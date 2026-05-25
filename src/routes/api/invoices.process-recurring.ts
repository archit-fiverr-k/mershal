/**
 * /api/invoices/process-recurring
 *
 * Called by a Cloudflare Cron Trigger daily at 9am UTC.
 * Finds all due recurring invoices and creates new drafts for them.
 *
 * Wrangler cron config (add to wrangler.jsonc):
 *   "triggers": { "crons": ["0 9 * * *"] }
 */
import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { jsonResponse, errorResponse } from "../../lib/firebase/middleware";
import { sendInvoiceEmail } from "../../lib/email";
import { addTimelineEvent } from "../../lib/timeline";

function addInterval(
  date: Date,
  interval: "weekly" | "monthly" | "quarterly",
): Date {
  const d = new Date(date);
  if (interval === "weekly") d.setDate(d.getDate() + 7);
  else if (interval === "monthly") d.setMonth(d.getMonth() + 1);
  else if (interval === "quarterly") d.setMonth(d.getMonth() + 3);
  return d;
}

export const Route = createFileRoute("/api/invoices/process-recurring")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Validate cron secret (simple guard)
        const cronSecret = request.headers.get("x-cron-secret");
        if (
          process.env.CRON_SECRET &&
          cronSecret !== process.env.CRON_SECRET
        ) {
          return errorResponse("Unauthorized", 401);
        }

        try {
          const now = new Date();
          const nowTimestamp = Timestamp.fromDate(now);

          // Query ALL users' invoices that are due for recurrence
          // We use a collection group query across all users
          const snap = await adminDb
            .collectionGroup("invoices")
            .where("isRecurring", "==", true)
            .where("recurringNextDate", "<=", nowTimestamp)
            .get();

          const processed: string[] = [];

          for (const doc of snap.docs) {
            const inv = doc.data();

            // Skip cancelled invoices
            if (inv.status === "cancelled") continue;

            // Check if past end date
            if (inv.recurringEndDate) {
              const endDate = inv.recurringEndDate.toDate?.() ?? inv.recurringEndDate;
              if (now > endDate) continue;
            }

            // Determine uid from path: users/{uid}/invoices/{invoiceId}
            const pathParts = doc.ref.path.split("/");
            const uid = pathParts[1];

            // Build due date (today + 30 days)
            const newDueDate = new Date(now);
            newDueDate.setDate(newDueDate.getDate() + 30);

            // Auto-generate next invoice number
            const countSnap = await adminDb
              .collection(`users/${uid}/invoices`)
              .count()
              .get();
            const count = countSnap.data().count + 1;
            const invoiceNumber = `INV-${String(count).padStart(4, "0")}`;

            // Fetch client
            const clientSnap = await adminDb
              .doc(`users/${uid}/clients/${inv.clientId}`)
              .get();
            const clientData = clientSnap.exists ? clientSnap.data() : null;
            const clientEmail = clientData?.email ?? "";
            const clientName = clientData?.name ?? "Client";

            // Fetch user (freelancer) workspace profile
            const userSnap = await adminDb.doc(`users/${uid}`).get();
            const userData = userSnap.exists ? userSnap.data() : null;
            const workspaceName = userData?.workspaceName ?? "Our Agency";
            const freelancerEmail = userData?.email ?? "";

            // Create new invoice (status is sent since we email it)
            const newInvoice = {
              clientId:     inv.clientId,
              projectId:    inv.projectId ?? "",
              invoiceNumber,
              status:       "sent",
              issueDate:    Timestamp.fromDate(now),
              dueDate:      Timestamp.fromDate(newDueDate),
              items:        inv.items ?? [],
              subtotal:     inv.subtotal ?? 0,
              taxRate:      inv.taxRate ?? 0,
              taxAmount:    inv.taxAmount ?? 0,
              total:        inv.total ?? 0,
              notes:        inv.notes ?? "",
              isRecurring:       true,
              recurringInterval: inv.recurringInterval,
              recurringNextDate: null,
              recurringEndDate:  inv.recurringEndDate ?? null,
              recurringParentId: doc.id,
              stripePaymentIntentId: "",
              paidAt:      null,
              createdAt:   FieldValue.serverTimestamp(),
              updatedAt:   FieldValue.serverTimestamp(),
            };

            const invoiceRef = await adminDb.collection(`users/${uid}/invoices`).add(newInvoice);

            // Send invoice email automatically
            if (clientEmail) {
              try {
                // Generate portal token
                const tokenRef = adminDb.collection("portalTokens").doc();
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 30);
                
                await tokenRef.set({
                  clientId: inv.clientId,
                  userId: uid,
                  expiresAt: expiresAt,
                  createdAt: new Date(),
                });
                
                const appUrl = process.env.VITE_APP_URL ?? "https://mershal.in";
                const portalUrl = `${appUrl}/portal/${tokenRef.id}`;
                
                await sendInvoiceEmail(
                  clientEmail,
                  clientName,
                  invoiceNumber,
                  inv.total ?? 0,
                  portalUrl,
                  workspaceName,
                  freelancerEmail
                );

                // Timeline: invoice_sent
                await addTimelineEvent(uid, inv.clientId, {
                  type: "invoice_sent",
                  title: "Invoice sent",
                  description: `Invoice ${invoiceNumber} ($${(inv.total ?? 0).toLocaleString()}) was sent automatically (recurring bill)`,
                  metadata: { invoiceId: invoiceRef.id },
                }).catch(console.error);
              } catch (emailErr) {
                console.error(`[process-recurring] Error sending email for ${invoiceNumber}:`, emailErr);
              }
            }

            // Update the original invoice's next recurring date
            const nextDate = addInterval(
              inv.recurringNextDate.toDate?.() ?? now,
              inv.recurringInterval,
            );
            await doc.ref.update({
              recurringNextDate: Timestamp.fromDate(nextDate),
              updatedAt: FieldValue.serverTimestamp(),
            });

            // Create notification for the user
            const { createNotification } = await import("../../lib/notifications");
            await createNotification(uid, {
              type: "recurring_created",
              title: "Recurring invoice created & sent",
              body: `Auto-created & sent ${invoiceNumber} to ${clientName}`,
              link: `/dashboard/invoices`,
              metadata: { invoiceNumber },
            });

            processed.push(invoiceNumber);
          }

          return jsonResponse({
            success: true,
            processed: processed.length,
            invoices: processed,
          });
        } catch (err: unknown) {
          console.error("[POST /api/invoices/process-recurring]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
