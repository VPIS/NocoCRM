import type { Entity } from './api.js';

// A record's page is /<entity>/<id>, its tab /<entity>/<id>/<tab>, one route
// a kind (client/routes.ts). They sat under /crm until 2026-10-19: mounted
// at /crm on Studio, a lead was /crm/crm/leads/<id>. The old addresses lead
// to these (pages/crm-legacy-redirect.tsx).
export const RECORD_ENTITIES: readonly Entity[] = [
  'leads',
  'opportunities',
  'companies',
  'contacts',
  'tasks',
  'approvals',
];

export function isRecordEntity(value: string | undefined): value is Entity {
  return RECORD_ENTITIES.includes(value as Entity);
}

// The record an address names: its kind and id, and its tab when there is
// one; nothing for any other page.
export function recordOf(
  pathname: string,
): { entity: Entity; id: string; tab?: string } | undefined {
  const [entity, id, tab] = pathname.split('/').filter(Boolean);
  if (!isRecordEntity(entity) || !id) return undefined;
  return tab ? { entity, id, tab } : { entity, id };
}

// Where an address from before leads now (pages/crm-legacy-redirect.tsx):
// /crm/<page> to /<page>, older names too, accounts having become
// companies and Auto follow-up (/crm/agents) Agent work.
export function currentAddress(pathname: string): string {
  const rest = pathname.replace(/^\/crm(?=\/|$)/u, '') || '/';
  return rest
    .replace(/^\/accounts(?=\/|$)/u, '/companies')
    .replace(/^\/agents(?=\/|$)/u, '/agent-work');
}
