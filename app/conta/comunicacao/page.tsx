"use client";
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { EvolutionSettings } from '@/components/evolution-settings';
import { EmailSettings } from '@/components/email-settings';
import { CommunicationOperations } from '@/components/communication-operations';
export default function CompanyCommunicationPage() {
  const { profile, loading } = useAuth();
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const membership = profile?.memberships.find(m => m.company.id === profile.selectedCompanyId);
  if (loading) return <main className="kalend-ui k-plans-container" role="status">Verificando sessão…</main>;
  const global = profile?.systemRole === 'SUPER_ADMIN';
  if (!global && (!membership || !['OWNER', 'ADMIN'].includes(membership.role))) return <main className="kalend-ui k-plans-container"><p>Acesso não autorizado aos canais desta empresa.</p><Link href="/conta">Minha conta</Link></main>;
  return <CommunicationOperations><main className="kalend-ui k-plans-container"><Link href="/conta#preferencias">← Minha conta</Link><h1>Comunicação</h1><h2>{global ? 'Canais do Kalend' : 'Canais da empresa'}</h2>
    <nav className="k-actions" aria-label="Canais"><button aria-pressed={channel === 'whatsapp'} onClick={() => setChannel('whatsapp')}>WhatsApp</button><button aria-pressed={channel === 'email'} onClick={() => setChannel('email')}>E-mail</button></nav>
    {channel === 'whatsapp' ? <EvolutionSettings scope={global ? 'GLOBAL' : 'COMPANY'} /> : <EmailSettings scope={global ? 'SYSTEM' : 'COMPANY'} />}
  </main></CommunicationOperations>;
}
