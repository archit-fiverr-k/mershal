import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/promo-codes")({
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

          // Fetch all promo codes
          const snapshot = await adminDb.collection("promo_codes").orderBy("createdAt", "desc").get();
          const codes = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          return jsonResponse({ codes });
        } catch (err) {
          if (err instanceof Error && err.name === "AuthError") return unauthorizedResponse();
          console.error("[GET /api/admin/promo-codes]", err);
          return errorResponse("Internal server error");
        }
      },
      POST: async ({ request }) => {
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

          const body = await request.json() as {
            code: string;
            discountType: "percent" | "fixed";
            value: number;
            status: "active" | "inactive";
          };

          if (!body.code || !body.discountType || body.value === undefined) {
            return errorResponse("Missing code parameters", 400);
          }

          // Save promo code
          const newDoc = await adminDb.collection("promo_codes").add({
            code: body.code.toUpperCase().trim(),
            discountType: body.discountType,
            value: body.value,
            status: body.status || "active",
            createdAt: new Date().toISOString(),
          });

          return jsonResponse({ success: true, id: newDoc.id });
        } catch (err) {
          if (err instanceof Error && err.name === "AuthError") return unauthorizedResponse();
          console.error("[POST /api/admin/promo-codes]", err);
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
          if (!targetId) return errorResponse("Missing target promo code ID", 400);

          await adminDb.doc(`promo_codes/${targetId}`).delete();

          return jsonResponse({ success: true });
        } catch (err) {
          if (err instanceof Error && err.name === "AuthError") return unauthorizedResponse();
          console.error("[DELETE /api/admin/promo-codes]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
