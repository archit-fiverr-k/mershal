import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import { errorResponse, jsonResponse } from "../../lib/firebase/middleware";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

const whiteboardSchema = z.object({
  strokes: z.array(z.any()),
});

export const Route = createFileRoute("/api/portal/$token/whiteboard")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
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

          const whiteboardSnap = await adminDb
            .doc(`users/${userId}/clients/${clientId}/whiteboard/data`)
            .get();

          if (whiteboardSnap.exists) {
            return jsonResponse(whiteboardSnap.data());
          }

          return jsonResponse({ strokes: [] });
        } catch (err) {
          console.error("[GET /api/portal/$token/whiteboard]", err);
          return errorResponse("Internal server error");
        }
      },
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
          const parsed = whiteboardSchema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(parsed.error.message, 400);
          }

          await adminDb
            .doc(`users/${userId}/clients/${clientId}/whiteboard/data`)
            .set({
              strokes: parsed.data.strokes,
              updatedAt: FieldValue.serverTimestamp(),
              updatedBy: "client",
            });

          return jsonResponse({ success: true });
        } catch (err) {
          console.error("[POST /api/portal/$token/whiteboard]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
