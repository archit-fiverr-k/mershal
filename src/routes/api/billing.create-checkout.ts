import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { createCheckoutSession } from "../../lib/stripe";

export const Route = createFileRoute("/api/billing/create-checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          const body = await request.json();
          const { priceId } = body;

          if (!priceId) {
            return errorResponse("Price ID required", 400);
          }

          const baseUrl = process.env.VITE_APP_URL || "https://mershal.in";

          // Fetch user profile info
          const userSnap = await adminDb.doc(`users/${decoded.uid}`).get();
          const userData = userSnap.data();

          const session = await createCheckoutSession({
            uid: decoded.uid,
            email: decoded.email || userData?.email || "",
            name: userData?.fullName || decoded.email || "Freelancer",
            priceId,
            successUrl: `${baseUrl}/dashboard/settings?tab=billing&success=true`,
            cancelUrl: `${baseUrl}/dashboard/settings?tab=billing&cancelled=true`,
          });

          return jsonResponse({ url: session.url });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[POST /api/billing/create-checkout]", err);
          return errorResponse("Failed to create checkout session");
        }
      },
    },
  },
});
