// @vitest-environment node

import sqlite from '@nocobase/db-sqlite';
import { createDatabaseManager, defineDatabase } from '@nocobase/db';
import { expect, it } from 'vitest';
import migration from '../../database/main/migrations/202610140002_crm_company_signals.js';

// The company signals' table, and the companies' watch switch and last check
// (database/main/migrations/202610140002_crm_company_signals.ts): created
// beside the companies, one event kept once per company, and dropped again.
it("creates the signals table and the companies' signal columns, and drops them", async () => {
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
    // The companies as they stood before.
    await builder.createCollection('crmCompanies', (c) => {
      c.string('id', { length: 36 });
      c.primary('id');
      c.string('name');
    });
    const query = isolated.query();
    await query
      .insertInto('crmCompanies')
      .values({ id: 'c1', name: 'Acme' })
      .execute();
    const context = {
      builder,
      query,
      connection: isolated.connection(),
    } as never;
    await migration.up(context);
    expect(await builder.hasCollection('crmSignals')).toBe(true);
    // An existing company is not watched and never checked.
    expect(
      await query
        .selectFrom('crmCompanies')
        .select(['signalsWatched', 'signalsCheckedAt'])
        .where('id', '=', 'c1')
        .executeTakeFirstOrThrow(),
    ).toMatchObject({ signalsCheckedAt: null });
    const signal = {
      id: 's1',
      companyId: 'c1',
      type: 'funding',
      title: 'Acme raised a Series B.',
      occurredOn: '2026-10-02',
      sources: JSON.stringify([]),
      eventKey: 'funding:2026-10:acmeraisedaseriesb',
      status: 'new',
      createdAt: '2026-10-03T00:00:00.000Z',
      updatedAt: '2026-10-03T00:00:00.000Z',
    };
    await query.insertInto('crmSignals').values(signal).execute();
    // The same event of the same company is kept once.
    await expect(
      query
        .insertInto('crmSignals')
        .values({ ...signal, id: 's2' })
        .execute(),
    ).rejects.toThrow();

    await migration.down(context);
    expect(await builder.hasCollection('crmSignals')).toBe(false);
    expect(
      Object.keys(
        (await query
          .selectFrom('crmCompanies')
          .selectAll()
          .executeTakeFirstOrThrow()) as Record<string, unknown>,
      ).sort(),
    ).toEqual(['id', 'name']);
  } finally {
    await isolated.destroy();
  }
});
