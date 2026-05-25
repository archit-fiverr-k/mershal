/**
 * notifications.ts — Firestore-backed notification utility
 *
 * Replaces the old localStorage notification system.
 * All notifications sync across devices via Firestore.
 *
 * Collection: users/{uid}/notifications/{notificationId}
 */
import { adminDb } from "./firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "invoice_paid"
  | "client_message"
  | "invoice_overdue"
  | "project_update"
  | "recurring_created";

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  metadata?: Record<string, string | number>;
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/** Create a new notification for a user */
export async function createNotification(
  uid: string,
  payload: NotificationPayload,
): Promise<string> {
  const ref = await adminDb
    .collection(`users/${uid}/notifications`)
    .add({
      ...payload,
      link: payload.link ?? "",
      metadata: payload.metadata ?? {},
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  return ref.id;
}

/** Mark a single notification as read */
export async function markNotificationRead(
  uid: string,
  notificationId: string,
): Promise<void> {
  await adminDb
    .doc(`users/${uid}/notifications/${notificationId}`)
    .update({ read: true });
}

/** Mark all unread notifications as read */
export async function markAllNotificationsRead(uid: string): Promise<void> {
  const snap = await adminDb
    .collection(`users/${uid}/notifications`)
    .where("read", "==", false)
    .get();

  if (snap.empty) return;

  const batch = adminDb.batch();
  snap.docs.forEach((doc) => batch.update(doc.ref, { read: true }));
  await batch.commit();
}

/** Delete a notification */
export async function deleteNotification(
  uid: string,
  notificationId: string,
): Promise<void> {
  await adminDb
    .doc(`users/${uid}/notifications/${notificationId}`)
    .delete();
}

/** Get unread notification count */
export async function getUnreadCount(uid: string): Promise<number> {
  const snap = await adminDb
    .collection(`users/${uid}/notifications`)
    .where("read", "==", false)
    .get();
  return snap.size;
}
