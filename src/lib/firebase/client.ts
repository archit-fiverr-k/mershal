/**
 * Firebase client SDK — browser-only.
 *
 * This module is imported by client components and the api-client.
 * It must NOT throw during SSR when VITE_ env vars are absent.
 * All exports are lazy — initialized only when first accessed in the browser.
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Safe check — import.meta.env is available in both SSR and client,
// but VITE_ vars are only injected for the client bundle.
const isBrowser = typeof window !== "undefined";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? "",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? "",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? "",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? "",
};

/**
 * Returns the Firebase app, initializing it only if we're in the browser
 * and the API key is present. Returns null on the server.
 */
function getFirebaseApp(): FirebaseApp | null {
  if (!isBrowser) return null;
  if (!firebaseConfig.apiKey) return null;

  if (getApps().length > 0) return getApp();
  return initializeApp(firebaseConfig);
}

// Lazy singletons — null on server, real instances in browser
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

function getFirebaseAuth(): Auth | null {
  if (!isBrowser) return null;
  if (_auth) return _auth;
  const app = getFirebaseApp();
  if (!app) return null;
  _auth = getAuth(app);
  return _auth;
}

function getFirebaseDb(): Firestore | null {
  if (!isBrowser) return null;
  if (_db) return _db;
  const app = getFirebaseApp();
  if (!app) return null;
  _db = getFirestore(app);
  return _db;
}

function getFirebaseStorage(): FirebaseStorage | null {
  if (!isBrowser) return null;
  if (_storage) return _storage;
  const app = getFirebaseApp();
  if (!app) return null;
  _storage = getStorage(app);
  return _storage;
}

// We cannot use Proxies for Firebase v9 modular SDK (like `doc(db, ...)`)
// because the SDK relies on internal object instances that Proxies break.
// Since these are only imported/used on the client in event handlers or useEffect,
// we can safely export the evaluated functions.
export const auth = (isBrowser ? getFirebaseAuth() : null) as Auth;
export const db = (isBrowser ? getFirebaseDb() : null) as Firestore;
export const storage = (isBrowser ? getFirebaseStorage() : null) as FirebaseStorage;

export default { auth, db, storage };
