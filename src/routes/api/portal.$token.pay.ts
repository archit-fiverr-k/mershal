import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import { errorResponse, jsonResponse } from "../../lib/firebase/middleware";
import { portalPaySchema } from "../../lib/validations";
import { stripe } from "../../lib/stripe";
import { Timestamp } from "firebase-admin/firestore";

export const Route = createFileRoute("/api/portal/$token/pay")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const { token } = params;
          let clientId = "";
          let userId = "";

          const tokenSnap = await adminDb.doc(`portalTokens/${token}`).get();
          if (tokenSnap.exists) {
            const tokenData = tokenSnap.data() as {
              clientId: string;
              userId: string;
              expiresAt: Timestamp;
            };

            if (tokenData.expiresAt.toDate() < new Date()) {
              return errorResponse("Portal link has expired", 410);
            }

            clientId = tokenData.clientId;
            userId = tokenData.userId;
          } else {
            // Check if user is logged in as the agency owner of this client
            try {
              const { verifyAuth } = await import("../../lib/firebase/middleware");
              const decoded = await verifyAuth(request);
              const clientSnap = await adminDb.doc(`users/${decoded.uid}/clients/${token}`).get();
              if (clientSnap.exists) {
                clientId = token;
                userId = decoded.uid;
              } else {
                return errorResponse("Invalid portal link or client ID", 404);
              }
            } catch (authErr) {
              return errorResponse("Invalid portal link", 404);
            }
          }

          const body = await request.json();
          const parsed = portalPaySchema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(parsed.error.message, 400);
          }

          const invoiceSnap = await adminDb
            .doc(`users/${userId}/invoices/${parsed.data.invoiceId}`)
            .get();

          if (!invoiceSnap.exists) {
            return errorResponse("Invoice not found", 404);
          }

          const invoice = invoiceSnap.data() as Record<string, unknown>;

          if (invoice.status === "paid") {
            return errorResponse("Invoice is already paid", 400);
          }

          // Fetch client email
          const clientSnap = await adminDb
            .doc(`users/${userId}/clients/${clientId}`)
            .get();
          const clientEmail = (clientSnap.data()?.email as string) ?? "";

          // Fetch workspace owner's custom payment gateway settings
          const ownerSnap = await adminDb.doc(`users/${userId}`).get();
          const ownerData = ownerSnap.exists ? ownerSnap.data() : null;
          const gateway = ownerData?.activePaymentGateway ?? "none";

          if (gateway !== "none") {
            const { checkLimit } = await import("../../lib/limits");
            const limitCheck = await checkLimit(userId, "stripe_payments");
            if (!limitCheck.allowed) {
              return errorResponse("Online payments are disabled for this workspace. The owner needs to upgrade to Mershal Pro.", 403);
            }
          }

          if (gateway === "stripe") {
            const StripeClass = (await import("stripe")).default;
            const dynamicStripe = ownerData?.stripeSecretKey
              ? new StripeClass(ownerData.stripeSecretKey, { apiVersion: "2023-10-16" as any })
              : stripe;

            const paymentIntent = await dynamicStripe.paymentIntents.create({
              amount: Math.round((invoice.total as number) * 100),
              currency: "usd",
              receipt_email: clientEmail,
              metadata: {
                invoiceId: parsed.data.invoiceId,
                userId: userId,
                invoiceNumber: invoice.invoiceNumber as string,
              },
            });

            await adminDb
              .doc(`users/${userId}/invoices/${parsed.data.invoiceId}`)
              .update({ stripePaymentIntentId: paymentIntent.id });

            return jsonResponse({
              clientSecret: paymentIntent.client_secret,
              activeGateway: "stripe",
            });
          } else if (gateway === "razorpay") {
            if (!ownerData?.razorpayKeyId || !ownerData?.razorpayKeySecret) {
              return errorResponse("Razorpay is not configured by the workspace owner.", 400);
            }

            const RazorpayClass = (await import("razorpay")).default;
            const razorpayInstance = new RazorpayClass({
              key_id: ownerData.razorpayKeyId,
              key_secret: ownerData.razorpayKeySecret,
            });

            const amountInSubunits = Math.round((invoice.total as number) * 100);
            const order = await razorpayInstance.orders.create({
              amount: amountInSubunits,
              currency: "INR",
              receipt: parsed.data.invoiceId,
              notes: {
                invoiceId: parsed.data.invoiceId,
                userId: userId,
                invoiceNumber: invoice.invoiceNumber as string,
              },
            });

            await adminDb
              .doc(`users/${userId}/invoices/${parsed.data.invoiceId}`)
              .update({ razorpayOrderId: order.id });

            return jsonResponse({
              orderId: order.id,
              amount: order.amount,
              currency: order.currency,
              keyId: ownerData.razorpayKeyId,
              activeGateway: "razorpay",
            });
          } else {
            return errorResponse("Online payments are disabled for this workspace.", 400);
          }
        } catch (err) {
          console.error("[POST /api/portal/$token/pay]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
