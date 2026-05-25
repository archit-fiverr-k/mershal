import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { createInvoiceSchema } from "../../lib/validations";
import { checkLimit, getLimitResponse, LimitError } from "../../lib/limits";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { sendInvoiceEmail } from "../../lib/email";
import { addTimelineEvent } from "../../lib/timeline";

export const Route = createFileRoute("/api/invoices")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          const url = new URL(request.url);
          const status = url.searchParams.get("status") ?? "";
          const clientId = url.searchParams.get("clientId") ?? "";

          let query = adminDb
            .collection(`users/${decoded.uid}/invoices`)
            .orderBy("createdAt", "desc") as FirebaseFirestore.Query;

          if (status) {
            query = query.where("status", "==", status);
          }
          if (clientId) {
            query = query.where("clientId", "==", clientId);
          }

          const snap = await query.get();
          const invoices = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          return jsonResponse({ invoices });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[GET /api/invoices]", err);
          return errorResponse("Internal server error");
        }
      },

      POST: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          const existingInvoices = await adminDb
            .collection("users")
            .doc(decoded.uid)
            .collection("invoices")
            .count()
            .get();

          const invoiceCount = existingInvoices.data().count;

          const limitCheck = await checkLimit(decoded.uid, "invoices", invoiceCount);
          if (!limitCheck.allowed) {
            return getLimitResponse("invoices");
          }

          const body = await request.json();
          const parsed = createInvoiceSchema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(parsed.error.message, 400);
          }

          // Auto-generate invoice number
          const countSnap = await adminDb
            .collection(`users/${decoded.uid}/invoices`)
            .count()
            .get();
          const count = countSnap.data().count + 1;
          const invoiceNumber = `INV-${String(count).padStart(4, "0")}`;

          const isRecurring = parsed.data.isRecurring ?? false;
          // By default, if not recurring, set status to sent (since we'll email it).
          // If recurring, keep the parsed status (usually draft).
          const initialStatus = isRecurring ? (parsed.data.status ?? "draft") : "sent";

          const data = {
            ...parsed.data,
            invoiceNumber,
            status: initialStatus,
            issueDate: parsed.data.issueDate
              ? Timestamp.fromDate(new Date(parsed.data.issueDate))
              : Timestamp.now(),
            dueDate: parsed.data.dueDate
              ? Timestamp.fromDate(new Date(parsed.data.dueDate))
              : null,
            // Recurring fields
            isRecurring,
            recurringInterval: parsed.data.recurringInterval ?? null,
            recurringNextDate: parsed.data.recurringNextDate
              ? Timestamp.fromDate(new Date(parsed.data.recurringNextDate))
              : null,
            recurringEndDate: parsed.data.recurringEndDate
              ? Timestamp.fromDate(new Date(parsed.data.recurringEndDate))
              : null,
            recurringParentId: parsed.data.recurringParentId ?? null,
            stripePaymentIntentId: "",
            paidAt: null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };

          const ref = await adminDb
            .collection(`users/${decoded.uid}/invoices`)
            .add(data);

          // If standard invoice (not recurring parent template), send invoice email automatically!
          if (!isRecurring) {
            try {
              // Fetch client
              const clientSnap = await adminDb
                .doc(`users/${decoded.uid}/clients/${parsed.data.clientId}`)
                .get();

              if (clientSnap.exists) {
                const client = clientSnap.data() as Record<string, any>;

                // Fetch workspace / agency name & email
                const userSnap = await adminDb.doc(`users/${decoded.uid}`).get();
                const userData = userSnap.data() as Record<string, any>;
                const workspaceName = userData?.workspaceName ?? "Our Agency";
                const freelancerEmail = userData?.email ?? "";

                // Generate portal token
                const tokenRef = adminDb.collection("portalTokens").doc();
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 30);

                await tokenRef.set({
                  clientId: parsed.data.clientId,
                  userId: decoded.uid,
                  expiresAt: expiresAt,
                  createdAt: new Date(),
                });

                const appUrl = process.env.VITE_APP_URL ?? "https://mershal.in";
                const portalUrl = `${appUrl}/portal/${tokenRef.id}`;

                await sendInvoiceEmail(
                  client.email,
                  client.name,
                  invoiceNumber,
                  parsed.data.total,
                  portalUrl,
                  workspaceName,
                  freelancerEmail
                );

                // Timeline: invoice_sent
                await addTimelineEvent(decoded.uid, parsed.data.clientId, {
                  type: "invoice_sent",
                  title: "Invoice sent",
                  description: `Invoice ${invoiceNumber} ($${parsed.data.total.toLocaleString()}) was sent automatically upon creation`,
                  metadata: { invoiceId: ref.id },
                }).catch(console.error);
              }
            } catch (emailErr) {
              console.error("[POST /api/invoices] Error sending automatic email:", emailErr);
              // Do not fail the request if only the email sending fails (keeps app robust)
            }
          }

          return jsonResponse({ id: ref.id, invoiceNumber, ...parsed.data, status: initialStatus }, 201);
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          if (err instanceof LimitError) {
            return errorResponse(err.message, 403);
          }
          console.error("[POST /api/invoices]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
