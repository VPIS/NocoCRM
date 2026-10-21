import type {
  DemoAnswer,
  DemoModelRequest,
} from '@nocobase/app-plugin-demo-mode/server/tokens';

// What the demo model answers while the demo dataset is there (demo-data.ts):
// the CRM's own AI asks it in process (ai-model.ts, tagged with the work), the
// assistant over the Agents gateway. Each business operation gets the JSON
// its card parses, written in the language of the material it was given and
// saying it is simulated; anything else gets the plugin's own fallback.

const zh = (request: DemoModelRequest) => request.language === 'zh';
const SIMULATED = {
  zh: '（演示模型生成，未调用真实的大模型）',
  en: '(Written by the demo model; no real model was called.)',
};
const mark = (request: DemoModelRequest) =>
  zh(request) ? SIMULATED.zh : SIMULATED.en;
const t = (request: DemoModelRequest, chinese: string, english: string) =>
  zh(request) ? chinese : english;

// The JSON Schema a prompt spells out after "matching this JSON Schema:"
// (ai-model.ts askJson), when it does.
function schemaIn(prompt: string): Record<string, unknown> | null {
  const marker = 'matching this JSON Schema:';
  const at = prompt.lastIndexOf(marker);
  if (at < 0) return null;
  try {
    return JSON.parse(prompt.slice(at + marker.length).trim()) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

// The smallest value a JSON Schema accepts, its texts saying they are
// simulated: what a capture or a merge proposal gets in the demo.
function sample(schema: unknown, note: string, depth = 0): unknown {
  const node = (schema ?? {}) as Record<string, unknown>;
  if (depth > 8) return null;
  for (const key of ['anyOf', 'oneOf'] as const) {
    const options: unknown = node[key];
    if (Array.isArray(options)) {
      const chosen: unknown =
        options.find(
          (option) => (option as { type?: unknown }).type !== 'null',
        ) ?? options[0];
      return sample(chosen, note, depth + 1);
    }
  }
  if (Array.isArray(node.enum)) return node.enum[0];
  if ('const' in node) return node.const;
  const type = Array.isArray(node.type)
    ? (node.type as unknown[]).find((item) => item !== 'null')
    : node.type;
  switch (type) {
    case 'object': {
      const properties = (node.properties ?? {}) as Record<string, unknown>;
      const required = new Set((node.required ?? []) as string[]);
      return Object.fromEntries(
        Object.entries(properties)
          .filter(([key]) => required.has(key))
          .map(([key, value]) => [key, sample(value, note, depth + 1)]),
      );
    }
    case 'array': {
      const min = typeof node.minItems === 'number' ? node.minItems : 0;
      return Array.from({ length: min }, () =>
        sample(node.items, note, depth + 1),
      );
    }
    case 'string':
      return typeof node.format === 'string' && node.format.startsWith('date')
        ? new Date().toISOString().slice(0, node.format === 'date' ? 10 : 24)
        : note;
    case 'integer':
    case 'number':
      return typeof node.minimum === 'number' ? node.minimum : 0;
    case 'boolean':
      return false;
    default:
      return null;
  }
}

const json = (value: unknown) => JSON.stringify(value);

// What `crm dashboard` printed (one `name: JSON` line per part): the
// reader's tasks today and overdue and the approvals waiting for them.
function overview(outputs: readonly string[]): {
  today: number;
  overdue: number;
  approvals: number;
  firstApproval: string | null;
} | null {
  const parts: Record<string, { total?: number; data?: { name?: unknown }[] }> =
    {};
  for (const line of outputs.join('\n').split('\n')) {
    const match = /^(today|overdue|approvals): (\{.*\})$/u.exec(line);
    if (!match) continue;
    try {
      parts[match[1] ?? ''] = JSON.parse(match[2] ?? '{}') as never;
    } catch {
      // Not the overview's shape: left out.
    }
  }
  if (!parts.today && !parts.overdue && !parts.approvals) return null;
  const first = parts.approvals?.data?.[0]?.name;
  return {
    today: parts.today?.total ?? 0,
    overdue: parts.overdue?.total ?? 0,
    approvals: parts.approvals?.total ?? parts.approvals?.data?.length ?? 0,
    firstApproval: typeof first === 'string' ? first : null,
  };
}

export function demoAnswers(): DemoAnswer[] {
  return [
    {
      // Approval review (approval-review.ts): conditional approval.
      id: 'crm.approval-review',
      match: (request) => request.tag === 'approvals',
      reply: (request) =>
        json({
          recommendation: 'conditional',
          summary: t(
            request,
            `条款在可接受范围内，但需要客户确认付款节点后再批准。${SIMULATED.zh}`,
            `The terms are within reach, but approve only once the customer confirms the payment milestones. ${SIMULATED.en}`,
          ),
          asked: t(
            request,
            '申请的条款比标准多让出一部分，影响按申请中的金额计算。',
            'The request gives away more than the standard; the effect follows from the amount in the request.',
          ),
          reasons: [
            t(
              request,
              '申请说明了客户的预算限制（来源：审批申请）',
              'The request explains the customer’s budget limit (source: the approval request)',
            ),
          ],
          together: null,
          precedents: t(
            request,
            '演示环境中没有可比较的历史审批。',
            'There is no comparable earlier approval in the demo.',
          ),
          risks: [
            t(
              request,
              '回款周期变长，需要在合同中写明付款节点',
              'Collection takes longer; write the payment milestones into the contract',
            ),
          ],
          missing: [
            t(
              request,
              '客户书面确认的付款计划',
              'The payment plan confirmed by the customer in writing',
            ),
          ],
          conditions: t(
            request,
            '合同写明分期付款节点后批准。',
            'Approve once the contract states the instalment milestones.',
          ),
          comment: t(
            request,
            '同意按条件批准。请先与客户确认付款节点并写入合同，再提交最终版本。',
            'Approved on conditions. Confirm the payment milestones with the customer and put them in the contract before submitting the final version.',
          ),
        }),
    },
    {
      // A lead's follow-up (lead-evaluation.ts): keep following up.
      id: 'crm.lead-follow-up',
      match: (request) => request.tag === 'leads' && !schemaIn(request.prompt),
      reply: (request) =>
        json({
          recommendation: 'follow',
          grade: 'B',
          summary: t(
            request,
            `线索表达了明确的需求，值得继续跟进。${SIMULATED.zh}`,
            `The lead stated a clear need and is worth following up. ${SIMULATED.en}`,
          ),
          brief: t(
            request,
            '客户在原始留言中说明了要解决的问题，但还没有确认预算和时间。下一步先电话了解现有系统和决策流程，再安排演示。',
            'The customer said what they want to solve in their message but has not confirmed budget or timing. Call first to learn about their current system and how they decide, then arrange a demo.',
          ),
          reasons: [
            t(
              request,
              '原始留言说明了业务需求（来源：线索的原始信息）',
              'The original message states the business need (source: the lead’s original information)',
            ),
          ],
          edition: null,
          invalidReason: null,
          nextStep: {
            type: 'task',
            subject: t(
              request,
              '电话沟通需求和决策流程',
              'Call to discuss the need and how they decide',
            ),
            inDays: 2,
            task: null,
            owner: null,
          },
          prep: [
            t(
              request,
              '准备一个与客户行业相近的案例',
              'Prepare a case from a similar industry',
            ),
          ],
          questions: [
            t(
              request,
              '预算和上线时间是怎样计划的？',
              'What budget and timing do they plan for?',
            ),
          ],
          opportunity: null,
          reviewInDays: null,
          changes: [],
          email: null,
          enrich: [],
        }),
    },
    {
      // A deal's follow-up (opportunity-evaluation.ts): keep it going.
      id: 'crm.opportunity-follow-up',
      match: (request) =>
        request.tag === 'opportunities' && !schemaIn(request.prompt),
      reply: (request) =>
        json({
          recommendation: 'continue',
          confidence: 'medium',
          stage: null,
          summary: t(
            request,
            `商机进展正常，先确认决策人和时间表。${SIMULATED.zh}`,
            `The deal is moving; confirm the decision makers and the timeline first. ${SIMULATED.en}`,
          ),
          brief: t(
            request,
            '最近的沟通集中在方案细节上，客户还没有给出采购时间表。建议约一次与决策人的会议，确认预算和评估标准。',
            'Recent exchanges were about the details of the proposal; the customer has not given a purchasing timeline. Meet the decision makers to confirm budget and evaluation criteria.',
          ),
          reasons: [
            t(
              request,
              '最近的任务记录显示客户在比较方案（来源：商机的任务）',
              'The latest task shows the customer comparing options (source: the deal’s tasks)',
            ),
          ],
          risks: [t(request, '决策时间可能推迟', 'The decision may slip')],
          nextStep: {
            type: 'task',
            subject: t(
              request,
              '与决策人确认采购时间表',
              'Confirm the purchasing timeline with the decision makers',
            ),
            inDays: 3,
            task: null,
            owner: null,
          },
          prep: [],
          questions: [],
          email: null,
          updates: [],
          pauseReason: null,
          resumeInDays: null,
          lostReason: null,
          revisitInDays: null,
          changes: [],
        }),
    },
    {
      // A task's preparation (task-preparation.ts).
      id: 'crm.task-preparation',
      match: (request) =>
        request.tag === 'tasks' && request.prompt.includes('"agenda"'),
      reply: (request) =>
        json({
          summary: t(
            request,
            `确认客户的需求和下一步安排。${SIMULATED.zh}`,
            `Confirm the customer's need and the next step. ${SIMULATED.en}`,
          ),
          brief: t(
            request,
            '客户已经了解过产品，正在评估是否适合自己的业务。',
            'The customer knows the product and is judging whether it fits their business.',
          ),
          people: [],
          company: null,
          questions: [
            t(request, '这次评估由谁来决定？', 'Who decides this evaluation?'),
          ],
          bring: [t(request, '产品演示环境', 'A product demo environment')],
          risks: [],
          agenda: [
            t(request, '回顾需求', 'Review the need'),
            t(request, '确认下一步', 'Agree the next step'),
          ],
        }),
    },
    {
      // Captures and merge proposals (askJson): the smallest object their
      // schema accepts, its texts saying they are simulated.
      id: 'crm.structured',
      match: (request) => Boolean(request.tag && schemaIn(request.prompt)),
      reply: (request) =>
        json(sample(schemaIn(request.prompt), mark(request).trim())),
    },
    {
      // The assistant over the gateway: an overview of the demo's work, or
      // a summary of what the tools it called returned.
      id: 'crm.assistant',
      match: (request) => !request.tag,
      reply: (request) => {
        // First a look at the overview through the CRM's command line, as
        // the assistant would, when the conversation offers its shell.
        if (
          !request.toolResults.length &&
          request.tools.some((tool) => tool.name === 'bash')
        )
          return {
            toolCalls: [
              { name: 'bash', arguments: { command: 'crm dashboard' } },
            ],
          };
        if (request.toolResults.length) {
          const read = overview(request.toolResults.map((r) => r.content));
          if (read)
            return t(
              request,
              `我看了一下你的工作台：今天有 ${read.today} 项任务，${read.overdue} 项已逾期，${read.approvals} 项审批在等你决定${read.firstApproval ? `（比如「${read.firstApproval}」）` : ''}。建议先处理审批和逾期任务，再跟进处于方案和谈判阶段的商机。\n\n${SIMULATED.zh}`,
              `I looked at your overview: ${read.today} task(s) today, ${read.overdue} overdue, and ${read.approvals} approval(s) waiting for you${read.firstApproval ? ` (such as "${read.firstApproval}")` : ''}. Decide the approvals and the overdue tasks first, then follow up the deals at proposal and negotiation.\n\n${SIMULATED.en}`,
            );
          return t(
            request,
            `我查看了 ${request.toolResults.length} 项 CRM 数据，页面上可以看到完整内容。按目前的进展，建议先处理逾期的任务，再跟进处于方案和谈判阶段的商机。\n\n${SIMULATED.zh}`,
            `I read ${request.toolResults.length} result(s) from the CRM; the pages show them in full. As things stand, deal with the overdue tasks first, then follow up the deals at proposal and negotiation.\n\n${SIMULATED.en}`,
          );
        }
        return t(
          request,
          `这是演示环境里的销售专家。根据演示数据，本周值得关注的是：华住的商机处于方案阶段，折扣申请正在审批；广汽的商机在谈判中，有一项任务已经逾期；顺丰是一条新线索，还没有首次联系。需要我从哪一项开始？\n\n${SIMULATED.zh}`,
          `This is the Sales Expert of the demo. In the demo data, this week's points are: H World's deal is at proposal with a discount waiting for approval; GAC's deal is in negotiation with an overdue task; SF Express is a new lead not contacted yet. Where shall we start?\n\n${SIMULATED.en}`,
        );
      },
    },
  ];
}
