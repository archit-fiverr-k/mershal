import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";

export const Route = createFileRoute("/api/clients/$id/timeline")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id: clientId } = params;

          // Verify client belongs to this user
          const clientSnap = await adminDb
            .doc(`users/${decoded.uid}/clients/${clientId}`)
            .get();
          if (!clientSnap.exists) {
            return errorResponse("Client not found", 404);
          }

          const snap = await adminDb
            .collection(`users/${decoded.uid}/clients/${clientId}/timeline`)
            .orderBy("createdAt", "desc")
            .limit(50)
            .get();

          const events = snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          return jsonResponse({ events });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError")
            return unauthorizedResponse();
          console.error("[GET /api/clients/$id/timeline]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
