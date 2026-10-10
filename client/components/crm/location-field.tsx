import { useRef, useState, type ReactElement } from 'react';
import { Search } from 'lucide-react';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { Label } from '../ui/label.js';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover.js';
import {
  CountryChoice,
  CountryLabel,
  SubdivisionChoice,
  SubdivisionLabel,
} from './geography.js';
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
    `geography/search?q=${encodeURIComponent(searched)}`,
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
      {region.length ? <span className='block'>{region}</span> : null}
      {address ? (
        <span className='block text-muted-foreground'>{address}</span>
      ) : null}
    </>
  );
  const save = async (): Promise<void> => {
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
      setOpen(false);
    } catch (cause) {
      setError(text(`errors.${errorCode(cause).code}`, { defaultValue: '' }));
    } finally {
      setSaving(false);
    }
  };
  if (!editable)
    return (
      <div className='px-2 py-1.5 text-sm'>
        {blank ? <span className='text-muted-foreground'>—</span> : line}
      </div>
    );
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDraft({ country, state, city, address });
          setQuery('');
          setError('');
        }
      }}
    >
      <PopoverTrigger
        nativeButton={false}
        aria-label={label}
        render={<div />}
        className='w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
      >
        {blank ? (
          <span className='text-muted-foreground'>
            {text('emptyFill', { field: label })}
          </span>
        ) : (
          line
        )}
      </PopoverTrigger>
      {/* Opening, the search takes the keys. */}
      <PopoverContent
        align='start'
        className='w-80 gap-3 p-3'
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
                    className='w-full truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted'
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
                void save();
              }
            }}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{text('fields.address')}</Label>
          <Input
            aria-label={toText(text('fields.address'))}
            value={draft.address}
            maxLength={TEXT_LIMIT}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                address: event.target.value,
              }))
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void save();
              }
            }}
          />
        </div>
        {error ? <p className='text-xs text-destructive'>{error}</p> : null}
        <div className='flex justify-end gap-2'>
          <Button
            size='sm'
            variant='ghost'
            disabled={saving}
            onClick={() => setOpen(false)}
          >
            {text('cancel')}
          </Button>
          <Button size='sm' disabled={saving} onClick={() => void save()}>
            {text('save')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
