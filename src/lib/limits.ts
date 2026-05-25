import { PLANS, PlanId } from "./stripe";
import { adminDb } from "./firebase/admin";

export type LimitKey = 
  'clients' | 'projects' | 'invoices' | 
  'ai' | 'portal' | 'stripe_payments'

export class LimitError extends Error {
  status = 403;
  upgradeUrl: string;

  constructor(feature: string, upgradeUrl = "/dashboard/settings?tab=billing") {
    super(`Upgrade required to use ${feature}`);
    this.name = "LimitError";
    this.upgradeUrl = upgradeUrl;
  }
}

export async function getUserPlan(uid: string): Promise<PlanId> {
  const userDoc = await adminDb.collection('users').doc(uid).get()
  const data = userDoc.data()
  
  const trialEndsAt = data?.trialEndsAt;
  const isTrialActive = trialEndsAt && trialEndsAt.toDate() > new Date();

  if (
    (data?.plan === 'pro' && data?.subscriptionStatus === 'active') ||
    isTrialActive
  ) {
    return 'pro'
  }
  
  return 'free'
}

export async function checkLimit(
  uid: string,
  feature: LimitKey,
  currentCount?: number
): Promise<{ allowed: boolean; limit: number | boolean; upgradeRequired: boolean }> {
  
  const plan = await getUserPlan(uid)
  const limits = PLANS[plan].limits
  const limit = limits[feature]
  
  let allowed = true
  let upgradeRequired = false
  
  if (typeof limit === 'boolean') {
    allowed = limit
    upgradeRequired = !limit
  } else if (limit === Infinity) {
    allowed = true
    upgradeRequired = false
  } else {
    const count = currentCount ?? 0
    allowed = count < (limit as number)
    upgradeRequired = !allowed
  }

  if (upgradeRequired) {
    // Trigger notification email asynchronously so we don't block API response
    triggerLimitReachedEmail(uid, feature, limit).catch(console.error);
  }
  
  return {
    allowed,
    limit,
    upgradeRequired
  }
}

async function triggerLimitReachedEmail(
  uid: string,
  feature: LimitKey,
  limitVal: number | boolean
) {
  try {
    const userRef = adminDb.collection("users").doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return;

    const userData = userDoc.data();
    const emailsSent = userData?.limitReachedEmailsSent ?? {};

    // Only send the email once per feature to avoid spamming the user
    if (!emailsSent[feature]) {
      const email = userData?.email;
      const name = userData?.fullName || "Freelancer";

      if (email) {
        let displayFeature = feature as string;
        if (feature === "ai") displayFeature = "AI assistant";
        if (feature === "portal") displayFeature = "Client Portal";
        if (feature === "stripe_payments") displayFeature = "Online Card Payments";

        const { sendLimitReachedEmail } = await import("./email");
        await sendLimitReachedEmail(email, name, displayFeature, limitVal);

        await userRef.update({
          [`limitReachedEmailsSent.${feature}`]: true,
        });
        console.log(`Limit email sent to ${email} for feature: ${feature}`);
      }
    }
  } catch (err) {
    console.error(`Error sending limit reached email for ${feature}:`, err);
  }
}

export function getLimitResponse(feature: string) {
  return new Response(
    JSON.stringify({
      error: 'Plan limit reached',
      code: 'UPGRADE_REQUIRED',
      feature,
      message: `Upgrade to Mershal Pro to unlock unlimited ${feature}.`,
      upgradeUrl: '/dashboard/settings?tab=billing'
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}
