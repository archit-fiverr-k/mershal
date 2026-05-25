import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

export const Route = createFileRoute("/api/clients/$id/regenerate-portal")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id: clientId } = params;

          // Fetch the client document
          const clientSnap = await adminDb
            .doc(`users/${decoded.uid}/clients/${clientId}`)
            .get();

          if (!clientSnap.exists) {
            return errorResponse("Client not found", 404);
          }

          const clientData = clientSnap.data() || {};
          const oldToken = clientData.portalToken;

          // Generate a new portal token
          const newToken = `${crypto.randomUUID()}-${clientId.slice(0, 8)}`;

          const { generateSecurePassword } = await import("../../lib/email");
          const newPassword = generateSecurePassword(clientData.name || "Client");

          // Create document in portalTokens/{newToken}
          await adminDb.doc(`portalTokens/${newToken}`).set({
            token: newToken,
            clientId,
            userId: decoded.uid,
            createdAt: FieldValue.serverTimestamp(),
            expiresAt: null, // welcome portal links never expire
          });

          // Link new token and password to client
          await adminDb.doc(`users/${decoded.uid}/clients/${clientId}`).update({
            portalToken: newToken,
            portalPassword: newPassword,
            updatedAt: FieldValue.serverTimestamp(),
          });

          // Delete the old token to invalidate it
          if (oldToken) {
            await adminDb
              .doc(`portalTokens/${oldToken}`)
              .delete()
              .catch((deleteErr) => {
                console.error(`Failed to delete old portal token ${oldToken}:`, deleteErr);
              });
          }

          // Add timeline event
          const { addTimelineEvent } = await import("../../lib/timeline");
          await addTimelineEvent(decoded.uid, clientId, {
            type: "portal_link_shared",
            title: "Portal Link Regenerated",
            description: `A new secure client portal link was generated. The previous link is now invalid.`,
          }).catch(console.error);

          const appUrl = process.env.VITE_APP_URL ?? request.headers.get("origin") ?? "https://mershal.in";
          const portalUrl = `${appUrl}/portal/${newToken}`;

          return jsonResponse({ success: true, portalToken: newToken, portalUrl, portalPassword: newPassword });
        } catch (err: any) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[POST /api/clients/$id/regenerate-portal] failed:", err);
          return errorResponse(err.message || "Failed to regenerate portal link", 500);
        }
      },
    },
  },
});
