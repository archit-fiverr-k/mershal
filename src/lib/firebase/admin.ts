/**
 * Firebase Admin SDK — server-only, lazy initialization.
 *
 * Initialization is deferred until the first actual use (first property access
 * on adminDb or adminAuth). This prevents the module from crashing at import
 * time when env vars are absent (local dev without .env, Vite SSR scan, etc.).
 */
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let _app: App | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

function getAdminApp(): App {
  if (_app) return _app;

  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }

  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? "";
  const projectId = process.env.FIREBASE_PROJECT_ID ?? "";

  if (!privateKey || !clientEmail || !projectId) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_ADMIN_PRIVATE_KEY, " +
      "FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_PROJECT_ID in your .env file.",
    );
  }

  _app = initializeApp({ credential: cert({ privateKey, clientEmail, projectId }), projectId });
  return _app;
}

function getAdminDbInstance(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getAdminApp());
  return _db;
}

function getAdminAuthInstance(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getAdminApp());
  return _auth;
}

/**
 * Proxy that defers initialization until first property access.
 * Existing code can use `adminDb.doc(...)` unchanged.
 */
export const adminDb = new Proxy({} as Firestore, {
  get(_target, prop: string | symbol) {
    const db = getAdminDbInstance();
    const val = (db as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function" ? (val as (...a: unknown[]) => unknown).bind(db) : val;
  },
});

export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop: string | symbol) {
    const auth = getAdminAuthInstance();
    const val = (auth as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function" ? (val as (...a: unknown[]) => unknown).bind(auth) : val;
  },
});
