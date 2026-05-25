import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { checkLimit, getLimitResponse } from "../../lib/limits";
import { stripe } from "../../lib/stripe";

export const Route = createFileRoute("/api/invoices/$id/pay")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const limitCheck = await checkLimit(decoded.uid, "stripe_payments");
          if (!limitCheck.allowed) {
            return getLimitResponse("online invoice payments");
          }
          const { id } = params;

          const invoiceSnap = await adminDb
            .doc(`users/${decoded.uid}/invoices/${id}`)
            .get();
          if (!invoiceSnap.exists) {
            return errorResponse("Invoice not found", 404);
          }

          const invoice = invoiceSnap.data() as Record<string, unknown>;

          if (invoice.status === "paid") {
            return errorResponse("Invoice is already paid", 400);
          }

          // Fetch client email for Stripe
          const clientSnap = await adminDb
            .doc(`users/${decoded.uid}/clients/${invoice.clientId}`)
            .get();
          const clientEmail = (clientSnap.data()?.email as string) ?? "";

          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round((invoice.total as number) * 100), // cents
            currency: "usd",
            receipt_email: clientEmail,
            metadata: {
              invoiceId: id,
              userId: decoded.uid,
              invoiceNumber: invoice.invoiceNumber as string,
            },
          });

          // Save payment intent ID to invoice
          await adminDb.doc(`users/${decoded.uid}/invoices/${id}`).update({
            stripePaymentIntentId: paymentIntent.id,
          });

          return jsonResponse({ clientSecret: paymentIntent.client_secret });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[POST /api/invoices/$id/pay]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
