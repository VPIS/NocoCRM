import type { StepLine } from '@nocobase/app-plugin-agents/client/chat';

// What the agent's run is doing, in the person's words rather than the
// command it runs: the plugin sums a run up as thinking, reading or working
// on a subject, and the subject of the CRM's agent is its CLI command line
// (`crm leads list --q "顺丰" --json | head -50`), which reads as noise. The
// command's object and verb, and what it searches for, say it plainly; any
// other step keeps the plugin's own wording. No imports beyond types, so the
// tests read it directly.

// The CRM's objects as its commands name them, singular or plural.
const OBJECTS: Record<string, string> = {
  lead: 'leads',
  leads: 'leads',
  company: 'companies',
  companies: 'companies',
  opportunity: 'opportunities',
  opportunities: 'opportunities',
  deal: 'opportunities',
  deals: 'opportunities',
  contact: 'contacts',
  contacts: 'contacts',
  task: 'tasks',
  tasks: 'tasks',
  approval: 'approvals',
  approvals: 'approvals',
};

export interface StepWords {
  // The key under `agentChat.step` and its values; null when the plugin's
  // wording stands.
  readonly key: string;
  readonly values?: Record<string, string>;
}

export function stepWords(line: StepLine): StepWords | null {
  if (line.kind === 'thinking') return { key: 'thinking' };
  const subject = line.subject.trim();
  // A skill the run loads: the method it works by.
  if (/^skill\b/iu.test(subject)) return { key: 'skill' };
  const command = /(?:^|[\s;&|(])crm\s+([a-z-]+)(?:\s+([a-z-]+))?/iu.exec(
    subject,
  );
  if (!command) return null;
  if (/--help\b/u.test(subject)) return { key: 'help' };
  const [, first, second] = command;
  const query = /--q\s+(?:"([^"]+)"|'([^']+)'|(\S+))/u.exec(subject);
  const q = query ? (query[1] ?? query[2] ?? query[3] ?? '') : '';
  if (first === 'search') return q ? { key: 'search', values: { q } } : null;
  if (first === 'plan' || first === 'plans') return { key: 'plan' };
  const object = OBJECTS[first.toLowerCase()];
  if (!object) return null;
  const verb = (second ?? '').toLowerCase();
  if (verb === 'list')
    return q
      ? { key: 'find', values: { object, q } }
      : { key: 'list', values: { object } };
  if (verb === 'get') return { key: 'get', values: { object } };
  if (verb === 'history') return { key: 'history', values: { object } };
  return { key: 'read', values: { object } };
}
