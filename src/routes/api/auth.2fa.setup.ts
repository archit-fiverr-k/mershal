import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { generateSecret } from "../../lib/totp";

export const Route = createFileRoute("/api/auth/2fa/setup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Skip 2FA check during setup
          const decoded = await verifyAuth(request, { skip2FA: true });

          if (!decoded.email) {
            return errorResponse("User email is required for 2FA setup", 400);
          }

          const secret = await generateSecret();

          // Save the secret temporarily
          await adminDb.doc(`users/${decoded.uid}/private/security`).set(
            {
              tempTwoFactorSecret: secret,
              tempTwoFactorCreatedAt: new Date().toISOString(),
            },
            { merge: true }
          );

          const qrCodeUrl = `otpauth://totp/Mershal:${decoded.email}?secret=${secret}&issuer=Mershal`;

          return jsonResponse({
            secret,
            qrCodeUrl,
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[POST /api/auth/2fa/setup]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
