/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { JSDOM } = require('jsdom');
const loader = require('./helpers/load-ts.cjs');
const feature = (code, enabled = true) => ({ id: code, code, name: `API ${code}`, enabled });
const plan = (id, extra = {}) => ({ id, name: id, code: id, description: 'Descrição API', displayOrder: 1, monthlyPriceCents: 9900, yearlyPriceCents: null, trialEnabled: true, trialDays: 9, isFeatured: false, badge: null, maxProfessionals: 1, maxClients: 50, maxUnits: 1, maxMessages: 100, features: [feature('agenda')], ...extra });
const base = plan('Essencial');
const professional = plan('Profissional', { monthlyPriceCents: 14900, maxProfessionals: 5, features: [feature('agenda'), feature('financeiro'), feature('oculto', false)] });
const premium = plan('Premium', { monthlyPriceCents: 19900, maxProfessionals: null, features: [feature('agenda'), feature('financeiro'), feature('relatorios')] });
const load = loader({ 'next/link': ({ children, href }) => React.createElement('a', { href }, children), './auth-provider': { useAuth: () => ({ profile: { user: { id: 'owner' } } }) } });
const { recoveryPlanDetails } = load('lib/recovery-plan-details.ts');
test('upgrade summaries use real feature codes and only claim supported inheritance', () => {
  const details = recoveryPlanDetails(professional, base);
  assert.equal(details.inherits, 'Essencial');
  assert.equal(details.features.map(f => f.name).join(','), 'API financeiro');
  assert.equal(details.limits.map(([, key]) => key).join(','), 'maxProfessionals');
  assert.equal(recoveryPlanDetails(premium, professional).inherits, 'Profissional');
  assert.equal(recoveryPlanDetails(plan('Menor', { features: [] }), base).inherits, null);
  assert.equal(recoveryPlanDetails(plan('Restrito', { maxClients: 1, features: professional.features }), base).inherits, null);
});
test('compact catalog hides comparison, trial marketing and fake annual; default catalog is preserved', () => {
  const { PlanCatalog } = load('components/plans/plan-catalog.tsx');
  const props = { plans: [base, professional, premium], interval: 'MONTHLY', onInterval() {}, onSelect() {} };
  const compact = renderToStaticMarkup(React.createElement(PlanCatalog, { ...props, compact: true }));
  assert.match(compact, /Tudo do Essencial \+/);
  assert.match(compact, /Tudo do Profissional \+/);
  assert.doesNotMatch(compact, /Compare os planos|Teste disponível|Período de cobrança|Anual|API oculto/);
  assert.equal(new JSDOM(compact).window.document.querySelectorAll('button[aria-pressed]').length, 3);
  const normal = renderToStaticMarkup(React.createElement(PlanCatalog, props));
  assert.match(normal, /Compare os planos/);
  assert.match(normal, /Teste disponível: 9 dias/);
  assert.match(normal, /Período de cobrança/);
  assert.equal(new JSDOM(normal).window.document.querySelectorAll('input[name=plan]').length, 3);
});
test('compact recovery hides payment before selection; plans-only layout keeps its direct controls', () => {
  const { RegularizationPanel } = load('components/regularization-panel.tsx');
  const state = { trial: { expired: true }, financial: { status: 'EXPIRED', requiresAction: false }, plans: [base, professional, premium], gateways: [], subscription: null, pendingCheckout: null };
  const compact = renderToStaticMarkup(React.createElement(RegularizationPanel, { companyId: 'company', state, recovery: true, compactRecovery: true }));
  assert.match(compact, /Escolha seu plano/);
  assert.doesNotMatch(compact, /Assinatura e pagamentos|Atualizar estado|Compare os planos|Perguntas frequentes|Pronto para escolher|Meio de pagamento|Iniciar checkout|Continuar para pagamento/);
  const normal = renderToStaticMarkup(React.createElement(RegularizationPanel, { companyId: 'company', state, plansOnly: true }));
  const document = new JSDOM(normal).window.document;
  assert.ok(document.querySelector('form > fieldset > label > select'));
  assert.ok(document.querySelector('form > fieldset > button.commercial-primary'));
  assert.match(normal, /Compare os planos|Iniciar checkout/);
});
test('real annual catalog still offers a choice and missing annual prices stay unavailable', () => {
  const { PlanCatalog } = load('components/plans/plan-catalog.tsx');
  const markup = renderToStaticMarkup(React.createElement(PlanCatalog, { plans: [base, { ...premium, yearlyPriceCents: 199000 }], interval: 'YEARLY', onInterval() {}, onSelect() {}, compact: true }));
  assert.match(markup, /Anual/);
  const document = new JSDOM(markup).window.document;
  assert.equal(document.querySelector('article button').disabled, true);
  assert.equal(document.querySelectorAll('article button')[1].disabled, false);
});
