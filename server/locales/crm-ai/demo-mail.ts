import type { Pairs } from './index.js';

// The demo mailboxes' provider (server/providers/crm/demo-mail.ts): its name
// on the Mail plugin's pages, which show a provider's label as given, and
// why it refuses what it refuses.
export const demoMailTexts = {
  label: [
    '演示邮箱（仅用于演示数据，不会真正发信）',
    'Demo mailbox (demo data only; nothing is delivered)',
  ],
  importOnly: [
    '演示邮箱只能随演示数据一起创建。',
    'A demo mailbox comes only with the demo data.',
  ],
  demoRecipientsOnly: [
    '演示邮箱只能发给演示数据里的联系人，邮件不会真正寄出。',
    'A demo mailbox sends only to the demo data’s people, and nothing is delivered.',
  ],
} as const satisfies Pairs;
