import { adminAuth } from "./admin";
import type { DecodedIdToken } from "firebase-admin/auth";
import { AsyncLocalStorage } from "node:async_hooks";

export const requestStorage = new AsyncLocalStorage<{ twoFactorRequired?: boolean }>();

export class AuthError extends Error {
  status = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Extracts and verifies the Firebase ID token from the Authorization header.
 * Returns the decoded token (uid, email, etc.) or throws AuthError.
 */
export async function verifyAuth(
  request: Request,
  options?: { skip2FA?: boolean }
): Promise<DecodedIdToken> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.error("[verifyAuth] Missing or invalid Authorization header. Header value:", authHeader);
    throw new AuthError("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7);
  if (!token) {
    console.error("[verifyAuth] Missing token after Bearer.");
    throw new AuthError("Missing token");
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);

    // Verify 2FA if enabled on user token and not skipped
    if (decoded.twoFactorEnabled && !options?.skip2FA) {
      const twoFactorToken = request.headers.get("X-2FA-Token");
      const store = requestStorage.getStore();

      if (!twoFactorToken) {
        if (store) store.twoFactorRequired = true;
        throw new AuthError("Two-factor authentication required");
      }

      const sessionSecret = process.env.FIREBASE_ADMIN_PRIVATE_KEY || "default-fallback-secure-key-123456";
      const { verifySessionToken } = await import("../totp");
      const verifiedUid = await verifySessionToken(twoFactorToken, sessionSecret);
      if (verifiedUid !== decoded.uid) {
        if (store) store.twoFactorRequired = true;
        throw new AuthError("Invalid or expired 2FA session token");
      }
    }

    return decoded;
  } catch (err) {
    if (err instanceof AuthError) throw err;
    console.error("[verifyAuth] Token verification failed:", err);
    throw new AuthError("Invalid or expired token");
  }
}

/**
 * Returns a standard 401 JSON response, or 403 if 2FA is required.
 */
export function unauthorizedResponse(message = "Unauthorized"): Response {
  const store = requestStorage.getStore();
  if (store?.twoFactorRequired) {
    return new Response(
      JSON.stringify({ error: "Two-factor authentication required", code: "2fa_required" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Returns a standard error JSON response.
 */
export function errorResponse(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Returns a standard JSON response.
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

