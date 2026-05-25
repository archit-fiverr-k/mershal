import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { createClientSchema } from "../../lib/validations";
import { checkLimit, getLimitResponse } from "../../lib/limits";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

export const Route = createFileRoute("/api/clients")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          const url = new URL(request.url);
          const search = url.searchParams.get("search")?.toLowerCase() ?? "";
          const status = url.searchParams.get("status") ?? "";
          const page = parseInt(url.searchParams.get("page") ?? "1", 10);
          const limit = 20;

          let query = adminDb
            .collection(`users/${decoded.uid}/clients`)
            .orderBy("createdAt", "desc")
            .limit(limit)
            .offset((page - 1) * limit);

          if (status) {
            query = query.where("status", "==", status) as typeof query;
          }

          const snap = await query.get();
          let clients = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

          if (search) {
            clients = clients.filter(
              (c: Record<string, unknown>) =>
                (c.name as string)?.toLowerCase().includes(search) ||
                (c.company as string)?.toLowerCase().includes(search) ||
                (c.email as string)?.toLowerCase().includes(search),
            );
          }

          return jsonResponse({ clients, page, hasMore: snap.docs.length === limit });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[GET /api/clients]", err);
          return errorResponse("Internal server error");
        }
      },

      POST: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          const existingClients = await adminDb
            .collection("users")
            .doc(decoded.uid)
            .collection("clients")
            .count()
            .get();

          const clientCount = existingClients.data().count;

          const limitCheck = await checkLimit(decoded.uid, "clients", clientCount);
          if (!limitCheck.allowed) {
            return getLimitResponse("clients");
          }

          const body = await request.json();
          const parsed = createClientSchema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(parsed.error.message, 400);
          }

          // Generate a portal password
          const { generateSecurePassword, sendClientWelcomeEmail } = await import("../../lib/email");
          const generatedPassword = generateSecurePassword(parsed.data.name);

          const ref = await adminDb
            .collection(`users/${decoded.uid}/clients`)
            .add({
              ...parsed.data,
              portalPassword: generatedPassword,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });

          // Generate a portal token
          const token = `${crypto.randomUUID()}-${ref.id.slice(0, 8)}`;

          // Create document in portalTokens/{token}
          await adminDb.doc(`portalTokens/${token}`).set({
            token,
            clientId: ref.id,
            userId: decoded.uid,
            createdAt: FieldValue.serverTimestamp(),
            expiresAt: null, // welcome portal links never expire
          });

          // Link token to client
          await adminDb.doc(`users/${decoded.uid}/clients/${ref.id}`).update({
            portalToken: token,
          });

          // Get owner profile and notification settings
          const userSnap = await adminDb.doc(`users/${decoded.uid}`).get();
          const userData = userSnap.exists ? userSnap.data() : null;
          const autoWelcomeEmailSetting = userData?.autoWelcomeEmail !== false;

          let emailStatus: "sent" | "failed" | "skipped" = "skipped";
          let emailError: string | null = null;

          if (autoWelcomeEmailSetting) {
            try {
              const freelancerName = userData?.fullName || "Your Freelancer";
              const freelancerEmail = userData?.email || "";
              const workspaceName = userData?.workspaceName || "Mershal Workspace";
              const appUrl = process.env.VITE_APP_URL ?? request.headers.get("origin") ?? "https://mershal.in";
              const portalUrl = `${appUrl}/portal/${token}`;

              await sendClientWelcomeEmail(
                parsed.data.email,
                parsed.data.name,
                freelancerName,
                freelancerEmail,
                workspaceName,
                portalUrl,
                generatedPassword,
                parsed.data.notes
              );
              emailStatus = "sent";
            } catch (err: any) {
              console.error("[POST /api/clients] Welcome email failed:", err);
              emailStatus = "failed";
              emailError = err.message || "Failed to send email via Resend";
            }
          }

          // Timeline: client_created
          const { addTimelineEvent } = await import("../../lib/timeline");
          addTimelineEvent(decoded.uid, ref.id, {
            type: "client_created",
            title: "Client added",
            description: `${parsed.data.name} was added as a client. Welcome email: ${emailStatus}.`,
          }).catch(console.error);

          return jsonResponse({
            id: ref.id,
            ...parsed.data,
            portalToken: token,
            portalPassword: generatedPassword,
            emailStatus,
            emailError,
          }, 201);
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          if (err instanceof LimitError) {
            return errorResponse(err.message, 403);
          }
          console.error("[POST /api/clients]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
