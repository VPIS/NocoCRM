// Where a record's mail is looked for, shared by the record's Mail tab and
// the AI follow-ups that read the owner's mail with the customer. It has no
// imports, so the browser bundle can take it.

// Domains shared by everyone who uses them: a company's website on one of
// these says nothing about whose mail is whose, so they are never searched.
const SHARED_DOMAINS = new Set([
  '126.com',
  '163.com',
  'aliyun.com',
  'foxmail.com',
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'icloud.com',
  'live.com',
  'me.com',
  'outlook.com',
  'proton.me',
  'protonmail.com',
  'qq.com',
  'sina.com',
  'sohu.com',
  'yahoo.com',
  'yeah.net',
]);

// Where a record's mail is looked for: its own addresses, and a company's
// domain (from its website) for anyone at the company.
export interface MailTarget {
  readonly addresses: readonly string[];
  readonly domain?: string;
}

// The company's own domain from a company's website, unless it is a mail
// service everyone shares.
export function domainOf(website: unknown): string | undefined {
  const raw = typeof website === 'string' ? website.trim() : '';
  if (!raw) return undefined;
  try {
    const host = new URL(raw.includes('://') ? raw : `https://${raw}`).hostname
      .toLowerCase()
      .replace(/^www\./u, '');
    return host.includes('.') && !SHARED_DOMAINS.has(host) ? host : undefined;
  } catch {
    return undefined;
  }
}

// The searches that find a record's mail: one per address, and the domain.
export function searchTerms(target: MailTarget): string[] {
  const terms = new Set(
    target.addresses.map((address) => address.trim().toLowerCase()),
  );
  if (target.domain) terms.add(`@${target.domain}`);
  terms.delete('');
  return [...terms];
}

// Whether an address is one of the record's: one of its addresses, or at its
// domain or a subdomain of it. The Mail plugin's search also matches subjects
// and previews, so a message is kept only when one of its people is.
export function concerns(target: MailTarget, address: unknown): boolean {
  const value = typeof address === 'string' ? address.trim().toLowerCase() : '';
  if (!value) return false;
  if (target.addresses.some((a) => a.trim().toLowerCase() === value))
    return true;
  const domain = target.domain?.toLowerCase();
  if (!domain) return false;
  const host = value.slice(value.lastIndexOf('@') + 1);
  return host === domain || host.endsWith(`.${domain}`);
}
