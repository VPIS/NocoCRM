const labels: Record<string, [string, string]> = {
  // The object is named: "Lead assigned to you", not "record".
  assigned: ['{{entity}} assigned to you', '{{entity}}已分配给你'],
  invited: ['You were added to a task', '你被加入任务'],
  removed: ['You were removed from a task', '你被移出任务'],
  cancelled: ['Task cancelled', '任务已取消'],
  rescheduled: ['Task rescheduled', '任务时间已变更'],
  // A colleague's comment on a record named the reader.
  mentioned: [
    'Someone mentions you in {{record}}',
    '有人在{{entity}}的评论里提到了你',
  ],
  // Someone answered a comment the reader wrote or replied to.
  replied: ['{{entity}} has a new reply', '{{entity}}有新回复'],
  starting: ['Task coming up', '任务时间快到了'],
  // The AI found news about a company the reader sells to
  // (company-signals.ts).
  signal: ['{{entity}} has news', '{{entity}}有新动态'],
  // A customer wrote on WhatsApp: on the lead or contact they are, or in a
  // conversation linked to no record yet. Nothing queues these since
  // 2026-10-16; kept for those queued before (index.ts).
  whatsapp: [
    '{{entity}} has a new WhatsApp message',
    '{{entity}}有新的 WhatsApp 消息',
  ],
  whatsappNew: ['New WhatsApp conversation', '新的 WhatsApp 对话'],
  pending: ['Approval requested', '待审批申请'],
  withdrawn: ['Request withdrawn', '审批已撤回'],
  approved: ['Request approved', '审批已通过'],
  rejected: ['Request rejected', '审批已拒绝'],
};
const entityLabels: Record<string, [string, string]> = {
  leads: ['Lead', '线索'],
  companies: ['Company', '公司'],
  contacts: ['Contact', '联系人'],
  opportunities: ['Opportunity', '商机'],
  tasks: ['Task', '任务'],
  approvals: ['Approval', '审批'],
};
// The object as a sentence names it, inside a title: "a lead", "an
// opportunity" (`record`); in Chinese the object's own name.
const recordLabels: Record<string, [string, string]> = {
  leads: ['a lead', '线索'],
  companies: ['a company', '公司'],
  contacts: ['a contact', '联系人'],
  opportunities: ['an opportunity', '商机'],
  tasks: ['a task', '任务'],
  approvals: ['an approval', '审批'],
};
const pick = (
  table: Record<string, [string, string]>,
  index: 0 | 1,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(table).map(([key, pair]) => [key, pair[index]]),
  );
export const notificationLocales = {
  'en-US': async (): Promise<{
    titles: Record<string, string>;
    entities: Record<string, string>;
    records: Record<string, string>;
    body: string;
  }> => ({
    titles: pick(labels, 0),
    entities: pick(entityLabels, 0),
    records: pick(recordLabels, 0),
    // The record's name alone: the inbox shows the title itself.
    body: '{{name}}',
  }),
  'zh-CN': async (): Promise<{
    titles: Record<string, string>;
    entities: Record<string, string>;
    records: Record<string, string>;
    body: string;
  }> => ({
    titles: pick(labels, 1),
    entities: pick(entityLabels, 1),
    records: pick(recordLabels, 1),
    body: '{{name}}',
  }),
};
