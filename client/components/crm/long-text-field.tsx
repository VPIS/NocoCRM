import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '../ui/button.js';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover.js';
import { Textarea } from '../ui/textarea.js';
import { Markdown } from './markdown.js';
import { LengthHint } from './length-hint.js';
import { LONG_TEXT_LIMIT } from '../../../server/providers/crm/limits.js';
import { useCrmText } from './api.js';

// A long text in the narrow column of a record's particulars (a company's
// introduction, a description): three lines that fade out when there is
// more, opening into a pop-up beside the field wide enough to read it
// whole and to edit it there, so the column never jumps and editing has
// room. An empty one the reader may fill opens straight into the editor.
export function LongTextField({
  value,
  label,
  editable,
  placeholder,
  error,
  onSave,
}: {
  value: string;
  label: string;
  editable: boolean;
  // Greyed in place of an empty value the reader may fill.
  placeholder?: string;
  error?: string;
  // Saves the text; whether it was saved.
  onSave: (text: string) => Promise<boolean>;
}): ReactElement {
  const { text, language } = useCrmText();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [overflows, setOverflows] = useState(false);
  const blank = !value.trim();
  useEffect(() => {
    const element = previewRef.current;
    if (!element) return;
    const measure = (): void =>
      setOverflows(element.scrollHeight > element.clientHeight + 1);
    // The observer reports once when it starts, then on every resize.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);
  const edit = (): void => {
    setDraft(value);
    setEditing(true);
  };
  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      if (await onSave(draft)) {
        setEditing(false);
        if (!draft.trim()) setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  };
  if (blank && !editable)
    return <div className='px-2 py-1.5 text-sm text-muted-foreground'>—</div>;
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setEditing(false);
        else if (blank) edit();
      }}
    >
      <PopoverTrigger
        nativeButton={false}
        aria-label={label}
        render={<div />}
        className='w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
      >
        {blank ? (
          <span className='text-muted-foreground'>{placeholder}</span>
        ) : (
          // Three lines, the last fading out while there is more.
          <div
            ref={previewRef}
            className={`line-clamp-3 leading-relaxed break-words ${
              overflows
                ? '[mask-image:linear-gradient(to_bottom,black_55%,transparent)]'
                : ''
            }`}
          >
            <Markdown compact>{value}</Markdown>
          </div>
        )}
        {error ? (
          <span className='mt-1 block text-xs text-destructive'>{error}</span>
        ) : null}
      </PopoverTrigger>
      {/* Beside the column, toward the page's middle, twice the column's
          width at most; a very long text scrolls inside. */}
      <PopoverContent
        side='left'
        align='start'
        sideOffset={8}
        // An empty one opens on its editor, which takes the keys.
        initialFocus={blank ? editorRef : true}
        className='max-h-[min(36rem,70vh)] w-[28rem] max-w-[calc(100vw-2rem)] gap-2 overflow-y-auto p-4'
      >
        <div className='flex items-center gap-2'>
          <span className='min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground'>
            {label}
          </span>
          {editable && !editing ? (
            <Button size='xs' variant='ghost' onClick={edit}>
              <Pencil />
              {text('edit')}
            </Button>
          ) : null}
        </div>
        {editing ? (
          <>
            <Textarea
              ref={editorRef}
              aria-label={label}
              autoFocus
              rows={10}
              maxLength={LONG_TEXT_LIMIT}
              value={draft}
              disabled={saving}
              className='max-h-[50vh] text-sm leading-relaxed'
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void save();
                }
              }}
            />
            <LengthHint length={draft.length} language={language} />
            {error ? (
              <span className='text-xs text-destructive'>{error}</span>
            ) : null}
            <div className='flex justify-end gap-2'>
              <Button
                size='sm'
                variant='ghost'
                disabled={saving}
                onClick={() => (blank ? setOpen(false) : setEditing(false))}
              >
                {text('cancel')}
              </Button>
              <Button size='sm' disabled={saving} onClick={() => void save()}>
                {text('save')}
              </Button>
            </div>
          </>
        ) : (
          // A double-click edits it too, as it does every other field.
          <div
            className={`rounded-md text-sm leading-relaxed break-words ${
              editable ? 'cursor-text' : ''
            }`}
            onDoubleClick={() => {
              if (!editable) return;
              // The double-click also selected the word under it.
              window.getSelection()?.removeAllRanges();
              edit();
            }}
          >
            <Markdown compact>{value}</Markdown>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
