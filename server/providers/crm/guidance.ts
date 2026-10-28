import type { CrmSettings } from './schema.js';

// The business guidance the CRM's AI works from: how this deployment
// sells, what counts as progress, when to follow up and when to ask for
// approval. Every conversation with an agent gets it as the CRM's rules
// (crm-agents/rules.ts), and every background run as its system prompt
// (ai-model.ts). This is the one shipped; an administrator may write the
// deployment's own over it on the settings page (businessGuidance). The
// shipped one is a template: the company's profile is left for the
// administrator to fill in, under the follow-up rules every deployment
// shares. The demo dataset writes its fictional company's guidance over it
// (demo-content/guidance.ts).
// The follow-up thresholds come from the CRM's settings (the reminders
// section), so the chat holds to the same days as the daily checks and the
// dashboard.
export interface GuidanceDays {
  uncontacted: number;
  stale: number;
  closing: number;
}
// The guidance in the CRM's AI language (CrmSettings.aiLanguage): Chinese
// for `zh-CN`, English otherwise. The two versions say the same.
export const crmGuidance = (
  days: GuidanceDays = { uncontacted: 2, stale: 14, closing: 7 },
  language = 'en-US',
): string =>
  language.startsWith('zh')
    ? `${chineseProfile}\n\n${chineseFollowUp(days)}\n\n${chineseBoundaries}`
    : `${englishProfile}\n\n${englishFollowUp(days)}\n\n${englishBoundaries}`;

// The guidance the AI works from: what an administrator wrote on the
// settings page, else the shipped one with the settings' reminders' days, in
// their AI language; the defaults without settings. The settings page shows
// the shipped one through it too, so it has no imports the browser lacks.
export const settingsGuidance = (
  settings: Pick<
    CrmSettings,
    | 'uncontactedDays'
    | 'leadStaleDays'
    | 'closeReminderDays'
    | 'aiLanguage'
    | 'businessGuidance'
  > | null,
): string =>
  settings?.businessGuidance?.trim()
    ? settings.businessGuidance
    : settings
      ? crmGuidance(
          {
            uncontacted: settings.uncontactedDays,
            stale: settings.leadStaleDays,
            closing: settings.closeReminderDays,
          },
          settings.aiLanguage,
        )
      : crmGuidance();

// The selling company's name as the guidance's company line gives it
// ("- Company: Loomstack (…)", "- 公司名称：Loomstack（…）"), for the lead
// research's question whether a lead's company already uses it; none while
// the template's placeholder stands or the guidance has no such line.
export const guidanceCompany = (guidance: string): string | null => {
  const name = /^\s*[-*]\s*(?:Company|公司名称)\s*[:：]\s*([^(（\n]*)/im
    .exec(guidance)?.[1]
    ?.trim();
  return name || null;
};

// The company's profile, for the administrator to fill in: what the AI
// knows of the company is only what is written here.
const chineseProfile = `# 公司定位
- 公司名称：（请填写）
- 产品与服务：（请填写卖什么、为客户解决什么问题）
- 版本与价格：（请填写可以报给客户的版本和价格；这里没有写的价格，AI 不会报给客户）
- 目标客户：（请填写哪些行业、规模和场景的客户最合适）
- 典型决策角色：（例如 IT 负责人、业务负责人、采购和法务）`;

const englishProfile = `# Company profile
- Company: (fill in)
- Products and services: (fill in what you sell and what it solves for customers)
- Editions and prices: (fill in the editions and prices that may be quoted to customers; the AI quotes no price that is not written here)
- Target customers: (fill in the industries, sizes and situations that fit best)
- Typical decision roles: (for example the head of IT, the business owner, procurement and legal)`;

// How leads and opportunities are followed up and when to ask for approval,
// the same for every company; the demo's guidance shares it.
export const chineseFollowUp = (days: GuidanceDays): string => `# 跟进和审批
- 商机各阶段的推进条件见「跟进商机」技能；证据不足时不推进阶段，下一步是去拿证据的任务。
- 新线索超过 ${days.uncontacted} 天未首次联系，建议创建首次联系的任务。
- 线索或商机超过 ${days.stale} 天没有联系（没有完成的任务、评论或邮件往来），建议安排下一步沟通。
- 预计成交日期 ${days.closing} 天内到达但仍未关闭，建议确认进展或调整日期。
- 客户要的条件超出审批标准（见「跟进商机」和「审批辅助」技能）时，建议发起审批，审批通过前不答应客户。
- 任务标题：只写要做的事，不带公司名称（任务关联了记录，列表里会显示），例如"方案演示"。
- 沟通过的内容写成评论，任务完成时写结果：记客户的原话要点和已确认的事实，推测单独标出，并写下一步和负责人。`;

export const englishFollowUp = (
  days: GuidanceDays,
): string => `# Follow-up and approvals
- The conditions for moving an opportunity to each stage are in the opportunity follow-up skill; without enough evidence the stage does not move, and the next step is a task that gets the evidence.
- A new lead not contacted for more than ${days.uncontacted} days: suggest creating a first-contact task.
- A lead or opportunity with no contact (no task done, comment or mail) for more than ${days.stale} days: suggest scheduling the next conversation.
- An expected close date within ${days.closing} days while the opportunity is still open: suggest confirming progress or moving the date.
- When a customer asks for conditions beyond the approval standards (see the opportunity follow-up and approval review skills), suggest submitting an approval, and promise the customer nothing until it is approved.
- Task titles: what to do, without the company's name (the task is linked to its record, which shows beside it), e.g. "Solution demo".
- What was discussed is written as a comment, and a task's result when it is done: the key points in the customer's own words and the facts confirmed; inferences are marked separately; it ends with the next step and who owns it.`;

const chineseBoundaries = `# 记录边界
- 不猜预算、决策人、竞争对手和项目进度；推测必须标成"推测"，并说明依据。
- 不报公司定位里没有写的价格，不承诺还没有的功能和上线时间。
- 商机名称写客户要的产品或服务，有版本的带上版本；金额按公司定位里的价格填，没有写价格的留空。
- 所有新增、修改、删除、线索转化和审批操作都必须等待用户确认。`;

const englishBoundaries = `# Record boundaries
- Do not guess the budget, the decision maker, competitors or the project's progress; an inference must be marked "Assumption", with its basis stated.
- Do not quote prices the company profile does not list, and do not promise features or release dates that do not exist yet.
- Opportunity names: the product or service the customer wants, with its edition where there is one; amounts follow the prices in the company profile, and stay empty where it lists none.
- Every create, update, delete, lead conversion and approval action waits for the user's confirmation.`;
