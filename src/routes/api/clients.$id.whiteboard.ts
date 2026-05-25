import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

const whiteboardSchema = z.object({
  strokes: z.array(z.any()),
});

export const Route = createFileRoute("/api/clients/$id/whiteboard")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id } = params;

          const clientSnap = await adminDb.doc(`users/${decoded.uid}/clients/${id}`).get();
          if (!clientSnap.exists) {
            return errorResponse("Client not found", 404);
          }

          const whiteboardSnap = await adminDb
            .doc(`users/${decoded.uid}/clients/${id}/whiteboard/data`)
            .get();

          if (whiteboardSnap.exists) {
            return jsonResponse(whiteboardSnap.data());
          }

          return jsonResponse({ strokes: [] });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[GET /api/clients/$id/whiteboard]", err);
          return errorResponse("Internal server error");
        }
      },
      POST: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id } = params;

          const clientSnap = await adminDb.doc(`users/${decoded.uid}/clients/${id}`).get();
          if (!clientSnap.exists) {
            return errorResponse("Client not found", 404);
          }

          const body = await request.json();
          const parsed = whiteboardSchema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(parsed.error.message, 400);
          }

          await adminDb
            .doc(`users/${decoded.uid}/clients/${id}/whiteboard/data`)
            .set({
              strokes: parsed.data.strokes,
              updatedAt: FieldValue.serverTimestamp(),
              updatedBy: "owner",
            });

          return jsonResponse({ success: true });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[POST /api/clients/$id/whiteboard]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
