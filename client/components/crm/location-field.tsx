import { useRef, useState, type ReactElement } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/input.js';
import { Textarea } from '../ui/textarea.js';
import { Label } from '../ui/label.js';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover.js';
import {
  CountryChoice,
  CountryLabel,
  SubdivisionChoice,
  SubdivisionLabel,
} from './geography.js';
import { FadePreview } from './long-text-field.js';
import { useDebounced } from './record-search.js';
import { TEXT_LIMIT } from '../../../server/providers/crm/limits.js';
import {
  errorCode,
  toText,
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useRefresh,
  type CrmRecord,
  type Entity,
} from './api.js';

interface PlaceMatch {
  country: string;
  state: string | null;
  label: string;
}

// A record's location (a lead's, a company's): its region, the part to
// see at a glance, on the first line as the reader's language writes it
// ("Hangzhou, Zhejiang, China"; 中国 浙江省 杭州), and its street address
// muted under it; edited as Clarify edits a primary location: a click opens a
// pop-up whose search finds a province or a country by its name and fills
// them, over the country, province, city and address each to change by
// itself, saved together.
export function LocationField({
  entity,
  record,
  editable,
  label,
  countries,
}: {
  entity: Entity;
  record: CrmRecord;
  editable: boolean;
  label: string;
  // The countries the record may name (its country field's options).
  countries: string[];
}): ReactElement {
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const zh = language.startsWith('zh');
  const country = toText(record.country);
  const state = toText(record.state);
  const city = toText(record.city);
  const address = toText(record.address);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ country, state, city, address });
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const searched = useDebounced(query.trim());
  const { data: matches } = useCrmQuery<PlaceMatch[]>(
    `geography/places?q=${encodeURIComponent(searched)}`,
    open && Boolean(searched),
  );
  const blank = !country && !state && !city && !address;
  // The parts there are, in the order the language writes an address.
  const parts = [
    city ? <span key='city'>{city}</span> : null,
    state && country ? (
      <SubdivisionLabel key='state' country={country} code={state} />
    ) : null,
    country ? <CountryLabel key='country' code={country} /> : null,
  ].filter((part) => part !== null);
  const region = (zh ? [...parts].reverse() : parts).flatMap((part, index) =>
    index ? [zh ? ' ' : ', ', part] : [part],
  );
  const line = (
    <>
      {region.length ? (
        <span className='block leading-relaxed'>{region}</span>
      ) : null}
      {address ? (
        // As the column's other long texts read: three lines, fading out
        // while there is more, the whole in the pop-up; the region line
        // above at the same height (the introduction's).
        <FadePreview className='whitespace-pre-line text-muted-foreground'>
          {address}
        </FadePreview>
      ) : null}
    </>
  );
  // Whether the location now stands as written (saved, or unchanged).
  const save = async (): Promise<boolean> => {
    if (
      draft.country === country &&
      draft.state === state &&
      draft.city === city &&
      draft.address === address
    )
      return true;
    setSaving(true);
    try {
      await api(`${toText(entity)}/${toText(record.id)}`, 'PATCH', {
        country: draft.country || null,
        state: draft.country && draft.state ? draft.state : null,
        city: draft.city.trim() || null,
        address: draft.address.trim() || null,
      });
      await refresh();
      setError('');
      return true;
    } catch (cause) {
      setError(text(`errors.${errorCode(cause).code}`, { defaultValue: '' }));
      return false;
    } finally {
      setSaving(false);
    }
  };
  // Saves, and closes once saved.
  const finish = async (): Promise<void> => {
    if (saving) return;
    if (await save()) setOpen(false);
  };
  if (!editable)
    return (
      <div className='px-2 py-1.5 text-sm'>
        {blank ? (
          <span data-placeholder className='text-muted-foreground'>
            —
          </span>
        ) : (
          line
        )}
      </div>
    );
  return (
    <Popover
      open={open}
      onOpenChange={(next, details) => {
        if (next) {
          setDraft({ country, state, city, address });
          setQuery('');
          setError('');
          setOpen(true);
          return;
        }
        // As an inline field: Escape leaves it as it was, any other way out
        // saves it, staying open while it cannot be saved.
        if (details.reason === 'escape-key') {
          setOpen(false);
          return;
        }
        void finish();
      }}
    >
      <PopoverTrigger
        nativeButton={false}
        aria-label={label}
        render={<div />}
        className='w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
      >
        {blank ? (
          <span data-placeholder className='text-muted-foreground'>
            {text('emptyFill', { field: label })}
          </span>
        ) : (
          line
        )}
      </PopoverTrigger>
      {/* Opening, the search takes the keys; its controls show focus as
          lightly as the inline editor does. */}
      <PopoverContent
        // Beside the column, toward the page's middle, as a long text's
        // pop-up opens (LongTextField).
        side='left'
        align='start'
        sideOffset={8}
        className='w-80 gap-3 p-3 [&_:focus-visible]:border-ring/50! [&_:focus-visible]:ring-2! [&_:focus-visible]:ring-ring/20!'
        initialFocus={searchRef}
      >
        {/* A province or a country found by name fills both. */}
        <div className='grid gap-1'>
          <div className='relative'>
            <Search
              aria-hidden
              className='pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground'
            />
            <Input
              ref={searchRef}
              aria-label={text('regionSearch')}
              placeholder={toText(text('regionSearch'))}
              value={query}
              className='pl-8'
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {searched && matches?.length ? (
            <ul className='grid max-h-48 overflow-y-auto'>
              {matches.map((match) => (
                <li key={`${match.country}:${match.state ?? ''}`}>
                  <button
                    type='button'
                    className='w-full truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-hover'
                    onClick={() => {
                      setDraft((current) => ({
                        ...current,
                        country: match.country,
                        state: match.state ?? '',
                      }));
                      setQuery('');
                    }}
                  >
                    {match.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : searched && matches ? (
            <p className='px-2 py-1.5 text-sm text-muted-foreground'>
              {text('regionNoMatch')}
            </p>
          ) : null}
        </div>
        <div className='grid gap-1.5'>
          <Label>{text('fields.country')}</Label>
          <CountryChoice
            label={toText(text('fields.country'))}
            value={draft.country}
            codes={countries}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                country: value,
                // Another country's provinces are not this one's.
                state: value === current.country ? current.state : '',
              }))
            }
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{text('fields.state')}</Label>
          <SubdivisionChoice
            label={toText(text('fields.state'))}
            value={draft.state}
            country={draft.country}
            onChange={(value) =>
              setDraft((current) => ({ ...current, state: value }))
            }
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{text('fields.city')}</Label>
          <Input
            aria-label={toText(text('fields.city'))}
            value={draft.city}
            maxLength={TEXT_LIMIT}
            onChange={(event) =>
              setDraft((current) => ({ ...current, city: event.target.value }))
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void finish();
              }
            }}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{text('fields.address')}</Label>
          {/* Of several lines if need be (a building, a floor): Enter
              breaks the line, Cmd/Ctrl+Enter saves. */}
          <Textarea
            aria-label={toText(text('fields.address'))}
            rows={2}
            value={draft.address}
            maxLength={TEXT_LIMIT}
            className='min-h-0 resize-none'
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                address: event.target.value,
              }))
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void finish();
              }
            }}
          />
        </div>
        {error ? <p className='text-xs text-destructive'>{error}</p> : null}
      </PopoverContent>
    </Popover>
  );
}
