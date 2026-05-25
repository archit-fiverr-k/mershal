import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import { errorResponse, jsonResponse, verifyAuth } from "../../lib/firebase/middleware";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export const Route = createFileRoute("/api/portal/$token/presence")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const { token } = params;
          const body = await request.json() as { role?: string };
          const role = body.role;

          if (role !== "client" && role !== "agency") {
            return errorResponse("Invalid role", 400);
          }

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

          const clientRef = adminDb.doc(`users/${userId}/clients/${clientId}`);
          const updateData: Record<string, any> = {};

          if (role === "client") {
            updateData.lastClientActiveAt = FieldValue.serverTimestamp();
          } else {
            updateData.lastAgencyActiveAt = FieldValue.serverTimestamp();
          }

          await clientRef.update(updateData);

          // Get updated client snapshot to return the current presence state of the other party
          const updatedSnap = await clientRef.get();
          const data = updatedSnap.data() || {};

          return jsonResponse({
            success: true,
            lastClientActiveAt: data.lastClientActiveAt || null,
            lastAgencyActiveAt: data.lastAgencyActiveAt || null,
          });
        } catch (err) {
          console.error("[POST /api/portal/$token/presence]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
