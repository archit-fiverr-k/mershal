import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { sendInvoiceEmail } from "../../lib/email";
import { FieldValue } from "firebase-admin/firestore";

export const Route = createFileRoute("/api/invoices/$id/send")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id } = params;

          const invoiceSnap = await adminDb
            .doc(`users/${decoded.uid}/invoices/${id}`)
            .get();
          if (!invoiceSnap.exists) {
            return errorResponse("Invoice not found", 404);
          }

          const invoice = invoiceSnap.data() as Record<string, unknown>;

          // Fetch client
          const clientSnap = await adminDb
            .doc(`users/${decoded.uid}/clients/${invoice.clientId}`)
            .get();
          if (!clientSnap.exists) {
            return errorResponse("Client not found", 404);
          }

          const client = clientSnap.data() as Record<string, unknown>;
          const appUrl = process.env.VITE_APP_URL ?? "https://mershal.in";

          // Fetch workspace / agency name
          const userSnap = await adminDb.doc(`users/${decoded.uid}`).get();
          const userData = userSnap.data() as Record<string, unknown>;
          const workspaceName = (userData?.workspaceName as string) ?? "Our Agency";
          const freelancerEmail = (userData?.email as string) ?? "";

          // Generate portal token for the client
          const tokenRef = adminDb.collection("portalTokens").doc();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          await tokenRef.set({
            clientId: invoice.clientId,
            userId: decoded.uid,
            expiresAt: expiresAt,
            createdAt: new Date(),
          });

          const portalUrl = `${appUrl}/portal/${tokenRef.id}`;

          await sendInvoiceEmail(
            client.email as string,
            client.name as string,
            invoice.invoiceNumber as string,
            invoice.total as number,
            portalUrl,
            workspaceName,
            freelancerEmail,
          );

          await adminDb.doc(`users/${decoded.uid}/invoices/${id}`).update({
            status: "sent",
            updatedAt: FieldValue.serverTimestamp(),
          });

          // Timeline: invoice_sent
          const { addTimelineEvent } = await import("../../lib/timeline");
          addTimelineEvent(decoded.uid, invoice.clientId as string, {
            type: "invoice_sent",
            title: "Invoice sent",
            description: `Invoice ${invoice.invoiceNumber} ($${(invoice.total as number).toLocaleString()}) was sent`,
            metadata: { invoiceId: id },
          }).catch(console.error);

          return jsonResponse({ success: true, portalUrl });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[POST /api/invoices/$id/send]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
