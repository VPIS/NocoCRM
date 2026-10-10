import { useState, type ClipboardEvent, type DragEvent } from 'react';
import { toText, useCrmApi, useCrmQuery, type Entity } from './api.js';

// The files a comment or a reply carries while it is written: picked with
// the box's paperclip, dropped onto it or pasted into it, each uploaded at
// once (POST /files with the record, which whoever may read it may do) and
// kept by id until the comment is posted with them.
export function useCommentUploads(
  entity: Entity,
  recordId: string,
  initial: readonly string[] = [],
) {
  const api = useCrmApi();
  const [files, setFiles] = useState<string[]>(() => [...initial]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<unknown>();
  // Files held over the box: it lights up to say a drop attaches them.
  const [dropping, setDropping] = useState(false);
  const add = (picked: File[]): void => {
    if (!picked.length || uploading) return;
    void (async () => {
      setUploading(true);
      setError(undefined);
      const body = new FormData();
      picked.forEach((file) => body.append('file', file));
      try {
        const result = await api<{ data: { id: string }[] }>(
          `files?entity=${toText(entity)}&recordId=${encodeURIComponent(recordId)}`,
          'POST',
          body,
        );
        setFiles((current) => [
          ...current,
          ...result.data.map((uploaded) => toText(uploaded.id)),
        ]);
      } catch (cause) {
        setError(cause);
      } finally {
        setUploading(false);
      }
    })();
  };
  return {
    files,
    uploading,
    error,
    add,
    remove: (id: string): void =>
      setFiles((current) => current.filter((file) => file !== id)),
    clear: (): void => setFiles([]),
    // What the box takes: files dragged over it or dropped onto it, and
    // files pasted into it; text drops and pastes as it would.
    dropProps: {
      'data-dropping': dropping || undefined,
      onDragOver: (event: DragEvent<HTMLElement>): void => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        setDropping(true);
      },
      onDragLeave: (): void => setDropping(false),
      onDrop: (event: DragEvent<HTMLElement>): void => {
        setDropping(false);
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        add([...event.dataTransfer.files]);
      },
      onPaste: (event: ClipboardEvent<HTMLElement>): void => {
        if (!event.clipboardData.files.length) return;
        event.preventDefault();
        add([...event.clipboardData.files]);
      },
    },
  };
}

// The files on a record's comments and replies, newest first, each with the
// comment carrying it and its writer: the attachments tab lists and counts
// them beside the record's own.
export interface CommentFile {
  fileId: string;
  commentId: string;
  actorId: string;
}
export function useCommentFileList(entity: Entity, id: string): CommentFile[] {
  const { data } = useCrmQuery<CommentFile[]>(
    `${toText(entity)}/${encodeURIComponent(id)}/comments/attachments`,
    Boolean(id),
  );
  return Array.isArray(data) ? data : [];
}
