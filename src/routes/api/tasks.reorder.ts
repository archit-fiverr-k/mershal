import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { reorderTasksSchema } from "../../lib/validations";
import { FieldValue } from "firebase-admin/firestore";

export const Route = createFileRoute("/api/tasks/reorder")({
  server: {
    handlers: {
      PATCH: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          const body = await request.json();
          const parsed = reorderTasksSchema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(parsed.error.message, 400);
          }

          const batch = adminDb.batch();
          for (const task of parsed.data.tasks) {
            const ref = adminDb.doc(`users/${decoded.uid}/tasks/${task.id}`);
            batch.update(ref, {
              position: task.position,
              status: task.status,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
          await batch.commit();

          return jsonResponse({ success: true });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[PATCH /api/tasks/reorder]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
