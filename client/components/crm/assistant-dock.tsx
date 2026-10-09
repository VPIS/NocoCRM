import { ArrowUp, Sparkles } from 'lucide-react';
import { useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
import { useLocation } from 'react-router';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '../ui/button.js';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '../ui/input-group.js';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip.js';
import { toText, useCrmText, useMetadata } from './api.js';
import { ask, focusComposer, useFocusReturn } from './assistant-ask.js';
import { useAssistantReadiness, usePanelOpen } from './assistant-state.js';
import { useCurrentRecord, type CurrentRecord } from './current-record.js';

// The assistant's one general entry: a box floating at the bottom of the main
// column (the application layout's <main>), in the manner of Clarify's "Ask
// anything". A question typed there, or one of the page's suggested
// questions, opens the assistant panel on a new conversation and sends it; on
// a record's page the conversation starts from that record (announced by the
// page, current-record.ts). It replaced the header's AI button and every
// record page's "Ask AI"; the AI cards keep their own "Ask AI", which asks
// about the card. Pages keep 6rem empty at the bottom of what scrolls under
// it (CrmFrame's pb-24, the record page's columns, the board's columns), so
// their last row can be scrolled above it. On a phone it is a round button
// in the corner that opens the panel. It hides while the panel is open, and
// on pages filled by panes of their own that cannot leave room for it.

// Pages the dock is not shown on: the overview, which opens on an ask box of
// its own (assistant-ask-box.tsx); the Mail plugin's workspace and the inbox,
// which fill the window with fixed panes whose bottom (pagination, keyboard
// hints) it would cover.
function hiddenOn(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/crm/mail' ||
    pathname === '/inbox' ||
    pathname.startsWith('/inbox/')
  );
}

// The questions a page suggests, by the kind of record it shows or else by
// its path; keys under `dock.q` in the crm locale.
const RECORD_QUESTIONS: Record<string, readonly string[]> = {
  leads: ['lead.next', 'lead.summary', 'lead.email'],
  opportunities: [
    'opportunity.missing',
    'opportunity.risk',
    'opportunity.progress',
  ],
  accounts: ['account.latest', 'account.contacts', 'account.deals'],
  contacts: ['contact.exchanges', 'contact.deals', 'contact.email'],
  tasks: ['task.prepare'],
  approvals: ['approval.decide'],
};
const PAGE_QUESTIONS: Record<string, readonly string[]> = {
  '/crm/leads': ['leads.first', 'leads.quiet'],
  '/crm/opportunities': ['opportunities.closing', 'opportunities.risk'],
  '/crm/accounts': ['accounts.quiet'],
  '/crm/contacts': ['contacts.quiet'],
  '/crm/tasks': ['tasks.overdue', 'tasks.week'],
  '/crm/approvals': ['approvals.waiting'],
};

function questionsFor(
  pathname: string,
  record: CurrentRecord | undefined,
): readonly string[] {
  if (record) return RECORD_QUESTIONS[record.entity] ?? [];
  return PAGE_QUESTIONS[pathname] ?? [];
}

export function AssistantDock(): ReactElement | null {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const readiness = useAssistantReadiness();
  const panelOpen = usePanelOpen();
  const record = useCurrentRecord();
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const [value, setValue] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLButtonElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  useFocusReturn(() => (isMobile ? phoneRef.current : inputRef.current));

  if (!meta?.assistant || readiness.state === 'loading' || hiddenOn(pathname))
    return null;
  const unavailable =
    readiness.state === 'unavailable' ? readiness.reason : undefined;
  const questions = questionsFor(pathname, record);
  const placeholder =
    unavailable ??
    toText(
      record
        ? text(`dock.placeholderFor.${record.entity}`)
        : text('dock.placeholder'),
    );

  const send = (prompt: string): void => {
    const question = prompt.trim();
    if (!question || unavailable) return;
    ask(question, record);
    setValue('');
    setListOpen(false);
    focusComposer();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    // Enter while an input method is composing only confirms the
    // composition.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      send(value);
    }
  };

  const box = (
    <InputGroup
      // The primitive fades the whole group while any control in it is
      // disabled, and the send button is whenever the box is empty: only an
      // unavailable chat fades the box here. On the card colour in both
      // themes, so the page does not show through.
      className={`crm-ai-border h-11 rounded-full [--crm-ai-lift:var(--shadow-lg)] has-disabled:bg-card dark:bg-card dark:has-disabled:bg-card ${
        unavailable ? 'opacity-60' : 'has-disabled:opacity-100'
      }`}
    >
      <InputGroupAddon className='pl-4'>
        <Sparkles className='text-ai' />
      </InputGroupAddon>
      <InputGroupInput
        ref={inputRef}
        value={value}
        disabled={Boolean(unavailable)}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <InputGroupAddon align='inline-end' className='pr-1.5'>
        <Tooltip>
          <TooltipTrigger
            render={
              <InputGroupButton
                size='icon-sm'
                aria-label={toText(text('send'))}
                disabled={!value.trim() || Boolean(unavailable)}
                className='rounded-full bg-ai text-ai-foreground hover:bg-ai/90 hover:text-ai-foreground disabled:bg-muted disabled:text-muted-foreground'
                onClick={() => send(value)}
              />
            }
          >
            <ArrowUp />
          </TooltipTrigger>
          <TooltipContent>{toText(text('send'))}</TooltipContent>
        </Tooltip>
      </InputGroupAddon>
    </InputGroup>
  );

  return (
    <TooltipProvider>
      <div
        // Over the bottom of the main column, below the header and every
        // overlay, above a stacked record page's sticky tab bar (z-10).
        className='pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-end px-4 md:justify-center'
        hidden={panelOpen}
      >
        {isMobile ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  ref={phoneRef}
                  size='icon-lg'
                  aria-label={unavailable ?? toText(text('dock.open'))}
                  disabled={Boolean(unavailable)}
                  className='pointer-events-auto rounded-full bg-ai text-ai-foreground shadow-lg hover:bg-ai/90'
                  onClick={() => ask('', record)}
                />
              }
            >
              <Sparkles />
            </TooltipTrigger>
            <TooltipContent>
              {unavailable ?? toText(text('dock.open'))}
            </TooltipContent>
          </Tooltip>
        ) : (
          <div
            ref={dockRef}
            className='pointer-events-auto relative w-full max-w-md'
            onFocus={() => setListOpen(true)}
            onBlur={(event) => {
              if (!dockRef.current?.contains(event.relatedTarget))
                setListOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setListOpen(false);
                inputRef.current?.focus();
              }
            }}
          >
            {unavailable ? (
              // Disabled controls take no pointer events, so the reason's
              // tooltip hangs on a wrapper around the box.
              <Tooltip>
                <TooltipTrigger render={<div className='w-full' />}>
                  {box}
                </TooltipTrigger>
                <TooltipContent>{unavailable}</TooltipContent>
              </Tooltip>
            ) : (
              box
            )}
            {/* After the box in the document, so Tab moves from the input to
                the suggestions; drawn above it. */}
            {listOpen && !value && questions.length > 0 && !unavailable && (
              <ul
                aria-label={toText(text('dock.suggestions'))}
                className='absolute bottom-full mb-2 flex w-full flex-col gap-0.5 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg'
              >
                {questions.map((key) => {
                  const question = toText(text(`dock.q.${key}`));
                  return (
                    <li key={key}>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='w-full justify-start font-normal'
                        // A click lands before the input's blur hides the list.
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => send(question)}
                      >
                        <Sparkles className='text-ai' />
                        <span className='truncate'>{question}</span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
