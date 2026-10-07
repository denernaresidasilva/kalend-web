export const settingsSections = {"whatsapp": "WhatsApp", "email": "E-mail", "push": "Push", "notificacoes": "Notificações", "pagamentos": "Pagamentos", "aparencia": "Aparência", "integracoes": "Integrações", "webhooks": "Webhooks", "seguranca": "Segurança"} as const;
export type SettingsSection = keyof typeof settingsSections;
