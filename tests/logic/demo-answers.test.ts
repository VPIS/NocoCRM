// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { DemoModelRequest } from '@nocobase/app-plugin-demo-mode/server/tokens';
import { demoAnswers } from '../../server/providers/crm/demo-answers.js';

// What the demo model answers the CRM: each business operation the JSON its
// card parses, the assistant a look at the overview through its shell and
// then what it read, in the request's language.

const request = (input: Partial<DemoModelRequest>): DemoModelRequest => ({
  model: 'demo-chat',
  system: '',
  messages: [],
  prompt: '',
  tools: [],
  toolResults: [],
  language: 'en',
  ...input,
});
const answer = async (input: Partial<DemoModelRequest>) => {
  const asked = request(input);
  const found = demoAnswers().find((candidate) => candidate.match(asked));
  return { id: found?.id, reply: await found?.reply(asked) };
};

describe('the demo model’s answers', () => {
  it('reviews an approval with the JSON its card reads, in the material’s language', async () => {
    const { id, reply } = await answer({
      tag: 'approvals',
      prompt: '审批：华住集团 企业版首年 15% 折扣',
      language: 'zh',
    });
    expect(id).toBe('crm.approval-review');
    expect(JSON.parse(String(reply))).toMatchObject({
      recommendation: 'conditional',
      summary: expect.stringContaining('演示模型'),
    });
  });

  it('fills a capture’s schema with simulated values', async () => {
    const schema = {
      type: 'object',
      properties: {
        leads: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              source: { enum: ['website', 'other'] },
              employees: { type: ['integer', 'null'], minimum: 1 },
            },
            required: ['name', 'source', 'employees'],
          },
        },
      },
      required: ['leads'],
    };
    const { id, reply } = await answer({
      tag: 'leads',
      prompt: `Organise this text.\n\nReturn only one JSON object, with no other text, matching this JSON Schema:\n${JSON.stringify(schema)}`,
    });
    expect(id).toBe('crm.structured');
    expect(JSON.parse(String(reply))).toEqual({
      leads: [
        {
          name: '(Written by the demo model; no real model was called.)',
          source: 'website',
          employees: 1,
        },
      ],
    });
  });

  it('has the assistant read the overview through its shell, then tell what it found', async () => {
    const tools = [{ name: 'bash' }, { name: 'skill' }];
    const first = await answer({
      prompt: '本周怎么样？',
      language: 'zh',
      tools,
    });
    expect(first).toEqual({
      id: 'crm.assistant',
      reply: {
        toolCalls: [{ name: 'bash', arguments: { command: 'crm dashboard' } }],
      },
    });
    const output = [
      'exit code 0',
      'today: {"data":[],"total":2}',
      'overdue: {"data":[],"total":1}',
      'approvals: {"data":[{"name":"华住集团 企业版首年 15% 折扣"}],"total":1}',
    ].join('\n');
    const second = await answer({
      prompt: '本周怎么样？',
      language: 'zh',
      tools,
      toolResults: [{ name: 'bash', content: output }],
    });
    expect(second.reply).toContain('今天有 2 项任务，1 项已逾期，1 项审批');
    expect(second.reply).toContain('华住集团 企业版首年 15% 折扣');
  });

  it('answers a conversation without tools from the demo’s story', async () => {
    const { reply } = await answer({ prompt: 'Where do I start?' });
    expect(reply).toContain('demo model');
  });

  it('leaves an operation it has no script for to the plugin’s fallback', async () => {
    expect(await answer({ tag: 'signals', prompt: 'news' })).toEqual({
      id: undefined,
      reply: undefined,
    });
  });
});
