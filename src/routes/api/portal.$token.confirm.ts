import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import { errorResponse, jsonResponse } from "../../lib/firebase/middleware";
import { stripe } from "../../lib/stripe";
import { sendInvoicePaidEmail } from "../../lib/email";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

const confirmPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  paymentMethod: z.enum(["stripe", "razorpay"]),
  stripePaymentIntentId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  razorpayOrderId: z.string().optional(),
  razorpaySignature: z.string().optional(),
});

export const Route = createFileRoute("/api/portal/$token/confirm")({
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
          const parsed = confirmPaymentSchema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(parsed.error.message, 400);
          }

          const {
            invoiceId,
            paymentMethod,
            stripePaymentIntentId,
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature,
          } = parsed.data;

          const invoiceDocRef = adminDb.doc(`users/${userId}/invoices/${invoiceId}`);
          const invoiceSnap = await invoiceDocRef.get();
          if (!invoiceSnap.exists) {
            return errorResponse("Invoice not found", 404);
          }

          const invoiceData = invoiceSnap.data() as Record<string, unknown>;
          if (invoiceData.status === "paid") {
            return jsonResponse({ success: true, message: "Invoice is already paid" });
          }

          // Retrieve owner credentials
          const ownerSnap = await adminDb.doc(`users/${userId}`).get();
          if (!ownerSnap.exists) {
            return errorResponse("Workspace owner profile not found", 404);
          }
          const ownerData = ownerSnap.data() as Record<string, any>;

          if (paymentMethod === "stripe") {
            if (!stripePaymentIntentId) {
              return errorResponse("stripePaymentIntentId is required", 400);
            }

            const StripeClass = (await import("stripe")).default;
            const dynamicStripe = ownerData.stripeSecretKey
              ? new StripeClass(ownerData.stripeSecretKey, { apiVersion: "2023-10-16" as any })
              : stripe;

            const paymentIntent = await dynamicStripe.paymentIntents.retrieve(stripePaymentIntentId);
            if (paymentIntent.status !== "succeeded") {
              return errorResponse(`Payment intent status is ${paymentIntent.status}`, 400);
            }

            // Verify intent matches the correct invoice
            if (paymentIntent.metadata?.invoiceId !== invoiceId) {
              return errorResponse("Payment intent metadata mismatch", 400);
            }

            // Update invoice doc
            await invoiceDocRef.update({
              status: "paid",
              stripePaymentIntentId,
              paidAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });
          } else if (paymentMethod === "razorpay") {
            if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
              return errorResponse("Razorpay verification parameters are required", 400);
            }

            if (!ownerData.razorpayKeySecret) {
              return errorResponse("Razorpay is not fully configured by the owner", 400);
            }

            const crypto = await import("crypto");
            const text = razorpayOrderId + "|" + razorpayPaymentId;
            const expectedSignature = crypto
              .createHmac("sha256", ownerData.razorpayKeySecret)
              .update(text)
              .digest("hex");

            if (expectedSignature !== razorpaySignature) {
              return errorResponse("Invalid Razorpay payment signature", 400);
            }

            // Update invoice doc
            await invoiceDocRef.update({
              status: "paid",
              razorpayOrderId,
              razorpayPaymentId,
              paidAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });
          } else {
            return errorResponse("Unsupported payment method", 400);
          }

          // ── Create In-App Notification ────────────────────────────────────
          try {
            const { createNotification } = await import("../../lib/notifications");
            const clientSnap = await adminDb.doc(`users/${userId}/clients/${clientId}`).get();
            const clientName = clientSnap.data()?.name ?? "your client";

            await createNotification(userId, {
              type: "invoice_paid",
              title: "Invoice paid",
              body: `${invoiceData.invoiceNumber} from ${clientName} was paid — $${(invoiceData.total as number ?? 0).toLocaleString()}`,
              link: `/dashboard/invoices`,
              metadata: {
                invoiceId: invoiceId,
                clientId: clientId,
              },
            });
          } catch (notiErr) {
            console.error("Failed to create paid invoice notification:", notiErr);
          }

          // ── Send Email ──────────────────────────────────────────────────
          try {
            if (ownerData.email) {
              await sendInvoicePaidEmail(
                ownerData.email as string,
                ownerData.fullName as string,
                invoiceData.invoiceNumber as string,
                invoiceData.total as number,
              );
            }
          } catch (emailErr) {
            console.error("Failed to send paid invoice confirmation email:", emailErr);
          }

          return jsonResponse({ success: true });
        } catch (err) {
          console.error("[POST /api/portal/$token/confirm]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
