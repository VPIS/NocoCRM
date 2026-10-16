import {
  CircleHelp,
  FileText,
  Image,
  Info,
  MapPin,
  Mic,
  Paperclip,
  Reply,
  Smile,
  Video,
  type LucideIcon,
} from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { Button } from '#components/ui/button';
import { Skeleton } from '#components/ui/skeleton';
import { Spinner } from '#components/ui/spinner';
import { useCrmText } from '../api.js';
import type { WhatsAppMessage } from './api.js';

// A conversation's messages, as the WhatsApp page's right pane and a
// record's WhatsApp tab show them: oldest at the top, a day separator per
// day, the customer's on the left and the team's on the right, each with its
// time and, for screen readers, who wrote it; media as a thumbnail or a file
// to download once stored. It opens at the newest message; when more arrive
// while the reader is at the bottom they come into view, otherwise a "New
// messages" button takes the reader there.

const KIND_ICONS: Record<string, LucideIcon> = {
  image: Image,
  document: FileText,
  audio: Mic,
  video: Video,
  sticker: Smile,
  location: MapPin,
  reaction: Reply,
  button: Reply,
  interactive: Reply,
  system: Info,
  unsupported: CircleHelp,
  media_placeholder: Paperclip,
};

// A message that is not plain text: its kind's icon and word.
export function MessageKind({ type }: { type: string }): ReactElement | null {
  const { text } = useCrmText();
  const Icon = KIND_ICONS[type];
  if (!Icon) return null;
  return (
    <span className='inline-flex items-center gap-1 text-muted-foreground'>
      <Icon aria-hidden className='size-4 shrink-0' />
      {text(`whatsapp.kind.${type}`)}
    </span>
  );
}

// A message's one-line summary (the conversation list's last line).
export function MessageSummary({
  type,
  text: body,
  caption,
}: {
  type: string;
  text: string | null;
  caption: string | null;
}): ReactElement {
  const { text } = useCrmText();
  // Deleted on the app (the server's `revoked`): said so.
  const words =
    type === 'revoked'
      ? toWords(text('whatsapp.revoked'))
      : [body, caption].filter(Boolean).join(' ');
  return (
    <span className='flex min-w-0 items-center gap-1'>
      {type === 'text' || type === 'revoked' ? null : (
        <MessageKind type={type} />
      )}
      {/* Cut where the row ends, whole on hover (T1.11). */}
      {words ? (
        <span className='min-w-0 truncate' title={words}>
          {words}
        </span>
      ) : null}
    </span>
  );
}

const dayKey = (at: string): string => {
  const date = new Date(at);
  return `${String(date.getFullYear())}-${String(date.getMonth())}-${String(date.getDate())}`;
};

// Whether a scroller is (nearly) at its bottom.
const atBottom = (node: HTMLElement): boolean =>
  node.scrollHeight - node.scrollTop - node.clientHeight < 48;

export function WhatsAppMessages({
  messages,
  more,
  loadingEarlier,
  onLoadEarlier,
  senderOf,
  showSenders = false,
  onSeeLatest,
  className = '',
}: {
  messages: readonly WhatsAppMessage[];
  more: boolean;
  loadingEarlier: boolean;
  onLoadEarlier: () => void;
  // The customer's name for a message (the conversation's one, or on a
  // record's tab whichever of its people wrote it).
  senderOf: (message: WhatsAppMessage) => string;
  // Above the first bubble of each run of one customer's messages: a
  // company's or a deal's tab shows several people.
  showSenders?: boolean;
  // The newest message came into view (at the start, by scrolling or by the
  // New messages button): the conversation can be marked read.
  onSeeLatest?: () => void;
  className?: string;
}): ReactElement {
  const { text, language } = useCrmText();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [behind, setBehind] = useState(false);
  // Whether the reader is at the newest message: an image that finishes
  // loading after the list opened keeps them there.
  const pinnedRef = useRef(true);
  const keepPinned = (): void => {
    const node = scrollRef.current;
    if (node && pinnedRef.current) node.scrollTop = node.scrollHeight;
  };
  // What the list held at the last render: its first and last message, and
  // the scroller's height, to tell new messages from earlier ones.
  const seenRef = useRef<{ first?: string; last?: string; height: number }>({
    height: 0,
  });
  // The window coming back into focus with the reader at the newest
  // message: what arrived meanwhile is read now.
  useEffect(() => {
    const focused = (): void => {
      if (pinnedRef.current) onSeeLatest?.();
    };
    window.addEventListener('focus', focused);
    return () => window.removeEventListener('focus', focused);
  }, [onSeeLatest]);
  const first = messages[0]?.id;
  const last = messages.at(-1)?.id;
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const seen = seenRef.current;
    if (!seen.last) {
      // The first messages: open at the newest.
      node.scrollTop = node.scrollHeight;
      onSeeLatest?.();
    } else if (first !== seen.first && last === seen.last) {
      // Earlier messages above: the one that was at the top stays put.
      node.scrollTop += node.scrollHeight - seen.height;
    } else if (last !== seen.last) {
      // Newer messages below: into view when the reader was at the bottom.
      const wasAtBottom = seen.height - node.scrollTop - node.clientHeight < 48;
      if (wasAtBottom) {
        node.scrollTop = node.scrollHeight;
        if (document.hasFocus()) onSeeLatest?.();
      } else setBehind(true);
    }
    seenRef.current = { first, last, height: node.scrollHeight };
  }, [first, last, onSeeLatest]);
  const time = new Intl.DateTimeFormat(language, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const date = new Intl.DateTimeFormat(language, { dateStyle: 'medium' });
  const team = toWords(text('whatsapp.team'));
  // Each message with what goes above it: the day's separator when the day
  // changes, the sender's name when another customer's run starts.
  const rows = messages.map((message, index) => {
    const before = messages[index - 1];
    const separator =
      !before || dayKey(before.occurredAt) !== dayKey(message.occurredAt);
    const own = message.direction === 'out';
    const sender = own ? team : senderOf(message);
    const showName =
      showSenders &&
      !own &&
      (separator || before.direction === 'out' || senderOf(before) !== sender);
    return { message, separator, own, sender, showName };
  });
  return (
    <div className={`relative flex min-h-0 flex-col ${className}`}>
      <div
        ref={scrollRef}
        className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-4'
        onScroll={(event) => {
          pinnedRef.current = atBottom(event.currentTarget);
          if (behind && atBottom(event.currentTarget)) {
            setBehind(false);
            onSeeLatest?.();
          }
        }}
      >
        {more ? (
          <div className='flex justify-center'>
            <Button
              variant='outline'
              size='sm'
              disabled={loadingEarlier}
              onClick={onLoadEarlier}
            >
              {loadingEarlier ? <Spinner data-icon='inline-start' /> : null}
              {text('whatsapp.loadEarlier')}
            </Button>
          </div>
        ) : null}
        {rows.map(({ message, separator, own, sender, showName }) => {
          return (
            <div key={message.id} className='flex flex-col gap-2'>
              {separator ? (
                <p className='my-2 text-center text-xs text-muted-foreground'>
                  {date.format(new Date(message.occurredAt))}
                </p>
              ) : null}
              {showName ? (
                <p className='text-xs font-medium text-muted-foreground'>
                  {sender}
                </p>
              ) : null}
              <div
                className={`flex max-w-[85%] flex-col gap-1 rounded-lg px-3 py-2 text-sm ${
                  own ? 'self-end bg-primary/10' : 'self-start bg-muted'
                }`}
              >
                <span className='sr-only'>{sender}: </span>
                <Body message={message} sender={sender} onLoad={keepPinned} />
                {/* The time, after where it came from when not the
                    conversation as it happens (sent from the app, the
                    history imported), and an edit. */}
                <span className='self-end text-xs text-muted-foreground'>
                  {[
                    message.origin === 'businessApp' ||
                    message.origin === 'imported'
                      ? toWords(text(`whatsapp.origin.${message.origin}`))
                      : '',
                    message.editedAt && !message.revokedAt
                      ? toWords(text('whatsapp.edited'))
                      : '',
                    time.format(new Date(message.occurredAt)),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {behind ? (
        <div className='pointer-events-none absolute inset-x-0 bottom-3 flex justify-center'>
          <Button
            variant='outline'
            size='sm'
            className='pointer-events-auto shadow-sm'
            onClick={() => {
              const node = scrollRef.current;
              if (node) node.scrollTop = node.scrollHeight;
              setBehind(false);
              onSeeLatest?.();
            }}
          >
            {text('whatsapp.newMessages')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

const toWords = (value: unknown): string =>
  typeof value === 'string' ? value : '';

function Body({
  message,
  sender,
  onLoad,
}: {
  message: WhatsAppMessage;
  sender: string;
  onLoad: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const words = message.text ?? '';
  const caption = message.caption ?? '';
  const media = message.media;
  const plain = (value: string) => (
    <p className='break-words whitespace-pre-wrap'>{value}</p>
  );
  // Deleted on the app: said so, its words gone.
  if (message.revokedAt)
    return (
      <p className='text-muted-foreground italic'>{text('whatsapp.revoked')}</p>
    );
  if (message.type === 'text') return plain(words);
  const kind = <MessageKind type={message.type} />;
  // A location, a reaction, a button's reply, a system message: its words
  // after the kind, muted, being what WhatsApp says rather than the
  // customer's own text.
  if (!media)
    return (
      <>
        {kind}
        {words ? (
          <p className='break-words whitespace-pre-wrap text-muted-foreground'>
            {words}
          </p>
        ) : null}
      </>
    );
  if (media.status === 'pending')
    return (
      <>
        {kind}
        <p className='text-muted-foreground'>
          {text('whatsapp.media.pending')}
        </p>
      </>
    );
  if (media.status === 'unavailable' || !media.url)
    return (
      <>
        {kind}
        {media.filename ? (
          <p className='break-words'>{media.filename}</p>
        ) : null}
        <p className='text-muted-foreground'>
          {text('whatsapp.media.unavailable')}
        </p>
        {caption ? plain(caption) : null}
      </>
    );
  const name = media.filename ?? toWords(text(`whatsapp.kind.${message.type}`));
  if (message.type === 'image' || message.type === 'sticker')
    return (
      <>
        <a
          href={`${media.url}?inline=1`}
          target='_blank'
          rel='noopener noreferrer'
        >
          <img
            src={`${media.url}?inline=1`}
            alt={
              caption || toWords(text('whatsapp.photoFrom', { name: sender }))
            }
            className='max-h-60 max-w-full rounded-md object-contain'
            onLoad={onLoad}
          />
        </a>
        {caption ? plain(caption) : null}
      </>
    );
  return (
    <>
      <a
        href={media.url}
        className='inline-flex min-w-0 items-center gap-2 rounded-md bg-background px-2 py-1.5 underline-offset-4 hover:underline'
        aria-label={toWords(text('whatsapp.download', { file: name }))}
      >
        <FileText aria-hidden className='size-4 shrink-0' />
        <span className='min-w-0 truncate'>{name}</span>
      </a>
      {caption ? plain(caption) : null}
    </>
  );
}

// Three bubbles, the customer's and the team's sides, while the messages
// load.
export function MessagesSkeleton(): ReactElement {
  const { text } = useCrmText();
  return (
    <div
      role='status'
      aria-label={toWords(text('loading'))}
      className='flex flex-col gap-3 px-4 py-4'
    >
      <Skeleton className='h-12 w-2/3 self-start' />
      <Skeleton className='h-10 w-1/2 self-end' />
      <Skeleton className='h-16 w-3/5 self-start' />
    </div>
  );
}
