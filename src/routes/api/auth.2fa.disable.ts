import { createFileRoute } from "@tanstack/react-router";
import { adminDb, adminAuth } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { verifyTotp } from "../../lib/totp";

export const Route = createFileRoute("/api/auth/2fa/disable")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Skip general 2FA validation check because we explicitly verify the code here
          const decoded = await verifyAuth(request, { skip2FA: true });

          const body = await request.json();
          const { code } = body;

          if (!code || typeof code !== "string" || code.length !== 6) {
            return errorResponse("Invalid or missing code", 400);
          }

          // Fetch the permanent 2FA secret
          const securityDocRef = adminDb.doc(`users/${decoded.uid}/private/security`);
          const securitySnap = await securityDocRef.get();

          if (!securitySnap.exists) {
            return errorResponse("Two-factor authentication is not enabled", 400);
          }

          const securityData = securitySnap.data();
          const secret = securityData?.twoFactorSecret;

          if (!secret) {
            return errorResponse("Two-factor authentication is not enabled", 400);
          }

          // Verify the TOTP code
          const isValid = await verifyTotp(secret, code);
          if (!isValid) {
            return errorResponse("Invalid verification code", 400);
          }

          // Remove the 2FA secret from Firestore
          await securityDocRef.set(
            {
              twoFactorSecret: null,
              tempTwoFactorSecret: null,
              tempTwoFactorCreatedAt: null,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );

          // Update user profile document to indicate 2FA is disabled
          await adminDb.doc(`users/${decoded.uid}`).set(
            {
              twoFactorEnabled: false,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );

          // Remove custom claims
          await adminAuth.setCustomUserClaims(decoded.uid, {
            twoFactorEnabled: false,
          });

          return jsonResponse({
            success: true,
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[POST /api/auth/2fa/disable]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
