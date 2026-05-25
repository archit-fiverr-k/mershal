import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { updateTaskSchema } from "../../lib/validations";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export const Route = createFileRoute("/api/tasks/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id } = params;

          const snap = await adminDb
            .doc(`users/${decoded.uid}/tasks/${id}`)
            .get();
          if (!snap.exists) {
            return errorResponse("Task not found", 404);
          }

          const body = await request.json();
          const parsed = updateTaskSchema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(parsed.error.message, 400);
          }

          const updateData: Record<string, unknown> = {
            ...parsed.data,
            updatedAt: FieldValue.serverTimestamp(),
          };

          if (parsed.data.dueDate) {
            updateData.dueDate = Timestamp.fromDate(new Date(parsed.data.dueDate));
          }

          await adminDb
            .doc(`users/${decoded.uid}/tasks/${id}`)
            .update(updateData);

          return jsonResponse({ success: true });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[PATCH /api/tasks/$id]", err);
          return errorResponse("Internal server error");
        }
      },

      DELETE: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id } = params;

          const snap = await adminDb
            .doc(`users/${decoded.uid}/tasks/${id}`)
            .get();
          if (!snap.exists) {
            return errorResponse("Task not found", 404);
          }

          await adminDb.doc(`users/${decoded.uid}/tasks/${id}`).delete();
          return jsonResponse({ success: true });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[DELETE /api/tasks/$id]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
