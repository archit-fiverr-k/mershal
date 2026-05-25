import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { updateProposalSchema } from "../../lib/validations";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export const Route = createFileRoute("/api/proposals/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const snap = await adminDb
            .doc(`users/${decoded.uid}/proposals/${params.id}`)
            .get();
          if (!snap.exists) return errorResponse("Proposal not found", 404);
          return jsonResponse({ id: snap.id, ...snap.data() });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError")
            return unauthorizedResponse();
          console.error("[GET /api/proposals/$id]", err);
          return errorResponse("Internal server error");
        }
      },

      PATCH: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const body = await request.json();
          const parsed = updateProposalSchema.safeParse(body);
          if (!parsed.success) return errorResponse(parsed.error.message, 400);

          const update: Record<string, unknown> = {
            ...parsed.data,
            updatedAt: FieldValue.serverTimestamp(),
          };
          if (parsed.data.validUntil) {
            update.validUntil = Timestamp.fromDate(new Date(parsed.data.validUntil));
          }

          await adminDb
            .doc(`users/${decoded.uid}/proposals/${params.id}`)
            .update(update);

          return jsonResponse({ success: true });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError")
            return unauthorizedResponse();
          console.error("[PATCH /api/proposals/$id]", err);
          return errorResponse("Internal server error");
        }
      },

      DELETE: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          await adminDb
            .doc(`users/${decoded.uid}/proposals/${params.id}`)
            .delete();
          return jsonResponse({ success: true });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError")
            return unauthorizedResponse();
          console.error("[DELETE /api/proposals/$id]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
