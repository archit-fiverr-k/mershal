/**
 * Vercel serverless function — SSR adapter for TanStack Start.
 *
 * TanStack Start (with cloudflare:false) builds a Node.js-compatible server
 * bundle at dist/server/server.js that exports a Cloudflare Workers-style
 * { fetch(request, env, ctx) } handler.
 *
 * This file bridges Vercel's Node.js (req, res) interface to that handler.
 *
 * vercel.json includes "includeFiles": "dist/server/**" so the bundle
 * is available at runtime inside the function.
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// dist/server/server.js is one level up from api/
// Use pathToFileURL so import() works on both Windows and Linux
const serverBundlePath = pathToFileURL(
  resolve(__dirname, "..", "dist", "server", "server.js")
).href;

let _handler = null;

async function loadHandler() {
  if (_handler) return _handler;
  const mod = await import(serverBundlePath);
  _handler = mod.default ?? mod;
  return _handler;
}

async function nodeRequestToWebRequest(req) {
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const host  = req.headers["x-forwarded-host"] ?? req.headers["host"] ?? "localhost";
  const url   = `${proto}://${host}${req.url}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }

  const method  = (req.method ?? "GET").toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  let body = null;
  if (hasBody) {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (chunks.length > 0) body = Buffer.concat(chunks);
  }

  return new Request(url, { method, headers, body });
}

async function webResponseToNodeResponse(webRes, res) {
  res.statusCode = webRes.status;

  for (const [key, value] of webRes.headers.entries()) {
    if (key.toLowerCase() === "transfer-encoding") continue;
    res.setHeader(key, value);
  }

  if (webRes.body) {
    const reader = webRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }

  res.end();
}

export default async function handler(req, res) {
  try {
    const serverHandler = await loadHandler();
    const webRequest    = await nodeRequestToWebRequest(req);

    const ctx = {
      waitUntil:              (p) => p.catch((e) => console.error("[waitUntil]", e)),
      passThroughOnException: () => {},
    };

    const webResponse = await serverHandler.fetch(webRequest, process.env, ctx);
    await webResponseToNodeResponse(webResponse, res);
  } catch (err) {
    console.error("[api/ssr.js] Unhandled error:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end("Internal Server Error");
    }
  }
}
