import { FileText, Paperclip, SendHorizontal, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactElement } from 'react';

import { Button } from '#components/ui/button';
import { Spinner } from '#components/ui/spinner';
import { Textarea } from '#components/ui/textarea';
import { ErrorNotice } from '../common.js';
import { toText, useCrmApi, useCrmText, useMetadata } from '../api.js';
import type { Conversation } from './api.js';

// How long after the customer's last message free words may be sent
// (Meta's customer service window, server/providers/crm/whatsapp/service.ts
// send()); after it only approved templates, which come later.
const WINDOW_MS = 24 * 60 * 60 * 1000;
// As the server takes them: the words and the file.
const MAX_TEXT = 4096;
const MAX_FILE = 20 * 1024 * 1024;

// The reply box under a conversation (phase 2, within the window): words,
// one file, or both, the words then its caption. It says why it is absent
// when the reader may not send, the window has closed or the customer has
// no number to send to; on a demo number it says nothing leaves. Enter
// sends, Shift+Enter starts a new line.
export function WhatsAppComposer({
  conversation,
  onSent,
}: {
  conversation: Conversation;
  onSent: (next: Conversation) => void;
}): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const { data: meta } = useMetadata();
  const [words, setWords] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const fileRef = useRef<HTMLInputElement>(null);
  // The window's time left, read again every minute.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const demo = conversation.number?.mode === 'demo';
  const lastInbound = conversation.lastInboundAt
    ? Date.parse(conversation.lastInboundAt)
    : NaN;
  const left = lastInbound + WINDOW_MS - now;
  const note = (words: unknown) => (
    <p className='border-t border-border px-4 py-2 text-xs text-muted-foreground'>
      {words as string}
    </p>
  );
  if (!meta?.sendWhatsApp) return note(text('whatsapp.composer.noPermission'));
  if (!demo && !(left > 0))
    return note(
      text(
        conversation.number?.mode === 'coexistence'
          ? 'whatsapp.composer.windowClosedApp'
          : 'whatsapp.composer.windowClosed',
      ),
    );
  if (!demo && !conversation.contact.phone)
    return note(text('whatsapp.composer.noRecipient'));
  const hours = Math.floor(left / 3_600_000);
  const status = demo
    ? text('whatsapp.composer.demo')
    : hours >= 1
      ? text('whatsapp.composer.windowHours', { count: hours })
      : text('whatsapp.composer.windowMinutes', {
          count: Math.max(1, Math.floor(left / 60_000)),
        });
  const ready = !busy && (Boolean(words.trim()) || Boolean(file));
  const send = (): void => {
    if (!ready) return;
    void (async () => {
      setBusy(true);
      setError(undefined);
      const body = new FormData();
      if (words.trim()) body.append('text', words.trim());
      if (file) body.append('file', file);
      try {
        const result = await api<{ data: Conversation }>(
          `whatsapp/conversations/${encodeURIComponent(conversation.id)}/messages`,
          'POST',
          body,
        );
        setWords('');
        setFile(null);
        onSent(result.data);
      } catch (cause) {
        setError(cause);
      } finally {
        setBusy(false);
      }
    })();
  };
  return (
    <form
      className='flex flex-col gap-2 border-t border-border px-4 py-3'
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <ErrorNotice error={error} />
      <p className='text-xs text-muted-foreground'>{status}</p>
      {file ? (
        <div className='flex w-fit max-w-full items-center gap-2 rounded-md bg-muted px-2 py-1 text-sm'>
          <FileText aria-hidden className='size-4 shrink-0' />
          <span className='min-w-0 truncate'>{file.name}</span>
          <button
            type='button'
            className='inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-hover hover:text-foreground'
            aria-label={toText(
              text('whatsapp.composer.removeFile', { file: file.name }),
            )}
            onClick={() => setFile(null)}
          >
            <X className='size-3.5' />
          </button>
        </div>
      ) : null}
      <div className='flex items-end gap-2'>
        <input
          ref={fileRef}
          type='file'
          hidden
          onChange={(event) => {
            const picked = event.target.files?.[0];
            event.target.value = '';
            if (!picked) return;
            if (picked.size > MAX_FILE) {
              setError(new Error(toText(text('whatsapp.composer.tooLarge'))));
              return;
            }
            setError(undefined);
            setFile(picked);
          }}
        />
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='shrink-0 text-muted-foreground'
          disabled={busy}
          aria-label={toText(text('whatsapp.composer.attach'))}
          title={toText(text('whatsapp.composer.attach'))}
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip />
        </Button>
        <Textarea
          value={words}
          rows={1}
          maxLength={MAX_TEXT}
          disabled={busy}
          placeholder={toText(text('whatsapp.composer.placeholder'))}
          aria-label={toText(text('whatsapp.composer.placeholder'))}
          className='max-h-40 min-h-9 resize-none'
          onChange={(event) => setWords(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              send();
            }
          }}
        />
        <Button
          type='submit'
          size='icon'
          className='shrink-0'
          disabled={!ready}
          aria-label={toText(text('whatsapp.composer.send'))}
          title={toText(text('whatsapp.composer.send'))}
        >
          {busy ? <Spinner /> : <SendHorizontal />}
        </Button>
      </div>
    </form>
  );
}
