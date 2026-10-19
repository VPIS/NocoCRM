import { useState, type ReactElement } from 'react';

import { Button } from '../../../components/ui/button.js';
import { Field, FieldLabel } from '../../../components/ui/field.js';
import { ErrorNotice, Loading } from '../../../components/crm/common.js';
import { MultiChoice } from '../../../components/crm/form.js';
import {
  localDate,
  toText,
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useMetadata,
  useRefresh,
} from '../../../components/crm/api.js';
import { DEFAULT_TIME_ZONE } from '../../../../server/providers/crm/zone-time.js';

// Who may approve: the approver rule (GET/PUT /api/approverRule), the roles
// and the people an applicant may choose as approver, any one of them
// enough. Each save is a new version of the lifecycle's parameter; it
// governs the pickers and the next submissions, while a request already
// submitted keeps its approver. Whoever is named must also be active and
// hold the approve capability, so the people it names now are listed under
// it.

const ROLES = ['sales-manager', 'system-administrator', 'sales-representative'];

export interface ApproverRule {
  roles: string[];
  users: string[];
  revision: number;
  updatedById: string | null;
  updatedAt: string | null;
  approvers: string[];
}

export function ApproverRuleCard(): ReactElement {
  const rule = useCrmQuery<ApproverRule>('approverRule');
  if (rule.isLoading) return <Loading />;
  if (!rule.data) return <ErrorNotice error={rule.error} />;
  // A saved version starts the form afresh from what was saved.
  return <ApproverRuleForm key={rule.data.revision} rule={rule.data} />;
}

const same = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((item) => b.includes(item));

function ApproverRuleForm({ rule }: { rule: ApproverRule }): ReactElement {
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const meta = useMetadata().data;
  const users = meta?.users ?? [];
  const nameOf = (id: string) =>
    users.find((user) => user.id === id)?.name ?? id;
  const [roles, setRoles] = useState(rule.roles);
  const [people, setPeople] = useState(rule.users);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const changed = !same(roles, rule.roles) || !same(people, rule.users);
  const save = async (): Promise<void> => {
    setBusy(true);
    setError(undefined);
    try {
      await api('approverRule', 'PUT', {
        roles,
        users: people,
        revision: rule.revision,
        requestId: crypto.randomUUID(),
      });
      // The pickers' approvers are in the workspace metadata.
      await refresh();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      aria-label={toText(text('approvalFlow.approvers.title'))}
      className='grid gap-4 rounded-xl border border-border bg-card p-4 shadow-xs'
    >
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='grid gap-1'>
          <h2 className='font-medium'>
            {text('approvalFlow.approvers.title')}
          </h2>
          <p className='text-sm text-muted-foreground'>
            {text('approvalFlow.approvers.hint')}
          </p>
        </div>
        <Button
          disabled={!changed || busy || (!roles.length && !people.length)}
          onClick={() => void save()}
        >
          {busy ? text('saving') : text('save')}
        </Button>
      </div>
      <ErrorNotice error={error} />
      <div className='grid gap-4 md:grid-cols-2'>
        <Field>
          <FieldLabel>{text('approvalFlow.approvers.roles')}</FieldLabel>
          <MultiChoice
            label={toText(text('approvalFlow.approvers.roles'))}
            value={roles}
            onChange={setRoles}
            choices={ROLES.map((role) => ({
              value: role,
              label: toText(text(`options.${role}`)),
            }))}
          />
        </Field>
        <Field>
          <FieldLabel>{text('approvalFlow.approvers.people')}</FieldLabel>
          <MultiChoice
            label={toText(text('approvalFlow.approvers.people'))}
            value={people}
            onChange={setPeople}
            searchable
            // A disabled user already named stays visible, to be taken off.
            choices={users
              .filter((user) => !user.disabled || people.includes(user.id))
              .map((user) => ({ value: user.id, label: user.name }))}
          />
        </Field>
      </div>
      <p className='text-sm'>
        {rule.approvers.length
          ? text('approvalFlow.approvers.now', {
              names: rule.approvers
                .map(nameOf)
                .join(language.startsWith('zh') ? '、' : ', '),
            })
          : text('approvalFlow.approvers.nobody')}
      </p>
      <p className='text-xs text-muted-foreground'>
        {rule.updatedAt
          ? text('approvalFlow.approvers.changed', {
              name: nameOf(rule.updatedById ?? ''),
              time: localDate(
                rule.updatedAt,
                language,
                meta?.settings.timeZone ?? DEFAULT_TIME_ZONE,
              ),
              revision: rule.revision,
            })
          : text('approvalFlow.approvers.default')}
      </p>
    </section>
  );
}
