import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { createProposalSchema } from "../../lib/validations";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { nanoid } from "nanoid";

export const Route = createFileRoute("/api/proposals")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          const url = new URL(request.url);
          const clientId = url.searchParams.get("clientId") ?? "";
          const status = url.searchParams.get("status") ?? "";

          let query = adminDb
            .collection(`users/${decoded.uid}/proposals`)
            .orderBy("createdAt", "desc") as FirebaseFirestore.Query;

          if (clientId) query = query.where("clientId", "==", clientId);
          if (status) query = query.where("status", "==", status);

          const snap = await query.get();
          const proposals = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          return jsonResponse({ proposals });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError")
            return unauthorizedResponse();
          console.error("[GET /api/proposals]", err);
          return errorResponse("Internal server error");
        }
      },

      POST: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          const body = await request.json();
          const parsed = createProposalSchema.safeParse(body);
          if (!parsed.success) return errorResponse(parsed.error.message, 400);

          // Generate a unique public token for the proposal
          const publicToken = nanoid(16);

          const data = {
            ...parsed.data,
            publicToken,
            validUntil: parsed.data.validUntil
              ? Timestamp.fromDate(new Date(parsed.data.validUntil))
              : null,
            viewedAt: null,
            acceptedAt: null,
            declinedAt: null,
            declineReason: "",
            convertedToProjectId: null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };

          const ref = await adminDb
            .collection(`users/${decoded.uid}/proposals`)
            .add(data);

          return jsonResponse({ id: ref.id, publicToken, ...parsed.data }, 201);
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError")
            return unauthorizedResponse();
          console.error("[POST /api/proposals]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
