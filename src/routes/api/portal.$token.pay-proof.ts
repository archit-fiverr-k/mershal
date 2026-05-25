import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import { errorResponse, jsonResponse } from "../../lib/firebase/middleware";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

const payProofSchema = z.object({
  invoiceId: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.string().min(1),
});

export const Route = createFileRoute("/api/portal/$token/pay-proof")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const { token } = params;
          let clientId = "";
          let userId = "";

          const tokenSnap = await adminDb.doc(`portalTokens/${token}`).get();
          if (tokenSnap.exists) {
            const tokenData = tokenSnap.data() as {
              clientId: string;
              userId: string;
              expiresAt: Timestamp;
            };

            if (tokenData.expiresAt.toDate() < new Date()) {
              return errorResponse("Portal link has expired", 410);
            }

            clientId = tokenData.clientId;
            userId = tokenData.userId;
          } else {
            // Check if user is logged in as the agency owner of this client
            try {
              const { verifyAuth } = await import("../../lib/firebase/middleware");
              const decoded = await verifyAuth(request);
              const clientSnap = await adminDb.doc(`users/${decoded.uid}/clients/${token}`).get();
              if (clientSnap.exists) {
                clientId = token;
                userId = decoded.uid;
              } else {
                return errorResponse("Invalid portal link or client ID", 404);
              }
            } catch (authErr) {
              return errorResponse("Invalid portal link", 404);
            }
          }

          const body = await request.json();
          const parsed = payProofSchema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(parsed.error.message, 400);
          }

          const { invoiceId, fileName, fileSize } = parsed.data;

          const invoiceDocRef = adminDb.doc(`users/${userId}/invoices/${invoiceId}`);
          const invoiceSnap = await invoiceDocRef.get();
          if (!invoiceSnap.exists) {
            return errorResponse("Invoice not found", 404);
          }

          const invoice = invoiceSnap.data() as Record<string, any>;
          if (invoice.status === "paid") {
            return errorResponse("Invoice is already paid", 400);
          }

          const proofObj = {
            name: fileName,
            size: fileSize,
            date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          };

          await invoiceDocRef.update({
            status: "pending_verification",
            paymentProof: proofObj,
            paymentProofSubmittedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });

          // Append audit log message to chat
          await adminDb
            .collection(`users/${userId}/clients/${clientId}/messages`)
            .add({
              content: `📄 Submitted payment proof for Invoice ${invoice.invoiceNumber}: "${fileName}" (${fileSize})`,
              senderName: "System (Client Action)",
              fromClient: true,
              createdAt: FieldValue.serverTimestamp(),
            });

          return jsonResponse({ success: true, paymentProof: proofObj });
        } catch (err) {
          console.error("[POST /api/portal/$token/pay-proof]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
