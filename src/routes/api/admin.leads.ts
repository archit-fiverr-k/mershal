import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/leads")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { adminDb } = await import("../../lib/firebase/admin");
        const { verifyAuth, unauthorizedResponse, errorResponse, jsonResponse } =
          await import("../../lib/firebase/middleware");
        try {
          const decoded = await verifyAuth(request);
          
          // Verify caller is admin
          const callerSnap = await adminDb.doc(`users/${decoded.uid}`).get();
          if (!callerSnap.exists) return unauthorizedResponse("Caller profile not found");
          const callerData = callerSnap.data();
          const isAdmin = decoded.email === "hello@mershal.in" || callerData?.isAdmin === true;
          if (!isAdmin) return unauthorizedResponse("Access denied");

          // Fetch all leads
          const snapshot = await adminDb.collection("leads").orderBy("createdAt", "desc").get();
          const leads = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          return jsonResponse({ leads });
        } catch (err) {
          if (err instanceof Error && err.name === "AuthError") return unauthorizedResponse();
          console.error("[GET /api/admin/leads]", err);
          return errorResponse("Internal server error");
        }
      },
      PATCH: async ({ request }) => {
        const { adminDb } = await import("../../lib/firebase/admin");
        const { verifyAuth, unauthorizedResponse, errorResponse, jsonResponse } =
          await import("../../lib/firebase/middleware");
        try {
          const decoded = await verifyAuth(request);
          
          // Verify caller is admin
          const callerSnap = await adminDb.doc(`users/${decoded.uid}`).get();
          if (!callerSnap.exists) return unauthorizedResponse("Caller profile not found");
          const callerData = callerSnap.data();
          const isAdmin = decoded.email === "hello@mershal.in" || callerData?.isAdmin === true;
          if (!isAdmin) return unauthorizedResponse("Access denied");

          const body = await request.json() as { id?: string; status?: "new" | "contacted" | "converted" };
          if (!body.id || !body.status) return errorResponse("Missing id or status", 400);

          await adminDb.doc(`leads/${body.id}`).update({ status: body.status });

          return jsonResponse({ success: true });
        } catch (err) {
          if (err instanceof Error && err.name === "AuthError") return unauthorizedResponse();
          console.error("[PATCH /api/admin/leads]", err);
          return errorResponse("Internal server error");
        }
      },
      DELETE: async ({ request }) => {
        const { adminDb } = await import("../../lib/firebase/admin");
        const { verifyAuth, unauthorizedResponse, errorResponse, jsonResponse } =
          await import("../../lib/firebase/middleware");
        try {
          const decoded = await verifyAuth(request);
          
          // Verify caller is admin
          const callerSnap = await adminDb.doc(`users/${decoded.uid}`).get();
          if (!callerSnap.exists) return unauthorizedResponse("Caller profile not found");
          const callerData = callerSnap.data();
          const isAdmin = decoded.email === "hello@mershal.in" || callerData?.isAdmin === true;
          if (!isAdmin) return unauthorizedResponse("Access denied");

          const url = new URL(request.url);
          const targetId = url.searchParams.get("id");
          if (!targetId) return errorResponse("Missing target lead ID", 400);

          await adminDb.doc(`leads/${targetId}`).delete();

          return jsonResponse({ success: true });
        } catch (err) {
          if (err instanceof Error && err.name === "AuthError") return unauthorizedResponse();
          console.error("[DELETE /api/admin/leads]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
