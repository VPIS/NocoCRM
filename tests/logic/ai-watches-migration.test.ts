// @vitest-environment node

import sqlite from '@nocobase/db-sqlite';
import { createDatabaseManager, defineDatabase } from '@nocobase/db';
import { expect, it } from 'vitest';
import migration from '../../database/main/migrations/202610160001_crm_ai_watches.js';

// The AI work a conversation waits on
// (database/main/migrations/202610160001_crm_ai_watches.ts): one row per AI
// entry, and dropped again.
it('creates the AI watches table keyed by the entry, and drops it', async () => {
  const isolated = createDatabaseManager(
    defineDatabase({
      drivers: { sqlite },
      default: 'main',
      connections: {
        main: {
          dialect: 'sqlite',
          filename: ':memory:',
          schemaManagement: 'managed',
        },
      },
    }),
  );
  try {
    await isolated.connect();
    const builder = isolated.builder();
    const query = isolated.query();
    const context = {
      builder,
      query,
      connection: isolated.connection(),
    } as never;
    await migration.up(context);
    expect(await builder.hasCollection('crmAiWatches')).toBe(true);
    const watch = {
      id: 'entry-1',
      entity: 'leads',
      recordId: 'lead-1',
      userId: 'rep',
      conversationId: 'conversation-1',
      createdAt: '2026-10-16T00:00:00.000Z',
    };
    await query.insertInto('crmAiWatches').values(watch).execute();
    // One watch per entry.
    await expect(
      query.insertInto('crmAiWatches').values(watch).execute(),
    ).rejects.toThrow();
    await migration.down(context);
    expect(await builder.hasCollection('crmAiWatches')).toBe(false);
  } finally {
    await isolated.destroy();
  }
});
