import { Check, Search, X } from 'lucide-react';
import { useState, type ReactElement, type ReactNode } from 'react';
import { Button } from '../ui/button.js';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover.js';

// The chips of a new task's form (RecordForm's quick mode), laid out as
// Clarify's task dialog: what is to be done reads as a title, and everything
// else is a chip under it that opens what sets it. The chips are the
// application's own outline buttons and popovers.

const chipClass = (empty: boolean): string =>
  `max-w-56 font-normal ${empty ? 'text-muted-foreground' : ''}`;

// One thing a search chip offers: a record or a person, by its name, with
// what tells it apart.
export interface SearchOption {
  id: string;
  label: string;
}

// A chip that searches, as Clarify's record chip does: a box to type in, and
// the matches under it, grouped (leads, companies, opportunities) when there
// are several kinds. A pick is marked; picking a marked one takes it out.
// One pick closes it; several stay open for more.
export function TaskSearchChip({
  icon,
  label,
  empty,
  placeholder,
  groups,
  selected,
  multiple = false,
  onSearch,
  onPick,
  onClear,
  clearLabel,
  onOpenChange,
  limit,
}: {
  icon: ReactNode;
  label: ReactNode;
  empty: boolean;
  placeholder: string;
  groups: { key: string; title?: string; options: SearchOption[] }[];
  selected: ReadonlySet<string>;
  multiple?: boolean;
  // Without it, the chip filters the options it was given by their names.
  onSearch?: (text: string) => void;
  onPick: (group: string, option: SearchOption) => void;
  // With it, a chip holding something has a cross beside it that empties it
  // at a click, without opening the list.
  onClear?: () => void;
  // The cross's name for screen readers.
  clearLabel?: string;
  // Told when the list opens or closes, so what it searches is fetched
  // only once someone looks.
  onOpenChange?: (open: boolean) => void;
  // How many options a group shows before anything is typed; the rest are
  // found by searching.
  limit?: number;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const clearable = Boolean(onClear) && !empty;
  const [text, setText] = useState('');
  const needle = onSearch ? '' : text.trim().toLowerCase();
  const shown = groups
    .map((group) => ({
      ...group,
      options: needle
        ? group.options.filter((option) =>
            option.label.toLowerCase().includes(needle),
          )
        : limit && !text.trim()
          ? group.options.slice(0, limit)
          : group.options,
    }))
    .filter((group) => group.options.length);
  return (
    <span className='inline-flex'>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange?.(next);
          if (!next) {
            setText('');
            onSearch?.('');
          }
        }}
      >
        <PopoverTrigger
          render={
            <Button
              type='button'
              variant='outline'
              size='sm'
              className={`${chipClass(empty)} ${clearable ? 'rounded-r-none border-r-0' : ''}`}
            />
          }
        >
          {icon}
          <span className='truncate'>{label}</span>
        </PopoverTrigger>
        <PopoverContent align='start' className='w-72 gap-0 p-0'>
          <div className='relative border-b'>
            <Search className='absolute top-2.5 left-3 size-4 text-muted-foreground' />
            <input
              autoFocus
              aria-label={placeholder}
              placeholder={placeholder}
              className='h-9 w-full bg-transparent pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground'
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                onSearch?.(e.target.value);
              }}
            />
          </div>
          <div className='max-h-72 overflow-y-auto p-1'>
            {shown.map((group) => (
              <div key={group.key}>
                {group.title && (
                  <div className='px-2 pt-2 pb-1 text-xs text-muted-foreground'>
                    {group.title}
                  </div>
                )}
                {group.options.map((option) => (
                  <Button
                    key={option.id}
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='w-full justify-start font-normal'
                    onClick={() => {
                      onPick(group.key, option);
                      if (!multiple) setOpen(false);
                    }}
                  >
                    <Check
                      className={
                        selected.has(option.id) ? 'opacity-100' : 'opacity-0'
                      }
                    />
                    <span className='truncate'>{option.label}</span>
                  </Button>
                ))}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {clearable && (
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='rounded-l-none px-1.5 text-muted-foreground hover:text-foreground'
          aria-label={clearLabel}
          title={clearLabel}
          onClick={onClear}
        >
          <X />
        </Button>
      )}
    </span>
  );
}
