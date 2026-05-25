import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";

export const Route = createFileRoute("/api/onboarding/counts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          const uid = decoded.uid;

          // Run all 5 lightweight count queries in parallel
          const [clients, projects, tasks, invoices, portalTokens] =
            await Promise.all([
              adminDb.collection(`users/${uid}/clients`).limit(1).get(),
              adminDb.collection(`users/${uid}/projects`).limit(1).get(),
              adminDb.collection(`users/${uid}/tasks`).limit(1).get(),
              adminDb.collection(`users/${uid}/invoices`).limit(1).get(),
              adminDb.collection(`users/${uid}/portalTokens`).limit(1).get(),
            ]);

          return jsonResponse({
            clients:      clients.size,
            projects:     projects.size,
            tasks:        tasks.size,
            invoices:     invoices.size,
            portalTokens: portalTokens.size,
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError")
            return unauthorizedResponse();
          console.error("[GET /api/onboarding/counts]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
