import { enUS, zhCN } from 'date-fns/locale';
import { X } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { DatePicker } from '../date-picker.js';
import { Button } from '../ui/button.js';
import { toText, useCrmText, useMetadata } from './api.js';
import {
  endOfDay,
  isEndOfDay,
} from '../../../server/providers/crm/zone-time.js';
import { TimeColumn } from './datetime-input.js';

// A task's time: a day from the date picker and, under its calendar, the
// time of day on a 24-hour clock when it is at an hour. A task has one time
// and no end. No time of day is a day alone, kept as the last instant of that
// business day (isEndOfDay), which no time picked to the minute can be.
// The time of day is picked from an hour and a minute column beside the
// calendar, on a 24-hour clock, never a native time control, whose 12/24-hour
// clock follows the browser's locale.

export interface TaskTime {
  dueAt: string | null;
}

const pad = (n: number): string => String(n).padStart(2, '0');

const clockOf = (value: unknown): string => {
  const date = value ? new Date(toText(value)) : null;
  return date && Number.isFinite(+date)
    ? `${pad(date.getHours())}:${pad(date.getMinutes())}`
    : '';
};

// "14:30" or "9:05" as hours and minutes; anything else is no time.
const parseClock = (text: string): [number, number] | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? [hours, minutes] : null;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function taskTime(
  day: Date | undefined,
  clock: string,
  timeZone: string,
): TaskTime {
  if (!day) return { dueAt: null };
  const at = new Date(day);
  const time = parseClock(clock);
  if (!time) {
    // Noon of the day picked, then the end of that business day.
    at.setHours(12, 0, 0, 0);
    return { dueAt: endOfDay(at, timeZone).toISOString() };
  }
  at.setHours(time[0], time[1], 0, 0);
  return { dueAt: at.toISOString() };
}

export function TaskTimeField({
  id,
  value,
  onChange,
  size = 'default',
}: {
  id?: string;
  value: { dueAt: unknown };
  onChange: (time: TaskTime) => void;
  // `sm` in a row of small buttons (a new task's quick form).
  size?: 'default' | 'sm';
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const timeZone = meta?.settings.timeZone ?? 'Asia/Shanghai';
  const small = size === 'sm';
  const due = value.dueAt ? new Date(toText(value.dueAt)) : undefined;
  const day =
    due && Number.isFinite(+due)
      ? new Date(due.getFullYear(), due.getMonth(), due.getDate())
      : undefined;
  const [clock, setClock] = useState(() =>
    due && isEndOfDay(due, timeZone) ? '' : clockOf(value.dueAt),
  );
  const today = (): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };
  const timed = parseClock(clock);
  // An hour or a minute picked: the other kept, or :00 and 09 to start with.
  // A time picked before a day is for today.
  const pick = (hour: number, minute: number): void => {
    const next = `${pad(hour)}:${pad(minute)}`;
    setClock(next);
    onChange(taskTime(day ?? today(), next, timeZone));
  };
  return (
    <DatePicker
      id={id}
      aria-label={toText(text('fields.dueAt'))}
      size={size}
      className={small ? '' : 'w-56'}
      value={day}
      locale={language.startsWith('zh') ? zhCN : enUS}
      placeholder={toText(text(small ? 'fields.dueAt' : 'taskTime.pickDate'))}
      display={
        day
          ? `${String(day.getFullYear())}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}${timed ? ` ${clock.trim()}` : ''}`
          : undefined
      }
      onChange={(picked) => onChange(taskTime(picked, clock, timeZone))}
      aside={
        <div className='flex w-24 flex-col'>
          <div className='relative flex min-h-0 flex-1'>
            <TimeColumn
              label={toText(text('hour'))}
              values={HOURS}
              selected={timed?.[0]}
              initial={9}
              open
              onPick={(hour) => pick(hour, timed?.[1] ?? 0)}
            />
            <TimeColumn
              label={toText(text('minute'))}
              values={MINUTES}
              selected={timed?.[1]}
              initial={0}
              open
              onPick={(minute) => pick(timed?.[0] ?? 9, minute)}
            />
          </div>
          {/* Back to a day alone. */}
          <Button
            type='button'
            variant='ghost'
            size='xs'
            className='m-1 text-muted-foreground'
            disabled={!timed}
            onClick={() => {
              setClock('');
              onChange(taskTime(day ?? today(), '', timeZone));
            }}
          >
            <X />
            {text('taskTime.noTime')}
          </Button>
        </div>
      }
    />
  );
}
