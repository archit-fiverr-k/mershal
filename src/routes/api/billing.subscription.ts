import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { stripe } from "../../lib/stripe";

export const Route = createFileRoute("/api/billing/subscription")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);

          const userSnap = await adminDb.doc(`users/${decoded.uid}`).get();
          if (!userSnap.exists) {
            return errorResponse("User not found", 404);
          }

          const userData = userSnap.data();
          let subscriptionDetails = null;

          if (userData?.stripeSubscriptionId) {
            try {
              const subscription = await stripe.subscriptions.retrieve(
                userData.stripeSubscriptionId
              );

              subscriptionDetails = {
                id: subscription.id,
                status: subscription.status,
                currentPeriodEnd: new Date(
                  subscription.current_period_end * 1000
                ).toISOString(),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                cancelAt: subscription.cancel_at
                  ? new Date(subscription.cancel_at * 1000).toISOString()
                  : null,
              };
            } catch (e) {
              console.error("Failed to fetch subscription from Stripe:", e);
            }
          }

          let plan = userData?.plan || "free";
          const trialEndsAt = userData?.trialEndsAt;
          if (trialEndsAt && trialEndsAt.toDate() > new Date()) {
            plan = "pro";
          }

          return jsonResponse({
            plan,
            subscriptionStatus: userData?.subscriptionStatus || null,
            stripeCustomerId: userData?.stripeCustomerId || null,
            stripeSubscriptionId: userData?.stripeSubscriptionId || null,
            subscription: subscriptionDetails,
            trialEndsAt: trialEndsAt ? trialEndsAt.toDate().toISOString() : null,
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[GET /api/billing/subscription]", err);
          return errorResponse("Failed to fetch subscription details");
        }
      },
    },
  },
});
