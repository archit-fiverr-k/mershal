/**
 * Post-build script for Vercel deployment.
 *
 * TanStack Start outputs:
 *   dist/client/   — static assets (JS, CSS, images)
 *   dist/server/   — SSR handler (server.js)
 *
 * This script copies static assets into the public directory so Vercel
 * can serve them directly (bypassing the SSR function for performance).
 */
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const clientDist = join(root, "dist", "client");
const publicDir = join(root, "public");

// Ensure public dir exists
mkdirSync(publicDir, { recursive: true });

// Copy all static assets from dist/client to public
// Vercel will serve these directly from CDN
if (existsSync(clientDist)) {
  cpSync(clientDist, publicDir, { recursive: true, force: true });
  console.log("✓ Copied dist/client → public/");
}

console.log("✓ Vercel build preparation complete");
