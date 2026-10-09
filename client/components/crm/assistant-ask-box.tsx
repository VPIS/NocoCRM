import { ArrowUp, Paperclip, Sparkles } from 'lucide-react';
import {
  Fragment,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { getAIModelKey, groupAIModels } from '@/extensions/nocobase-ai';
import { ChatAttachment } from '@/extensions/nocobase-ai/components/chat/chat-attachment.js';
import { Button } from '../ui/button.js';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '../ui/input-group.js';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../ui/select.js';
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
  useAskAttachments,
  useAskModel,
  useFocusReturn,
} from './assistant-ask.js';
import { useAssistantReadiness } from './assistant-state.js';

// The overview's ask box: the first thing on the page, in its flow rather
// than floating like the dock (which the overview does not show), with the
// overview's suggested questions always laid out under it. It is composed
// like the chat's own composer: the question grows past one line (Enter
// sends, Shift+Enter breaks the line), files are attached with the
// paperclip, by dropping or pasting them, and uploaded at once, and the
// model the conversation runs on is picked beside them. Sending opens the
// panel on a new conversation that sends the question with its files on
// that model. While the metadata or the chat is still loading it is drawn
// disabled, so nothing below it moves once the chat is ready; while the
// chat cannot start the reason is its placeholder and tooltip.
export function AssistantAskBox(): ReactElement | null {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const readiness = useAssistantReadiness();
  const files = useAskAttachments();
  const { models, model, select } = useAskModel();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useFocusReturn(() => inputRef.current);

  // Removed only once the metadata says the assistant is off: until the
  // metadata arrives it is drawn as while the chat loads.
  if (meta && !meta.assistant) return null;
  const unavailable =
    meta && readiness.state === 'unavailable' ? readiness.reason : undefined;
  const disabled = !meta || readiness.state !== 'ready';
  const placeholder = unavailable ?? toText(text('dock.placeholder'));
  const ready = files.attachments.filter((item) => item.status === 'done');
  const canSend =
    !disabled && !files.uploading && Boolean(value.trim() || ready.length);

  const send = (prompt: string): void => {
    const question = prompt.trim();
    if (disabled || files.uploading || (!question && !ready.length)) return;
    ask(question, undefined, { attachments: ready, model });
    setValue('');
    files.clear();
    focusComposer();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    // Enter while an input method is composing only confirms the
    // composition; Shift+Enter breaks the line.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send(value);
    }
  };
  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    if (disabled || !event.dataTransfer.files.length) return;
    event.preventDefault();
    files.upload(Array.from(event.dataTransfer.files));
  };
  const attachLabel = toText(text('dock.attach'));

  const box = (
    <InputGroup
      // The chat composer's arrangement, in the ask boxes' AI border
      // (client/styles.css). The primitive fades the whole group
      // while any control in it is disabled, and the send button is
      // whenever the box is empty: only a chat that is not ready fades the
      // box here.
      className={`crm-ai-border rounded-3xl has-disabled:bg-card dark:bg-card dark:has-disabled:bg-card ${
        disabled ? 'opacity-60' : 'has-disabled:opacity-100'
      }`}
      onDragOver={(event) => {
        if (!disabled && event.dataTransfer.types.includes('Files'))
          event.preventDefault();
      }}
      onDrop={onDrop}
    >
      {files.attachments.length > 0 && (
        <InputGroupAddon
          align='block-start'
          className='flex-wrap gap-1.5 px-4 pt-3'
        >
          {files.attachments.map((attachment) => (
            <ChatAttachment
              key={attachment.uid}
              attachment={attachment}
              removable
              onRemove={() => files.remove(attachment.uid)}
            />
          ))}
        </InputGroupAddon>
      )}
      <InputGroupTextarea
        ref={inputRef}
        value={value}
        rows={1}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={placeholder}
        // One line high until more is written, then growing with the text up
        // to a third of the window, past which it scrolls.
        className='max-h-[33vh] min-h-0 px-5 pt-4 pb-1 text-base md:text-base'
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        onPaste={(event) => {
          const pasted = Array.from(event.clipboardData.items)
            .filter((item) => item.kind === 'file')
            .map((item) => item.getAsFile())
            .filter((file): file is File => file !== null);
          if (!pasted.length || disabled) return;
          event.preventDefault();
          files.upload(pasted);
        }}
      />
      <InputGroupAddon
        align='block-end'
        className='justify-between gap-2 px-3 pb-2.5'
      >
        <div className='flex min-w-0 items-center gap-1.5'>
          <Tooltip>
            <TooltipTrigger
              render={
                <InputGroupButton
                  size='icon-sm'
                  aria-label={attachLabel}
                  disabled={disabled}
                  className='rounded-full'
                  onClick={() => fileRef.current?.click()}
                />
              }
            >
              <Paperclip />
            </TooltipTrigger>
            <TooltipContent>{attachLabel}</TooltipContent>
          </Tooltip>
          {model && (
            <Select
              value={getAIModelKey(model)}
              disabled={disabled}
              onValueChange={(next) => {
                if (typeof next === 'string') select(next);
              }}
            >
              <SelectTrigger
                size='sm'
                aria-label={toText(text('dock.model'))}
                title={model.label}
                className='max-w-48 min-w-0 rounded-full border-0 bg-muted/60 shadow-none'
              >
                <SelectValue>
                  <span className='truncate'>{model.label}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className='max-h-96 min-w-56'>
                {groupAIModels([...models]).map((group, index) => (
                  <Fragment key={group.key}>
                    {index > 0 && <SelectSeparator />}
                    <SelectGroup>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.models.map((item) => (
                        <SelectItem
                          key={getAIModelKey(item)}
                          value={getAIModelKey(item)}
                        >
                          <span className='block max-w-64 truncate'>
                            {item.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </Fragment>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <InputGroupButton
                size='icon-sm'
                aria-label={toText(text('send'))}
                disabled={!canSend}
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
        <input
          ref={fileRef}
          type='file'
          multiple
          hidden
          tabIndex={-1}
          aria-hidden='true'
          data-testid='ask-files'
          onChange={(event) => {
            const picked = Array.from(event.target.files ?? []);
            if (picked.length) files.upload(picked);
            event.target.value = '';
          }}
        />
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
                  disabled={disabled || files.uploading}
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
