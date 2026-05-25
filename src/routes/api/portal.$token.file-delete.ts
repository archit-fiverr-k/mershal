import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import { errorResponse, jsonResponse, verifyAuth } from "../../lib/firebase/middleware";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

const fileDeleteSchema = z.object({
  name: z.string().min(1),
  size: z.string(),
  date: z.string(),
});

export const Route = createFileRoute("/api/portal/$token/file-delete")({
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
              } else {
                return errorResponse("Invalid portal link or client ID", 404);
              }
            } catch (authErr) {
              return errorResponse("Invalid portal link", 404);
            }
          }

          const body = await request.json();
          const parsed = fileDeleteSchema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(parsed.error.message, 400);
          }

          const fileObj = {
            name: parsed.data.name,
            size: parsed.data.size,
            date: parsed.data.date,
          };

          // Remove from client's files array
          await adminDb.doc(`users/${userId}/clients/${clientId}`).update({
            files: FieldValue.arrayRemove(fileObj),
          });

          return jsonResponse({ success: true });
        } catch (err) {
          console.error("[POST /api/portal/$token/file-delete]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
