import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import { errorResponse, jsonResponse, verifyAuth } from "../../lib/firebase/middleware";
import { Timestamp } from "firebase-admin/firestore";

export const Route = createFileRoute("/api/portal/$token")({
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

          const clientSnap = await adminDb.doc(`users/${userId}/clients/${clientId}`).get();
          if (!clientSnap.exists) {
            return errorResponse("Client not found", 404);
          }

          // Check if caller is workspace owner
          let isOwner = false;
          try {
            const decoded = await verifyAuth(request);
            if (decoded && decoded.uid === userId) {
              isOwner = true;
            }
          } catch (authErr) {
            // Not logged in or not the owner
          }

          if (!isOwner) {
            let portalPassword = clientSnap.data()?.portalPassword;
            if (!portalPassword) {
              const { generateSecurePassword } = await import("../../lib/email");
              portalPassword = generateSecurePassword(clientSnap.data()?.name || "Client");
              await adminDb.doc(`users/${userId}/clients/${clientId}`).update({
                portalPassword,
              });
            }

            const url = new URL(request.url);
            const reqPassword = request.headers.get("x-portal-password") || url.searchParams.get("password");

            if (!reqPassword) {
              return errorResponse("Password required", 401);
            }
            if (reqPassword !== portalPassword) {
              return errorResponse("Incorrect password", 401);
            }
          }

          const [projectsSnap, invoicesSnap, messagesSnap] = await Promise.all([
            adminDb
              .collection(`users/${userId}/projects`)
              .where("clientId", "==", clientId)
              .get(),
            adminDb
              .collection(`users/${userId}/invoices`)
              .where("clientId", "==", clientId)
              .get(),
            adminDb
              .collection(`users/${userId}/clients/${clientId}/messages`)
              .orderBy("createdAt", "asc")
              .get(),
          ]);

          const projectIds = projectsSnap.docs.map((d) => d.id);
          let tasks: any[] = [];
          if (projectIds.length > 0) {
            const tasksSnap = await adminDb
              .collection(`users/${userId}/tasks`)
              .where("projectId", "in", projectIds.slice(0, 10))
              .get();
            tasks = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
            tasks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          }

          const ownerSnap = await adminDb.doc(`users/${userId}`).get();
          const ownerData = ownerSnap.exists ? ownerSnap.data() : null;

          const trialEndsAt = ownerData?.trialEndsAt;
          const isTrialActive = trialEndsAt && trialEndsAt.toDate() > new Date();
          const isPro = (ownerData?.plan === "pro" && ownerData?.subscriptionStatus === "active") || !!isTrialActive;

          const paymentGateway = {
            activeGateway: ownerData?.activePaymentGateway ?? "none",
            stripePublishableKey: ownerData?.stripePublishableKey ?? "",
            razorpayKeyId: ownerData?.razorpayKeyId ?? "",
            isPro,
          };

          return jsonResponse({
            client: { id: clientSnap.id, ...clientSnap.data() },
            projects: projectsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
            invoices: invoicesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
            messages: messagesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
            tasks,
            paymentGateway,
          });
        } catch (err) {
          console.error("[GET /api/portal/$token]", err);
          return errorResponse("Internal server error");
        }
      },
      POST: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { token } = params;

          const clientSnap = await adminDb.doc(`users/${decoded.uid}/clients/${token}`).get();
          if (!clientSnap.exists) {
            return errorResponse("Client not found", 404);
          }

          const tokenRef = adminDb.collection("portalTokens").doc();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          await tokenRef.set({
            clientId: token,
            userId: decoded.uid,
            expiresAt: expiresAt,
            createdAt: new Date(),
          });

          const appUrl = process.env.VITE_APP_URL ?? request.headers.get("origin") ?? "http://localhost:5173";
          const portalUrl = `${appUrl}/portal/${tokenRef.id}`;

          return jsonResponse({ portalUrl });
        } catch (err) {
          console.error("[POST /api/portal/$token]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
