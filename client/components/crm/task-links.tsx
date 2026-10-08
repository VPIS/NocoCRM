import { useQuery } from '@tanstack/react-query';
import { Building2, Handshake, Link2, Radar, Users } from 'lucide-react';
import { useEffect, useState, type ReactElement } from 'react';
import {
  toText,
  useCrmApi,
  useCrmScopeKey,
  useCrmText,
  useMetadata,
  type CrmRecord,
  type Data,
  type Entity,
  type ListData,
} from './api.js';
import { recordTitle } from './lookups.js';
import { TaskSearchChip, type SearchOption } from './task-quick.js';

// A new task's chips that search (RecordForm's quick mode): the record it
// concerns, one lead, account or opportunity found by one search across the
// three, as Clarify's record chip does; and the colleagues taking part.

// The first matches of each kind, before anything is typed and after.
const RESULTS = 5;
// The colleagues listed before a name is typed.
const PEOPLE = 8;

function useDebounced(value: string, delay = 250): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// The first matches of one kind of record, through the list endpoint.
function useMatches(
  entity: Entity,
  search: string,
  enabled: boolean,
  extra: Record<string, string> = {},
): { rows: CrmRecord[]; titles: Record<string, string> } {
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const params = new URLSearchParams({ pageSize: String(RESULTS) });
  if (search) params.set('search', search);
  for (const [key, value] of Object.entries(extra))
    if (value) params.set(key, value);
  const path = `${toText(entity)}?${params.toString()}`;
  const query = useQuery({
    queryKey: [...scopeKey, 'task-links', path],
    queryFn: () => api<ListData>(path),
    enabled,
    staleTime: 20000,
  });
  const rows = query.data?.data;
  return {
    rows: Array.isArray(rows) ? rows : [],
    // The names of the records they refer to (a deal's account).
    titles: query.data?.titles ?? {},
  };
}

const arrayOf = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(toText) : [];

export function TaskLinkChips({
  input,
  onChange,
  names,
}: {
  input: Data;
  onChange: (changes: Data) => void;
  // The names the form already knows (records it opened with or picked).
  names: Record<string, string>;
}): ReactElement | null {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const [recordSearch, setRecordSearch] = useState('');
  const [peopleSearch, setPeopleSearch] = useState('');
  // What was picked here, by id, so a chip names it at once.
  const [known, setKnown] = useState<Record<string, string>>({});
  const recordQuery = useDebounced(recordSearch);
  // Fetched once the record chip is opened, not with the dialog.
  const [looking, setLooking] = useState(false);
  const leadMatches = useMatches('leads', recordQuery, looking, {
    excludeStatus: 'converted',
  });
  const accountMatches = useMatches('accounts', recordQuery, looking);
  const dealMatches = useMatches('opportunities', recordQuery, looking);
  const leads = leadMatches.rows;
  const accounts = accountMatches.rows;
  const opportunities = dealMatches.rows;
  const listTitles = {
    ...leadMatches.titles,
    ...accountMatches.titles,
    ...dealMatches.titles,
  };
  if (!meta) return null;
  const nameOf = (id: unknown): string => {
    const key = toText(id ?? '');
    return key ? (known[key] ?? names[key] ?? listTitles[key] ?? '') : '';
  };
  const listed = (items: string[]): string =>
    items.join(language.startsWith('zh') ? '、' : ', ');
  const options = (entity: Entity, records: CrmRecord[]): SearchOption[] =>
    records.map((record) => ({
      id: toText(record.id),
      label: recordTitle(entity, record, { ...listTitles, ...names }),
    }));
  const remember = (option: SearchOption): void =>
    setKnown((current) => ({ ...current, [option.id]: option.label }));
  // One record: a lead, an account, or a deal (which carries its account),
  // shown with its kind's menu icon.
  const linked = nameOf(
    input.opportunityId || input.leadId || input.accountId || '',
  );
  const LinkedIcon = input.opportunityId
    ? Handshake
    : input.leadId
      ? Radar
      : input.accountId
        ? Building2
        : Link2;
  const colleagues = arrayOf(input.internalParticipants);
  const team = meta.users.filter(
    (u) =>
      !u.disabled &&
      u.roles.length &&
      (!peopleSearch.trim() ||
        u.name.toLowerCase().includes(peopleSearch.trim().toLowerCase())),
  );
  const toggle = (list: string[], id: string): string[] =>
    list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
  return (
    <>
      <TaskSearchChip
        icon={<LinkedIcon />}
        label={linked || text('taskQuick.record')}
        empty={!linked}
        placeholder={toText(text('taskQuick.searchRecords'))}
        groups={[
          {
            key: 'leads',
            title: toText(text('entities.leads')),
            options: options('leads', leads),
          },
          {
            key: 'accounts',
            title: toText(text('entities.accounts')),
            options: options('accounts', accounts),
          },
          {
            key: 'opportunities',
            title: toText(text('entities.opportunities')),
            options: options('opportunities', opportunities),
          },
        ]}
        selected={
          new Set(
            [input.leadId, input.accountId, input.opportunityId]
              .map((v) => toText(v ?? ''))
              .filter(Boolean),
          )
        }
        onSearch={setRecordSearch}
        onOpenChange={(open) => {
          if (open) setLooking(true);
        }}
        clearLabel={toText(text('taskQuick.clear'))}
        onClear={() =>
          onChange({
            leadId: null,
            accountId: null,
            opportunityId: null,
          })
        }
        onPick={(group, option) => {
          remember(option);
          const key =
            group === 'leads'
              ? 'leadId'
              : group === 'accounts'
                ? 'accountId'
                : 'opportunityId';
          // One record: picking the one linked takes it out.
          if (toText(input[key] ?? '') === option.id)
            return onChange({
              leadId: null,
              accountId: null,
              opportunityId: null,
            });
          // A deal carries its account, so the task shows on the account too.
          const deal = opportunities.find((r) => toText(r.id) === option.id);
          const account =
            key === 'accountId'
              ? option.id
              : key === 'opportunityId'
                ? toText(deal?.accountId ?? '') || null
                : null;
          onChange({
            leadId: key === 'leadId' ? option.id : null,
            accountId: account,
            opportunityId: key === 'opportunityId' ? option.id : null,
          });
        }}
      />
      <TaskSearchChip
        icon={<Users />}
        label={
          colleagues.length
            ? listed(
                colleagues.map(
                  (id) => meta.users.find((u) => u.id === id)?.name ?? '',
                ),
              )
            : text('fields.internalParticipants')
        }
        empty={!colleagues.length}
        multiple
        placeholder={toText(text('taskQuick.searchPeople'))}
        groups={[
          {
            key: 'users',
            options: team.map((u) => ({ id: u.id, label: u.name })),
          },
        ]}
        selected={new Set(colleagues)}
        onSearch={setPeopleSearch}
        limit={PEOPLE}
        clearLabel={toText(text('taskQuick.clear'))}
        onClear={() => onChange({ internalParticipants: [] })}
        onPick={(_group, option) =>
          onChange({ internalParticipants: toggle(colleagues, option.id) })
        }
      />
    </>
  );
}
