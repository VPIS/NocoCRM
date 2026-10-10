import type { FileRecord } from '@nocobase/app-plugin-file/client';

export interface CrmFile {
  id: string;
  filename: string;
  createdAt: string;
  // The stored type, or null when the upload recorded none.
  mimeType: string | null;
  size: number | null;
  url: string;
}

// The preview dialog is the file plugin's (client/extensions/
// nocobase-file-component-ui): images, PDF, text and Markdown, and Word,
// Excel and PowerPoint rendered in the browser. It takes the plugin's file
// record shape; the CRM serves the bytes from its own route, with
// "?inline=1" so the browser may show what it renders itself.
export function fileRecord(file: CrmFile): FileRecord {
  const dot = file.filename.lastIndexOf('.');
  return {
    id: file.id,
    disk: '',
    key: '',
    filename: file.filename,
    ext: dot < 0 ? '' : file.filename.slice(dot + 1).toLowerCase(),
    mimeType: file.mimeType ?? 'application/octet-stream',
    size: file.size ?? 0,
    createdAt: file.createdAt,
    updatedAt: file.createdAt,
    contentUrl: `${file.url}?inline=1`,
  };
}
