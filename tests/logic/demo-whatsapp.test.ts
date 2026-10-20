// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  demoContent,
  demoLanguages,
} from '../../server/providers/crm/demo-content/index.js';
import { demoWhatsAppSchedule } from '../../server/providers/crm/demo-whatsapp.js';

// The demo's WhatsApp conversations: each language's texts follow the
// schedule, message for message, and a customer nobody linked has a name
// to show.

describe('demo WhatsApp content', () => {
  for (const language of demoLanguages)
    it(`follows the schedule in ${language}`, () => {
      const { conversations } = demoContent(language).whatsapp;
      expect(conversations).toHaveLength(demoWhatsAppSchedule.length);
      for (const [index, entry] of demoWhatsAppSchedule.entries()) {
        const content = conversations[index];
        expect([index, content.messages.length]).toEqual([
          index,
          entry.messages.length,
        ]);
        expect(content.messages.every((m) => m.trim().length > 0)).toBe(true);
        if ('state' in entry.customer)
          expect(Boolean(content.profileName || content.username)).toBe(true);
        expect(entry.number).toBeLessThan(
          demoContent(language).whatsapp.displayNames.length,
        );
      }
    });

  for (const language of demoLanguages)
    it(`sends its pictures and files in ${language}, each a customer's, with a caption`, () => {
      const { files } = demoContent(language).whatsapp;
      // The bytes are what their type says: JPEG, PNG, PDF, a CSV with
      // Excel's byte-order mark.
      const magic: Record<string, (b: Buffer) => boolean> = {
        'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8,
        'image/png': (b) => b.subarray(1, 4).toString() === 'PNG',
        'application/pdf': (b) => b.subarray(0, 5).toString() === '%PDF-',
        'text/csv': (b) =>
          b.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])),
      };
      for (const file of Object.values(files)) {
        const bytes = Buffer.from(file.base64, 'base64');
        expect(bytes.length).toBeGreaterThan(1000);
        expect(magic[file.mimeType]?.(bytes)).toBe(true);
        // A document carries its name; a photo has none.
        expect(file.filename === null).toBe(file.mimeType.startsWith('image/'));
      }
      const named = demoWhatsAppSchedule.flatMap((entry, index) =>
        Object.entries(entry.media ?? {}).map(([at, key]) => ({
          entry,
          index,
          at: Number(at),
          key,
        })),
      );
      expect(named.map((n) => n.key).sort()).toEqual(Object.keys(files).sort());
      for (const { entry, at } of named)
        expect(entry.messages[at]?.[0]).toBe('in');
    });
});
