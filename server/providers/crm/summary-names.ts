import type { Actor } from './authorization.js';
import { toText, type Entity } from './schema.js';
import type { CrmService, ListOptions } from './service.js';
import { groupRelation, type Summary, type SummaryRequest } from './summary.js';
import { resolveTitles } from './titles.js';

// A summary (summary.ts) with the display names of the group keys that are
// ids: a person's name, a record's title. Shared by the AI's
// summarize_records tool and the summary route.
export async function namedSummary(
  service: CrmService,
  actor: Actor,
  entity: Entity,
  options: ListOptions,
  request: SummaryRequest,
): Promise<Summary & { names: Record<string, string> }> {
  const summary = await service.summarize(actor, entity, options, request);
  const relation = summary.groupBy
    ? groupRelation(entity, summary.groupBy)
    : undefined;
  const keys = summary.groups
    .map((g) => g.key)
    .filter((k): k is string => k !== null);
  let names: Record<string, string> = {};
  if (relation === 'users') {
    const wanted = new Set(keys);
    names = Object.fromEntries(
      (await service.users(actor))
        .filter((u) => wanted.has(toText(u.id)))
        .map((u) => [toText(u.id), toText(u.name ?? u.id)]),
    );
  } else if (relation && keys.length)
    names = (await resolveTitles(service, actor, {}, { [relation]: keys }))
      .names;
  return { ...summary, names };
}
