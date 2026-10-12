import { Upload } from 'lucide-react';
import { useRef, useState, type ReactElement } from 'react';
import {
  arrayValues,
  toText,
  useCrmApi,
  useCrmText,
  useRefresh,
  type Data,
  type Entity,
} from './api.js';

// Attachments, wherever they appear: the drop zone that adds files, and
// the record's files as its Attachments tab lists them; the files
// themselves are drawn by CommentFiles (comment-files.tsx), one look
// everywhere, a form's included.

// The CRM's file rows and the preview dialog's record shape, in their own
// module so this one exports components only.
export type { CrmFile } from './file-record.js';

// The drop zone every attachment list shares: drag files onto it or click
// it to pick them. It uploads them and hands the new file ids to its owner,
// which decides where they go (a record's attachments, a form's value).
export function FileDropZone({
  entity,
  busy,
  setBusy,
  onUploaded,
  onError,
}: {
  entity: Entity;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onUploaded: (ids: string[]) => Promise<void> | void;
  onError: (error: unknown) => void;
}): ReactElement {
  const api = useCrmApi();
  const { text } = useCrmText();
  const fileRef = useRef<HTMLInputElement>(null);
  // Counts enters and leaves, because dragging over a child fires a leave
  // for the parent before the child's enter.
  const [dragDepth, setDragDepth] = useState(0);
  const over = dragDepth > 0;
  const upload = (picked: File[]): void => {
    if (!picked.length || busy) return;
    void (async () => {
      setBusy(true);
      const body = new FormData();
      picked.forEach((file) => body.append('file', file));
      try {
        const result = await api<{ data: { id: string }[] }>(
          `attachments/upload?entity=${toText(entity)}`,
          'POST',
          body,
        );
        await onUploaded(result.data.map((uploaded) => toText(uploaded.id)));
      } catch (cause) {
        onError(cause);
      } finally {
        setBusy(false);
      }
    })();
  };
  return (
    <div
      role='button'
      tabIndex={busy ? -1 : 0}
      aria-disabled={busy}
      aria-label={text('uploadFile')}
      className={`flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 rounded-md border border-dashed px-3 py-3 text-sm transition-colors ${
        over
          ? 'border-primary bg-primary/5 text-foreground'
          : 'border-border text-muted-foreground hover:border-primary/60 hover:bg-hover'
      } ${busy ? 'cursor-progress opacity-60' : 'cursor-pointer'}`}
      onClick={() => !busy && fileRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (!busy) fileRef.current?.click();
        }
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragDepth((n) => n + 1);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = busy ? 'none' : 'copy';
      }}
      onDragLeave={() => setDragDepth((n) => Math.max(0, n - 1))}
      onDrop={(event) => {
        event.preventDefault();
        setDragDepth(0);
        upload(Array.from(event.dataTransfer.files ?? []));
      }}
    >
      <Upload className='size-4 shrink-0' />
      <span>{busy ? text('uploading') : text('dropFilesHere')}</span>
      {!busy && (
        <span className='font-medium text-primary underline-offset-4 hover:underline'>
          {text('chooseFiles')}
        </span>
      )}
      <input
        ref={fileRef}
        type='file'
        multiple
        hidden
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          upload(Array.from(event.target.files ?? []));
          // Without this, picking the same file twice fires no change event.
          event.target.value = '';
        }}
      />
    </div>
  );
}

// The drop zone under a record's own attachment group: what lands on it is
// appended to the record's attachments and the page refreshed.
export function UploadZone({
  entity,
  record,
  busy,
  setBusy,
  onError,
}: {
  entity: Entity;
  record: Data;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onError: (error: unknown) => void;
}): ReactElement {
  const api = useCrmApi();
  const refresh = useRefresh();
  return (
    <FileDropZone
      entity={entity}
      busy={busy}
      setBusy={setBusy}
      onError={onError}
      onUploaded={async (ids) => {
        await api(`${toText(entity)}/${toText(record.id)}`, 'PATCH', {
          attachments: [...arrayValues(record.attachments).map(toText), ...ids],
        });
        await refresh();
      }}
    />
  );
}
