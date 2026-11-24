import type { FastifyCorsOptions } from "@fastify/cors";
export function corsOptions(): FastifyCorsOptions {
  const isProduction = process.env.NODE_ENV === "production";
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    ...(isProduction ? [] : ["http://localhost:3001"]),
  ].filter((origin): origin is string => Boolean(origin));

  if (isProduction && !process.env.FRONTEND_URL) {
    console.warn(
      "⚠️  FRONTEND_URL is not set: all cross-origin browser requests will be rejected.",
    );
  }

  return {
    origin: (origin, cb) => {
      // Requests with no Origin header (server-to-server, webhooks, curl,
      // same-origin navigation) are not subject to CORS. In production we
      // still only allow them through un-reflected (no CORS headers granted).
      if (!origin) {
        cb(null, !isProduction);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error("Not allowed by CORS"), false);
      }
    },
    credentials: true,
  };
}
