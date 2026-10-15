// A LinkedIn address as the duplicate checks and the record pages read it,
// shared by both. It has no imports, so the browser bundle can take it.

// What a LinkedIn address points at, as "in/<name>" for a person's profile or
// "company/<name>" for a company's page (a school's and a showcase page are
// pages too), whichever way it was written: with or without the scheme or
// "www.", on a country's subdomain ("cn.linkedin.com"), with a query, a
// trailing slash or a further path ("/details/…"), the name percent-encoded
// or not. Empty when it is not a LinkedIn profile or page.
export function linkedinPath(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || /\s/.test(raw)) return '';
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return '';
  }
  const host = url.hostname.toLowerCase();
  if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return '';
  const [kind, name] = url.pathname.split('/').filter(Boolean);
  if (!kind || !name) return '';
  const page = kind.toLowerCase();
  const type =
    page === 'in' || page === 'pub'
      ? 'in'
      : page === 'company' || page === 'school' || page === 'showcase'
        ? 'company'
        : '';
  if (!type) return '';
  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    // A malformed escape is kept as written.
  }
  return `${type}/${decoded}`;
}

// The same profile or page however it was written, for matching: the path
// in lower case. Empty when the address is not one.
export function linkedinKey(value: unknown): string {
  return linkedinPath(value).toLowerCase();
}
