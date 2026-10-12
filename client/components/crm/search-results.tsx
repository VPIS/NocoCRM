import { Fragment, type ReactElement } from 'react';
import {
  dueText,
  money,
  toText,
  useCrmText,
  useMetadata,
  type CrmRecord,
  type Entity,
} from './api.js';
import { DEFAULT_TIME_ZONE } from '../../../server/providers/crm/zone-time.js';

// A record as the global search lists it (search-dialog.tsx, and the AI
// answer's found records): its name, the typed words in bold, and after it
// on the same line, muted, what tells it apart. Plain text throughout: the row itself is the
// one thing to choose, so it holds no links of its own.

// The particulars on each kind's line, the ones the reader may read.
const DETAILS: Record<Entity, readonly string[]> = {
  leads: ['company', 'status'],
  opportunities: ['companyId', 'stage', 'amount'],
  companies: ['industry', 'city'],
  contacts: ['companyId', 'jobTitle'],
  tasks: ['dueAt', 'status'],
  approvals: ['topic', 'status'],
};

export function SearchRow({
  entity,
  record,
  titles,
  words,
}: {
  entity: Entity;
  record: CrmRecord;
  // The names of the records it refers to (a deal's company).
  titles: Record<string, string>;
  // The words to set in bold.
  words: readonly string[];
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const fields = meta?.definitions[entity]?.fields ?? [];
  const timeZone = meta?.settings.timeZone ?? DEFAULT_TIME_ZONE;
  const parts = DETAILS[entity].flatMap((key) => {
    const value = record[key];
    if (value == null || value === '') return [];
    const field = fields.find((f) => f.key === key);
    if (key === 'dueAt') return [dueText(record, timeZone)];
    if (key === 'amount')
      return [money(value, toText(record.currency), language)];
    if (field?.type === 'relation') return [titles[toText(value)] ?? ''];
    if (field?.type === 'select' || key === 'status' || key === 'stage')
      return [
        toText(text(`options.${toText(value)}`, { defaultValue: value })),
      ];
    return [toText(value)];
  });
  const detail = parts.filter(Boolean).join(' · ');
  return (
    // One line: the name, then what tells it apart, muted, each cut where
    // the row ends, the name keeping at least half of it.
    <span className='flex min-w-0 flex-1 items-baseline gap-2'>
      <span className='max-w-full min-w-0 shrink truncate'>
        <Highlight text={toText(record.name)} words={words} />
      </span>
      {detail && (
        <span className='min-w-[40%] flex-1 truncate text-xs text-muted-foreground'>
          <Highlight text={detail} words={words} />
        </span>
      )}
    </span>
  );
}

// The words found in a text, in bold, each wherever it appears and in any
// case, as the server matched them word by word.
function Highlight({
  text,
  words,
}: {
  text: string;
  words: readonly string[];
}): ReactElement {
  const terms = words.filter(Boolean).map((word) => word.toLowerCase());
  if (!terms.length || !text) return <>{text}</>;
  const lower = text.toLowerCase();
  const marked = new Array<boolean>(text.length).fill(false);
  for (const term of terms) {
    let at = lower.indexOf(term);
    while (at !== -1) {
      marked.fill(true, at, at + term.length);
      at = lower.indexOf(term, at + term.length);
    }
  }
  // Runs of plain and bold text, each keyed by where it starts.
  const runs: { start: number; text: string; bold: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = runs.at(-1);
    if (last && last.bold === marked[i]) last.text += text[i];
    else runs.push({ start: i, text: text[i] ?? '', bold: marked[i] ?? false });
  }
  return (
    <>
      {runs.map((run) =>
        run.bold ? (
          <strong key={run.start} className='font-semibold text-foreground'>
            {run.text}
          </strong>
        ) : (
          <Fragment key={run.start}>{run.text}</Fragment>
        ),
      )}
    </>
  );
}
