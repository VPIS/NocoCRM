// @vitest-environment node

import { createTestDatabase } from '@nocobase/app-testing/server';
import {
  AGENTS_MIGRATIONS,
  AGENTS_PACKAGE,
} from '@nocobase/app-plugin-agents/testing';
import { expect, it } from 'vitest';

it('preserves agents with CRM run history when upgrading legacy discoveries', async () => {
  const test = await createTestDatabase();
  try {
    const migrator = test.database.createMigrator({
      directory: AGENTS_MIGRATIONS,
      packageName: AGENTS_PACKAGE,
    });
    await migrator.upTo('202610290001_ag_repair_runner_agents');
    const query = test.database.query();
    const now = '2026-10-25T12:00:00.000Z';
    await query
      .insertInto('agAgents')
      .values(
        [
          { id: 'unused', source: 'runner', status: 'pending', type: 'runner' },
          { id: 'used', source: 'runner', status: 'pending', type: 'runner' },
          {
            id: 'enabled',
            source: 'runner',
            status: 'enabled',
            type: 'runner',
          },
          {
            id: 'legacy-crm',
            source: 'system',
            status: 'disabled',
            type: 'online',
          },
        ].map((agent) => ({
          ...agent,
          name: agent.id,
          ownerUserId: 'admin',
          createdAt: now,
          updatedAt: now,
        })),
      )
      .execute();
    // Runner-origin CRM plans obtain their agent from this run. Even a
    // completed run must protect it after the pending state is retired.
    await query
      .insertInto('agRuns')
      .values({
        id: 'crm-run',
        agentId: 'used',
        agentType: 'runner',
        status: 'completed',
        subjectKind: 'conversation',
        subjectId: 'crm-conversation',
        threadScope: 'crm',
        actorUserId: 'admin',
        createdAt: now,
        updatedAt: now,
      })
      .execute();
    await query
      .insertInto('agAgentChanges')
      .values({
        id: 'automatic-discovery',
        agentId: 'unused',
        revision: 1,
        action: 'created',
        actorUserId: null,
        createdAt: now,
      })
      .execute();

    await migrator.upTo('202610310001_ag_retire_pending_runner_agents');
    const remaining = () =>
      query
        .selectFrom('agAgents')
        .select(['id', 'status'])
        .orderBy('id')
        .execute();
    const expected = [
      { id: 'enabled', status: 'enabled' },
      { id: 'legacy-crm', status: 'disabled' },
      { id: 'used', status: 'disabled' },
    ];
    expect(await remaining()).toEqual(expected);
    expect(
      await query.selectFrom('agRuns').select('agentId').execute(),
    ).toEqual([{ agentId: 'used' }]);
    expect(
      await query.selectFrom('agAgentChanges').select('id').execute(),
    ).toEqual([]);

    // This release cannot restore deleted discoveries or creation audits.
    // Deployment rollback therefore needs the pre-upgrade database backup.
    await migrator.rollback();
    expect(await remaining()).toEqual(expected);
    expect(
      await query.selectFrom('agAgentChanges').select('id').execute(),
    ).toEqual([]);
  } finally {
    await test.destroy();
  }
});
