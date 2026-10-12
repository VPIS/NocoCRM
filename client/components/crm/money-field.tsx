import { useRef, useState, type ReactElement } from 'react';
import { Input } from '../ui/input.js';
import { Label } from '../ui/label.js';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover.js';
import { Choice } from './form.js';
import {
  errorCode,
  money,
  toText,
  useCrmApi,
  useCrmText,
  useMetadata,
  useRefresh,
  type CrmRecord,
  type Entity,
} from './api.js';

// An amount in its currency (a deal's amount, a company's annual revenue),
// read as one value ("CN¥35,000") and edited as a location is: a click
// opens a pop-up beside the column with the currency and the number, both
// saved together when it closes, Escape leaving them as they were and Enter
// in the number saving at once.
export function MoneyField({
  entity,
  record,
  amountKey,
  editable,
  label,
  placeholder,
}: {
  entity: Entity;
  record: CrmRecord;
  // The amount's field; its currency is the record's `currency`.
  amountKey: 'amount' | 'annualRevenue';
  editable: boolean;
  label: string;
  // What an empty one says to whoever may fill it.
  placeholder: string;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  const amount = record[amountKey];
  const currency = toText(record.currency);
  const blank = amount === null || amount === undefined || amount === '';
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ currency: '', amount: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const amountRef = useRef<HTMLInputElement>(null);
  const currencies = (
    meta?.settings.options.currency ??
    meta?.definitions[entity]?.fields.find((f) => f.key === 'currency')
      ?.options ??
    []
  ).map((code) => ({ value: code, label: code }));
  const shown = blank ? null : money(amount, currency, language);
  // Whether it now stands as written (saved, or unchanged).
  const save = async (): Promise<boolean> => {
    const number = draft.amount.trim() === '' ? null : Number(draft.amount);
    if (number !== null && !Number.isFinite(number)) {
      setError(text('errors.invalidInput', { defaultValue: '' }));
      return false;
    }
    if (
      draft.currency === currency &&
      (number === null ? blank : Number(amount) === number)
    )
      return true;
    setSaving(true);
    try {
      await api(`${toText(entity)}/${toText(record.id)}`, 'PATCH', {
        currency: draft.currency || null,
        [amountKey]: number,
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
  const finish = async (): Promise<void> => {
    if (saving) return;
    if (await save()) setOpen(false);
  };
  if (!editable)
    return (
      <div className='px-2 py-1.5 text-sm tabular-nums'>
        {shown ?? (
          <span data-placeholder className='text-muted-foreground'>
            —
          </span>
        )}
      </div>
    );
  return (
    <Popover
      open={open}
      onOpenChange={(next, details) => {
        if (next) {
          setDraft({
            currency: currency || meta?.settings.currency || '',
            amount: blank ? '' : toText(amount),
          });
          setError('');
          setOpen(true);
          return;
        }
        // As an inline field: Escape leaves it as it was, any other way
        // out saves it, staying open while it cannot be saved.
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
        className='w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm tabular-nums transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
      >
        {shown ?? (
          <span data-placeholder className='text-muted-foreground'>
            {placeholder}
          </span>
        )}
      </PopoverTrigger>
      {/* Beside the column, as a location's pop-up opens; the number takes
          the keys, its controls showing focus lightly. */}
      <PopoverContent
        side='left'
        align='start'
        sideOffset={8}
        initialFocus={amountRef}
        className='w-80 gap-3 p-3 [&_:focus-visible]:border-ring/50! [&_:focus-visible]:ring-2! [&_:focus-visible]:ring-ring/10!'
      >
        <div className='grid grid-cols-[8rem_minmax(0,1fr)] gap-2'>
          <div className='grid gap-1.5'>
            <Label>{text('fields.currency')}</Label>
            <Choice
              label={toText(text('fields.currency'))}
              value={draft.currency}
              choices={currencies}
              onChange={(value) =>
                setDraft((current) => ({ ...current, currency: value }))
              }
            />
          </div>
          <div className='grid gap-1.5'>
            <Label>{label}</Label>
            <Input
              ref={amountRef}
              aria-label={label}
              inputMode='decimal'
              value={draft.amount}
              className='tabular-nums'
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  amount: event.target.value.replace(/[^\d.]/g, ''),
                }))
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void finish();
                }
              }}
            />
          </div>
        </div>
        {error ? <p className='text-xs text-destructive'>{error}</p> : null}
      </PopoverContent>
    </Popover>
  );
}
