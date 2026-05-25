import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import { errorResponse, jsonResponse } from "../../lib/firebase/middleware";

export const Route = createFileRoute("/api/auth/validate-signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { fingerprint, email } = body;

          if (!fingerprint || typeof fingerprint !== "string") {
            return errorResponse("System fingerprint is required", 400);
          }

          const clientIp = 
            request.headers.get("CF-Connecting-IP") || 
            request.headers.get("x-real-ip") || 
            request.headers.get("x-forwarded-for")?.split(",")[0].trim() || 
            "127.0.0.1";

          // 1. Check system fingerprint (Strict: limit of 1 account per system)
          const fingerprintSnap = await adminDb
            .collection("users")
            .where("deviceFingerprint", "==", fingerprint)
            .get();

          if (fingerprintSnap.size >= 1) {
            return jsonResponse({
              allowed: false,
              code: "TRIAL_LIMIT_EXCEEDED",
              message: "Free trial already claimed on this system. Only one free trial is allowed per device.",
            });
          }

          // 2. Check IP Address (Generous: limit of 2 accounts per IP to prevent shared Wi-Fi false positives)
          const isLocalIp = 
            clientIp === "127.0.0.1" || 
            clientIp === "::1" || 
            clientIp === "localhost" || 
            !clientIp || 
            clientIp === "unknown";

          if (!isLocalIp) {
            const ipSnap = await adminDb
              .collection("users")
              .where("signupIp", "==", clientIp)
              .get();

            if (ipSnap.size >= 2) {
              return jsonResponse({
                allowed: false,
                code: "TRIAL_LIMIT_EXCEEDED",
                message: "Free trial already claimed from this network connection. Please contact support if you need assistance.",
              });
            }
          }

          return jsonResponse({
            allowed: true,
            clientIp,
          });
        } catch (err) {
          console.error("[POST /api/auth/validate-signup]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
