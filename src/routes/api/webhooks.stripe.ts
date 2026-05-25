import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import { errorResponse, jsonResponse } from "../../lib/firebase/middleware";
import { constructWebhookEvent, getPlanFromPriceId } from "../../lib/stripe";
import { sendInvoicePaidEmail } from "../../lib/email";
import { FieldValue } from "firebase-admin/firestore";
import type Stripe from "stripe";

async function updateUserPlan(
  customerId: string,
  updates: Record<string, any>
) {
  const usersRef = adminDb.collection("users");
  const snapshot = await usersRef
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.error("No user found for customer:", customerId);
    return null;
  }

  const userDoc = snapshot.docs[0];
  await userDoc.ref.update(updates);
  return userDoc.id;
}

export const Route = createFileRoute("/api/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sig = request.headers.get("stripe-signature");
        if (!sig) {
          return errorResponse("Missing stripe-signature header", 400);
        }

        let event: Stripe.Event;
        try {
          const body = await request.text();
          event = constructWebhookEvent(body, sig);
        } catch (err) {
          console.error("[Stripe Webhook] Signature verification failed:", err);
          return errorResponse("Invalid webhook signature", 400);
        }

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as Stripe.Checkout.Session;
              if (session.mode === "subscription") {
                const customerId = session.customer as string;
                const subscriptionId = session.subscription as string;
                const uid = session.metadata?.firebaseUID || session.metadata?.userId;

                await updateUserPlan(customerId, {
                  plan: "pro",
                  subscriptionStatus: "active",
                  stripeSubscriptionId: subscriptionId,
                  stripeCustomerId: customerId,
                  updatedAt: FieldValue.serverTimestamp(),
                });

                console.log(`User upgraded to Pro via Checkout: ${uid || customerId}`);

                // Send Pro welcome email
                const customerEmail = session.customer_details?.email;
                const customerName = session.customer_details?.name || "Freelancer";
                if (customerEmail) {
                  const { sendProUpgradeEmail } = await import("../../lib/email");
                  await sendProUpgradeEmail(customerEmail, customerName).catch(console.error);
                }
              }
              break;
            }

            case "customer.subscription.updated": {
              const sub = event.data.object as Stripe.Subscription;
              const customerId = sub.customer as string;

              const priceId = sub.items.data[0]?.price.id ?? "";
              const plan = getPlanFromPriceId(priceId) ?? "pro";
              const isActive = sub.status === "active";

              await updateUserPlan(customerId, {
                plan: isActive ? plan : "free",
                subscriptionStatus: sub.status,
                stripeSubscriptionId: sub.id,
                updatedAt: FieldValue.serverTimestamp(),
              });

              console.log(`Subscription updated for ${customerId}: ${sub.status}`);
              break;
            }

            case "customer.subscription.deleted": {
              const sub = event.data.object as Stripe.Subscription;
              const customerId = sub.customer as string;

              const uid = await updateUserPlan(customerId, {
                plan: "free",
                subscriptionStatus: "cancelled",
                stripeSubscriptionId: "",
                updatedAt: FieldValue.serverTimestamp(),
              });

              console.log(`Subscription cancelled for: ${customerId}`);

              if (uid) {
                const userSnap = await adminDb.doc(`users/${uid}`).get();
                if (userSnap.exists) {
                  const userData = userSnap.data() as Record<string, unknown>;
                  if (userData.email) {
                    const { sendProCancelledEmail } = await import("../../lib/email");
                    await sendProCancelledEmail(
                      userData.email as string,
                      (userData.fullName as string) || "Freelancer",
                    ).catch(console.error);
                  }
                }
              }
              break;
            }

            case "invoice.payment_succeeded": {
              const invoice = event.data.object as Stripe.Invoice;
              const customerId = invoice.customer as string;

              // If it's a subscription invoice, update user's plan to pro
              if (invoice.subscription) {
                await updateUserPlan(customerId, {
                  plan: "pro",
                  subscriptionStatus: "active",
                  lastPaymentAt: FieldValue.serverTimestamp(),
                  updatedAt: FieldValue.serverTimestamp(),
                });
                console.log(`Subscription invoice payment succeeded for customer ${customerId}`);
                break;
              }

              // Otherwise, process as client invoice payment
              const paymentIntentId =
                typeof invoice.payment_intent === "string"
                  ? invoice.payment_intent
                  : invoice.payment_intent?.id ?? "";

              if (!paymentIntentId) break;

              // Find the invoice in Firestore by payment intent ID
              const usersSnap = await adminDb.collection("users").get();
              for (const userDoc of usersSnap.docs) {
                const invoicesSnap = await adminDb
                  .collection(`users/${userDoc.id}/invoices`)
                  .where("stripePaymentIntentId", "==", paymentIntentId)
                  .limit(1)
                  .get();

                if (!invoicesSnap.empty) {
                  const invoiceDoc = invoicesSnap.docs[0];
                  const invoiceData = invoiceDoc.data() as Record<string, unknown>;

                  await invoiceDoc.ref.update({
                    status: "paid",
                    paidAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                  });

                  // ── Firestore notification ──────────────────────────────
                  const { createNotification } = await import("../../lib/notifications");
                  const clientSnap = await adminDb
                    .doc(`users/${userDoc.id}/clients/${invoiceData.clientId}`)
                    .get();
                  const clientName = clientSnap.data()?.name ?? "your client";
                  await createNotification(userDoc.id, {
                    type: "invoice_paid",
                    title: "Invoice paid",
                    body: `${invoiceData.invoiceNumber} from ${clientName} was paid — $${(invoiceData.total as number ?? 0).toLocaleString()}`,
                    link: `/dashboard/invoices`,
                    metadata: {
                      invoiceId: invoiceDoc.id,
                      clientId: invoiceData.clientId as string,
                    },
                  }).catch(console.error);

                  // Notify owner via email
                  const ownerSnap = await adminDb.doc(`users/${userDoc.id}`).get();
                  const ownerData = ownerSnap.data() as Record<string, unknown>;
                  if (ownerData.email) {
                    await sendInvoicePaidEmail(
                      ownerData.email as string,
                      ownerData.fullName as string,
                      invoiceData.invoiceNumber as string,
                      invoiceData.total as number,
                    ).catch(console.error);
                  }
                  break;
                }
              }
              break;
            }

            case "invoice.payment_failed": {
              const invoice = event.data.object as Stripe.Invoice;
              const customerId = invoice.customer as string;

              // If it's a subscription invoice, mark plan status past_due and notify
              if (invoice.subscription) {
                const uid = await updateUserPlan(customerId, {
                  subscriptionStatus: "past_due",
                  updatedAt: FieldValue.serverTimestamp(),
                });
                console.log(`Subscription payment failed for customer ${customerId}`);

                if (uid) {
                  const userSnap = await adminDb.doc(`users/${uid}`).get();
                  if (userSnap.exists) {
                    const userData = userSnap.data() as Record<string, unknown>;
                    if (userData.email) {
                      const { sendOverdueReminderEmail } = await import("../../lib/email");
                      await sendOverdueReminderEmail(
                        userData.email as string,
                        (userData.fullName as string) || "Freelancer",
                        "your subscription",
                        0,
                      ).catch(console.error);
                    }
                  }
                }
                break;
              }

              // Otherwise handle as client payment failed
              const usersSnap = await adminDb
                .collection("users")
                .where("stripeCustomerId", "==", customerId)
                .limit(1)
                .get();

              if (!usersSnap.empty) {
                const userDoc = usersSnap.docs[0];
                const userData = userDoc.data() as Record<string, unknown>;

                // Send payment failed email
                const { sendOverdueReminderEmail } = await import("../../lib/email");
                if (userData.email) {
                  await sendOverdueReminderEmail(
                    userData.email as string,
                    userData.fullName as string,
                    "your subscription",
                    0,
                  ).catch(console.error);
                }
              }
              break;
            }

            default:
              // Unhandled event type — ignore
              break;
          }

          return jsonResponse({ received: true });
        } catch (err) {
          console.error("[Stripe Webhook] Handler error:", err);
          return errorResponse("Webhook handler failed");
        }
      },
    },
  },
});
