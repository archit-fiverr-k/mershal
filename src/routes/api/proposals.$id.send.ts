/**
 * /api/proposals/:id/send
 * Send a proposal to client via email with a unique public link.
 */
import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { FieldValue } from "firebase-admin/firestore";
import { sendProposalEmail } from "../../lib/email/index";

export const Route = createFileRoute("/api/proposals/$id/send")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id } = params;

          const proposalSnap = await adminDb
            .doc(`users/${decoded.uid}/proposals/${id}`)
            .get();
          if (!proposalSnap.exists) return errorResponse("Proposal not found", 404);

          const proposal = proposalSnap.data() as Record<string, unknown>;

          // Fetch client
          const clientSnap = await adminDb
            .doc(`users/${decoded.uid}/clients/${proposal.clientId}`)
            .get();
          if (!clientSnap.exists) return errorResponse("Client not found", 404);

          const client = clientSnap.data() as Record<string, unknown>;

          const appUrl = process.env.VITE_APP_URL ?? "https://mershal.in";
          const proposalUrl = `${appUrl}/proposal/${proposal.publicToken}`;

          // Fetch freelancer user settings/profile
          const userSnap = await adminDb.doc(`users/${decoded.uid}`).get();
          const userData = userSnap.data() as Record<string, unknown>;
          const workspaceName = (userData?.workspaceName as string) ?? "Mershal Workspace";
          const freelancerEmail = (userData?.email as string) ?? "";

          // Send email
          await sendProposalEmail(
            client.email as string,
            client.name as string,
            proposal.title as string,
            proposalUrl,
            workspaceName,
            freelancerEmail,
          );

          // Mark as sent + add timeline event
          await proposalSnap.ref.update({
            status: "sent",
            updatedAt: FieldValue.serverTimestamp(),
          });

          // Timeline: proposal_sent
          const { addTimelineEvent } = await import("../../lib/timeline");
          addTimelineEvent(decoded.uid, proposal.clientId as string, {
            type: "proposal_sent",
            title: "Proposal sent",
            description: `Proposal "${proposal.title}" was sent to ${client.name}`,
            metadata: { proposalId: id },
          }).catch(console.error);

          return jsonResponse({ success: true, proposalUrl });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError")
            return unauthorizedResponse();
          console.error("[POST /api/proposals/$id/send]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
