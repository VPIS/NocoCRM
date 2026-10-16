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
        expect(entry.unread).toBeLessThanOrEqual(
          entry.messages.length -
            1 -
            entry.messages.map(([direction]) => direction).lastIndexOf('out'),
        );
      }
    });
});
