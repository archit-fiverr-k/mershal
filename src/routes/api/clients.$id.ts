import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { updateClientSchema } from "../../lib/validations";
import { FieldValue } from "firebase-admin/firestore";

export const Route = createFileRoute("/api/clients/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id } = params;

          const clientSnap = await adminDb
            .doc(`users/${decoded.uid}/clients/${id}`)
            .get();

          if (!clientSnap.exists) {
            return errorResponse("Client not found", 404);
          }

          // Fetch related projects
          const projectsSnap = await adminDb
            .collection(`users/${decoded.uid}/projects`)
            .where("clientId", "==", id)
            .orderBy("createdAt", "desc")
            .limit(10)
            .get();

          // Fetch recent invoices
          const invoicesSnap = await adminDb
            .collection(`users/${decoded.uid}/invoices`)
            .where("clientId", "==", id)
            .orderBy("createdAt", "desc")
            .limit(5)
            .get();

          return jsonResponse({
            client: { id: clientSnap.id, ...clientSnap.data() },
            projects: projectsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
            recentInvoices: invoicesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[GET /api/clients/$id]", err);
          return errorResponse("Internal server error");
        }
      },

      PATCH: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id } = params;

          const snap = await adminDb
            .doc(`users/${decoded.uid}/clients/${id}`)
            .get();
          if (!snap.exists) {
            return errorResponse("Client not found", 404);
          }

          const body = await request.json();
          const parsed = updateClientSchema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(parsed.error.message, 400);
          }

          await adminDb.doc(`users/${decoded.uid}/clients/${id}`).update({
            ...parsed.data,
            updatedAt: FieldValue.serverTimestamp(),
          });

          return jsonResponse({ success: true });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[PATCH /api/clients/$id]", err);
          return errorResponse("Internal server error");
        }
      },

      DELETE: async ({ request, params }) => {
        try {
          const decoded = await verifyAuth(request);
          const { id } = params;

          const snap = await adminDb
            .doc(`users/${decoded.uid}/clients/${id}`)
            .get();
          if (!snap.exists) {
            return errorResponse("Client not found", 404);
          }

          // Check if user is on Free plan and enforce 60 days deletion rule
          const { getUserPlan } = await import("../../lib/limits");
          const plan = await getUserPlan(decoded.uid);

          if (plan === "free") {
            const clientData = snap.data();
            const createdAt = clientData?.createdAt;
            if (createdAt) {
              let createdDate: Date;
              if (typeof createdAt.toDate === "function") {
                createdDate = createdAt.toDate();
              } else if (createdAt.seconds) {
                createdDate = new Date(createdAt.seconds * 1000);
              } else {
                createdDate = new Date(createdAt);
              }

              const diffTime = Math.abs(Date.now() - createdDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays < 60) {
                const remainingDays = 60 - diffDays;
                return errorResponse(
                  `On the Free plan, clients can only be deleted 60 days after adding. Please wait ${remainingDays} more day${remainingDays !== 1 ? "s" : ""} or upgrade to Pro.`,
                  403
                );
              }
            }
          }

          await adminDb.doc(`users/${decoded.uid}/clients/${id}`).delete();
          return jsonResponse({ success: true });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[DELETE /api/clients/$id]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
