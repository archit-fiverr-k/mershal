import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { createProjectSchema } from "../../lib/validations";
import { checkLimit, getLimitResponse } from "../../lib/limits";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export const Route = createFileRoute("/api/projects")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          const url = new URL(request.url);
          const clientId = url.searchParams.get("clientId") ?? "";
          const status = url.searchParams.get("status") ?? "";

          let query = adminDb
            .collection(`users/${decoded.uid}/projects`)
            .orderBy("createdAt", "desc") as FirebaseFirestore.Query;

          if (clientId) {
            query = query.where("clientId", "==", clientId);
          }
          if (status) {
            query = query.where("status", "==", status);
          }

          const snap = await query.get();
          const projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          return jsonResponse({ projects });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[GET /api/projects]", err);
          return errorResponse("Internal server error");
        }
      },

      POST: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          const existingProjects = await adminDb
            .collection("users")
            .doc(decoded.uid)
            .collection("projects")
            .count()
            .get();

          const projectCount = existingProjects.data().count;

          const limitCheck = await checkLimit(decoded.uid, "projects", projectCount);
          if (!limitCheck.allowed) {
            return getLimitResponse("projects");
          }

          const body = await request.json();
          const parsed = createProjectSchema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(parsed.error.message, 400);
          }

          const data = {
            ...parsed.data,
            startDate: parsed.data.startDate
              ? Timestamp.fromDate(new Date(parsed.data.startDate))
              : null,
            dueDate: parsed.data.dueDate
              ? Timestamp.fromDate(new Date(parsed.data.dueDate))
              : null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };

          const ref = await adminDb
            .collection(`users/${decoded.uid}/projects`)
            .add(data);

          // Timeline: project_created (fire-and-forget)
          if (parsed.data.clientId) {
            const { addTimelineEvent } = await import("../../lib/timeline");
            addTimelineEvent(decoded.uid, parsed.data.clientId, {
              type: "project_created",
              title: "Project created",
              description: `Project "${parsed.data.name}" was created`,
              metadata: { projectId: ref.id },
            }).catch(console.error);
          }

          return jsonResponse({ id: ref.id, ...parsed.data }, 201);
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          if (err instanceof LimitError) {
            return errorResponse(err.message, 403);
          }
          console.error("[POST /api/projects]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
