import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import { errorResponse, jsonResponse, verifyAuth } from "../../lib/firebase/middleware";
import { portalMessageSchema } from "../../lib/validations";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export const Route = createFileRoute("/api/portal/$token/message")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const { token } = params;
          let clientId = "";
          let userId = "";
          let fromClient = true;

          const tokenSnap = await adminDb.doc(`portalTokens/${token}`).get();
          if (tokenSnap.exists) {
            const tokenData = tokenSnap.data() as {
              clientId: string;
              userId: string;
              expiresAt: Timestamp;
            };

            if (tokenData.expiresAt && tokenData.expiresAt.toDate() < new Date()) {
              return errorResponse("Portal link has expired", 410);
            }

            clientId = tokenData.clientId;
            userId = tokenData.userId;
          } else {
            // Check if user is logged in as the agency owner of this client
            try {
              const decoded = await verifyAuth(request);
              const clientSnap = await adminDb.doc(`users/${decoded.uid}/clients/${token}`).get();
              if (clientSnap.exists) {
                clientId = token;
                userId = decoded.uid;
                fromClient = false;
              } else {
                return errorResponse("Invalid portal link or client ID", 404);
              }
            } catch (authErr) {
              return errorResponse("Invalid portal link", 404);
            }
          }

          const body = await request.json();
          const parsed = portalMessageSchema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(parsed.error.message, 400);
          }

          await adminDb
            .collection(`users/${userId}/clients/${clientId}/messages`)
            .add({
              content: parsed.data.content,
              senderName: parsed.data.senderName,
              fromClient,
              createdAt: FieldValue.serverTimestamp(),
            });

          // Create Firestore notification only for messages from the client
          if (fromClient) {
            const { createNotification } = await import("../../lib/notifications");
            await createNotification(userId, {
              type: "client_message",
              title: "New message from client",
              body: `${parsed.data.senderName}: "${parsed.data.content.slice(0, 80)}${parsed.data.content.length > 80 ? "…" : ""}"`,
              link: `/dashboard/clients`,
              metadata: { clientId },
            }).catch(console.error);
          }

          return jsonResponse({ success: true });
        } catch (err) {
          console.error("[POST /api/portal/$token/message]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
