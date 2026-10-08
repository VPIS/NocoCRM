import { randomUUID } from 'node:crypto';
import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// Accounts and contacts had a Notes field of their own, beside the notes
// every record keeps in its timeline. The timeline is now the one place a
// note is written, so each field's text becomes a note there, written by
// the record's owner (else its creator) at the record's last change, and
// the column goes. The note says which field it came from (`field` in its
// changes), so down puts the text back and removes those notes. Notes
// written in the timeline since are left as they are.

const TABLES = { accounts: 'crmAccounts', contacts: 'crmContacts' } as const;

// The history column keeps JSON text, which reads back as text or, through
// some adapters, already parsed.
function parse(value: unknown): unknown {
  let current = value;
  for (let i = 0; i < 2 && typeof current === 'string'; i++) {
    try {
      current = JSON.parse(current) as unknown;
    } catch {
      return current;
    }
  }
  return current;
}

const text = (value: unknown): string =>
  typeof value === 'string'
    ? value
    : typeof value === 'number' || typeof value === 'bigint'
      ? String(value)
      : '';

const instant = (value: unknown): string => {
  const date = value instanceof Date ? value : new Date(text(value));
  return Number.isFinite(+date) ? date.toISOString() : new Date().toISOString();
};

const migration: MigrationDefinition = defineMigration({
  name: '202610080003_crm_record_notes_to_timeline',
  async up({ builder, query }: MigrationContext): Promise<void> {
    for (const [entity, table] of Object.entries(TABLES)) {
      if (!(await builder.hasCollection(table))) continue;
      const rows = await query
        .selectFrom(table)
        .select(['id', 'notes', 'ownerId', 'createdById', 'updatedAt'])
        .where('notes', 'is not', null)
        .execute();
      for (const row of rows) {
        const body = text(row.notes).trim();
        if (!body) continue;
        await query
          .insertInto('crmHistory')
          .values({
            id: randomUUID(),
            entity,
            recordId: text(row.id),
            actorId: text(row.ownerId) || text(row.createdById) || null,
            action: 'note',
            changes: JSON.stringify({ text: body, field: 'notes' }),
            createdAt: instant(row.updatedAt),
          })
          .execute();
      }
      await builder.alterCollection(table, (c) => {
        c.dropField('notes');
      });
    }
  },
  async down({ builder, query }: MigrationContext): Promise<void> {
    for (const [entity, table] of Object.entries(TABLES)) {
      if (!(await builder.hasCollection(table))) continue;
      await builder.alterCollection(table, (c) => {
        c.text('notes');
      });
      const notes = await query
        .selectFrom('crmHistory')
        .select(['id', 'recordId', 'changes'])
        .where('entity', '=', entity)
        .where('action', '=', 'note')
        .execute();
      for (const note of notes) {
        const changes = parse(note.changes) as {
          text?: unknown;
          field?: unknown;
        } | null;
        if (changes?.field !== 'notes') continue;
        await query
          .updateTable(table)
          .set({ notes: text(changes.text) })
          .where('id', '=', text(note.recordId))
          .execute();
        await query
          .deleteFrom('crmHistory')
          .where('id', '=', text(note.id))
          .execute();
      }
    }
  },
});

export default migration;
