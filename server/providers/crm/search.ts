import type { Actor } from './authorization.js';
import { CrmError, type CrmRecord, type Entity } from './schema.js';
import type { CrmService } from './service.js';
import { resolveTitles } from './titles.js';

// The global search (client/components/crm/global-search.tsx): one typed
// text looked up in every kind of record, through each kind's own list, so
// the reader's record scope applies exactly as on the list pages. A kind the
// reader may not read is left out rather than refused: nobody is turned away
// for a list they were not asking about.

// The kinds searched, in the order the results show them.
export const SEARCH_KINDS: readonly Entity[] = [
  'leads',
  'opportunities',
  'accounts',
  'contacts',
  'tasks',
  'approvals',
];
// The matches of one kind shown; the total says how many there are.
export const SEARCH_PAGE = 5;

export interface SearchGroup {
  entity: Entity;
  total: number;
  rows: CrmRecord[];
  titles: Record<string, string>;
  names: Record<string, string>;
}

export async function searchAll(
  service: CrmService,
  actor: Actor,
  text: string,
): Promise<SearchGroup[]> {
  const groups = await Promise.all(
    SEARCH_KINDS.map(async (entity): Promise<SearchGroup | undefined> => {
      try {
        const result = await service.list(actor, entity, {
          search: text,
          pageSize: SEARCH_PAGE,
        });
        if (!result.total) return undefined;
        const { titles, names } = await resolveTitles(service, actor, {
          [entity]: result.data,
        });
        return {
          entity,
          total: result.total,
          rows: result.data,
          titles,
          names,
        };
      } catch (error) {
        if (error instanceof CrmError && error.status === 403) return undefined;
        throw error;
      }
    }),
  );
  return groups.filter((group): group is SearchGroup => Boolean(group));
}
