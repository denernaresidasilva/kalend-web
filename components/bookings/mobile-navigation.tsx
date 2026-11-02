"use client";
import Link from "next/link";
import { CalendarDays, LayoutDashboard, Bell, UserRound } from "lucide-react";
import type { AuthMe } from "@/lib/contracts";
import { accountDestination } from "@/lib/company-selection";
export function MobileNavigation({ profile }: { profile: AuthMe }) {
  const destination = accountDestination(profile);
  if (profile.systemRole === "SUPER_ADMIN" || !destination.startsWith("/painel/")) return null;
  return <nav className="k-mobile-bottom" aria-label="Atalhos do aplicativo"><Link href={destination}><LayoutDashboard size={20} aria-hidden="true" /><span>Painel</span></Link><Link href={`${destination}#agenda`}><CalendarDays size={20} aria-hidden="true" /><span>Agenda</span></Link><Link href="/conta/notificacoes"><Bell size={20} aria-hidden="true" /><span>Avisos</span></Link><Link href="/conta"><UserRound size={20} aria-hidden="true" /><span>Conta</span></Link></nav>;
}
