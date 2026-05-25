const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

async function getCrypto() {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    return crypto;
  }
  const nodeCrypto = await import("node:crypto");
  return nodeCrypto.webcrypto as unknown as any;
}

export function base32Decode(str: string): Uint8Array {
  const clean = str.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = "";
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) throw new Error("Invalid base32 character: " + clean[i]);
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substring(i * 8, (i + 1) * 8), 2);
  }
  return bytes;
}

export function base32Encode(buffer: Uint8Array): string {
  let bits = "";
  for (let i = 0; i < buffer.length; i++) {
    bits += buffer[i].toString(2).padStart(8, "0");
  }
  let str = "";
  for (let i = 0; i < bits.length; i += 5) {
    const segment = bits.substring(i, i + 5);
    if (segment.length < 5) {
      str += BASE32_CHARS[parseInt(segment.padEnd(5, "0"), 2)];
    } else {
      str += BASE32_CHARS[parseInt(segment, 2)];
    }
  }
  return str;
}

export async function generateSecret(): Promise<string> {
  const cryptoObj = await getCrypto();
  const bytes = new Uint8Array(20);
  cryptoObj.getRandomValues(bytes);
  return base32Encode(bytes);
}

export async function generateTotp(secretBase32: string, timeStep?: number): Promise<string> {
  const step = timeStep ?? Math.floor(Date.now() / 1000 / 30);
  const secretBytes = base32Decode(secretBase32);
  const cryptoObj = await getCrypto();

  const key = await cryptoObj.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: { name: "SHA-1" } },
    false,
    ["sign"]
  );

  const timeBuffer = new ArrayBuffer(8);
  const view = new DataView(timeBuffer);
  const high = Math.floor(step / 0x100000000);
  const low = step % 0x100000000;
  view.setUint32(0, high, false);
  view.setUint32(4, low, false);

  const signature = await cryptoObj.subtle.sign("HMAC", key, timeBuffer);
  const digest = new Uint8Array(signature);

  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];

  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
}

export async function verifyTotp(secretBase32: string, token: string, window = 1): Promise<boolean> {
  const currentStep = Math.floor(Date.now() / 1000 / 30);
  for (let i = -window; i <= window; i++) {
    const generated = await generateTotp(secretBase32, currentStep + i);
    if (generated === token) {
      return true;
    }
  }
  return false;
}

function base64urlEncode(arr: Uint8Array | string): string {
  const str = typeof arr === "string" ? arr : String.fromCharCode(...arr);
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}

export async function signSessionToken(uid: string, secretKey: string, durationMs = 12 * 60 * 60 * 1000): Promise<string> {
  const payloadObj = {
    uid,
    exp: Date.now() + durationMs,
  };
  const payloadStr = JSON.stringify(payloadObj);
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payloadStr);
  const secretBytes = encoder.encode(secretKey);

  const cryptoObj = await getCrypto();
  const key = await cryptoObj.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"]
  );

  const signature = await cryptoObj.subtle.sign("HMAC", key, payloadBytes);
  const sigBytes = new Uint8Array(signature);

  return `${base64urlEncode(payloadStr)}.${base64urlEncode(sigBytes)}`;
}

export async function verifySessionToken(token: string, secretKey: string): Promise<string | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadBase64, sigBase64] = parts;
    const payloadStr = String.fromCharCode(...base64urlDecode(payloadBase64));
    const payloadObj = JSON.parse(payloadStr);

    if (payloadObj.exp < Date.now()) {
      return null;
    }

    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(payloadStr);
    const secretBytes = encoder.encode(secretKey);
    const sigBytes = base64urlDecode(sigBase64);

    const cryptoObj = await getCrypto();
    const key = await cryptoObj.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: { name: "SHA-256" } },
      false,
      ["verify"]
    );

    const isValid = await cryptoObj.subtle.verify("HMAC", key, sigBytes, payloadBytes);
    return isValid ? payloadObj.uid : null;
  } catch {
    return null;
  }
}
