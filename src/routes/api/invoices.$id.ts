import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { updateInvoiceSchema } from "../../lib/validations";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export const Route = createFileRoute("/api/invoices/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id } = params;

          const snap = await adminDb
            .doc(`users/${decoded.uid}/invoices/${id}`)
            .get();
          if (!snap.exists) {
            return errorResponse("Invoice not found", 404);
          }

          const invoice = { id: snap.id, ...snap.data() } as Record<string, unknown>;

          // Fetch client name
          let clientName = "";
          if (invoice.clientId) {
            const clientSnap = await adminDb
              .doc(`users/${decoded.uid}/clients/${invoice.clientId}`)
              .get();
            clientName = (clientSnap.data()?.name as string) ?? "";
          }

          return jsonResponse({ ...invoice, clientName });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[GET /api/invoices/$id]", err);
          return errorResponse("Internal server error");
        }
      },

      PATCH: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id } = params;

          const snap = await adminDb
            .doc(`users/${decoded.uid}/invoices/${id}`)
            .get();
          if (!snap.exists) {
            return errorResponse("Invoice not found", 404);
          }

          const body = await request.json();
          const parsed = updateInvoiceSchema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(parsed.error.message, 400);
          }

          const updateData: Record<string, unknown> = {
            ...parsed.data,
            updatedAt: FieldValue.serverTimestamp(),
          };

          if (parsed.data.issueDate) {
            updateData.issueDate = Timestamp.fromDate(new Date(parsed.data.issueDate));
          }
          if (parsed.data.dueDate) {
            updateData.dueDate = Timestamp.fromDate(new Date(parsed.data.dueDate));
          }

          await adminDb
            .doc(`users/${decoded.uid}/invoices/${id}`)
            .update(updateData);

          return jsonResponse({ success: true });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[PATCH /api/invoices/$id]", err);
          return errorResponse("Internal server error");
        }
      },

      DELETE: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id } = params;

          const snap = await adminDb
            .doc(`users/${decoded.uid}/invoices/${id}`)
            .get();
          if (!snap.exists) {
            return errorResponse("Invoice not found", 404);
          }

          await adminDb.doc(`users/${decoded.uid}/invoices/${id}`).delete();
          return jsonResponse({ success: true });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[DELETE /api/invoices/$id]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
