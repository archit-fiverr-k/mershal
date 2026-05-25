import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";

export const Route = createFileRoute("/api/ai/conversations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);

          const snap = await adminDb
            .collection(`users/${decoded.uid}/conversations`)
            .orderBy("updatedAt", "desc")
            .limit(50)
            .get();

          const conversations = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          return jsonResponse({ conversations });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[GET /api/ai/conversations]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
