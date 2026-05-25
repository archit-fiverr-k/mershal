import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import { errorResponse, jsonResponse, verifyAuth } from "../../lib/firebase/middleware";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

const approveSchema = z.object({
  milestoneId: z.string(),
});

export const Route = createFileRoute("/api/portal/$token/approve")({
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
          const parsed = approveSchema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(parsed.error.message, 400);
          }

          // Fetch project to update status or log
          const projectsSnap = await adminDb
            .collection(`users/${userId}/projects`)
            .where("clientId", "==", clientId)
            .limit(1)
            .get();

          if (!projectsSnap.empty) {
            const projectDoc = projectsSnap.docs[0];
            await projectDoc.ref.update({
              approvalStatus: "approved",
              approvalMilestoneId: parsed.data.milestoneId,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }

          // Try to find the task and update its status to "done" in Firestore
          let milestoneName = parsed.data.milestoneId;
          try {
            const taskRef = adminDb.doc(`users/${userId}/tasks/${parsed.data.milestoneId}`);
            const taskSnap = await taskRef.get();
            if (taskSnap.exists) {
              milestoneName = taskSnap.data()?.title || milestoneName;
              await taskRef.update({
                status: "done",
                updatedAt: FieldValue.serverTimestamp(),
              });
            }
          } catch (taskErr) {
            console.error("Error updating task status to done:", taskErr);
          }

          // Append audit log message to chat
          await adminDb
            .collection(`users/${userId}/clients/${clientId}/messages`)
            .add({
              content: `✅ Approved milestone: "${milestoneName}"`,
              senderName: fromClient ? "System (Client Action)" : "System (Owner Action)",
              fromClient,
              createdAt: FieldValue.serverTimestamp(),
            });

          return jsonResponse({ success: true });
        } catch (err) {
          console.error("[POST /api/portal/$token/approve]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
