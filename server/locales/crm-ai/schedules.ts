import type { Pair } from './index.js';

// The CRM's daily checks as the scheduled tasks page shows them: the
// target's label and description, and the schedule's title and
// description (CrmProvider), in the CRM's working language.
export const scheduleTexts = {
  leadTarget: ['线索巡检', 'Lead signal check'],
  leadTargetDescription: [
    'AI 跟进长时间未联系、没有动静或培育复查到期的线索',
    'The AI follows up leads left uncontacted, gone quiet or due for a nurture review',
  ],
  leadTitle: ['线索每日巡检', 'Daily lead check'],
  leadDescription: [
    '每天检查进行中的线索：新线索太久没联系、跟进中太久没有联系、培育复查到期（天数见 CRM 设置的提醒）。AI 对每条跟进一次，结果进线索负责人的「待我处理」。',
    "Every day, the open leads are checked: a new lead left uncontacted, a working one gone quiet, a nurtured one due for review (the days are the CRM settings' reminders). The AI follows each up once, and the result waits on its owner.",
  ],
  dealTarget: ['商机巡检', 'Opportunity signal check'],
  dealTargetDescription: [
    'AI 跟进没有动静、临近或超过预计成交日期、暂停到期的商机',
    'The AI follows up opportunities gone quiet, near or past their expected close date, or due to resume',
  ],
  dealTitle: ['商机每日巡检', 'Daily opportunity check'],
  dealDescription: [
    '每天检查进行中的商机：太久没有联系、预计成交日期临近或已过、暂停到了预计恢复日期（天数见 CRM 设置的提醒）。AI 对每个跟进一次，结果进商机负责人的「待我处理」。',
    "Every day, the open opportunities are checked: one gone quiet, one whose expected close date is near or past, a paused one due to resume (the days are the CRM settings' reminders). The AI follows each up once, and the result waits on its owner.",
  ],
  fileTarget: ['附件清理', 'Attachment cleanup'],
  fileTargetDescription: [
    '删除不再被任何记录或评论使用的附件',
    'Deletes the attachments no record or comment uses any more',
  ],
  fileTitle: ['附件每日清理', 'Daily attachment cleanup'],
  fileDescription: [
    '每天检查附件：不在任何记录的附件里、也不在任何评论里的文件，第一次发现后再过 7 天、且上传满 7 天，从系统中删除（包括存储的文件）。期间重新被使用的文件会保留。',
    'Every day, the attachments are checked: a file no record lists among its attachments and no comment carries is deleted from the system, its stored file included, 7 days after it was first found unused and once it is 7 days old. One used again meanwhile is kept.',
  ],
  taskTarget: ['任务准备', 'Task preparation'],
  taskTargetDescription: [
    'AI 为当天有具体时间的任务做准备',
    "The AI prepares the day's timed tasks",
  ],
  taskTitle: ['任务每日准备', 'Daily task preparation'],
  taskDescription: [
    '每天早上为当天还没开始、有具体时间、关联了线索、商机或公司的任务做一次准备：目标、进展、对方的人、近况、要问的问题、要带的材料、风险和要点。结果只有任务负责人和参与人能看到。',
    "Every morning, each task still ahead today that has a time of day and concerns a lead, an opportunity or a company is prepared once: its aim, where things stand, the people on the other side, recent news, the questions to ask, what to bring, the risks and the points to cover. Only the task's owner and participants see it.",
  ],
} as const satisfies Record<string, Pair>;
