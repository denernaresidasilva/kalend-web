"use client";

import { useState, useSyncExternalStore } from "react";

type MarketingEvent = "lp_view" | "hero_cta_click" | "pricing_view" | "plan_selected" | "trial_modal_open" | "trial_signup_started" | "trial_signup_submitted" | "trial_signup_success" | "trial_signup_error" | "onboarding_started";
type EventPayload = { plan_id?: string; signup_id?: string };
const CONSENT_KEY = "kalend:marketing-consent:v1";
const ATTRIBUTION_KEY = "kalend:campaign-attribution:v1";
const subscribeConsent = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("kalend:marketing-consent", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("kalend:marketing-consent", callback); };
};

function consented() {
  try { return localStorage.getItem(CONSENT_KEY) === "accepted"; } catch { return false; }
}

function loadConfiguredTags() {
  if (document.querySelector("script[data-kalend-tracking]")) return;
  const gtm = process.env.NEXT_PUBLIC_GTM_ID?.trim();
  const ga = process.env.NEXT_PUBLIC_GA4_ID?.trim();
  const meta = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const ads = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim();
  if (gtm) {
    const script = document.createElement("script");
    script.async = true;
    script.dataset.kalendTracking = "gtm";
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtm)}`;
    document.head.append(script);
    return; // GTM owns tags when configured, preventing duplicate direct integrations.
  }
  if (ga || ads) {
    const id = ga || ads!;
    const script = document.createElement("script");
    script.async = true;
    script.dataset.kalendTracking = "gtag";
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.append(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
    window.gtag("js", new Date());
    if (ga) window.gtag("config", ga, { send_page_view: false });
    if (ads) window.gtag("config", ads, { send_page_view: false });
  }
  if (meta) {
    const script = document.createElement("script");
    script.dataset.kalendTracking = "meta";
    script.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${meta.replace(/[^a-zA-Z0-9_-]/g, "")}');`;
    document.head.append(script);
  }
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function rememberAttribution() {
  if (!consented()) return;
  const params = new URLSearchParams(window.location.search);
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "gbraid", "wbraid", "fbclid"];
  const attribution = Object.fromEntries(keys.map(key => [key, params.get(key)]).filter(([, value]) => value));
  if (Object.keys(attribution).length) {
    try { sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution)); } catch { /* browser privacy mode */ }
  }
}

export function getCampaignAttribution(): Record<string, string> {
  if (!consented()) return {};
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed as Record<string, string> : {};
  } catch { return {}; }
}

export function trackMarketingEvent(name: MarketingEvent, payload: EventPayload = {}) {
  if (typeof window === "undefined" || !consented()) return;
  loadConfiguredTags();
  if (name === "trial_signup_success") {
    try {
      const key = payload.signup_id ? `kalend:trial-conversion:${payload.signup_id}` : "kalend:trial-conversion-recorded:v1";
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch { /* event remains in memory for this navigation */ }
  }
  const safePayload = payload.plan_id ? { plan_id: payload.plan_id } : {};
  window.dataLayer?.push({ event: name, ...safePayload });
  window.gtag?.("event", name, safePayload);
  if (name === "trial_signup_success") {
    const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim();
    const conversionLabel = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL?.trim();
    if (adsId && conversionLabel) window.gtag?.("event", "conversion", { send_to: `${adsId}/${conversionLabel}` });
    window.fbq?.("track", "CompleteRegistration", safePayload);
  }
}

export function MarketingConsent() {
  const [dismissed, setDismissed] = useState(false);
  const visible = useSyncExternalStore(subscribeConsent, () => !consented(), () => false);
  function save(value: "accepted" | "declined") {
    try { localStorage.setItem(CONSENT_KEY, value); } catch { /* persist consent only when available */ }
    window.dispatchEvent(new Event("kalend:marketing-consent"));
    setDismissed(true);
    if (value === "accepted") {
      loadConfiguredTags();
      rememberAttribution();
      trackMarketingEvent("lp_view");
    }
  }
  if (!visible || dismissed) return null;
  return <aside className="lp-consent-banner" aria-label="Preferências de privacidade"><div><b>Privacidade e medição</b><p>Com sua autorização, usamos cookies e identificadores para medir campanhas e melhorar a divulgação. Não enviamos senha, e-mail ou telefone para analytics.</p></div><div><button type="button" onClick={()=>save("declined")}>Agora não</button><button type="button" onClick={()=>save("accepted")}>Aceitar medição</button></div></aside>;
}
