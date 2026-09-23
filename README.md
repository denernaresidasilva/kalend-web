This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## API do Kalend

As páginas do Super Admin usam a URL centralizada em `lib/api.ts`.
Configure no ambiente de build ou em `.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=https://api.kalend.tech
```

Sem configuração, o padrão continua sendo a API HTTPS de produção.
A variável é pública e incorporada ao JavaScript durante o build: não coloque
segredos nela e refaça o build/deploy após alterá-la.

A criação manual consulta `GET /plans/public`, filtra os planos ativos e envia
`POST /companies/manual` com `planId`, `billingInterval` (MONTHLY/YEARLY) e
`startWithTrial`. Não há integração de pagamento neste formulário.

Para acessar a API diretamente de `https://dev.kalend.tech`, a API/infraestrutura
deve permitir essa origem no CORS, tanto nas respostas GET quanto no preflight
OPTIONS e na resposta POST do cadastro manual. Configurar a URL pública não
substitui essa permissão.

Diagnóstico em 23/09/2026: GET /plans e GET /plans/public retornaram HTTP 200
com três planos ativos, mas sem Access-Control-Allow-Origin para a origem dev.
OPTIONS /companies/manual retornou 204 também sem esse cabeçalho.
Para a origem https://kalend.tech, GET /plans retornou o cabeçalho correspondente.
Esse bloqueio faz o navegador rejeitar fetch mesmo com uma resposta HTTP 200.
