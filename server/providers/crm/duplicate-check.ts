import type { Row } from '@nocobase/db';
import type { Actor } from './authorization.js';
import { findDuplicates, type FoundDuplicate } from './lead-merge.js';
import { matchCompany } from './opportunity-capture.js';
import type { CrmService } from './service.js';

// What a record about to be created may repeat, as New lead, New
// opportunity and New company with the AI find it, for an agent to check
// before its plan creates one (`crm duplicates check`): open leads, contacts
// and companies by the lead's person and company; contacts by their email,
// phone or LinkedIn; companies by name, with their leads; a company's open
// deals. Read with the reader's access.

export interface DuplicateCheckInput {
  entity: 'leads' | 'contacts' | 'companies' | 'opportunities';
  name?: string;
  company?: string;
  companyId?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
}

export type CheckedDuplicate = Omit<FoundDuplicate, 'entity'> & {
  entity: FoundDuplicate['entity'] | 'opportunities';
  stage?: string;
};

export async function checkDuplicates(
  service: CrmService,
  actor: Actor,
  input: DuplicateCheckInput,
): Promise<CheckedDuplicate[]> {
  const person: Row = {
    name: input.name,
    company: input.company,
    email: input.email,
    phone: input.phone,
    linkedin: input.linkedin,
  };
  switch (input.entity) {
    case 'leads':
    case 'contacts':
      return findDuplicates(service, actor, person);
    case 'companies':
      return (
        await findDuplicates(service, actor, {
          company: input.name ?? input.company,
        })
      ).filter((found) => found.entity !== 'contacts');
    case 'opportunities': {
      const found: CheckedDuplicate[] = [];
      let companyId = input.companyId ?? '';
      if (!companyId && input.company) {
        const companies = (
          await findDuplicates(service, actor, { company: input.company })
        ).filter((item) => item.entity === 'companies');
        found.push(...companies);
        if (companies.length === 1) companyId = companies[0].id;
      }
      if (companyId)
        for (const deal of (await matchCompany(service, actor, companyId, []))
          .duplicates)
          found.push({
            entity: 'opportunities',
            id: deal.id,
            name: deal.name,
            matched: ['company'],
            stage: deal.stage,
          });
      return found;
    }
  }
}
