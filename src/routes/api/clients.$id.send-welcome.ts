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

export const Route = createFileRoute("/api/clients/$id/send-welcome")({
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
          let token = clientData.portalToken;
          let password = clientData.portalPassword;

          const { generateSecurePassword, sendClientWelcomeEmail } = await import("../../lib/email");
          const updates: Record<string, any> = {};

          // If no token exists yet, generate a new one
          if (!token) {
            token = `${crypto.randomUUID()}-${clientId.slice(0, 8)}`;
            updates.portalToken = token;

            // Create document in portalTokens/{token}
            await adminDb.doc(`portalTokens/${token}`).set({
              token,
              clientId,
              userId: decoded.uid,
              createdAt: FieldValue.serverTimestamp(),
              expiresAt: null, // welcome portal links never expire
            });
          }

          // If no password exists yet, generate a new one
          if (!password) {
            password = generateSecurePassword(clientData.name || "Client");
            updates.portalPassword = password;
          }

          if (Object.keys(updates).length > 0) {
            await adminDb.doc(`users/${decoded.uid}/clients/${clientId}`).update({
              ...updates,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }

          // Fetch freelancer user settings/profile from users/{userId}
          const userSnap = await adminDb.doc(`users/${decoded.uid}`).get();
          const userData = userSnap.exists ? userSnap.data() : null;

          const freelancerName = userData?.fullName || "Your Freelancer";
          const freelancerEmail = userData?.email || "";
          const workspaceName = userData?.workspaceName || "Mershal Workspace";
          const appUrl = process.env.VITE_APP_URL ?? request.headers.get("origin") ?? "https://mershal.in";
          const portalUrl = `${appUrl}/portal/${token}`;

          // Send welcome email
          await sendClientWelcomeEmail(
            clientData.email,
            clientData.name,
            freelancerName,
            freelancerEmail,
            workspaceName,
            portalUrl,
            password,
            clientData.notes
          );

          // Timeline event for email sent
          const { addTimelineEvent } = await import("../../lib/timeline");
          await addTimelineEvent(decoded.uid, clientId, {
            type: "portal_link_shared",
            title: "Welcome Email Sent",
            description: `Welcome email with portal link sent to ${clientData.name} (${clientData.email})`,
          }).catch(console.error);

          return jsonResponse({ success: true });
        } catch (err: any) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[POST /api/clients/$id/send-welcome] failed:", err);
          return errorResponse(err.message || "Failed to send welcome email", 500);
        }
      },
    },
  },
});
