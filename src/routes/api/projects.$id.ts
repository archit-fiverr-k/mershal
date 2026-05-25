import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { updateProjectSchema } from "../../lib/validations";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export const Route = createFileRoute("/api/projects/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id } = params;

          const projectSnap = await adminDb
            .doc(`users/${decoded.uid}/projects/${id}`)
            .get();

          if (!projectSnap.exists) {
            return errorResponse("Project not found", 404);
          }

          const tasksSnap = await adminDb
            .collection(`users/${decoded.uid}/tasks`)
            .where("projectId", "==", id)
            .orderBy("position", "asc")
            .get();

          return jsonResponse({
            project: { id: projectSnap.id, ...projectSnap.data() },
            tasks: tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[GET /api/projects/$id]", err);
          return errorResponse("Internal server error");
        }
      },

      PATCH: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id } = params;

          const snap = await adminDb
            .doc(`users/${decoded.uid}/projects/${id}`)
            .get();
          if (!snap.exists) {
            return errorResponse("Project not found", 404);
          }

          const body = await request.json();
          const parsed = updateProjectSchema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(parsed.error.message, 400);
          }

          const updateData: Record<string, unknown> = {
            ...parsed.data,
            updatedAt: FieldValue.serverTimestamp(),
          };

          if (parsed.data.startDate) {
            updateData.startDate = Timestamp.fromDate(new Date(parsed.data.startDate));
          }
          if (parsed.data.dueDate) {
            updateData.dueDate = Timestamp.fromDate(new Date(parsed.data.dueDate));
          }

          await adminDb
            .doc(`users/${decoded.uid}/projects/${id}`)
            .update(updateData);

          return jsonResponse({ success: true });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[PATCH /api/projects/$id]", err);
          return errorResponse("Internal server error");
        }
      },

      DELETE: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id } = params;

          const snap = await adminDb
            .doc(`users/${decoded.uid}/projects/${id}`)
            .get();
          if (!snap.exists) {
            return errorResponse("Project not found", 404);
          }

          // Delete all related tasks in a batch
          const tasksSnap = await adminDb
            .collection(`users/${decoded.uid}/tasks`)
            .where("projectId", "==", id)
            .get();

          const batch = adminDb.batch();
          tasksSnap.docs.forEach((d) => batch.delete(d.ref));
          batch.delete(adminDb.doc(`users/${decoded.uid}/projects/${id}`));
          await batch.commit();

          return jsonResponse({ success: true });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[DELETE /api/projects/$id]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
