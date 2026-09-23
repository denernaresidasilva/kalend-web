// NEXT_PUBLIC_* is embedded by Next.js at build time.
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL?.trim() || "https://api.kalend.tech"
).replace(/\/+$/, "");
