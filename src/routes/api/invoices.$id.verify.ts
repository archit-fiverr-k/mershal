import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { FieldValue } from "firebase-admin/firestore";

export const Route = createFileRoute("/api/invoices/$id/verify")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id } = params;

          const invoiceDocRef = adminDb.doc(`users/${decoded.uid}/invoices/${id}`);
          const invoiceSnap = await invoiceDocRef.get();
          if (!invoiceSnap.exists) {
            return errorResponse("Invoice not found", 404);
          }

          const invoice = invoiceSnap.data() as Record<string, any>;
          if (invoice.status === "paid") {
            return errorResponse("Invoice is already paid", 400);
          }

          // Mark invoice as paid
          await invoiceDocRef.update({
            status: "paid",
            paidAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });

          // Add timeline event
          const { addTimelineEvent } = await import("../../lib/timeline");
          await addTimelineEvent(decoded.uid, invoice.clientId, {
            type: "invoice_paid",
            title: "Invoice paid",
            description: `Invoice ${invoice.invoiceNumber} ($${(invoice.total ?? 0).toLocaleString()}) was marked as Paid`,
            metadata: { invoiceId: id, method: "offline_verification" },
          }).catch(console.error);

          // Append audit message to client chat
          await adminDb
            .collection(`users/${decoded.uid}/clients/${invoice.clientId}/messages`)
            .add({
              content: `✅ Payment proof verified by freelancer. Invoice ${invoice.invoiceNumber} marked as Paid.`,
              senderName: "System (Owner Action)",
              fromClient: false,
              createdAt: FieldValue.serverTimestamp(),
            });

          return jsonResponse({ success: true });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[POST /api/invoices/$id/verify]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
