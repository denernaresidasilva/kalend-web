export type AuthMe = {
  user: { id: string; name: string; email: string; isSuperAdmin: boolean };
  systemRole: "SUPER_ADMIN" | "USER";
  memberships: Array<{ id: string; role: "OWNER" | "ADMIN" | "RECEPTIONIST" | "PROFESSIONAL" | "CLIENT"; company: { id: string; name: string; slug: string; status: "TRIAL" | "ACTIVE"; isActive: true } }>;
  selectedCompanyId: string | null;
  session: { expiresAt: string; refreshExpiresAt: string };
};
export type Gateway = {
  gateway: "MERCADO_PAGO" | "STRIPE" | "PAGBANK";
  enabled: boolean; environment: "SANDBOX" | "PRODUCTION"; publicId: string | null;
  configured: boolean; webhookConfigured: boolean;
  status: "NOT_CONFIGURED" | "PENDING_VALIDATION" | "CONNECTED" | "FAILED";
  lastValidatedAt: string | null; adapterAvailable: boolean; webhookPath: string;
};
export type WebhookMetadata = {
  id: string; environment: "SANDBOX" | "PRODUCTION" | null;
  gateway: "MANUAL" | Gateway["gateway"]; externalEventId: string; eventType: string | null;
  status: "RECEIVED" | "PROCESSING" | "PROCESSED" | "FAILED" | "IGNORED";
  receivedAt: string; processedAt: string | null; createdAt: string; updatedAt: string;
  companyId: string | null; paymentId: string | null; attempts: number;
  errorMessage?: "PROCESSING_FAILED" | null;
};
export type Summary = {
  generatedAt: string; period: { from: string; to: string; timezone: "UTC" };
  companies: { total: number; active: number; trial: number; suspended: number; canceled: number; inactive: number; new: number };
  users: { total: number };
  subscriptions: { total: number; active: number; trialing: number; pastDue: number; canceled: number; expired: number };
  payments: { total: number; approved: number; pending: number; failed: number; canceled: number; refunded: number; revenueCents: number; monthlyRevenueCents: number };
  recentEvents: WebhookMetadata[];
};
export const isSuperAdmin = (profile: AuthMe | null) => profile?.systemRole === "SUPER_ADMIN";
