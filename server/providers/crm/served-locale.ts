import locales from '../../locales/index.js';

// A user's stored language as the CRM writes to them in it (notifications,
// work done for them while away): one the server offers
// (server/locales/index.ts), else English.
export const servedLocale = (locale: unknown): string =>
  typeof locale === 'string' && Object.hasOwn(locales, locale)
    ? locale
    : 'en-US';
