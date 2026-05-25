import { createFileRoute } from "@tanstack/react-router";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { sendWelcomeEmail } from "../../lib/email";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export const Route = createFileRoute("/api/email/welcome")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await verifyAuth(request);
          const body = await request.json();
          const parsed = schema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(parsed.error.message, 400);
          }

          console.log(`[welcome-email] Attempting to send welcome email to: ${parsed.data.email}`);
          await sendWelcomeEmail(parsed.data.email, parsed.data.name);
          console.log(`[welcome-email] Welcome email sent successfully to: ${parsed.data.email}`);
          return jsonResponse({ success: true });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            console.error("[welcome-email] Auth verification failed");
            return unauthorizedResponse();
          }
          console.error("[POST /api/email/welcome] Failed to send welcome email:", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
