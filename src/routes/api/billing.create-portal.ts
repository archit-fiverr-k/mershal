import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { createCustomerPortalSession } from "../../lib/stripe";

export const Route = createFileRoute("/api/billing/create-portal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);

          const userSnap = await adminDb.doc(`users/${decoded.uid}`).get();
          const userData = userSnap.data();

          if (!userData?.stripeCustomerId) {
            return errorResponse("No billing account found. Please subscribe first.", 400);
          }

          const baseUrl = process.env.VITE_APP_URL || "https://mershal.in";

          const session = await createCustomerPortalSession(
            userData.stripeCustomerId,
            `${baseUrl}/dashboard/settings?tab=billing`
          );

          return jsonResponse({ url: session.url });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[POST /api/billing/create-portal]", err);
          return errorResponse("Failed to create portal session");
        }
      },
    },
  },
});
