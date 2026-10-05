import type { EmailConfiguration, EmailInput } from './email';
export function emailFields(row: EmailConfiguration): EmailInput {
  return { provider: row.provider, email: row.email, username: row.username, smtpHost: row.smtpHost, smtpPort: row.smtpPort, security: row.security };
}
export function emailDirty(draft: EmailInput, saved: EmailConfiguration, hasSecretInput: boolean): boolean {
  const original = emailFields(saved);
  return hasSecretInput || (Object.keys(original) as (keyof EmailInput)[]).some(key => draft[key] !== original[key]);
}
