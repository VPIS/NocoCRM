import { useRef, type ReactElement } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip.js';
import { toText, useCrmText } from './api.js';
import { useAskDraft, useFocusReturn } from './assistant-ask.js';
import { AskComposer } from './assistant-ask-composer.js';
import { useAgentReadiness } from './agent-chat/ask.js';

// The overview's ask box: the first thing on the page, in its flow rather
// than floating like the dock (which the overview does not show), always
// expanded (assistant-ask-composer.tsx), with no suggested questions under
// it (until 2026-10-16 there were three). Sending starts a conversation with the assistant that
// sends the question with its files on the model picked, and opens the
// panel on it. While the agents are still loading it is drawn disabled, so
// nothing below it moves once the assistant is ready; while the assistant cannot answer the
// reason is its placeholder and tooltip.
export function AssistantAskBox(): ReactElement | null {
  const { text } = useCrmText();
  const readiness = useAgentReadiness();
  const disabled = readiness.state !== 'ready';
  const draft = useAskDraft(undefined, disabled);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useFocusReturn(() => inputRef.current);

  const unavailable =
    readiness.state === 'unavailable' ? readiness.reason : undefined;
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
      <div className='flex flex-col'>
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
      </div>
    </TooltipProvider>
  );
}
