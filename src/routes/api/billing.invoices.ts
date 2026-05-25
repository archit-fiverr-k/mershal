import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { stripe } from "../../lib/stripe";

export const Route = createFileRoute("/api/billing/invoices")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);

          const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
          const userData = userDoc.data();

          if (!userData?.stripeCustomerId) {
            return jsonResponse({ invoices: [] });
          }

          const invoices = await stripe.invoices.list({
            customer: userData.stripeCustomerId,
            limit: 10,
          });

          const formattedInvoices = invoices.data.map((inv) => ({
            id: inv.id,
            amount: inv.amount_paid / 100,
            currency: inv.currency,
            status: inv.status,
            date: new Date(inv.created * 1000).toISOString(),
            pdfUrl: inv.invoice_pdf,
            description: inv.lines.data[0]?.description || "Mershal Pro subscription",
          }));

          return jsonResponse({ invoices: formattedInvoices });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[GET /api/billing/invoices]", err);
          return errorResponse("Failed to fetch invoices");
        }
      },
    },
  },
});
