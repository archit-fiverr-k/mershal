import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/leads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { adminDb } = await import("../../lib/firebase/admin");
        const { jsonResponse, errorResponse } = await import("../../lib/firebase/middleware");
        try {
          const body = await request.json() as { email?: string; message?: string };
          if (!body.email || !body.message) {
            return errorResponse("Missing email or message", 400);
          }

          // Add to leads collection
          await adminDb.collection("leads").add({
            email: body.email,
            message: body.message,
            status: "new", // "new" | "contacted" | "converted"
            createdAt: new Date().toISOString(),
          });

          return jsonResponse({ success: true });
        } catch (err) {
          console.error("[POST /api/leads]", err);
          return errorResponse("Failed to submit inquiry", 500);
        }
      },
    },
  },
});
