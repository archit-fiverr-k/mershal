/**
 * API client for making authenticated requests to the backend.
 * Automatically attaches the Firebase ID token as a Bearer token.
 */

import { auth } from "./firebase/client";

async function getToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (typeof window !== "undefined") {
    const twoFactorToken = localStorage.getItem("mershal_2fa_token");
    if (twoFactorToken) {
      headers["X-2FA-Token"] = twoFactorToken;
    }
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw Object.assign(new Error(error.error ?? "Request failed"), {
      status: response.status,
      data: error,
    });
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, options: RequestInit = {}) => request<T>(path, options),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
