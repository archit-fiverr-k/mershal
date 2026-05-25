import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";

export const Route = createFileRoute("/api/ai/conversations/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id } = params;

          const convSnap = await adminDb
            .doc(`users/${decoded.uid}/conversations/${id}`)
            .get();
          if (!convSnap.exists) {
            return errorResponse("Conversation not found", 404);
          }

          const messagesSnap = await adminDb
            .collection(`users/${decoded.uid}/conversations/${id}/messages`)
            .orderBy("createdAt", "asc")
            .get();

          const messages = messagesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          return jsonResponse({
            conversation: { id: convSnap.id, ...convSnap.data() },
            messages,
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[GET /api/ai/conversations/$id]", err);
          return errorResponse("Internal server error");
        }
      },

      DELETE: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id } = params;

          const convSnap = await adminDb
            .doc(`users/${decoded.uid}/conversations/${id}`)
            .get();
          if (!convSnap.exists) {
            return errorResponse("Conversation not found", 404);
          }

          // Delete all messages in batch
          const messagesSnap = await adminDb
            .collection(`users/${decoded.uid}/conversations/${id}/messages`)
            .get();

          const batch = adminDb.batch();
          messagesSnap.docs.forEach((d) => batch.delete(d.ref));
          batch.delete(adminDb.doc(`users/${decoded.uid}/conversations/${id}`));
          await batch.commit();

          return jsonResponse({ success: true });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[DELETE /api/ai/conversations/$id]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
