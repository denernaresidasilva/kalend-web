import { api, endSession } from "./api";
export async function logoutAllSessions() {
  // The server identifies the user from the authenticated cookie; no user/tenant is submitted.
  await api<void>("/auth/logout-all", { method: "POST" });
  endSession();
}
