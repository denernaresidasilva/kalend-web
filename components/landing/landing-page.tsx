"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, CalendarDays, Check, ChevronDown, Clock3, Eye, EyeOff, Menu, ShieldCheck, Sparkles, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "@/lib/api";
import type { PublicPlan } from "@/lib/contracts";
import { money } from "@/lib/commercial";
import { useRouter } from "next/navigation";
import { trackMarketingEvent, rememberAttribution, getCampaignAttribution, MarketingConsent } from "@/lib/landing-tracking";
import { KalendLogo } from "@/components/kalend-logo";

type TrialPlan = Pick<PublicPlan, "id" | "name" | "description" | "monthlyPriceCents" | "yearlyPriceCents" | "trialEnabled" | "trialDays" | "isFeatured" | "features" | "maxProfessionals" | "maxClients" | "maxUnits" | "maxMessages">;

const sections = [
  { id: "funcionalidades", label: "Funcionalidades" },
  { id: "como-funciona", label: "Como funciona" },
  { id: "para-quem", label: "Para quem é" },
  { id: "planos", label: "Planos" },
  { id: "faq", label: "Perguntas frequentes" },
];

const benefits = [
  { icon: CalendarDays, title: "Agenda organizada", body: "As ferramentas de agenda estão em desenvolvimento no produto." },
  { icon: Clock3, title: "Mais praticidade", body: "A proposta do Kalend é simplificar rotinas conforme os módulos forem liberados." },
  { icon: UsersRound, title: "Clientes conectados", body: "Os recursos de CRM e relacionamento estão em desenvolvimento." },
  { icon: ShieldCheck, title: "Gestão centralizada", body: "O Super Admin está ativo; a gestão operacional das empresas está em evolução." },
];

const features = [
  { number: "01", title: "Atraia e agende", body: "Apresente seus serviços e facilite o contato de quem deseja conhecer seu negócio.", status: "Agenda pública em desenvolvimento", icon: CalendarDays },
  { number: "02", title: "Organize e venda", body: "O Kalend está preparando ferramentas para reunir a rotina da operação.", status: "PDV, caixa e comandas em desenvolvimento", icon: Clock3 },
  { number: "03", title: "Relacione e fidelize", body: "Construa um relacionamento contínuo com seus clientes conforme os recursos forem disponibilizados.", status: "CRM e fidelidade em desenvolvimento", icon: UsersRound },
];

const faq = [
  { q: "Preciso informar um cartão para começar?", a: "Não. O cadastro de teste grátis não solicita dados de pagamento. A duração depende do plano elegível exibido no catálogo." },
  { q: "Quanto tempo dura o teste?", a: "A página consulta os planos públicos do Kalend e mostra a duração configurada para cada plano. O servidor valida novamente a elegibilidade no cadastro." },
  { q: "O Kalend já tem todos os módulos operacionais?", a: "A plataforma está em evolução. Nesta página, recursos em desenvolvimento são identificados claramente e não são apresentados como disponíveis." },
  { q: "Posso acessar pelo celular?", a: "O site é responsivo. A disponibilidade de cada recurso depende do módulo e do plano publicado; aplicativos nativos não são anunciados como disponíveis." },
];

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  if (!digits) return "";
  const international = digits.startsWith("55") ? digits : `55${digits}`;
  const local = international.slice(2);
  if (local.length < 3) return `+55 (${local}`;
  const ddd = local.slice(0, 2);
  const rest = local.slice(2);
  return `+55 (${ddd}) ${rest.length > 8 ? rest.slice(0, 5) + (rest.length > 5 ? `-${rest.slice(5)}` : "") : rest.length > 4 ? rest.slice(0, 4) + `-${rest.slice(4)}` : rest}`;
}

function LandingMockup() {
  return <div className="lp-visual" aria-label="Ilustração conceitual de uma plataforma de gestão">
    <div className="lp-orbit lp-orbit-one" /><div className="lp-orbit lp-orbit-two" />
    <div className="lp-dashboard">
      <div className="lp-dash-side"><span className="lp-mini-mark"><CalendarDays size={17}/></span><i/><i/><i/><i/></div>
      <div className="lp-dash-main"><div className="lp-dash-top"><span>VISÃO DO NEGÓCIO</span><b>Hoje <ChevronDown size={13}/></b></div>
        <div className="lp-dash-title"><strong>Bom dia!</strong><small>Acompanhe sua operação</small></div>
        <div className="lp-stat-row"><div><small>AGENDA</small><b>Organizada</b><span className="lp-stat-line"/></div><div><small>CLIENTES</small><b>Em contexto</b><span className="lp-stat-line shorter"/></div></div>
        <div className="lp-calendar"><div className="lp-cal-head"><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span></div>{[0,1,2,3].map((row)=><div className="lp-cal-row" key={row}><span>{row + 9}:00</span><i/><i/><i/><i/><i/></div>)}</div>
      </div>
      <div className="lp-float-card"><span><Sparkles size={14}/></span><div><b>Mais clareza</b><small>Uma rotina mais organizada</small></div></div>
    </div>
    <span className="lp-visual-note">Prévia conceitual da experiência Kalend</span>
  </div>;
}

export function LandingPage() {
  const [plans, setPlans] = useState<TrialPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TrialPlan | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const modal = useRef<HTMLDialogElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const signupStarted = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!signupSuccess) return;
    const timer = window.setTimeout(() => router.replace("/"), 2400);
    return () => window.clearTimeout(timer);
  }, [router, signupSuccess]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        if (!API_URL) throw new Error("API indisponível");
        const response = await fetch(`${API_URL}/plans/public`, { credentials: "omit", cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Catálogo indisponível");
        const rows: PublicPlan[] = await response.json();
        setPlans(rows.filter(plan => plan.isActive && plan.isPublic && plan.trialEnabled && plan.trialDays > 0));
      } catch { if (!controller.signal.aborted) setPlansError(true); }
      finally { if (!controller.signal.aborted) setPlansLoading(false); }
    })();
    rememberAttribution();
    trackMarketingEvent("lp_view");
    const pricing = document.getElementById("planos");
    let pricingObserver: IntersectionObserver | undefined;
    if (pricing) {
      pricingObserver = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { trackMarketingEvent("pricing_view"); pricingObserver?.disconnect(); }
      }, { threshold: 0.25 });
      pricingObserver.observe(pricing);
    }
    return () => { controller.abort(); pricingObserver?.disconnect(); };
  }, []);

  const trialCards = useMemo(() => plans, [plans]);
  function openSignup(plan: TrialPlan) {
    signupStarted.current = false;
    setSelectedPlan(plan);
    trackMarketingEvent("plan_selected", { plan_id: plan.id });
    trackMarketingEvent("trial_modal_open", { plan_id: plan.id });
    modal.current?.showModal();
    requestAnimationFrame(() => firstField.current?.focus());
  }
  function closeSignup() { modal.current?.close(); }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPlan) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    if (password !== confirmPassword) { const field = form.elements.namedItem("confirmPassword") as HTMLInputElement; field.setCustomValidity("As senhas não coincidem."); field.reportValidity(); return; }
    trackMarketingEvent("trial_signup_submitted", { plan_id: selectedPlan.id });
    const data = {
      companyName: formData.get("companyName"), ownerName: formData.get("ownerName"),
      whatsapp: String(formData.get("whatsapp") ?? "").replace(/[\s()-]/g, ""),
      email: formData.get("email"), password, confirmPassword,
      planId: selectedPlan.id, acceptTerms: formData.get("acceptTerms") === "on",
      marketingConsent: formData.get("marketingConsent") === "on", website: formData.get("website"),
      attribution: getCampaignAttribution(),
    };
    const button = form.querySelector<HTMLButtonElement>("[type=submit]");
    const message = form.querySelector<HTMLElement>("[data-form-message]");
    if (button) { button.disabled = true; button.textContent = "Criando sua conta…"; }
    if (message) { message.textContent = ""; message.dataset.state = ""; }
    try {
      if (!API_URL) throw new Error("O serviço de cadastro está indisponível agora.");
      const response = await fetch(`${API_URL}/auth/trial-signup`, {
        method: "POST", credentials: "include", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!response.ok) {
        if (response.status === 409 || response.status === 403) throw new Error("Não foi possível concluir o cadastro com esses dados. Se você já tem uma conta, acesse Entrar ou contate o suporte para recuperar o acesso. O Kalend não substitui identidades existentes.");
        if (response.status === 429) throw new Error("Muitas tentativas. Aguarde um pouco e tente novamente.");
        throw new Error("Não foi possível criar sua conta agora. Confira os dados e tente novamente.");
      }
      const result = await response.json();
      if (result.created !== true) throw new Error("Não foi possível confirmar o cadastro. Tente entrar antes de enviar novamente.");
      form.reset();
      trackMarketingEvent("trial_signup_success", { plan_id: selectedPlan.id });
      setSignupSuccess(true);
    } catch (error) {
      if (message) { message.textContent = error instanceof Error ? error.message : "Não foi possível criar sua conta."; message.dataset.state = "error"; }
      trackMarketingEvent("trial_signup_error", { plan_id: selectedPlan.id });
      if (button) { button.disabled = false; button.textContent = "Criar minha conta grátis"; }
    }
  }

  return <main className="lp-root">
    <header className="lp-header"><Link href="/lp" aria-label="Kalend, página inicial"><KalendLogo /></Link>
      <nav className={mobileMenu ? "lp-nav lp-nav-open" : "lp-nav"} aria-label="Navegação principal">{sections.map(item=><a key={item.id} href={`#${item.id}`} onClick={()=>setMobileMenu(false)}>{item.label}</a>)}</nav>
      <div className="lp-header-actions"><Link href="/">Entrar</Link><a className="lp-button lp-button-small" href="#planos" onClick={()=>trackMarketingEvent("hero_cta_click")}>Começar grátis <ArrowRight size={15}/></a><button className="lp-menu-toggle" type="button" aria-label={mobileMenu ? "Fechar menu" : "Abrir menu"} aria-expanded={mobileMenu} onClick={()=>setMobileMenu(v=>!v)}>{mobileMenu?<X/>:<Menu/>}</button></div>
    </header>

    <section className="lp-hero"><div className="lp-container lp-hero-grid"><div className="lp-hero-copy"><span className="lp-kicker"><Sparkles size={15}/> A plataforma para negócios que trabalham com agendamentos</span><h1>Você cuida dos seus clientes.<br/><em>O Kalend cuida do resto.</em></h1><p>Agenda, gestão de clientes, automações e fidelização em uma plataforma em evolução. Organize seu negócio e tenha mais clareza sobre a operação.</p><div className="lp-hero-actions"><a className="lp-button" href="#planos" onClick={()=>trackMarketingEvent("hero_cta_click")}>Começar meu teste grátis <ArrowRight size={18}/></a><a className="lp-button lp-button-quiet" href="#funcionalidades">Conhecer o Kalend <ArrowDown size={17}/></a></div><ul className="lp-proof"><li><Check/> Sem cartão de crédito</li><li><Check/> Planos e trial validados pelo Kalend</li><li><Check/> Acesso pelo navegador</li></ul></div><LandingMockup/></div></section>

    <section className="lp-benefits"><div className="lp-container lp-benefit-grid">{benefits.map(({icon:Icon,title,body})=><article key={title}><span><Icon size={21}/></span><div><h2>{title}</h2><p>{body}</p></div></article>)}</div></section>

    <section className="lp-section lp-features" id="funcionalidades"><div className="lp-container"><div className="lp-section-heading"><span className="lp-kicker">A JORNADA KALEND</span><h2>Três caminhos para uma gestão mais clara.</h2><p>Conheça a direção dos módulos do produto. Os recursos ainda em desenvolvimento estão identificados sem promessas de disponibilidade.</p></div><div className="lp-feature-grid">{features.map(({number,title,body,status,icon:Icon})=><article className="lp-feature-card" key={number}><span className="lp-feature-number">{number}</span><div className="lp-feature-icon"><Icon size={24}/></div><h3>{title}</h3><p>{body}</p><span className="lp-status">{status}</span></article>)}</div></div></section>

    <section className="lp-agenda lp-section"><div className="lp-container lp-split"><div className="lp-agenda-art"><div className="lp-phone"><div className="lp-phone-notch"/><small>KALEND · PRÉVIA</small><h3>Seu próximo passo começa aqui.</h3><div className="lp-phone-line"/><div className="lp-phone-line short"/><div className="lp-phone-slot"><CalendarDays/> Ferramentas de agenda <b>Em evolução</b></div><div className="lp-phone-slot muted"><Clock3/> Rotina da empresa <b>Em evolução</b></div></div></div><div className="lp-split-copy"><span className="lp-kicker">AGENDA E ATENDIMENTO</span><h2>Uma experiência pensada para a rotina do seu negócio.</h2><p>O Kalend está construindo uma jornada que conecta apresentação de serviços, horários e gestão de atendimentos. Consulte a disponibilidade real dos módulos antes de iniciar.</p><ul className="lp-check-list"><li><Check/> Visão centralizada da operação</li><li><Check/> Experiência acessível em telas menores</li><li><Check/> Recursos publicados conforme plano</li></ul><a href="#planos" className="lp-text-link">Consultar planos disponíveis <ArrowRight size={16}/></a></div></div></section>

    <section className="lp-automation lp-section"><div className="lp-container lp-split lp-split-reverse"><div className="lp-split-copy"><span className="lp-kicker">COMUNICAÇÃO COM RESPONSABILIDADE</span><h2>Mensagens no momento certo, respeitando permissões e preferências.</h2><p>O produto oferece configurações de comunicação e notificações. A disponibilidade depende do canal conectado, autorização do destinatário e homologação do provedor.</p><div className="lp-channel-grid"><div><span>01</span><b>E-mail</b><small>Conforme configuração</small></div><div><span>02</span><b>WhatsApp</b><small>Canal conectado e autorizado</small></div><div><span>03</span><b>Push Web</b><small>Com permissão e dispositivo ativo</small></div></div></div><div className="lp-message-art"><div className="lp-message-card"><span className="lp-message-avatar">K</span><div><small>Kalend · canais configuráveis</small><b>Preferências sempre importam.</b><p>Mensagens dependem de configuração, autorização e disponibilidade.</p></div><ShieldCheck className="lp-message-shield"/></div><div className="lp-message-orb"/></div></div></section>

    <section className="lp-dark-section lp-section"><div className="lp-container lp-dark-inner"><span className="lp-kicker">UMA PLATAFORMA EM EVOLUÇÃO</span><h2>Seu negócio acompanha você.</h2><p>Conheça a experiência Kalend pelo navegador em diferentes tamanhos de tela. Recursos e aplicativos são divulgados somente quando estiverem disponíveis.</p><div className="lp-device-row"><div className="lp-device lp-device-desktop"><div className="lp-device-head"><i/><i/><i/><span>kalend</span></div><div className="lp-device-content"><b>Um espaço para organizar sua operação.</b><div/><div/><div/></div></div><div className="lp-device lp-device-tablet"><div className="lp-device-content"><b>Seu negócio em contexto.</b><div/><div/><div/></div></div><div className="lp-device lp-device-phone"><div className="lp-device-content"><b>Kalend</b><div/><div/></div></div></div></div></section>

    <section className="lp-audience lp-section" id="para-quem"><div className="lp-container"><div className="lp-section-heading"><span className="lp-kicker">FEITO PARA QUEM ATENDE</span><h2>Para negócios que valorizam cada atendimento.</h2><p>Conheça o Kalend e avalie se a plataforma combina com a realidade da sua empresa.</p></div><div className="lp-audience-grid">{["Salões de beleza","Barbearias","Estética","Atendimentos especializados","Nail designers","Negócios com agendamento"].map((name,index)=><article key={name}><span>0{index+1}</span><b>{name}</b><small>Disponibilidade de recursos conforme evolução do produto.</small></article>)}</div></div></section>

    <section className="lp-how lp-section" id="como-funciona"><div className="lp-container"><div className="lp-section-heading"><span className="lp-kicker">COMO COMEÇAR</span><h2>Comece em três passos simples.</h2></div><div className="lp-steps"><article><span>01</span><h3>Escolha um plano</h3><p>Confira os valores, limites e duração do teste publicados no catálogo.</p></article><article><span>02</span><h3>Crie sua conta</h3><p>Informe os dados básicos da empresa e do responsável.</p></article><article><span>03</span><h3>Conheça o Kalend</h3><p>Acesse sua conta e acompanhe a configuração inicial disponível.</p></article></div></div></section>

    <section className="lp-pricing lp-section" id="planos"><div className="lp-container"><div className="lp-section-heading"><span className="lp-kicker">PLANOS KALEND</span><h2>Seu próximo passo começa com transparência.</h2><p>Valores e condições carregados do catálogo publicado. Teste grátis sem cartão quando o plano for elegível.</p></div>{plansLoading ? <div className="lp-plan-state" role="status">Carregando planos publicados…</div> : plansError ? <div className="lp-plan-state" role="alert">Não foi possível carregar os planos agora. Tente novamente mais tarde.</div> : !trialCards.length ? <div className="lp-plan-state" role="status">Nenhum plano está elegível para teste grátis no momento.</div> : <div className="lp-plans-grid">{trialCards.map(plan=>{const annualSaving=plan.yearlyPriceCents===null?0:plan.monthlyPriceCents*12-plan.yearlyPriceCents;return <article className={plan.isFeatured?"lp-plan lp-plan-featured":"lp-plan"} key={plan.id}><div className="lp-plan-top"><span>{plan.isFeatured?"DESTAQUE":"PLANO KALEND"}</span><h3>{plan.name}</h3><p>{plan.description || "Recursos e limites conforme catálogo."}</p></div><div className="lp-price"><strong>{money(plan.monthlyPriceCents)}</strong><small>/ mês</small></div>{plan.yearlyPriceCents !== null && <p className="lp-year-price">ou {money(plan.yearlyPriceCents)} por ano{annualSaving>0?` · economize ${money(annualSaving)}`:""}</p>}<p className="lp-trial">{plan.trialDays} dias de teste grátis</p><ul>{plan.features.filter(f=>f.enabled).slice(0,7).map(feature=><li key={feature.id}><Check size={16}/>{feature.name}</li>)}</ul><dl className="lp-plan-limits"><div><dt>Profissionais</dt><dd>{plan.maxProfessionals??"Sem limite publicado"}</dd></div><div><dt>Clientes</dt><dd>{plan.maxClients??"Sem limite publicado"}</dd></div><div><dt>Unidades</dt><dd>{plan.maxUnits??"Sem limite publicado"}</dd></div><div><dt>Mensagens</dt><dd>{plan.maxMessages??"Sem limite publicado"}</dd></div></dl><button type="button" className="lp-button lp-plan-cta" onClick={()=>openSignup(plan)}>Testar grátis este plano <ArrowRight size={16}/></button><small className="lp-plan-foot">Sem cartão. Elegibilidade confirmada no cadastro.</small></article>})}</div>}</div></section>

    <section className="lp-faq lp-section" id="faq"><div className="lp-container lp-faq-layout"><div><span className="lp-kicker">PERGUNTAS FREQUENTES</span><h2>Informação clara para começar.</h2><p>Consulte as condições reais do produto antes de criar sua conta.</p></div><div className="lp-faq-list">{faq.map((item,index)=><article key={item.q}><button type="button" aria-expanded={openFaq===index} onClick={()=>setOpenFaq(openFaq===index?null:index)}>{item.q}<ChevronDown size={18}/></button>{openFaq===index&&<p>{item.a}</p>}</article>)}</div></div></section>

    <section className="lp-final"><div className="lp-container lp-final-inner"><span className="lp-kicker">PRONTO PARA CONHECER?</span><h2>Comece seu teste grátis sem cartão.</h2><p>Consulte os planos públicos e escolha uma opção elegível.</p><a className="lp-button" href="#planos" onClick={()=>trackMarketingEvent("hero_cta_click")}>Criar minha conta grátis <ArrowRight size={18}/></a></div></section>
    <footer className="lp-footer"><div className="lp-container lp-footer-inner"><Link href="/lp"><KalendLogo/></Link><p>© Kalend. Gestão para negócios que trabalham com agendamentos.</p><nav aria-label="Links legais"><Link href="/termos">Termos de Uso</Link><Link href="/privacidade">Privacidade</Link><Link href="/">Entrar</Link></nav></div></footer>
    <MarketingConsent />

    <dialog ref={modal} className="lp-modal" onClick={event=>{if(event.target===modal.current)closeSignup();}} onCancel={closeSignup} aria-labelledby="lp-modal-title">
      <button type="button" className="lp-modal-close" aria-label="Fechar cadastro" onClick={closeSignup}><X/></button>
      <div className="lp-modal-heading"><span className="lp-kicker">TESTE GRÁTIS · SEM CARTÃO</span><h2 id="lp-modal-title">Sua jornada com o Kalend começa aqui.</h2><p>Crie sua conta e conheça os recursos disponíveis para sua empresa.</p>{selectedPlan&&<div className="lp-selected-plan"><span>Plano selecionado</span><b>{selectedPlan.name}</b><small>{selectedPlan.trialDays} dias de teste · plano mensal de {money(selectedPlan.monthlyPriceCents)} após contratação, conforme condições do plano</small></div>}</div>
      {signupSuccess ? <section className="lp-signup-success" role="status" aria-live="polite"><span className="lp-kicker">TESTE GRÁTIS · SEM CARTÃO</span><h3>Conta criada com sucesso!</h3><p>Sua empresa já está cadastrada no Kalend. Agora entre com seu e-mail e senha para acessar o sistema.</p><Link className="lp-button lp-submit" href="/" onClick={event=>{event.preventDefault();router.replace("/");}}>Ir para login <ArrowRight size={17}/></Link><small>Você será direcionado ao login em instantes.</small></section> : <form className="lp-signup-form" onSubmit={submitSignup} onInput={event=>{const target=event.target as HTMLInputElement;if(target.name==="confirmPassword")target.setCustomValidity("");if(target.name&&!signupStarted.current){signupStarted.current=true;trackMarketingEvent("trial_signup_started",{plan_id:selectedPlan?.id});}}}>
        <label>Nome da empresa<input ref={firstField} name="companyName" autoComplete="organization" maxLength={120} required/></label>
        <label>Nome do responsável<input name="ownerName" autoComplete="name" maxLength={120} required/></label>
        <label>WhatsApp<input name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="+55 (11) 99999-9999" maxLength={22} onChange={event=>{event.currentTarget.value=formatPhone(event.currentTarget.value)}} required/></label>
        <label>E-mail<input name="email" type="email" autoComplete="email" maxLength={254} required/></label>
        <label>Senha<span className="lp-password-wrap"><input name="password" type={showPassword?"text":"password"} autoComplete="new-password" minLength={12} required aria-describedby="lp-password-help"/><button type="button" aria-label={showPassword?"Ocultar senha":"Mostrar senha"} onClick={()=>setShowPassword(value=>!value)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></span><small id="lp-password-help">Use 12 ou mais caracteres, com maiúscula, minúscula, número e símbolo.</small></label>
        <label>Confirmar senha<span className="lp-password-wrap"><input name="confirmPassword" type={showPassword?"text":"password"} autoComplete="new-password" minLength={12} required/><button type="button" aria-label={showPassword?"Ocultar senha":"Mostrar senha"} onClick={()=>setShowPassword(value=>!value)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></span></label>
        <label className="lp-consent"><input name="acceptTerms" type="checkbox" required/><span>Li e aceito os <Link href="/termos" target="_blank" rel="noreferrer">Termos de Uso</Link> e a <Link href="/privacidade" target="_blank" rel="noreferrer">Política de Privacidade</Link>.</span></label>
        <label className="lp-consent"><input name="marketingConsent" type="checkbox"/><span>Quero receber novidades e comunicações promocionais. Este consentimento é opcional e separado do cadastro.</span></label>
        <label className="lp-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
        <p className="lp-form-message" data-form-message role="status" aria-live="polite"/>
        <button type="submit" className="lp-button lp-submit">Criar minha conta grátis <ArrowRight size={17}/></button>
        <small className="lp-modal-foot">Nenhum cartão será solicitado para iniciar o período de teste. Se este e-mail já possui uma conta, entre para continuar; ele não será associado automaticamente.</small>
      </form>}
    </dialog>
  </main>;
}
