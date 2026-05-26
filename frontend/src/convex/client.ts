import { ConvexReactClient } from "convex/react";

/**
 * Convex client for online AI features (Claude API).
 * Only initialized when a real CONVEX_URL environment variable is set.
 * The app is offline-first — Convex is entirely optional.
 */

let CONVEX_URL: string | null = null;

if (typeof process !== "undefined" && process.env?.CONVEX_URL) {
  CONVEX_URL = process.env.CONVEX_URL;
}

// Only create the client if we have a real Convex deployment URL.
// When null, App.tsx skips the ConvexProvider entirely.
export const convexClient = CONVEX_URL
  ? new ConvexReactClient(CONVEX_URL)
  : null;
