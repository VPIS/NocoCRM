import { toText } from './schema.js';
import type { QueryAdapter, Row } from '@nocobase/db';
import {
  assertFields,
  compileFilter,
  conditions,
  type Actor,
} from './authorization.js';
import { CrmError, object, type CrmRecord } from './schema.js';
import type { CrmService } from './service.js';

export async function conversionPreview(
  service: CrmService,
  actor: Actor,
  id: string,
): Promise<Row> {
  const lead = await service.get(actor, 'leads', id);
  const companies = (await service.list(actor, 'companies', { pageSize: 1000 }))
    .data;
  const contacts = (await service.list(actor, 'contacts', { pageSize: 1000 }))
    .data;
  const normalized = (v: unknown): string =>
    toText(v ?? '')
      .replace(/[\s.,，。]/g, '')
      .toLowerCase();
  const company = normalized(lead.company);
  const domain = toText(lead.email ?? '').split('@')[1];
  const matchedCompanies = companies.filter(
    (a) =>
      (company &&
        (normalized(a.name).includes(company) ||
          company.includes(normalized(a.name)))) ||
      (domain && toText(a.website ?? '').includes(domain)),
  );
  const companyIds = new Set(matchedCompanies.map((a) => toText(a.id)));
  const name = normalized(lead.name);
  const email = toText(lead.email ?? '').toLowerCase();
  const phone = normalized(lead.phone);
  // The opportunities still open at those companies: converting with a new
  // one beside them may duplicate a deal already being worked.
  const opportunities = companyIds.size
    ? (
        await service.list(actor, 'opportunities', { pageSize: 1000 })
      ).data.filter(
        (o) =>
          companyIds.has(toText(o.companyId ?? '')) &&
          !['won', 'lost'].includes(toText(o.stage)),
      )
    : [];
  return {
    lead,
    companies: matchedCompanies,
    // The same person: the same e-mail or phone, or the same name at one of
    // the matching companies, which finds a contact the lead gave no e-mail
    // or phone for.
    contacts: contacts.filter(
      (c) =>
        (email && toText(c.email ?? '').toLowerCase() === email) ||
        (phone && normalized(c.phone) === phone) ||
        (name &&
          normalized(c.name) === name &&
          companyIds.has(toText(c.companyId ?? ''))),
    ),
    opportunities,
  };
}
export async function convertLead(
  service: CrmService,
  actor: Actor,
  id: string,
  raw: unknown,
  tx?: QueryAdapter,
): Promise<CrmRecord> {
  if (!tx)
    return service.mutate(actor, (prepared, query) =>
      convertLead(service, prepared, id, raw, query),
    );
  const input = object(raw);
  const editable = await service.get(actor, 'leads', id, tx, 'update');
  assertFields(
    { status: 'converted' },
    await conditions(actor, 'leads', 'update'),
  );
  if (editable.status === 'converted')
    throw new CrmError('convertedReadOnly', 409);
  // Only copy fields the person converting the lead may actually read.
  const lead = await service.get(actor, 'leads', id, tx);
  const companyInput: Row = {
    name: lead.company,
    ownerId: lead.ownerId,
    source: lead.source,
    status: 'qualified',
    website: lead.website,
    description: lead.companyDescription,
    ...Object.fromEntries(
      ['industry', 'country', 'state', 'city', 'employees', 'address'].map(
        (key) => [key, lead[key]],
      ),
    ),
  };
  // input.company / input.contact override what the lead supplies, field by
  // field: the card lets the user correct an inherited value before
  // confirming, and the assistant can propose corrections the same way.
  // save() validates the merged result like any other write.
  Object.assign(companyInput, object(input.company ?? {}));
  if (input.companyName) companyInput.name = toText(input.companyName);
  const contactInput: Row = {
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    jobTitle: lead.jobTitle,
    ownerId: lead.ownerId,
    source: lead.source,
    employed: true,
    ...object(input.contact ?? {}),
  };
  const merge = async (
    entity: 'companies' | 'contacts',
    recordId: unknown,
    proposed: Row,
    force: unknown,
  ): Promise<CrmRecord> => {
    if (!recordId) return service.save(actor, entity, proposed, undefined, tx);
    const current = await service.get(actor, entity, toText(recordId), tx);
    const requested = Array.isArray(force) ? force : [];
    const patch: Row = {};
    for (const [key, value] of Object.entries(proposed))
      if (
        value != null &&
        value !== '' &&
        (current[key] == null || current[key] === '' || requested.includes(key))
      )
        patch[key] = value;
    return Object.keys(patch).length
      ? service.save(actor, entity, patch, current.id, tx)
      : current;
  };
  const company = await merge(
    'companies',
    input.companyId,
    companyInput,
    input.overwriteCompanyFields,
  );
  contactInput.companyId = company.id;
  if (input.contactId) {
    const chosen = await service.get(
      actor,
      'contacts',
      toText(input.contactId),
      tx,
    );
    if (chosen.companyId !== company.id) throw new CrmError('companyMismatch');
  }
  const contact = await merge(
    'contacts',
    input.contactId,
    contactInput,
    input.overwriteContactFields,
  );
  let opportunity: CrmRecord | undefined;
  if (input.createOpportunity === true)
    opportunity = await service.save(
      actor,
      'opportunities',
      {
        name: input.opportunityName || company.name,
        ownerId: lead.ownerId,
        source: lead.source,
        companyId: company.id,
        // A lead is converted once its scene, scale and deployment or
        // edition are clear, which is what qualification asks for: the deal
        // starts there rather than at first contact (the opportunity
        // follow-up skill's stages).
        stage: 'qualification',
        amount: input.amount ?? null,
        // What the person set on the deal in the conversion dialog beside
        // its name and amount; the rest comes from the lead and the company.
        ...Object.fromEntries(
          Object.entries(object(input.opportunity ?? {})).filter(([key]) =>
            ['currency', 'expectedCloseAt'].includes(key),
          ),
        ),
        contacts: [{ contactId: contact.id, role: 'other' }],
      },
      undefined,
      tx,
    );
  const now = new Date().toISOString();
  const access = await conditions(actor, 'leads', 'update');
  const updated = await tx
    .updateTable('crmLeads')
    .set({
      status: 'converted',
      convertedAt: now,
      convertedCompanyId: company.id,
      convertedContactId: contact.id,
      convertedOpportunityId: opportunity?.id ?? null,
      updatedAt: now,
    })
    .where('id', '=', id)
    .where('status', '!=', 'converted')
    .where((eb) => compileFilter(eb, access.scope))
    .execute();
  if (!updated.updatedCount) throw new CrmError('conflict', 409);
  // Conversion is the single authorized system operation that links all existing history,
  // including tasks owned by colleagues, while preserving their original content.
  const tasks = await tx
    .selectFrom('crmTasks')
    .selectAll()
    .where('leadId', '=', id)
    .execute();
  for (const task of tasks)
    await tx
      .updateTable('crmTasks')
      .set({
        companyId: company.id,
        opportunityId: opportunity?.id ?? null,
        updatedAt: now,
      })
      .where('id', '=', task.id)
      .execute();
  await service.history(
    tx,
    actor,
    'leads',
    id,
    'converted',
    lead.status,
    'converted',
    {
      companyId: company.id,
      contactId: contact.id,
      opportunityId: opportunity?.id ?? null,
    },
  );
  return service.get(actor, 'leads', id, tx);
}
