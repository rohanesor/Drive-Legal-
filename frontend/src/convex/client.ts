import { ConvexReactClient } from "convex/react";

let CONVEX_URL = "http://10.0.2.2:3210";

if (typeof process !== "undefined" && process.env?.CONVEX_URL) {
  CONVEX_URL = process.env.CONVEX_URL;
}

export const convexClient = new ConvexReactClient(CONVEX_URL);
