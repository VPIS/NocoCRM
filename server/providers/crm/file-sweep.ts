import type { driveManagerToken } from '@nocobase/app-server/drive';
import type { ServiceToken } from '@nocobase/service-provider';
import { definitions, object, toText } from './schema.js';
import { array, type CrmService } from './service.js';
import { encodeRow, jsonValue } from './values.js';

// The files nothing uses any more, deleted from the system: a file is used
// while a record's attachments or a comment that is not deleted names it.
// One no longer used is first noticed by a pass and deleted by a later one
// at least GRACE_MS after that, and never before it is GRACE_MS old, so a
// file just removed, or uploaded into a form still open, comes back if it
// is used again meanwhile. The history's earlier values (a comment's text
// before an edit, a change's old attachments) do not keep a file: once
// deleted, they name a file that no longer opens.

type DriveManager =
  typeof driveManagerToken extends ServiceToken<infer T> ? T : never;

export const GRACE_MS = 7 * 24 * 60 * 60 * 1000;
// The files noticed unused, by id, with when: the CRM settings' row.
const SWEEP_ROW = 'file-sweep';

export interface SweepPass {
  checked: number;
  noticed: number;
  deleted: number;
}

// Every file id a record or a comment uses.
async function usedFiles(service: CrmService): Promise<Set<string>> {
  const query = service.database.query();
  const used = new Set<string>();
  for (const definition of Object.values(definitions)) {
    if (!definition.fields.some((field) => field.key === 'attachments'))
      continue;
    const rows = await query
      .selectFrom(definition.table)
      .select('attachments')
      .execute();
    for (const row of rows)
      for (const id of array(row.attachments)) used.add(toText(id));
  }
  const comments = await query
    .selectFrom('crmHistory')
    .select('changes')
    .where('action', '=', 'comment')
    .execute();
  for (const comment of comments) {
    const changes = object(jsonValue(comment.changes) ?? {});
    if (changes.deleted) continue;
    for (const id of array(changes.attachments)) used.add(toText(id));
  }
  return used;
}

export async function sweepFiles(
  service: CrmService,
  drive: DriveManager | undefined,
  now = new Date(),
): Promise<SweepPass> {
  const query = service.database.query();
  const files = await query
    .selectFrom('crmFiles')
    .select(['id', 'disk', 'key', 'createdAt'])
    .execute();
  const used = await usedFiles(service);
  const row = await query
    .selectFrom('crmSettings')
    .select('value')
    .where('id', '=', SWEEP_ROW)
    .executeTakeFirst();
  const stored = object(jsonValue(row?.value) ?? {});
  const noticed: Record<string, string> = {};
  const pass: SweepPass = { checked: files.length, noticed: 0, deleted: 0 };
  const older = (at: unknown): boolean => {
    const time = Date.parse(toText(at));
    return !Number.isNaN(time) && now.getTime() - time >= GRACE_MS;
  };
  for (const file of files) {
    const id = toText(file.id);
    if (used.has(id)) continue;
    const since = stored[id];
    if (!since) {
      noticed[id] = now.toISOString();
      pass.noticed += 1;
      continue;
    }
    if (!older(since) || !older(file.createdAt)) {
      noticed[id] = toText(since);
      continue;
    }
    // The stored file first, then its rows; one the disk no longer holds
    // goes all the same.
    try {
      await drive?.use(toText(file.disk)).delete(toText(file.key));
    } catch {
      // Gone already, or its disk is no longer configured.
    }
    await query.deleteFrom('crmFileUploads').where('id', '=', id).execute();
    await query.deleteFrom('crmFiles').where('id', '=', id).execute();
    pass.deleted += 1;
  }
  if (row)
    await query
      .updateTable('crmSettings')
      .set(encodeRow({ value: noticed, updatedAt: now }))
      .where('id', '=', SWEEP_ROW)
      .execute();
  else
    await query
      .insertInto('crmSettings')
      .values(encodeRow({ id: SWEEP_ROW, value: noticed, updatedAt: now }))
      .execute();
  return pass;
}
