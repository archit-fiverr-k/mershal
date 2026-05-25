import { createFileRoute } from "@tanstack/react-router";
import { adminDb, adminAuth } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";
import { verifyTotp, signSessionToken } from "../../lib/totp";

export const Route = createFileRoute("/api/auth/2fa/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Skip 2FA check during initial verification
          const decoded = await verifyAuth(request, { skip2FA: true });

          const body = await request.json();
          const { code } = body;

          if (!code || typeof code !== "string" || code.length !== 6) {
            return errorResponse("Invalid or missing code", 400);
          }

          // Fetch the temp secret from the private security sub-document
          const securityDocRef = adminDb.doc(`users/${decoded.uid}/private/security`);
          const securitySnap = await securityDocRef.get();

          if (!securitySnap.exists) {
            return errorResponse("Two-factor authentication setup not initiated", 400);
          }

          const securityData = securitySnap.data();
          const tempSecret = securityData?.tempTwoFactorSecret;

          if (!tempSecret) {
            return errorResponse("Two-factor authentication setup not initiated", 400);
          }

          // Verify the TOTP code
          const isValid = await verifyTotp(tempSecret, code);
          if (!isValid) {
            return errorResponse("Invalid verification code", 400);
          }

          // Move the secret to permanent storage and clear the temp secret
          await securityDocRef.set(
            {
              twoFactorSecret: tempSecret,
              tempTwoFactorSecret: null,
              tempTwoFactorCreatedAt: null,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );

          // Update user profile document to indicate 2FA is active
          await adminDb.doc(`users/${decoded.uid}`).set(
            {
              twoFactorEnabled: true,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );

          // Set Firebase custom claim so that future tokens have twoFactorEnabled claim
          await adminAuth.setCustomUserClaims(decoded.uid, {
            twoFactorEnabled: true,
          });

          // Sign and return a new 2FA session token
          const sessionSecret = process.env.FIREBASE_ADMIN_PRIVATE_KEY || "default-fallback-secure-key-123456";
          const token = await signSessionToken(decoded.uid, sessionSecret);

          return jsonResponse({
            success: true,
            token,
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[POST /api/auth/2fa/verify]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
