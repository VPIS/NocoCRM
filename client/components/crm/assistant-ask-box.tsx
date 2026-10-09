import { Sparkles } from 'lucide-react';
import { useRef, type ReactElement } from 'react';
import { Button } from '../ui/button.js';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip.js';
import { toText, useCrmText, useMetadata } from './api.js';
import {
  HOME_QUESTIONS,
  useAskDraft,
  useFocusReturn,
} from './assistant-ask.js';
import { AskComposer } from './assistant-ask-composer.js';
import { useAssistantReadiness } from './assistant-state.js';

// The overview's ask box: the first thing on the page, in its flow rather
// than floating like the dock (which the overview does not show), with the
// overview's suggested questions always laid out under it, always expanded
// (assistant-ask-composer.tsx). Sending opens the panel on a new
// conversation that sends the question with its files on the model picked.
// While the metadata or the chat is still loading it is drawn disabled, so
// nothing below it moves once the chat is ready; while the chat cannot start
// the reason is its placeholder and tooltip.
export function AssistantAskBox(): ReactElement | null {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const readiness = useAssistantReadiness();
  const disabled = !meta || readiness.state !== 'ready';
  const draft = useAskDraft(undefined, disabled);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useFocusReturn(() => inputRef.current);

  // Removed only once the metadata says the assistant is off: until the
  // metadata arrives it is drawn as while the chat loads.
  if (meta && !meta.assistant) return null;
  const unavailable =
    meta && readiness.state === 'unavailable' ? readiness.reason : undefined;
  const placeholder = unavailable ?? toText(text('dock.placeholder'));

  const box = (
    <AskComposer
      draft={draft}
      placeholder={placeholder}
      disabled={disabled}
      expanded
      inputRef={inputRef}
      className='rounded-3xl'
      inputClassName='px-5 pt-4 pb-1 text-base md:text-base'
    />
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
            the chips carry no tooltip of their own. A chip sends its
            question with the files attached, on the model picked. */}
        <ul
          aria-label={toText(text('dock.suggestions'))}
          className='flex flex-wrap justify-center gap-2'
        >
          {HOME_QUESTIONS.map(({ key, prompt }) => {
            const label = toText(text(`dock.q.${key}`));
            return (
              <li key={key}>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={disabled || draft.files.uploading}
                  className='rounded-full font-normal'
                  onClick={() =>
                    draft.send(toText(text(prompt ?? `dock.q.${key}`)))
                  }
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
