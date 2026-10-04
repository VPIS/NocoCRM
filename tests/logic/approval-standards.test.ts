// @vitest-environment node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import enUS from '../../client/locales/en-US.js';
import zhCN from '../../client/locales/zh-CN.js';

const SKILLS = ['lead-follow-up', 'opportunity-follow-up', 'approval-review'];

const skill = (name: string): string =>
  readFileSync(
    fileURLToPath(new URL(`../../ai/skills/${name}/SKILL.md`, import.meta.url)),
    'utf8',
  );

// The approval standards (what needs an approval) are written in two
// skills: the deal follow-up proposes approvals by them, the approval
// review weighs a request against them. Nothing else states them, so the
// two must say the same.
// The standards' lines, one per kind of term, then the company's say.
const standards = (text: string): string[] =>
  text
    .split('\n')
    .filter((line) =>
      /^- (Discount|Payment terms|Contract terms|Delivery commitments): |^- Standards the company adds/.test(
        line,
      ),
    );

describe('the approval standards', () => {
  it('read the same in the deal follow-up and the approval review', () => {
    const followUp = standards(skill('opportunity-follow-up'));
    expect(followUp).toHaveLength(5);
    expect(standards(skill('approval-review'))).toEqual(followUp);
    expect(followUp.join('\n')).toContain('10%');
    expect(followUp.join('\n')).toContain('30 days');
  });
});

// A skill's frontmatter: its single-line values, and the namespace of its
// display text.
const front = (name: string) => {
  const text = /^---\n([\s\S]*?)\n---\n/.exec(skill(name))?.[1] ?? '';
  const value = (pattern: RegExp) => pattern.exec(text)?.[1].trim() ?? '';
  return {
    text,
    title: value(/^\s+title:\s*(.+)$/m),
    description: value(/^description:\s*(.+)$/m),
    namespace: value(/^ {2}namespace:\s*(.+)$/m),
  };
};

// The AI Employee plugin reads a skill's frontmatter as YAML and drops the
// whole skill when it does not parse, logging only an error; a plain value
// holding ": " is the usual way to break it.
describe('the skill files', () => {
  for (const name of SKILLS)
    it(`${name} has frontmatter the plugin can read`, () => {
      const { text, title } = front(name);
      expect(text).toMatch(new RegExp(`^name: ${name}$`, 'm'));
      expect(title).not.toBe('');
      for (const line of text.split('\n')) {
        const value = /^\s*[\w.]+:\s(.*)$/.exec(line)?.[1] ?? '';
        if (/^['"[{|>]/.test(value)) continue;
        expect(`${line} → ${/: |\s#/.test(value)}`).toBe(`${line} → false`);
      }
    });
});

// The skills are written in English alone. The plugin's skill pages and the
// Sales skills page show their title and description in the reader's
// language, keyed by that English text in the `crm` namespace.
describe("the skills shown in the reader's language", () => {
  const messages = (resource: unknown) => resource as Record<string, unknown>;
  for (const name of SKILLS)
    it(`${name} has its title and description in both locales`, () => {
      const english = front(name);
      expect(english.namespace).toBe('crm');
      for (const key of [english.title, english.description]) {
        expect(messages(enUS)[key]).toBe(key);
        expect(messages(zhCN)[key]).toMatch(/\p{Script=Han}/u);
      }
    });
});
