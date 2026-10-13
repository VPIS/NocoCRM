import { format, type Locale } from 'date-fns';
import { CalendarIcon, XIcon } from 'lucide-react';
import { useState, type ReactElement, type ReactNode } from 'react';
import { cn } from 'cn';
import { Button } from './ui/button.js';
import { Calendar } from './ui/calendar.js';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover.js';

// A date picked from a calendar, as shadcn's Date Picker guide composes it:
// an outline button showing the date opens the Calendar in a Popover. The
// date reads as yyyy-MM-dd, the way every date in the application is shown.
export interface DatePickerProps {
  readonly id?: string;
  readonly value: Date | undefined;
  readonly onChange: (date: Date | undefined) => void;
  readonly locale?: Locale;
  readonly placeholder?: string;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly size?: 'default' | 'sm';
  readonly 'aria-label'?: string;
  // What the button shows in place of the date (a date with its time).
  readonly display?: ReactNode;
  // Beside the calendar (a time of day); with it, picking a day keeps the
  // popover open so the rest can be set too.
  readonly aside?: ReactNode;
  // Told when the calendar opens and closes (an inline editor saves on
  // close).
  readonly onOpenChange?: (open: boolean) => void;
  // Open from the start (an inline editor, opened by a double-click).
  readonly defaultOpen?: boolean;
  // With it, a date that is set offers to clear it under the calendar, which
  // closes it as a pick does; leave it out where a date is required.
  readonly onClear?: () => void;
  readonly clearLabel?: string;
}

export function DatePicker({
  id,
  value,
  onChange,
  locale,
  placeholder,
  className,
  disabled,
  size = 'default',
  'aria-label': ariaLabel,
  display,
  aside,
  onOpenChange,
  defaultOpen = false,
  onClear,
  clearLabel,
}: DatePickerProps): ReactElement {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            id={id}
            type='button'
            variant='outline'
            size={size}
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn(
              'justify-start font-normal',
              !value && 'text-muted-foreground',
              className,
            )}
          />
        }
      >
        <CalendarIcon />
        {value ? (display ?? format(value, 'yyyy-MM-dd')) : placeholder}
      </PopoverTrigger>
      <PopoverContent className='w-auto gap-0 p-0' align='start'>
        <div className='flex'>
          <Calendar
            mode='single'
            selected={value}
            defaultMonth={value}
            locale={locale}
            onSelect={(date) => {
              onChange(date);
              if (!aside) {
                setOpen(false);
                onOpenChange?.(false);
              }
            }}
          />
          {aside}
        </div>
        {onClear && value ? (
          <div className='border-t p-2'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='w-full'
              onClick={() => {
                onClear();
                setOpen(false);
                onOpenChange?.(false);
              }}
            >
              <XIcon data-icon='inline-start' />
              {clearLabel}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
