import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { adminDb } = await import("../../lib/firebase/admin");
        const { verifyAuth, unauthorizedResponse, errorResponse, jsonResponse } =
          await import("../../lib/firebase/middleware");
        try {
          const decoded = await verifyAuth(request);
          const snap = await adminDb.doc(`users/${decoded.uid}`).get();
          if (!snap.exists) return errorResponse("User not found", 404);
          
          const userData = snap.data();
          let plan = userData?.plan || "free";
          const trialEndsAt = userData?.trialEndsAt;
          if (trialEndsAt && trialEndsAt.toDate() > new Date()) {
            plan = "pro";
          }
          
          return jsonResponse({ uid: decoded.uid, ...userData, plan });
        } catch (err) {
          if (err instanceof Error && err.name === "AuthError") return unauthorizedResponse();
          console.error("[GET /api/profile]", err);
          return errorResponse("Internal server error");
        }
      },
      PATCH: async ({ request }) => {
        const { adminDb } = await import("../../lib/firebase/admin");
        const { verifyAuth, unauthorizedResponse, errorResponse, jsonResponse } =
          await import("../../lib/firebase/middleware");
        const { updateProfileSchema } = await import("../../lib/validations");
        const { FieldValue } = await import("firebase-admin/firestore");
        try {
          const decoded = await verifyAuth(request);
          const body = await request.json();
          const parsed = updateProfileSchema.safeParse(body);
          if (!parsed.success) return errorResponse(parsed.error.message, 400);
          await adminDb.doc(`users/${decoded.uid}`).update({ ...parsed.data, updatedAt: FieldValue.serverTimestamp() });
          return jsonResponse({ success: true });
        } catch (err) {
          if (err instanceof Error && err.name === "AuthError") return unauthorizedResponse();
          console.error("[PATCH /api/profile]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});