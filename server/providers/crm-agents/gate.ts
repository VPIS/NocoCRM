import type {
  ActionGate,
  AgentsAccess,
  CallerIdentity,
} from '@nocobase/app-plugin-agents/server/tokens';
import type { KeyScope } from '@nocobase/authorization/core';
import { capability, conditions, type Actor } from '../crm/authorization.js';
import type { CrmService } from '../crm/service.js';
import { entities } from '../crm/schema.js';
import {
  AI_WORK_ACTION,
  COLLEAGUES_ACTION,
  COLLECTION_ACTION,
  COMMENT_ACTION,
  SEARCH_ACTION,
  GRANTABLE,
  PLAN_ACTION,
  recordAction,
  SALES_ACTIONS,
  VERBS,
} from './actions.js';

// Who holds which of the CRM's business actions (actions.ts), as the Agents
// plugin asks: for the command manifest it offers a caller, and for each
// request a run makes (the CRM's guard checks the route's action against
// it). The plugin intersects nothing itself.

// What a person may do, read from their permission sets as the services
// decide it, and kept to the scope of the API key they call with.
export async function heldActions(
  service: CrmService,
  userId: string,
  keyScope?: KeyScope,
): Promise<Set<string>> {
  const actor: Actor = {
    id: userId,
    locale: 'en-US',
    scope: service.authz.for({
      principal: { type: 'user', id: userId },
      subjects: [{ type: 'authenticated', id: '*' }],
      ...(keyScope ? { keyScope } : {}),
    }),
  };
  const held = new Set<string>();
  for (const entity of entities)
    for (const verb of VERBS)
      try {
        await conditions(actor, entity, COLLECTION_ACTION[verb]);
        held.add(recordAction(entity, verb));
      } catch {
        // Not held.
      }
  for (const [name, key] of Object.entries(SALES_ACTIONS))
    if (await capability(actor, name)) held.add(key);
  // Whoever reads a kind of record searches it and comments on it, and
  // may set the AI agents to work on it (each route checks the record as
  // its card's button does).
  if ([...held].some((action) => action.endsWith('/view'))) {
    held.add(SEARCH_ACTION);
    held.add(COMMENT_ACTION);
    held.add(AI_WORK_ACTION);
  }
  held.add(COLLEAGUES_ACTION);
  // Whoever may create or change a record may have a change proposed to
  // them; each step is still checked as them when the plan is rehearsed and
  // carried out.
  if (
    [...held].some(
      (action) => action.endsWith('/create') || action.endsWith('/edit'),
    )
  )
    held.add(PLAN_ACTION);
  return held;
}

// A person holds their own actions; a run those its agent is configured
// with, within what the person who woke it holds, and never one an agent may
// not be given. A consultation (a run another agent asked) keeps only the
// reading actions, which the plugin applies, and proposing a plan, which the
// person still confirms.
export function crmActionGate(service: CrmService): ActionGate {
  return {
    async allowed(identity: CallerIdentity) {
      const held = await heldActions(
        service,
        identity.userId,
        identity.keyScope,
      );
      if (identity.kind !== 'run') return held;
      const configured = new Set(identity.agent?.actions ?? []);
      return new Set(
        [...held].filter(
          (action) => configured.has(action) && GRANTABLE.has(action),
        ),
      );
    },
    consultable: (action) => action === PLAN_ACTION,
  };
}

// How far the Agents plugin's own business action (changing agents and
// skills) reaches for a caller, from the levels their permission sets give
// on the plugin's `agents` resource type: every agent, or the ones they own.
export function crmAgentsAccess(service: CrmService): AgentsAccess {
  return {
    async scopeOf(identity, key) {
      const scope = service.authz.for(identity);
      const business = key.slice(0, key.indexOf('/'));
      const action = key.slice(key.indexOf('/') + 1);
      const can = (level: string) =>
        scope.can({
          resource: { type: 'agents', id: business },
          action: `${action}.${level}`,
        });
      if (await can('all')) return 'all';
      if ((await can('related')) && identity.principal)
        return { users: [identity.principal.id] };
      return 'none';
    },
  };
}
