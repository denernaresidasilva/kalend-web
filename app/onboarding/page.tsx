"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { CalendarDays, CheckCircle2, ChevronRight, CircleUserRound, Clock3, ListPlus, Sparkles } from "lucide-react";

const steps = [
  { icon: CircleUserRound, title: "Revise os dados do responsável", detail: "Confira as informações da sua conta e mantenha seus dados atualizados.", href: "/conta" },
  { icon: Clock3, title: "Configure o horário de funcionamento", detail: "A configuração de horários estará disponível quando o módulo operacional for liberado." },
  { icon: ListPlus, title: "Cadastre seu primeiro serviço", detail: "O cadastro de serviços ainda não está disponível neste ambiente." },
  { icon: CalendarDays, title: "Prepare a agenda pública", detail: "A página pública de agendamento será habilitada após a disponibilização do módulo de agenda." },
];

export default function OnboardingPage() {
  const { profile, loading } = useAuth();
  const company = profile?.memberships.find(item => item.company.id === profile.selectedCompanyId)?.company;
  return <main className="kalend-ui lp-onboarding"><section className="lp-onboarding-card">
    <span className="lp-onboarding-icon"><Sparkles/></span>
    <p className="lp-onboarding-kicker">BOAS-VINDAS AO KALEND</p>
    <h1>Sua conta foi criada{company ? `, ${company.name}` : ""}.</h1>
    <p className="lp-onboarding-lead">Seu período de teste está ativo. Veja o que já pode fazer e o que está sendo preparado para sua empresa.</p>
    {loading ? <p role="status">Verificando sua sessão…</p> : !profile ? <p role="alert">Não encontramos uma sessão ativa. <Link href="/">Entre para continuar.</Link></p> : <>
      <div className="lp-onboarding-status"><CheckCircle2/><div><b>Conta e teste grátis ativos</b><span>Empresa vinculada à sua sessão segura. Nenhum pagamento foi criado.</span></div></div>
      <ol className="lp-onboarding-steps">{steps.map(({icon:Icon,title,detail,href},index)=><li key={title} className={href?"available":"upcoming"}><span className="lp-onboarding-step-number">0{index+1}</span><Icon/><div><b>{title}</b><p>{detail}</p></div>{href?<Link href={href} aria-label={`Abrir: ${title}`}><ChevronRight/></Link>:<span className="lp-upcoming-label">Em evolução</span>}</li>)}</ol>
      <div className="lp-onboarding-actions"><Link className="lp-onboarding-primary" href="/conta">Abrir minha conta</Link><Link href="/lp#planos">Consultar planos</Link></div>
    </>}
    <small>O Kalend não solicita cartão para iniciar o teste. Recursos operacionais serão apresentados quando estiverem disponíveis.</small>
  </section></main>;
}
