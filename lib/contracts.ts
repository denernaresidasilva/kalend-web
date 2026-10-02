export type AuthMe = {
  user: { id: string; name: string; email: string; isSuperAdmin: boolean };
  systemRole: "SUPER_ADMIN" | "USER";
  memberships: Array<{ id: string; role: "OWNER" | "ADMIN" | "RECEPTIONIST" | "PROFESSIONAL" | "CLIENT"; company: { id: string; name: string; slug: string; status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELED"; isActive: boolean } }>;
  selectedCompanyId: string | null;
  session: { expiresAt: string; refreshExpiresAt: string };
};
export type Gateway = {
  gateway: "MERCADO_PAGO" | "STRIPE" | "PAGBANK" | "ASAAS";
  enabled: boolean; environment: "SANDBOX" | "PRODUCTION"; publicId: string | null;
  provider: Gateway["gateway"]; capabilities: Capabilities; recurringConfigured: boolean;
  webhookUrl: string | null; webhookStatus: "REMOTE_KEY_UNVERIFIED" | "CONFIGURED_UNVERIFIED" | "NOT_CONFIGURED";
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

export type Capabilities = {
  checkout: boolean; recurring: boolean; nativeIdempotency: boolean;
  cancelAtPeriodEnd: boolean; webhookManagement: boolean; limitation?: string;
};
export type PublicPlan = {
  id: string; name: string; code: string; description: string | null;
  monthlyPriceCents: number; yearlyPriceCents: number | null;
  trialEnabled: boolean; trialDays: number; badge: string | null;
  isFeatured: boolean; displayOrder: number; isActive: boolean; isPublic: boolean;
  maxProfessionals: number | null; maxClients: number | null; maxUnits: number | null; maxMessages: number | null;
  features: Array<{ id: string; code: string; name: string; enabled: boolean }>;
};
export type PendingCheckout = {
  id: string; planId: string | null; gateway: string; billingInterval: "MONTHLY" | "YEARLY";
  checkoutUrl: string | null; creationState: "READY" | "CREATING" | "CREATED" | "UNCERTAIN";
};
export type Regularization = {
  serverNow: string;
  trial: { active: boolean; endsAt: string | null; remainingDays: number; expired: boolean };
  financial: { requiresAction: boolean; status: string | null; paymentStatus?: string | null };
  context: { companyId?: string; role: AuthMe["memberships"][number]["role"] | null; systemRole?: AuthMe["systemRole"]; commercialApplicable?: boolean };
  companyId?: string | null;
  subscription?: null | {
    id: string; status: string; planId: string; planName: string; billingInterval: "MONTHLY" | "YEARLY";
    trialStartedAt: string | null; trialEndsAt: string | null; currentPeriodEnd: string | null;
    graceEndsAt: string | null; cancelAtPeriodEnd: boolean;
  };
  plans?: PublicPlan[];
  gateways?: Array<{ provider: Gateway["gateway"]; environment: Gateway["environment"]; capabilities: Capabilities }>;
  pendingCheckout?: PendingCheckout | null;
};
export type SubscriptionDetail = {
  id: string; status: string; billingInterval: string; gateway: string; environment: string | null;
  trialStartedAt: string | null; trialEndsAt: string | null; currentPeriodStart: string | null;
  currentPeriodEnd: string | null; graceEndsAt: string | null; canceledAt: string | null;
  cancellationRequestedAt: string | null; cancelAtPeriodEnd: boolean; createdAt: string;
  company: { name: string }; plan: { name: string }; payments: Array<{
    id: string; status: string; amountCents: number; refundedAmountCents: number; currency: string;
    gateway: string; environment: string | null; periodStart: string | null; periodEnd: string | null;
  }>;
};
