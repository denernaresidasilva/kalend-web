import type { PublicPlan } from "./contracts";
import { planLimits } from "./plan-presentation";

// Claim inheritance only when the published features AND limits support it.
export function recoveryPlanDetails(plan: PublicPlan, previous?: PublicPlan) {
  const enabled = plan.features.filter(feature => feature.enabled);
  const base = previous?.features.filter(feature => feature.enabled) ?? [];
  const identity = (feature: PublicPlan["features"][number]) => feature.code || feature.name;
  const extra = enabled.filter(feature => !base.some(other => identity(other) === identity(feature)));
  const changedLimits = planLimits.filter(([, key]) => previous?.[key] !== plan[key]);
  const inherits = !!previous && base.every(feature => enabled.some(other => identity(other) === identity(feature))) &&
    planLimits.every(([, key]) => {
      const from = previous[key], to = plan[key];
      return from === null ? to === null : typeof from === "number" && (to === null || typeof to === "number" && to >= from);
    }) && (extra.length > 0 || changedLimits.length > 0);
  return {
    inherits: inherits ? previous!.name : null,
    features: (inherits ? extra : enabled).slice(0, 4),
    limits: (inherits ? changedLimits : planLimits).filter(([, key]) => plan[key] === null || typeof plan[key] === "number"),
  };
}
