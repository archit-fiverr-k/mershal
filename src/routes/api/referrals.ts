/**
 * /api/referrals
 *
 * POST /api/referrals/apply  — apply a referral code on signup
 * GET  /api/referrals        — get current user's referral code + stats
 */
import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { FieldValue } from "firebase-admin/firestore";

/** Generate a referral code from uid */
function generateReferralCode(uid: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const prefix = uid.substring(0, 2).toUpperCase();
  let suffix = "";
  for (let i = 0; i < 5; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}${suffix}`;
}

export const Route = createFileRoute("/api/referrals")({
  server: {
    handlers: {
      /** GET — return current user's referral code + stats */
      GET: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          const uid = decoded.uid;

          const userSnap = await adminDb.doc(`users/${uid}`).get();
          const userData = userSnap.data() ?? {};

          let referralCode = userData.referralCode as string | undefined;

          // Generate and persist code if not yet set
          if (!referralCode) {
            referralCode = generateReferralCode(uid);
            await adminDb.doc(`users/${uid}`).update({
              referralCode,
              updatedAt: FieldValue.serverTimestamp(),
            });
            // Register code in global collection for lookup
            await adminDb.doc(`referralCodes/${referralCode}`).set({
              uid,
              createdAt: FieldValue.serverTimestamp(),
              redeemCount: 0,
            });
          }

          // Count how many users were referred
          const referredSnap = await adminDb
            .collection("users")
            .where("referredBy", "==", uid)
            .get();
          const referredCount = referredSnap.size;

          // Count how many free months have been granted
          const creditsGranted = userData.referralCreditsGranted ?? 0;

          return jsonResponse({
            referralCode,
            referralLink: `${process.env.VITE_APP_URL ?? "https://mershal.in"}/?ref=${referralCode}`,
            referredCount,
            creditsGranted,
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError")
            return unauthorizedResponse();
          console.error("[GET /api/referrals]", err);
          return errorResponse("Internal server error");
        }
      },

      /** POST — apply a referral code for the calling user */
      POST: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          const uid = decoded.uid;
          const { code } = await request.json() as { code: string };

          if (!code || typeof code !== "string") {
            return errorResponse("Referral code is required", 400);
          }

          const upperCode = code.toUpperCase().trim();

          // Look up the code
          const codeSnap = await adminDb.doc(`referralCodes/${upperCode}`).get();
          if (!codeSnap.exists) {
            return errorResponse("Invalid referral code", 404);
          }

          const codeData = codeSnap.data()!;
          const referrerId = codeData.uid as string;

          if (referrerId === uid) {
            return errorResponse("You cannot use your own referral code", 400);
          }

          // Check if this user already applied a referral
          const userSnap = await adminDb.doc(`users/${uid}`).get();
          if (userSnap.data()?.referredBy) {
            return errorResponse("You have already applied a referral code", 400);
          }

          // Apply referral — mark the new user as referred
          await adminDb.doc(`users/${uid}`).update({
            referredBy: referrerId,
            referralCodeUsed: upperCode,
            updatedAt: FieldValue.serverTimestamp(),
          });

          // Grant referrer a credit flag (they get 1 free month — apply manually via Stripe)
          await adminDb.doc(`users/${referrerId}`).update({
            referralCreditsGranted: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
          });

          // Increment redeem count on code doc
          await codeSnap.ref.update({
            redeemCount: FieldValue.increment(1),
          });

          // Notify referrer
          const { createNotification } = await import("../../lib/notifications");
          const newUserSnap = await adminDb.doc(`users/${uid}`).get();
          const newUserName = newUserSnap.data()?.fullName ?? "Someone";
          await createNotification(referrerId, {
            type: "project_update",
            title: "Referral credit earned! 🎉",
            body: `${newUserName} joined Mershal using your referral link. You've earned 1 free month!`,
            link: "/dashboard/settings?tab=Billing",
          }).catch(console.error);

          return jsonResponse({ success: true });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError")
            return unauthorizedResponse();
          console.error("[POST /api/referrals]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
