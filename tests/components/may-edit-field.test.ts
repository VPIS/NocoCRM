import { describe, expect, it } from 'vitest';
import {
  mayEditField,
  type CrmRecord,
  type Metadata,
} from '../../client/components/crm/api.js';

// Whether a record shown beside another (the company, deal and lead cards)
// may be changed there: the object's edit scope, the field among those it
// allows, never a converted lead or an approval.

const meta = (update: unknown): Metadata =>
  ({
    userId: 'me',
    permissions: {
      companies: { update },
      leads: { update },
      approvals: { update },
    },
  }) as unknown as Metadata;
const record = (values: Record<string, unknown>): CrmRecord =>
  ({ id: 'r', ...values }) as CrmRecord;

describe('mayEditField', () => {
  it('lets whoever may change every record change any', () => {
    const all = meta({ fields: '*', all: true });
    expect(
      mayEditField(all, 'companies', record({ ownerId: 'other' }), 'status'),
    ).toBe(true);
  });

  it('lets whoever may change their own records change only those', () => {
    const own = meta({ fields: '*' });
    expect(
      mayEditField(own, 'companies', record({ ownerId: 'me' }), 'status'),
    ).toBe(true);
    expect(
      mayEditField(own, 'companies', record({ createdById: 'me' }), 'status'),
    ).toBe(true);
    expect(
      mayEditField(own, 'companies', record({ ownerId: 'other' }), 'status'),
    ).toBe(false);
  });

  it('keeps to the fields the scope allows', () => {
    const some = meta({ fields: ['website'], all: true });
    expect(mayEditField(some, 'companies', record({}), 'website')).toBe(true);
    expect(mayEditField(some, 'companies', record({}), 'status')).toBe(false);
  });

  it('never offers a converted lead, an approval, or what may not be changed', () => {
    const all = meta({ fields: '*', all: true });
    expect(
      mayEditField(all, 'leads', record({ status: 'converted' }), 'phone'),
    ).toBe(false);
    expect(mayEditField(all, 'approvals', record({}), 'name')).toBe(false);
    expect(
      mayEditField(
        meta(false),
        'companies',
        record({ ownerId: 'me' }),
        'status',
      ),
    ).toBe(false);
    expect(mayEditField(undefined, 'companies', record({}), 'status')).toBe(
      false,
    );
  });
});
