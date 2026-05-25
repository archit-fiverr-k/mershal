import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { createTaskSchema } from "../../lib/validations";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export const Route = createFileRoute("/api/tasks")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          const url = new URL(request.url);
          const projectId = url.searchParams.get("projectId") ?? "";
          const status = url.searchParams.get("status") ?? "";

          let query = adminDb
            .collection(`users/${decoded.uid}/tasks`)
            .orderBy("position", "asc") as FirebaseFirestore.Query;

          if (projectId) {
            query = query.where("projectId", "==", projectId);
          }
          if (status) {
            query = query.where("status", "==", status);
          }

          const snap = await query.get();
          const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          return jsonResponse({ tasks });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[GET /api/tasks]", err);
          return errorResponse("Internal server error");
        }
      },

      POST: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          const body = await request.json();
          const parsed = createTaskSchema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(parsed.error.message, 400);
          }

          // Get the last position in the column (in-memory to avoid Firestore composite index requirement)
          const existingSnap = await adminDb
            .collection(`users/${decoded.uid}/tasks`)
            .where("projectId", "==", parsed.data.projectId)
            .where("status", "==", parsed.data.status)
            .get();

          let lastPosition = 0;
          existingSnap.forEach((doc) => {
            const pos = doc.data().position as number;
            if (pos !== undefined && pos >= lastPosition) {
              lastPosition = pos + 1;
            }
          });

          const data = {
            ...parsed.data,
            position: lastPosition,
            dueDate: parsed.data.dueDate
              ? Timestamp.fromDate(new Date(parsed.data.dueDate))
              : null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };

          const ref = await adminDb
            .collection(`users/${decoded.uid}/tasks`)
            .add(data);

          return jsonResponse({ id: ref.id, ...parsed.data, position: lastPosition }, 201);
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[POST /api/tasks]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
