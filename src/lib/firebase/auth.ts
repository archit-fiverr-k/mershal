import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./client";

const googleProvider = new GoogleAuthProvider();

/**
 * Creates a new user with email/password, creates their Firestore profile,
 * and sends a welcome email.
 */
/**
 * Generates a stable browser fingerprint based on screen metrics, user agent,
 * timezone, canvas hash, and a persistent local UUID.
 */
async function getDeviceFingerprint(): Promise<string> {
  let localUuid = "";
  if (typeof window !== "undefined") {
    localUuid = localStorage.getItem("mershal_device_uuid") || "";
    if (!localUuid) {
      localUuid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("mershal_device_uuid", localUuid);
    }
  }

  const screenWidth = typeof window !== "undefined" ? window.screen.width : 0;
  const screenHeight = typeof window !== "undefined" ? window.screen.height : 0;
  const colorDepth = typeof window !== "undefined" ? window.screen.colorDepth : 0;
  const timezone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  const language = typeof navigator !== "undefined" ? navigator.language : "";
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";

  let canvasHash = "";
  if (typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("MershalFingerprint!", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("MershalFingerprint!", 4, 17);
        const dataUrl = canvas.toDataURL();
        let hash = 0;
        for (let i = 0; i < dataUrl.length; i++) {
          hash = (hash << 5) - hash + dataUrl.charCodeAt(i);
          hash |= 0;
        }
        canvasHash = hash.toString();
      }
    } catch (e) {
      // Ignore canvas error
    }
  }

  const rawString = `${localUuid}|${screenWidth}x${screenHeight}|${colorDepth}|${timezone}|${language}|${userAgent}|${canvasHash}`;
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    hash = (hash << 5) - hash + rawString.charCodeAt(i);
    hash |= 0;
  }
  return "fp_" + Math.abs(hash).toString(16) + "_" + localUuid.substring(0, 8);
}

/**
 * Creates a new user with email/password, creates their Firestore profile,
 * and sends a welcome email.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
): Promise<User> {
  const fingerprint = await getDeviceFingerprint();

  // Validate signup with server API
  const valRes = await fetch("/api/auth/validate-signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fingerprint, email }),
  });

  if (!valRes.ok) {
    const errorData = await valRes.json();
    throw new Error(errorData.error || "Device verification failed.");
  }

  const valData = await valRes.json();
  if (!valData.allowed) {
    throw new Error(valData.message || "Free trial limit reached for this system.");
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  await updateProfile(user, { displayName: fullName });

  await setDoc(doc(db, "users", user.uid), {
    fullName,
    email,
    avatarUrl: "",
    workspaceName: "My Mershal Workspace",
    mobileNumber: "",
    onboardingCompleted: false,
    plan: "free",
    stripeCustomerId: "",
    stripeSubscriptionId: "",
    subscriptionStatus: "inactive",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deviceFingerprint: fingerprint,
    signupIp: valData.clientIp || "",
    trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
  });

  // Fire-and-forget welcome email via API
  try {
    const token = await user.getIdToken();
    await fetch("/api/email/welcome", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, name: fullName }),
    });
  } catch {
    // Non-critical — don't block signup
  }

  return user;
}

/**
 * Signs in with email and password.
 */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/**
 * Initiates Google OAuth via redirect (avoids COOP popup issues).
 * After redirect back, call handleGoogleRedirect() to finish sign-in.
 */
export async function signInWithGoogle(): Promise<void> {
  await signInWithRedirect(auth, googleProvider);
}

/**
 * Processes the Google redirect result on page load.
 * Creates a Firestore user doc on first login.
 * Returns the user if a redirect just completed, or null otherwise.
 */
export async function handleGoogleRedirect(): Promise<User | null> {
  const result = await getRedirectResult(auth);
  if (!result) return null;

  const user = result.user;
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const fingerprint = await getDeviceFingerprint();

    // Validate signup with server API
    const valRes = await fetch("/api/auth/validate-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprint, email: user.email }),
    });

    if (!valRes.ok) {
      await user.delete();
      await firebaseSignOut(auth);
      const errorData = await valRes.json();
      throw new Error(errorData.error || "Device verification failed.");
    }

    const valData = await valRes.json();
    if (!valData.allowed) {
      await user.delete();
      await firebaseSignOut(auth);
      throw new Error(valData.message || "Free trial limit reached for this system.");
    }

    const fullName = user.displayName ?? "User";
    await setDoc(userRef, {
      fullName,
      email: user.email ?? "",
      avatarUrl: user.photoURL ?? "",
      workspaceName: "My Mershal Workspace",
      mobileNumber: "",
      onboardingCompleted: false,
      plan: "free",
      stripeCustomerId: "",
      stripeSubscriptionId: "",
      subscriptionStatus: "inactive",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deviceFingerprint: fingerprint,
      signupIp: valData.clientIp || "",
      trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    });

    // Fire-and-forget welcome email
    try {
      const token = await user.getIdToken();
      await fetch("/api/email/welcome", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: user.email, name: fullName }),
      });
    } catch {
      // Non-critical
    }
  }

  return user;
}

/**
 * Signs out the current user.
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Subscribes to auth state changes.
 */
export function onAuthStateChange(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

/**
 * Gets the current user's ID token for API calls.
 */
export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
