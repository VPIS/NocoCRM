import { ArrowUp, Sparkles } from 'lucide-react';
import { useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
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
import {
  HOME_QUESTIONS,
  ask,
  focusComposer,
  useFocusReturn,
} from './assistant-ask.js';
import { useAssistantReadiness } from './assistant-state.js';

// The overview's ask box: the first thing on the page, in its flow rather
// than floating like the dock (which the overview does not show), with the
// overview's suggested questions always laid out under it. It asks the
// panel exactly as the dock does: a new conversation sending the question.
// While the metadata or the chat is still loading it is drawn disabled, so nothing below it
// moves once the chat is ready; while the chat cannot start the reason is
// its placeholder and tooltip.
export function AssistantAskBox(): ReactElement | null {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const readiness = useAssistantReadiness();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useFocusReturn(() => inputRef.current);

  // Removed only once the metadata says the assistant is off: until the
  // metadata arrives it is drawn as while the chat loads.
  if (meta && !meta.assistant) return null;
  const unavailable =
    meta && readiness.state === 'unavailable' ? readiness.reason : undefined;
  const disabled = !meta || readiness.state !== 'ready';
  const placeholder = unavailable ?? toText(text('dock.placeholder'));

  const send = (prompt: string): void => {
    const question = prompt.trim();
    if (!question || disabled) return;
    ask(question);
    setValue('');
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
      // The dock's shape, framed like the overview's cards since it sits in
      // the page. The primitive fades the whole group while any control in
      // it is disabled, and the send button is whenever the box is empty:
      // only a chat that is not ready fades the box here.
      className={`h-12 rounded-full border-border/60 bg-card shadow-xs has-disabled:bg-card dark:bg-card dark:has-disabled:bg-card ${
        disabled ? 'opacity-60' : 'has-disabled:opacity-100'
      }`}
    >
      <InputGroupAddon className='pl-4'>
        <Sparkles className='text-ai' />
      </InputGroupAddon>
      <InputGroupInput
        ref={inputRef}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <InputGroupAddon align='inline-end' className='pr-2'>
        <Tooltip>
          <TooltipTrigger
            render={
              <InputGroupButton
                size='icon-sm'
                aria-label={toText(text('send'))}
                disabled={!value.trim() || disabled}
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
      <div className='flex flex-col gap-2.5'>
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
        {/* The reason, when there is one, shows in the box right above, so
            the chips carry no tooltip of their own. */}
        <ul
          aria-label={toText(text('dock.suggestions'))}
          className='flex flex-wrap gap-2'
        >
          {HOME_QUESTIONS.map(({ key, prompt }) => {
            const label = toText(text(`dock.q.${key}`));
            return (
              <li key={key}>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={disabled}
                  className='rounded-full font-normal'
                  onClick={() => send(toText(text(prompt ?? `dock.q.${key}`)))}
                >
                  <Sparkles className='text-ai' />
                  {label}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </TooltipProvider>
  );
}
