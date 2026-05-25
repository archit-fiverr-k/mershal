import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { verifyTotp, signSessionToken } from "../../lib/totp";

export const Route = createFileRoute("/api/auth/2fa/validate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Skip 2FA check during validation check itself to avoid loop
          const decoded = await verifyAuth(request, { skip2FA: true });

          const body = await request.json();
          const { code } = body;

          if (!code || typeof code !== "string" || code.length !== 6) {
            return errorResponse("Invalid or missing code", 400);
          }

          // Fetch the permanent 2FA secret
          const securityDocRef = adminDb.doc(`users/${decoded.uid}/private/security`);
          const securitySnap = await securityDocRef.get();

          if (!securitySnap.exists) {
            return errorResponse("Two-factor authentication is not enabled", 400);
          }

          const securityData = securitySnap.data();
          const secret = securityData?.twoFactorSecret;

          if (!secret) {
            return errorResponse("Two-factor authentication is not enabled", 400);
          }

          // Verify the TOTP code
          const isValid = await verifyTotp(secret, code);
          if (!isValid) {
            return errorResponse("Invalid verification code", 400);
          }

          // Sign and return a new 12-hour 2FA session token
          const sessionSecret = process.env.FIREBASE_ADMIN_PRIVATE_KEY || "default-fallback-secure-key-123456";
          const token = await signSessionToken(decoded.uid, sessionSecret);

          return jsonResponse({
            success: true,
            token,
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[POST /api/auth/2fa/validate]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
