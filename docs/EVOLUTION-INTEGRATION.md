# Evolution — contrato de sessão e interface Kalend

Atualizado em 07/10/2026. Implementação/testes locais, sem commit, push, deploy, restart ou operações na Evolution real.

## Contextos

Super Admin usa GLOBAL, sem selectedCompanyId, em `/communication/evolution`; backend AdminGuard. Empresa usa `/company/communication/evolution`, TenantGuard OWNER/ADMIN e companyId da sessão. Frontend verifica usuário/empresa antes do request e invalida respostas em mudança de sessão/tenant. Não há seleção de instanceName, ambiente ou credencial pelo navegador.

O origin da API vem exclusivamente de NEXT_PUBLIC_API_URL no build Web. Não existe variável pública de API key Evolution nem request direto ao provider. Nomes DEV/produção e webhook são definidos pelo backend; ver [documentação API](../../kalend-api/docs/EVOLUTION-INTEGRATION.md).

## Contrato

`lib/evolution.ts` define um único EvolutionConnection para get/prepare/connect/reconnect/pairing/logout/delete e para o pareamento global legado. Contém status, qrCode/qrExpiresAt, pairingCode/pairingExpiresAt, attemptExpiresAt, disconnectReason, operationPending, pairingSupported, perfil conectado e errorCode/message seguros. API não entrega credenciais, lease, ciphertext ou telefone digitado na tentativa. Não usar connected:boolean para o pareamento legado; testes de saúde/envio continuam com seus resultados próprios.

Estados preservados: PENDING, CREATED, CREATING, DELETING, CONNECTING, QR_AVAILABLE, CONNECTED, DISCONNECTED, ERROR. Somente confirmação open marca CONNECTED; QR ou HTTP bem-sucedido não comprovam conexão.

## QR e telefone

Configurar prepara a instância; painel GLOBAL aberto pela seção Canais prepara automaticamente. Abertura preserva sessão/tentativa existente, inclusive PHONE legado. Botão Conectar usando QR Code solicita/reutiliza QR; não cancela tentativa válida para atualizá-la.

Evolution → webhook → snapshot cifrado temporário no PostgreSQL → consulta Kalend → imagem PNG no painel. Não é necessário recuperar imagem novamente da Evolution. Browser mantém o resultado somente no estado React, sem localStorage/sessionStorage. Código expirado é ocultado, com instrução de pedir novo código na mesma conexão; não há restart em polling.

Conectar usando número abre formulário. Separadores são removidos preservando todos os dígitos: `+55 (12) 99605-5129` → `5512996055129`. POST pairing-code envia `{phone}`; backend preserva telefone cifrado por até cinco minutos para a operação. Código aparece como **Código de conexão**, com instruções do WhatsApp, sem reformatar o valor. Se só houver QR, ele pode aparecer com aviso de pairing pendente. Reconnect usa número preservado enquanto a tentativa existe; após logout/encerramento/expiração total é necessário informar o telefone novamente.

QR tem janela local de 60s, pairing 120s; tentativa total 5min e espera inicial sem código 60s. Esses limites não são promessa de validade remota do WhatsApp. Expiração não inventa um código nem estende o mesmo valor por polling. Open/logout/close/delete retiram os códigos.

## Polling e erros

Há um intervalo de 10 segundos enquanto painel permanece aberto/visível, inclusive depois de conectado/desconectado. Requests usam single flight; foco também solicita atualização. Cleanup remove intervalos/timers/listeners e aborta requests. Resultados antigos são versionados e descartados.

Erro transitório não interrompe imediatamente o monitoramento. Três falhas consecutivas pausam polling; 401/403 de sessão/autorização pausam imediatamente. Atualizar estado ou nova ação reinicia. Uma espera sem código é limitada a 60 segundos; uma reconexão posterior começa nova janela de espera. Um erro de validação do telefone não cancela monitoramento de uma conexão válida.

Requests possuem deadlines e AbortController propagado: leitura 40s (até duas chamadas provider de 15s + DNS/auth); gerenciamento/envio de teste 90s (provisionamento pode exigir múltiplas chamadas sequenciais). Nunca há sleep arbitrário para aguardar QR. Mensagens públicas vêm de allowlist por errorCode; body/mensagem remota não são exibidos diretamente. Credenciais do provider inválidas não disparam refresh da sessão de usuário.

Excluir pede confirmação e fecha/resetta painel quando concluído; não recria em loop. Logout remove QR/pairing. O painel da empresa conectado oferece Enviar teste para mim, sem telefone/destinatário no body. Aceitação não é confirmação de entrega. GLOBAL mantém seu teste de envio na preferência do canal global.

## Testes e publicação futura

Testes incluem PNG completo de QR legível (fixture offline, não sessão real), renderização/expiração, pairing, retry, close/401, monitoramento conectado, single flight, limite de espera, desmontagem e mudança de identidade. Integração HTTP/TLS local exercita provider simulado → callback 200 sob lease → persistência → cliente HTTP real do Web → React.

API/migration devem preceder Web. O contrato do pareamento global legado mudou para EvolutionConnection; ambos projetos devem ser publicados juntos, sem misturar writers API antigos/novos. Nenhuma migration ou publicação foi realizada nesta implementação. VPS, aparelhos reais, proxy/PM2 e logs próprios da Evolution continuam pendentes de homologação. Não é necessário modificar a Evolution 2.3.7.
