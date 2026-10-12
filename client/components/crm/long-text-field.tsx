import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover.js';
import { Textarea } from '../ui/textarea.js';
import { Markdown } from './markdown.js';
import { LengthHint } from './length-hint.js';
import { LONG_TEXT_LIMIT } from '../../../server/providers/crm/limits.js';
import { useCrmText } from './api.js';

// A long text in the narrow column of a record's particulars (a company's
// introduction, a description): three lines that fade out when there is
// more, opening into a pop-up beside the field wide enough to read it
// whole and to edit it there (a double-click on the text, as every field
// edits), so the column never jumps and editing has room. As an inline
// field does, it saves when the pop-up closes, Escape leaving it as it
// was, and Cmd/Ctrl+Enter saves at once. An empty one the reader may fill
// opens straight into the editor.
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
  const { language } = useCrmText();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const blank = !value.trim();
  const edit = (): void => {
    setDraft(value);
    setEditing(true);
  };
  // Whether the text now stands as written (saved, or unchanged).
  const save = async (): Promise<boolean> => {
    if (draft === value) {
      setEditing(false);
      return true;
    }
    setSaving(true);
    try {
      const saved = await onSave(draft);
      if (saved) setEditing(false);
      return saved;
    } finally {
      setSaving(false);
    }
  };
  if (blank && !editable)
    return (
      <div
        data-placeholder
        className='px-2 py-1.5 text-sm text-muted-foreground'
      >
        —
      </div>
    );
  return (
    <Popover
      open={open}
      onOpenChange={(next, details) => {
        if (next) {
          setOpen(true);
          if (blank) edit();
          return;
        }
        // Escape leaves the text as it was; any other way out saves it,
        // staying open on the editor while it cannot be saved.
        if (!editing || details.reason === 'escape-key') {
          setEditing(false);
          setOpen(false);
          return;
        }
        void save().then((saved) => {
          if (saved) setOpen(false);
        });
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
            {placeholder}
          </span>
        ) : (
          <FadePreview>
            <Markdown compact>{value}</Markdown>
          </FadePreview>
        )}
        {error ? (
          <span className='mt-1 block text-xs text-destructive'>{error}</span>
        ) : null}
      </PopoverTrigger>
      {/* Beside the column, toward the page's middle, twice the column's
          width at most; a very long text scrolls inside. Its editor shows
          focus as lightly as the inline editor does. */}
      <PopoverContent
        side='left'
        align='start'
        sideOffset={8}
        // An empty one opens on its editor, which takes the keys.
        initialFocus={blank ? editorRef : true}
        className='max-h-[min(36rem,70vh)] w-[28rem] max-w-[calc(100vw-2rem)] gap-2 overflow-y-auto p-4 [&_:focus-visible]:border-ring/50! [&_:focus-visible]:ring-2! [&_:focus-visible]:ring-ring/10!'
      >
        <span className='truncate text-xs font-medium text-muted-foreground'>
          {label}
        </span>
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

// A long text with room to unfold in place, across the left column (a
// lead's original message under the record's title, a comment, a task's
// result or a decision's comment in the timeline): five lines that fade
// out while there is more,
// a click unfolding the whole and another folding it back; a double-click
// is left to the field around it, which edits. A click waits a moment so a
// double-click does not unfold and fold it too, and selecting text does not
// count as a click.
export function FoldingText({ value }: { value: string }): ReactElement {
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = (): void =>
      setOverflows(element.scrollHeight > element.clientHeight + 1);
    // The observer reports once when it starts, then on every resize.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [value, open]);
  useEffect(() => () => clearTimeout(timerRef.current), []);
  const foldable = overflows || open;
  return (
    <div
      ref={ref}
      aria-expanded={foldable ? open : undefined}
      className={`leading-relaxed break-words ${foldable ? 'cursor-pointer' : ''} ${
        open
          ? ''
          : `line-clamp-5 ${
              overflows
                ? '[mask-image:linear-gradient(to_bottom,black_55%,transparent)]'
                : ''
            }`
      }`}
      onClick={(event) => {
        if (!foldable || event.detail > 1) return;
        if (!window.getSelection()?.isCollapsed) return;
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(
          () => setOpen((current) => !current),
          220,
        );
      }}
      onDoubleClick={() => clearTimeout(timerRef.current)}
    >
      <Markdown compact>{value}</Markdown>
    </div>
  );
}

// A long text's preview in the narrow column of a record's particulars (a
// description, an introduction, a street address): three lines, the last
// fading out while there is more.
export function FadePreview({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = (): void =>
      setOverflows(element.scrollHeight > element.clientHeight + 1);
    // The observer reports once when it starts, then on every resize.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children]);
  return (
    <div
      ref={ref}
      className={`line-clamp-3 leading-relaxed break-words ${
        overflows
          ? '[mask-image:linear-gradient(to_bottom,black_55%,transparent)]'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

// A long text a timeline entry changed, read whole: its one line on the
// entry opens, on a click, a pop-up as the particulars' long texts do,
// read only, with the field's name and the text it was given.
export function LongTextPeek({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  // What the entry's line shows: the text cut where the line ends.
  children: ReactNode;
}): ReactElement {
  return (
    <Popover>
      <PopoverTrigger
        nativeButton={false}
        render={<span />}
        className='min-w-0 shrink cursor-pointer truncate rounded-sm underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_*]:whitespace-nowrap'
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        side='bottom'
        align='start'
        sideOffset={6}
        // No taller than the room below the line (or, flipped, above it),
        // so it never runs out of both and lands in the window's corner.
        className='max-h-[min(36rem,var(--available-height))] w-[28rem] max-w-[calc(100vw-2rem)] gap-2 overflow-y-auto p-4'
      >
        <span className='truncate text-xs font-medium text-muted-foreground'>
          {label}
        </span>
        <div className='text-sm leading-relaxed break-words'>
          <Markdown compact>{value}</Markdown>
        </div>
      </PopoverContent>
    </Popover>
  );
}
