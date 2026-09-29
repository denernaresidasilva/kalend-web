export type CommercialIssue = {
  code: "PLAN_LIMIT_REACHED" | "PLAN_FEATURE_UNAVAILABLE" | "SUBSCRIPTION_REQUIRED";
  feature?: "professionals" | "clients" | "units" | "messages";
  current?: number; limit?: number; upgradeRequired?: boolean;
};
export function parseCommercialIssue(value: unknown): CommercialIssue | undefined {
  if (!value || typeof value !== "object") return;
  const d = value as Record<string, unknown>;
  if (!["PLAN_LIMIT_REACHED", "PLAN_FEATURE_UNAVAILABLE", "SUBSCRIPTION_REQUIRED"].includes(String(d.code))) return;
  const result: CommercialIssue = { code: d.code as CommercialIssue["code"] };
  if (["professionals", "clients", "units", "messages"].includes(String(d.feature))) result.feature = d.feature as CommercialIssue["feature"];
  if (Number.isSafeInteger(d.current) && (d.current as number) >= 0) result.current = d.current as number;
  if (Number.isSafeInteger(d.limit) && (d.limit as number) >= 0) result.limit = d.limit as number;
  if (typeof d.upgradeRequired === "boolean") result.upgradeRequired = d.upgradeRequired;
  return result;
}
