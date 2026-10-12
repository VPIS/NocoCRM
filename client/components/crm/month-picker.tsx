import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { Button } from '../ui/button.js';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover.js';
import { useCrmText } from './api.js';

// The calendar's month as its stepper shows it, opening on a click a
// picker of the months of a year, a year at a time, with the way back to
// this month at its foot. Months are "yyyy-mm".
export function MonthPicker({
  month,
  current,
  title,
  onChange,
}: {
  month: string;
  // This month, "yyyy-mm", in the business time zone.
  current: string;
  // The month as the stepper reads it ("2026年10月").
  title: string;
  onChange: (month: string) => void;
}): ReactElement {
  const { text, language } = useCrmText();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number(month.slice(0, 4)));
  const monthName = (index: number): string =>
    new Intl.DateTimeFormat(language, {
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(2026, index, 1)));
  const pick = (next: string): void => {
    onChange(next);
    setOpen(false);
  };
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        // Opens on the year shown.
        if (next) setYear(Number(month.slice(0, 4)));
        setOpen(next);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant='ghost'
            size='sm'
            className='min-w-24 font-medium tabular-nums'
          />
        }
      >
        {title}
      </PopoverTrigger>
      <PopoverContent align='center' className='w-64 gap-2 p-2'>
        <div className='flex items-center justify-between'>
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label={text('previousYear')}
            onClick={() => setYear((y) => y - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className='text-sm font-medium tabular-nums'>{year}</span>
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label={text('nextYear')}
            onClick={() => setYear((y) => y + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
        <div className='grid grid-cols-3 gap-1'>
          {Array.from({ length: 12 }, (_, index) => {
            const value = `${String(year)}-${String(index + 1).padStart(2, '0')}`;
            const shown = value === month;
            return (
              <Button
                key={value}
                variant={shown ? 'default' : 'ghost'}
                size='sm'
                aria-pressed={shown}
                className={`font-normal ${
                  !shown && value === current ? 'text-primary' : ''
                }`}
                onClick={() => pick(value)}
              >
                {monthName(index)}
              </Button>
            );
          })}
        </div>
        <Button
          variant='outline'
          size='sm'
          disabled={month === current}
          onClick={() => pick(current)}
        >
          {text('thisMonth')}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
