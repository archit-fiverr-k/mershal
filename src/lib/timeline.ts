/**
 * timeline.ts — Client activity timeline utility
 *
 * Records granular lifecycle events for each client.
 * Firestore path: users/{uid}/clients/{clientId}/timeline/{eventId}
 */
import { adminDb } from "./firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimelineEventType =
  | "client_created"
  | "project_created"
  | "invoice_sent"
  | "invoice_paid"
  | "portal_accessed"
  | "client_message"
  | "project_completed"
  | "proposal_sent"
  | "proposal_accepted"
  | "proposal_declined"
  | "portal_link_shared";

export interface TimelineEventPayload {
  type: TimelineEventType;
  title: string;
  description?: string;
  metadata?: Record<string, string | number>;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export async function addTimelineEvent(
  uid: string,
  clientId: string,
  payload: TimelineEventPayload,
): Promise<string> {
  const ref = await adminDb
    .collection(`users/${uid}/clients/${clientId}/timeline`)
    .add({
      ...payload,
      description: payload.description ?? "",
      metadata: payload.metadata ?? {},
      createdAt: FieldValue.serverTimestamp(),
    });
  return ref.id;
}
