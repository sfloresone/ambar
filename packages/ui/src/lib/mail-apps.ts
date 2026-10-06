/** Webmail shortcut for the user's email domain, so checking the code is one tap away. */
export type MailApp = {
  label: string;
  href: string;
};

const MAIL_APPS: { domains: string[]; app: MailApp }[] = [
  { domains: ["gmail.com", "googlemail.com"], app: { label: "Open Gmail", href: "https://mail.google.com/mail/u/0/#inbox" } },
  { domains: ["outlook.com", "hotmail.com", "live.com", "msn.com"], app: { label: "Open Outlook", href: "https://outlook.live.com/mail/" } },
  { domains: ["icloud.com", "me.com", "mac.com"], app: { label: "Open iCloud Mail", href: "https://www.icloud.com/mail" } },
  { domains: ["yahoo.com", "ymail.com"], app: { label: "Open Yahoo Mail", href: "https://mail.yahoo.com" } },
  { domains: ["proton.me", "protonmail.com", "pm.me"], app: { label: "Open Proton Mail", href: "https://mail.proton.me" } },
];

export function mailAppFor(email: string): MailApp | null {
  const domain = email.split("@")[1]?.toLowerCase();

  return MAIL_APPS.find(({ domains }) => domain !== undefined && domains.includes(domain))?.app ?? null;
}
