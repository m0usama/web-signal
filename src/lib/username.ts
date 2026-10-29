/**
 * WEB//SIGNAL logs in with a username. Supabase Auth needs an email, so each
 * username maps to an internal address that never receives mail.
 */
export const USERNAME_DOMAIN = "web-signal.local";
export const USERNAME_PATTERN = /^[a-z0-9_-]{2,24}$/;
export const MIN_PASSWORD = 8;

export function normaliseUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function usernameToEmail(username: string): string {
  return `${normaliseUsername(username)}@${USERNAME_DOMAIN}`;
}
