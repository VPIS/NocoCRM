import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Agents } from '@nocobase/app-plugin-agents/server/tokens';
import type { DatabaseManager } from '@nocobase/db';
import { ASSISTANT_MARKER } from './assistant.js';
import { METHOD_SKILLS } from './skill.js';

// @temporary(nocobase-official): an application cannot ship skills into the
// Agents plugin's library, so the CRM's method skills are put there from
// code once, at start. Replace with the plugin's own mechanism when it has
// one.
//
// The CRM's method skills (ai/skills: lead follow-up, opportunity follow-up,
// approval review, task preparation) as skills of the library, where people
// read and edit them on Settings → Agent team → Skills: each is added once,
// from its SKILL.md as shipped, and attached to the assistant; the marker
// keeps their ids, so a skill an administrator edited, detached or deleted
// stays as they left it, and a later SKILL.md shipped with the code does not
// replace the library's. The background runs read the library's current
// version (`readSkill` in crm/ai-model.ts), so an edit there is what they follow.

export const SKILLS_MARKER = 'agents-skills-v1';

export async function provisionSkills(
  agents: Agents,
  database: DatabaseManager,
  dir: string,
): Promise<void> {
  const query = database.query();
  const done = await query
    .selectFrom('crmSettings')
    .select('id')
    .where('id', '=', SKILLS_MARKER)
    .executeTakeFirst();
  if (done) return;
  // The marker first, as the assistant's: an instance starting beside this
  // one finds it and adds nothing.
  try {
    await query
      .insertInto('crmSettings')
      .values({
        id: SKILLS_MARKER,
        value: JSON.stringify({ version: 1, skillIds: {} }),
        updatedAt: new Date(),
      })
      .execute();
  } catch {
    return;
  }
  // One a person added under the same name before is taken as it is.
  const library = new Map(
    (await agents.skills.list()).map((skill) => [skill.slug, skill.id]),
  );
  const skillIds: Record<string, string> = {};
  for (const slug of METHOD_SKILLS) {
    const existing = library.get(slug);
    if (existing) {
      skillIds[slug] = existing;
      continue;
    }
    const content = await readFile(join(dir, slug, 'SKILL.md'), 'utf8').catch(
      () => null,
    );
    if (!content) continue;
    skillIds[slug] = (await agents.skills.create(null, { content })).id;
  }
  // Attached to the assistant, beside what it already has.
  const assistant = await query
    .selectFrom('crmSettings')
    .select('value')
    .where('id', '=', ASSISTANT_MARKER)
    .executeTakeFirst();
  const agentId = agentIdOf(assistant?.value);
  if (agentId) {
    const target = { scope: 'agent', scopeId: agentId };
    const attached = await agents.skills.attached(target).catch(() => null);
    if (attached)
      await agents.skills.attach(target, [
        ...new Set([...attached, ...Object.values(skillIds)]),
      ]);
  }
  await query
    .updateTable('crmSettings')
    .set({
      value: JSON.stringify({ version: 1, skillIds }),
      updatedAt: new Date(),
    })
    .where('id', '=', SKILLS_MARKER)
    .execute();
}

function agentIdOf(value: unknown): string | null {
  try {
    const id = (JSON.parse(String(value)) as { agentId?: unknown }).agentId;
    return typeof id === 'string' && id ? id : null;
  } catch {
    return null;
  }
}
