import { describe, expect, it } from 'vitest';
import {
  isOn,
  levelOf,
  setLevel,
  toggle,
} from '../../client/pages/settings/permission-sets/detail/grants.js';
import { grantsSignature } from '../../client/pages/settings/permission-sets/data.js';

// The Permissions tab edits a set's grants as plain arrays: an action on
// or off, and how far a data-scoped business action reaches.
const records = {
  key: 'records',
  recordAccess: ['allRecords', 'recordsIOwn'],
  defaultValue: 'recordsIOwn',
};

describe("a permission set's grants", () => {
  it('turns an action on with its scope at the default, and off again, dropping an empty grant', () => {
    const on = toggle([], 'composite', 'crm.leads', 'edit', true, records);
    expect(on).toEqual([
      {
        resource: { type: 'composite', id: 'crm.leads' },
        actions: [
          {
            action: 'edit',
            policy: { type: 'composite', scopes: { records: 'recordsIOwn' } },
          },
        ],
      },
    ]);
    expect(isOn(on, 'composite', 'crm.leads', 'edit')).toBe(true);
    expect(levelOf(on, 'composite', 'crm.leads', 'edit', records)).toBe(
      'recordsIOwn',
    );
    expect(toggle(on, 'composite', 'crm.leads', 'edit', false)).toEqual([]);
    // An action without a scope carries no policy.
    expect(toggle([], 'page', 'home', 'access', true)).toEqual([
      {
        resource: { type: 'page', id: 'home' },
        actions: [{ action: 'access' }],
      },
    ]);
  });

  it('changes how far an action reaches, keeping what else its policy holds', () => {
    const start = [
      {
        resource: { type: 'composite', id: 'crm.leads' },
        actions: [
          {
            action: 'view',
            policy: {
              type: 'composite',
              scopes: { records: 'recordsIOwn', other: 'kept' },
              extra: true,
            },
          },
          { action: 'create' },
        ],
      },
    ];
    const changed = setLevel(
      start,
      'composite',
      'crm.leads',
      'view',
      records,
      'allRecords',
    );
    expect(changed[0]!.actions[0]!.policy).toEqual({
      type: 'composite',
      scopes: { records: 'allRecords', other: 'kept' },
      extra: true,
    });
    expect(changed[0]!.actions[1]).toEqual({ action: 'create' });
    // A stored custom filter reads by its key.
    const custom = [
      {
        resource: { type: 'composite', id: 'crm.leads' },
        actions: [
          {
            action: 'view',
            policy: {
              type: 'composite',
              scopes: {
                records: {
                  type: 'recordAccess',
                  key: 'customFilter',
                  params: {},
                },
              },
            },
          },
        ],
      },
    ];
    expect(levelOf(custom, 'composite', 'crm.leads', 'view', records)).toBe(
      'customFilter',
    );
  });

  it('tells two versions of a set apart by content, not by order', () => {
    const a = [
      {
        resource: { type: 'page', id: 'home' },
        actions: [{ action: 'access' }],
      },
      {
        resource: { type: 'page', id: 'crm-tasks' },
        actions: [{ action: 'access' }],
      },
    ];
    expect(grantsSignature(a)).toBe(grantsSignature([...a].reverse()));
    expect(grantsSignature(a)).not.toBe(grantsSignature(a.slice(1)));
  });
});
