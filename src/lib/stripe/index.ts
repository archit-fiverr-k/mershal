import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
  typescript: true,
})

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    limits: {
      clients: 1,
      projects: 1,
      invoices: 5,
      ai: false,
      portal: false,
      stripe_payments: false,
    }
  },
  pro: {
    name: 'Pro',
    price: 19,
    priceId: process.env.STRIPE_PRO_PRICE_ID || process.env.VITE_STRIPE_PRO_PRICE_ID || '',
    limits: {
      clients: Infinity,
      projects: Infinity,
      invoices: Infinity,
      ai: true,
      portal: true,
      stripe_payments: true,
    }
  }
}

export type PlanId = keyof typeof PLANS

export function getPlanFromPriceId(priceId: string): 'pro' | null {
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID || process.env.VITE_STRIPE_PRO_PRICE_ID;
  if (priceId === proPriceId) return 'pro';
  return null;
}

export async function getOrCreateStripeCustomer(
  uid: string,
  email: string,
  name: string
): Promise<string> {
  const { adminDb } = await import('../firebase/admin')
  
  const userDoc = await adminDb
    .collection('users')
    .doc(uid)
    .get()
  
  const userData = userDoc.data()
  
  if (userData?.stripeCustomerId) {
    return userData.stripeCustomerId
  }
  
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { firebaseUID: uid }
  })
  
  await adminDb
    .collection('users')
    .doc(uid)
    .update({ stripeCustomerId: customer.id })
  
  return customer.id
}

export async function createCheckoutSession({
  uid,
  email,
  name,
  priceId,
  successUrl,
  cancelUrl,
}: {
  uid: string
  email: string
  name: string
  priceId: string
  successUrl: string
  cancelUrl: string
}) {
  const customerId = await getOrCreateStripeCustomer(uid, email, name)
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { firebaseUID: uid }
    },
    metadata: { firebaseUID: uid },
    billing_address_collection: 'auto',
    customer_update: {
      address: 'auto',
      name: 'auto',
    }
  })
  
  return session
}

export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
  return session
}

export function constructWebhookEvent(
  body: string,
  signature: string
) {
  return stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || ''
  )
}
