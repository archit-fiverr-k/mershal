/**
 * /api/notifications
 *
 * Firestore-backed notification system.
 * Notifications stored at users/{uid}/notifications/{notificationId}
 *
 * GET  /api/notifications           — list last 20 notifications
 * POST /api/notifications/read-all  — mark all as read
 * POST /api/notifications/:id/read  — mark one as read
 */
import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { markAllNotificationsRead, markNotificationRead } from "../../lib/notifications";

export const Route = createFileRoute("/api/notifications")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          const uid = decoded.uid;

          const snap = await adminDb
            .collection(`users/${uid}/notifications`)
            .orderBy("createdAt", "desc")
            .limit(20)
            .get();

          const notifications = snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          const unreadCount = notifications.filter((n: any) => !n.read).length;

          return jsonResponse({ notifications, unreadCount });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError")
            return unauthorizedResponse();
          console.error("[GET /api/notifications]", err);
          return errorResponse("Internal server error");
        }
      },

      // PATCH /api/notifications — mark all as read
      PATCH: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          await markAllNotificationsRead(decoded.uid);
          return jsonResponse({ success: true });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError")
            return unauthorizedResponse();
          console.error("[PATCH /api/notifications]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
