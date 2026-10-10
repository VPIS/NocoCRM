import {
  Download,
  File as FileIcon,
  FileArchive,
  FileImage,
  FileMusic,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Paperclip,
  Presentation,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useRef, useState, type ReactElement, type ReactNode } from 'react';
import { FilePreviewDialog } from '#extensions/nocobase-file-component-ui';
import { Button } from '../ui/button.js';
import {
  localDate,
  toText,
  useCrmQuery,
  useCrmText,
  useMetadata,
} from './api.js';
import { fileRecord, type CrmFile } from './file-record.js';

// What a file is, by its extension and stored type: its icon, the colour
// of the icon's tile (the theme's status colours, lightly), and the short
// name read under its own (PDF, XLSX).
const KINDS: {
  test: (ext: string, type: string) => boolean;
  icon: LucideIcon;
  tone: string;
}[] = [
  {
    test: (ext) => ext === 'pdf',
    icon: FileText,
    tone: 'bg-destructive/10 text-destructive',
  },
  {
    test: (ext) => ['doc', 'docx', 'rtf', 'odt', 'pages'].includes(ext),
    icon: FileText,
    tone: 'bg-info/10 text-info',
  },
  {
    test: (ext) => ['xls', 'xlsx', 'csv', 'ods', 'numbers'].includes(ext),
    icon: FileSpreadsheet,
    tone: 'bg-success/10 text-success',
  },
  {
    test: (ext) => ['ppt', 'pptx', 'odp', 'key'].includes(ext),
    icon: Presentation,
    tone: 'bg-warning/10 text-warning',
  },
  {
    test: (_ext, type) => type.startsWith('image/'),
    icon: FileImage,
    tone: 'bg-ai/10 text-ai',
  },
  {
    test: (_ext, type) => type.startsWith('video/'),
    icon: FileVideo,
    tone: 'bg-ai/10 text-ai',
  },
  {
    test: (_ext, type) => type.startsWith('audio/'),
    icon: FileMusic,
    tone: 'bg-ai/10 text-ai',
  },
  {
    test: (ext) => ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext),
    icon: FileArchive,
    tone: 'bg-muted text-muted-foreground',
  },
  {
    test: (ext) => ['txt', 'md'].includes(ext),
    icon: FileText,
    tone: 'bg-muted text-muted-foreground',
  },
];
function kindOf(file: CrmFile): { icon: LucideIcon; tone: string } {
  const dot = file.filename.lastIndexOf('.');
  const ext = dot < 0 ? '' : file.filename.slice(dot + 1).toLowerCase();
  return (
    KINDS.find((kind) => kind.test(ext, file.mimeType ?? '')) ?? {
      icon: FileIcon,
      tone: 'bg-muted text-muted-foreground',
    }
  );
}
// A size as people read it: 820 KB, 1.4 MB.
function sizeOf(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${String(Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
// An image a browser draws itself, shown as a small preview; others (and
// formats such as HEIC or TIFF that it may not draw) as a card.
const DRAWN = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
]);

// A comment's files under its text: its images first, as a row of small
// previews, then its other files, each a one-line card with its kind's
// icon, its name, then its size, so a row never mixes heights. A
// click opens the preview dialog, paging through the comment's files in
// that order. While the comment is written, each also removes its file.
// The record's Attachments tab draws its files the same way (FileCards),
// each's upload date and where it came from on hover.
export function CommentFiles({
  ids,
  onRemove,
  detail,
  empty,
  className = 'mt-2',
  rows = true,
}: {
  ids: readonly string[];
  onRemove?: (id: string) => void;
  // Said on hover after the name and the upload date: where it came from.
  detail?: (id: string) => string | null | undefined;
  // What shows when there are none; nothing by default.
  empty?: ReactNode;
  className?: string;
  // One file a row across the width, its date and where it came from at
  // the row's end, with download and remove there (the default, for the
  // timeline's comments and the Attachments tab alike), instead of chips.
  rows?: boolean;
}): ReactElement | null {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const [previewing, setPreviewing] = useState<string | null>(null);
  const { data } = useCrmQuery<CrmFile[]>(
    `attachments?ids=${encodeURIComponent(ids.join(','))}`,
    ids.length > 0,
  );
  if (!ids.length)
    return empty ? (
      <p className='text-sm text-muted-foreground'>{empty}</p>
    ) : null;
  const fileOf = (id: string): CrmFile | undefined =>
    data?.find((f) => f.id === id);
  // On hover: its name, when it came, and where from.
  const titleOf = (id: string): string | undefined => {
    const file = fileOf(id);
    if (!file) return undefined;
    return [
      file.filename,
      localDate(
        file.createdAt,
        language,
        meta?.settings.timeZone ?? 'Asia/Shanghai',
      ),
      detail?.(id),
    ]
      .filter(Boolean)
      .join(' · ');
  };
  const isImage = (id: string): boolean =>
    DRAWN.has(fileOf(id)?.mimeType ?? '');
  const images = ids.filter(isImage);
  const others = ids.filter((id) => !isImage(id));
  const records = [...images, ...others].flatMap((id) => {
    const file = fileOf(id);
    return file ? [fileRecord(file)] : [];
  });
  const previewIndex = records.findIndex((r) => r.id === previewing);
  const remove = (id: string): ReactElement | null =>
    onRemove ? (
      <button
        type='button'
        className='absolute -top-1.5 -right-1.5 hidden size-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-xs group-hover/file:flex group-focus-within/file:flex hover:text-foreground [@media(hover:none)]:flex'
        aria-label={`${toText(text('remove'))} ${fileOf(id)?.filename ?? ''}`}
        onClick={() => onRemove(id)}
      >
        <X className='size-3' />
      </button>
    ) : null;
  const label = (id: string): string =>
    `${toText(text('preview'))} ${fileOf(id)?.filename ?? ''}`;
  if (rows)
    return (
      <div className={`grid gap-1.5 ${className}`}>
        <FilePreviewDialog
          files={records}
          initialIndex={Math.max(previewIndex, 0)}
          open={previewIndex >= 0}
          onOpenChange={(open) => !open && setPreviewing(null)}
        />
        {[...images, ...others].map((id) => {
          const file = fileOf(id);
          const kind = file
            ? kindOf(file)
            : { icon: Paperclip, tone: 'bg-muted text-muted-foreground' };
          const Icon = kind.icon;
          const from = detail?.(id);
          return (
            // The row opens the preview; its end downloads and removes.
            <div
              key={id}
              className='flex min-w-0 items-center rounded-lg border border-border bg-card pr-1.5 shadow-xs transition-colors hover:bg-muted/60'
            >
              <button
                type='button'
                disabled={!file}
                aria-label={label(id)}
                className='flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg pr-2 pl-2 text-left'
                onClick={() => file && setPreviewing(id)}
              >
                {file && DRAWN.has(file.mimeType ?? '') ? (
                  <img
                    src={`${file.url}?inline=1`}
                    alt=''
                    loading='lazy'
                    className='size-7 shrink-0 rounded border border-border object-cover'
                  />
                ) : (
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded ${kind.tone}`}
                  >
                    <Icon className='size-4' />
                  </span>
                )}
                <span className='flex min-w-0 flex-1 items-baseline gap-2'>
                  <span className='truncate text-sm font-medium'>
                    {file?.filename ?? '…'}
                  </span>
                  <span className='shrink-0 text-xs text-muted-foreground'>
                    {file ? sizeOf(file.size) : ''}
                  </span>
                </span>
                {/* When it came and where from, at the row's end. */}
                <span className='flex shrink-0 items-center gap-2 text-xs text-muted-foreground'>
                  {from ? (
                    <span className='max-w-40 truncate' title={from}>
                      {from}
                    </span>
                  ) : null}
                  {file ? (
                    <span className='tabular-nums'>
                      {localDate(
                        file.createdAt,
                        language,
                        meta?.settings.timeZone ?? 'Asia/Shanghai',
                      )}
                    </span>
                  ) : null}
                </span>
              </button>
              {file ? (
                <a
                  className='inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground'
                  href={file.url}
                  download={file.filename}
                  aria-label={`${toText(text('download'))} ${file.filename}`}
                  title={toText(text('download'))}
                >
                  <Download className='size-3.5' />
                </a>
              ) : null}
              {onRemove ? (
                <button
                  type='button'
                  className='inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive'
                  aria-label={`${toText(text('remove'))} ${file?.filename ?? ''}`}
                  title={toText(text('remove'))}
                  onClick={() => onRemove(id)}
                >
                  <Trash2 className='size-3.5' />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  return (
    <div className={`grid gap-2 ${className}`}>
      <FilePreviewDialog
        files={records}
        initialIndex={Math.max(previewIndex, 0)}
        open={previewIndex >= 0}
        onOpenChange={(open) => !open && setPreviewing(null)}
      />
      {images.length ? (
        <div className='flex flex-wrap gap-2'>
          {images.map((id) => {
            const file = fileOf(id) as CrmFile;
            return (
              <span key={id} className='group/file relative'>
                <button
                  type='button'
                  title={titleOf(id)}
                  aria-label={label(id)}
                  className='block size-14 overflow-hidden rounded-md border border-border bg-muted shadow-xs transition-opacity hover:opacity-90'
                  onClick={() => setPreviewing(id)}
                >
                  <img
                    src={`${file.url}?inline=1`}
                    alt={file.filename}
                    loading='lazy'
                    className='size-full object-cover'
                  />
                </button>
                {remove(id)}
              </span>
            );
          })}
        </div>
      ) : null}
      {others.length ? (
        <div className='flex flex-wrap gap-2'>
          {others.map((id) => {
            const file = fileOf(id);
            const kind = file
              ? kindOf(file)
              : { icon: Paperclip, tone: 'bg-muted text-muted-foreground' };
            const Icon = kind.icon;
            return (
              <span key={id} className='group/file relative max-w-full min-w-0'>
                <button
                  type='button'
                  disabled={!file}
                  title={titleOf(id)}
                  aria-label={label(id)}
                  className='flex h-8 max-w-72 min-w-0 items-center gap-2 rounded-md border border-border bg-card pr-2.5 pl-1 text-left shadow-xs transition-colors hover:bg-muted/60'
                  onClick={() => file && setPreviewing(id)}
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded ${kind.tone}`}
                  >
                    <Icon className='size-3.5' />
                  </span>
                  <span className='flex min-w-0 items-baseline gap-1.5'>
                    <span className='truncate text-xs font-medium'>
                      {file?.filename ?? '…'}
                    </span>
                    <span className='shrink-0 text-[0.6875rem] text-muted-foreground'>
                      {file ? sizeOf(file.size) : ''}
                    </span>
                  </span>
                </button>
                {remove(id)}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// The record's Attachments tab's files, drawn as a comment's.
export const FileCards = CommentFiles;

// The box's paperclip: picks files to attach, several at once.
export function AttachButton({
  onPick,
  busy,
}: {
  onPick: (files: File[]) => void;
  busy: boolean;
}): ReactElement {
  const { text } = useCrmText();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type='file'
        multiple
        hidden
        onChange={(event) => {
          onPick([...(event.target.files ?? [])]);
          event.target.value = '';
        }}
      />
      <Button
        type='button'
        size='icon-sm'
        variant='ghost'
        className='text-muted-foreground'
        disabled={busy}
        aria-label={text('comments.attach')}
        title={text('comments.attach')}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip />
      </Button>
    </>
  );
}
