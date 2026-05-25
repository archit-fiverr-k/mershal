# Mershal — Deployment Guide

## 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com) and create a new project.
2. Enable **Authentication**:
   - Go to Authentication → Sign-in method
   - Enable **Email/Password**
   - Enable **Google** (add your domain to authorized domains)
3. Enable **Firestore Database**:
   - Create database in production mode
   - Choose a region close to your users
4. Enable **Storage**:
   - Go to Storage → Get started
   - Choose the same region as Firestore

---

## 2. Firebase Admin Service Account

1. Go to Project Settings → Service Accounts
2. Click **Generate new private key** → Download JSON
3. Extract these values from the JSON:
   - `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY`
   - `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `project_id` → `FIREBASE_PROJECT_ID`

---

## 3. Firestore Security Rules

Deploy the security rules to deny all direct client access:

```bash
firebase deploy --only firestore:rules
```

This ensures all data access goes through the Admin SDK in API routes.

---

## 4. Stripe Setup

1. Create a [Stripe account](https://stripe.com) and go to the Dashboard.
2. Create two products:
   - **Mershal Pro** — $19/month recurring → copy the Price ID
   - **Mershal Agency** — $49/month recurring → copy the Price ID
3. Set up a webhook:
   - Go to Developers → Webhooks → Add endpoint
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

---

## 5. Resend Setup

1. Create a [Resend account](https://resend.com)
2. Add and verify your sending domain
3. Create an API key → `RESEND_API_KEY`
4. Set `RESEND_FROM_EMAIL` to your verified sender (e.g., `Mershal <noreply@yourdomain.com>`)

---

## 6. OpenAI Setup

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Create an API key → `OPENAI_API_KEY`

---

## 7. Vercel Environment Variables

Set all of the following in your Vercel project settings (Settings → Environment Variables):

### Firebase Client (public — prefix with VITE_)
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Firebase Admin (server-only — no VITE_ prefix)
```
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PROJECT_ID=your-project-id
```

> **Important:** The private key must have literal `\n` characters (not actual newlines) when set in Vercel. The admin SDK handles the conversion.

### Stripe
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_AGENCY_PRICE_ID=price_...
```

### Stripe (public — for frontend checkout)
```
VITE_STRIPE_PRO_PRICE_ID=price_...
VITE_STRIPE_AGENCY_PRICE_ID=price_...
```

### OpenAI
```
OPENAI_API_KEY=sk-...
```

### Resend
```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Mershal <noreply@yourdomain.com>
```

### App URL
```
VITE_APP_URL=https://your-domain.com
```

---

## 8. Cloudflare Workers (wrangler.jsonc)

If deploying to Cloudflare Workers instead of Vercel, add secrets via:

```bash
wrangler secret put FIREBASE_ADMIN_PRIVATE_KEY
wrangler secret put FIREBASE_ADMIN_CLIENT_EMAIL
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put OPENAI_API_KEY
wrangler secret put RESEND_API_KEY
```

And set public vars in `wrangler.jsonc`:
```jsonc
{
  "vars": {
    "VITE_FIREBASE_PROJECT_ID": "your-project-id",
    "FIREBASE_PROJECT_ID": "your-project-id"
  }
}
```

---

## 9. Post-Deploy Smoke Test Checklist

- [ ] Visit `/signup` — create a new account with email/password
- [ ] Check Firebase Console → Authentication → Users (new user should appear)
- [ ] Check Firestore → `users/{uid}` document was created
- [ ] Check welcome email was received (Resend logs)
- [ ] Visit `/dashboard` — stats load without errors
- [ ] Create a client → appears in `/dashboard/clients`
- [ ] Create a project → appears in `/dashboard/projects`
- [ ] Create an invoice → appears in `/dashboard/invoices`
- [ ] Send invoice → client receives email with portal link
- [ ] Visit portal link → client data loads correctly
- [ ] Open AI chat → send a message → streaming response appears
- [ ] Go to Settings → Billing → click Upgrade → Stripe Checkout opens
- [ ] Complete test payment → plan updates to "pro" in Firestore
- [ ] Stripe webhook fires → check Stripe Dashboard → Webhooks → recent events

---

## 10. Firebase Indexes Required

Create these composite indexes in Firestore (Console → Indexes → Composite):

| Collection | Fields | Order |
|---|---|---|
| `users/{uid}/projects` | `status` ASC, `createdAt` DESC | — |
| `users/{uid}/tasks` | `projectId` ASC, `position` ASC | — |
| `users/{uid}/tasks` | `projectId` ASC, `status` ASC | — |
| `users/{uid}/invoices` | `clientId` ASC, `createdAt` DESC | — |
| `users/{uid}/invoices` | `status` ASC, `createdAt` DESC | — |
| `users/{uid}/conversations/{id}/messages` | `createdAt` ASC | — |

Or deploy via `firebase.json` with the Firestore indexes configuration.
