import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/users")({
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

          // Fetch all users
          const snapshot = await adminDb.collection("users").orderBy("createdAt", "desc").get();
          const users = snapshot.docs.map((doc) => ({
            uid: doc.id,
            ...doc.data(),
          }));

          return jsonResponse({ users });
        } catch (err) {
          if (err instanceof Error && err.name === "AuthError") return unauthorizedResponse();
          console.error("[GET /api/admin/users]", err);
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

          const body = await request.json() as { uid?: string; plan?: "free" | "pro"; isAdmin?: boolean };
          if (!body.uid) return errorResponse("Missing user UID", 400);

          const updates: Record<string, any> = {};
          if (body.plan !== undefined) updates.plan = body.plan;
          if (body.isAdmin !== undefined) updates.isAdmin = body.isAdmin;

          await adminDb.doc(`users/${body.uid}`).update(updates);

          return jsonResponse({ success: true });
        } catch (err) {
          if (err instanceof Error && err.name === "AuthError") return unauthorizedResponse();
          console.error("[PATCH /api/admin/users]", err);
          return errorResponse("Internal server error");
        }
      },
      DELETE: async ({ request }) => {
        const { adminDb, adminAuth } = await import("../../lib/firebase/admin");
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
          const targetUid = url.searchParams.get("uid");
          if (!targetUid) return errorResponse("Missing target user UID", 400);
          if (targetUid === decoded.uid) return errorResponse("You cannot delete yourself", 400);

          // 1. Delete Firestore profile
          await adminDb.doc(`users/${targetUid}`).delete();
          
          // 2. Delete Auth record
          try {
            await adminAuth.deleteUser(targetUid);
          } catch (authErr) {
            console.warn(`Auth record for ${targetUid} not found or couldn't be deleted:`, authErr);
          }

          return jsonResponse({ success: true });
        } catch (err) {
          if (err instanceof Error && err.name === "AuthError") return unauthorizedResponse();
          console.error("[DELETE /api/admin/users]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
