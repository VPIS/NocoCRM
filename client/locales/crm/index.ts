const wording = {
  conversionRate: ['Conversion rate', '转化率'],
  uncontacted: ['Leads awaiting first contact', '待首次跟进线索'],
  uncontactedCard: ['New leads', '新线索'],
  // An empty field the reader may fill, by its label.
  emptyFill: ['Add {{field}}', '填写{{field}}'],
  emptyChoose: ['Choose {{field}}', '选择{{field}}'],
  // A lead's empty original message, under its heading.
  messagePlaceholder: ['Add the original message...', '填写原始信息...'],
  stale: ['Stalled', '停滞'],
  convertedThisMonth: ['Converted this month', '本月转化'],
  converted: ['Converted leads', '已转化线索'],
  newThisMonth: ['New this month', '本月新增'],
  customers: ['Customers', '成交客户'],
  churnedThisMonth: ['Churned this month', '本月流失客户'],
  inactiveContacts: ['Former employees', '已离职人数'],
  missingContact: ['No contact details', '缺少联系方式'],
  todayTasks: ['Today’s tasks', '今日任务'],
  myDecisions: ['Waiting for me', '待我审批'],
  awaitingApproval: ['Awaiting approval', '等待审批'],
  toSubmit: ['To submit', '待提交'],
  approvedThisMonth: ['Approved this month', '本月通过'],
  rejectedThisMonth: ['Rejected this month', '本月拒绝'],
  planned: ['Upcoming', '待进行'],
  overdueTasks: ['Overdue tasks', '逾期任务'],
  cancelled: ['Cancelled', '已取消'],

  opportunityName: ['{{name}} opportunity', '{{name}}商机'],
  workspace: ['Sales workspace', '销售工作台'],
  dashboard: ['Overview', '工作台'],
  // The overview's heading, by the time of day in the CRM's time zone.
  greeting: {
    morning: ['Morning, {{name}}', '早上好，{{name}}'],
    afternoon: ['Afternoon, {{name}}', '下午好，{{name}}'],
    evening: ['Evening, {{name}}', '晚上好，{{name}}'],
  },
  greetingAlone: {
    morning: ['Good morning', '早上好'],
    afternoon: ['Good afternoon', '下午好'],
    evening: ['Good evening', '晚上好'],
  },
  sourcesSection: ['Lead sources', '线索来源'],
  // The overview's own navigation, a row of its sections.
  reportSections: ['Sections of the reports', '报表导航'],
  reportsTitle: ['Reports', '报表'],
  // The four figures that open the reports page.
  keyFigures: ['Key figures', '关键数字'],
  // The Mailbox page's way to the Mail accounts page (pages/crm-mail).
  mailManageAccounts: ['Manage mail accounts', '管理邮箱账户'],
  // The user's conversations with the assistant, under the menu
  // (sidebar-chats.tsx); "conversation" as the panel's own list says it.
  chats: {
    title: ['Conversations', '对话'],
    new: ['New conversation', '新对话'],
    untitled: ['New conversation', '新对话'],
    empty: [
      'No conversations yet. Ask anything at the bottom of the page to start one.',
      '还没有对话。在页面底部输入问题即可开始。',
    ],
    failed: ['Conversations could not be loaded.', '对话加载失败。'],
    retry: ['Retry', '重试'],
    unread: ['Unread', '未读'],
    loading: ['Loading…', '正在加载…'],
    missing: ['This conversation no longer exists', '这段对话已不存在'],
    actions: ['Actions for "{{title}}"', '“{{title}}”的操作'],
    delete: ['Delete', '删除'],
    deleting: ['Deleting…', '正在删除…'],
    deleteTitle: ['Delete conversation "{{title}}"?', '删除对话“{{title}}”？'],
    deleteHint: [
      'Its messages are deleted with it. This cannot be undone.',
      '其中的消息会一并删除，此操作无法撤销。',
    ],
    deleteFailed: [
      'The conversation could not be deleted. Try again.',
      '对话删除失败，请重试。',
    ],
    deleted: ['Deleted conversation "{{title}}"', '已删除对话“{{title}}”'],
  },
  // The assistant's dock at the bottom of the page (assistant-dock.tsx), the
  // overview's ask box (assistant-ask-box.tsx), and the questions they
  // suggest, by page.
  dock: {
    placeholder: ['Ask anything…', '问任何问题…'],
    attach: ['Attach files', '上传文件'],
    model: ['Model', '模型'],
    // On a record's page, by the kind of record.
    placeholderFor: {
      leads: ['Ask anything about this lead…', '关于此线索，问任何问题…'],
      opportunities: [
        'Ask anything about this opportunity…',
        '关于此商机，问任何问题…',
      ],
      companies: [
        'Ask anything about this company…',
        '关于此公司，问任何问题…',
      ],
      contacts: [
        'Ask anything about this contact…',
        '关于此联系人，问任何问题…',
      ],
      tasks: ['Ask anything about this task…', '关于此任务，问任何问题…'],
      approvals: [
        'Ask anything about this approval…',
        '关于此审批，问任何问题…',
      ],
    },
    open: ['Ask Noco', '问 Noco'],
    suggestions: ['Suggested questions', '推荐问题'],
    q: {
      home: {
        focus: ['What should I focus on today?', '今天我最该处理什么？'],
        deals: ['Which opportunities need attention?', '哪些商机需要关注？'],
        followUp: ['Who should I follow up with?', '我该跟进谁？'],
        analyze: ['Analyze sales and make a report', '分析销售情况并生成报告'],
      },
      leads: {
        first: [
          'Which new leads should I contact first?',
          '哪些新线索应该先联系？',
        ],
        quiet: ['Which leads have gone quiet?', '哪些线索很久没有跟进了？'],
      },
      opportunities: {
        closing: [
          'Which opportunities are expected to close this month?',
          '本月预计成交哪些商机？',
        ],
        risk: ['Which opportunities are at risk?', '哪些商机有风险？'],
      },
      companies: {
        quiet: [
          "Which companies haven't been contacted lately?",
          '哪些公司最近没有联系？',
        ],
      },
      contacts: {
        quiet: [
          "Who haven't I been in touch with lately?",
          '最近有哪些联系人没有联系？',
        ],
      },
      tasks: {
        overdue: ["What's overdue?", '有哪些逾期的任务？'],
        week: ["What's on my plate this week?", '我这周有哪些任务？'],
      },
      approvals: {
        waiting: ['Which approvals are waiting on me?', '哪些审批在等我处理？'],
      },
      lead: {
        next: [
          "Is this lead worth pursuing, and what's the next step?",
          '这条线索值得跟进吗？下一步做什么？',
        ],
        summary: ['Summarize this lead', '总结一下这条线索'],
        email: ['Draft a follow-up email', '起草一封跟进邮件'],
      },
      opportunity: {
        missing: [
          "What's missing to move this opportunity forward?",
          '推进这个商机还缺什么？',
        ],
        risk: [
          'What are the risks in this opportunity?',
          '这个商机有哪些风险？',
        ],
        progress: ['Summarize recent progress', '总结最近的进展'],
      },
      company: {
        latest: [
          "What's the latest with this company?",
          '这个公司最近有什么进展？',
        ],
        contacts: ['Who are the key contacts?', '主要联系人是谁？'],
        deals: ['Which opportunities are open?', '有哪些进行中的商机？'],
      },
      contact: {
        exchanges: [
          'Summarize my exchanges with this person',
          '总结我和这位联系人的往来',
        ],
        deals: [
          'Which opportunities is this person involved in?',
          '这位联系人参与了哪些商机？',
        ],
        email: ['Draft a follow-up email', '起草一封跟进邮件'],
      },
      task: {
        prepare: ['Help me prepare for this task', '帮我为这个任务做准备'],
      },
      approval: {
        decide: ['Should this request be approved?', '这个审批该批准吗？'],
      },
    },
  },
  // The global search (client/components/crm/global-search.tsx): the
  // dialog ⌘K opens, its keyword results and its AI answer.
  globalSearch: {
    label: ['Search', '搜索'],
    dialogTitle: ['Search the CRM', '搜索 CRM'],
    placeholder: [
      'Search leads, opportunities, companies, contacts, tasks, approvals…',
      '搜索线索、商机、公司、联系人、任务、审批…',
    ],
    askPlaceholder: [
      'Describe what you are looking for, or ask a question…',
      '用一句话描述要找的记录或问题…',
    ],
    searchTab: ['Search', '搜索'],
    askTab: ['Ask AI', '问 AI'],
    hint: [
      'Type a name, company, email, phone or website; words in any order',
      '输入名称、公司、邮箱、电话或网址，几个词顺序不限',
    ],
    askHint: [
      'For example: new leads Wang Lei owns; opportunities created this month',
      '例如：王磊负责的新线索；本月新建的商机',
    ],
    hintAsk: [
      'Or switch to Ask AI to describe what you are looking for',
      '也可以切换到“问 AI”，用一句话描述要找的记录',
    ],
    searching: ['Searching…', '正在搜索…'],
    noResults: ['No matching records', '没有找到匹配的记录'],
    failed: ['The search failed', '搜索失败'],
    retry: ['Try again', '重试'],
    showAllIn: [
      'All {{count}} in {{list}}',
      '在{{list}}中查看全部 {{count}} 条',
    ],
    askAbout: ['Ask AI: {{text}}', '问 AI：{{text}}'],
    answerTitle: ['AI answer', 'AI 回答'],
    closeAnswer: ['Close the answer', '关闭回答'],
    working: ['Thinking…', '正在思考…'],
    steps: {
      search_records: ['Looking up records…', '正在查找记录…'],
      summarize_records: ['Counting…', '正在统计…'],
      get_record: ['Reading a record…', '正在读取记录…'],
      list_users: ['Looking up colleagues…', '正在查找同事…'],
      frontend: ['Gathering the results…', '正在整理结果…'],
    },
    foundTitle: ['{{title}} · {{count}}', '{{title}} · {{count}} 条'],
    firstOf: ['(the first 200 only)', '（仅显示前 200 条）'],
    showAll: ['All {{count}}', '查看全部 {{count}} 条'],
    followUp: ['Ask a follow-up', '继续追问'],
    followUpDraft: [
      'About my search "{{question}}": ',
      '关于我刚才搜索的“{{question}}”：',
    ],
    needsDecision: [
      'Noco proposed a change for you to confirm in the conversation.',
      'Noco 提出了需要你确认的修改，请在对话中处理。',
    ],
    answerFailed: ['Could not answer this.', '没能回答这个问题。'],
    openConversation: ['Open the conversation', '打开对话'],
    foundChip: ['Found by AI: {{title}}', 'AI 找到的：{{title}}'],
    context: ['Global search', '全局搜索'],
  },
  assistantEmployeeName: ['Noco', 'Noco'],
  // The line under the chat's header naming what a conversation began from.
  assistantStart: ['Started from', '起点'],
  assistantConversations: ['All conversations', '所有对话'],
  assistantHideConversations: ['Hide conversations', '收起对话列表'],
  assistantNewConversation: ['New conversation', '新对话'],
  assistantEmployeeRole: ['Sales assistant', '销售助手'],
  assistantEmployeeBio: [
    'The CRM sales assistant: it reads the records the signed-in user may see, summarizes them and suggests next steps.',
    'CRM 销售助手：按你的权限读取记录，做总结并建议下一步。',
  ],
  assistantEmployeeGreeting: [
    'Ask about CRM records, capture data, get next steps or a summary. I read and write the CRM with your account permissions, and every change waits for your confirmation.',
    '围绕 CRM 的记录进行提问，录入数据、建议下一步、总结报告等。我按你账号权限读写 CRM，每一项修改都需要你确认。',
  ],
  assistantLoading: ['Loading the AI configuration…', '正在加载 AI 配置…'],
  assistantConfigError: [
    'The AI configuration could not be loaded. Check the AI settings and reload the page.',
    '无法加载 AI 配置。请检查 AI 设置后刷新页面。',
  ],
  assistantNoEmployee: [
    'The CRM assistant is not available. An administrator can enable it under AI settings → AI employees.',
    'CRM 助手不可用。管理员可以在「AI 设置 → AI 员工」中启用它。',
  ],
  assistantNoModel: [
    'No AI model is enabled. Enable one under AI settings and reload the page.',
    '没有启用的 AI 模型。请在 AI 设置中启用一个后刷新页面。',
  ],
  loading: ['Loading…', '正在加载…'],
  empty: ['A fresh start', '从这里开始'],
  emptyDescription: [
    'No matching records yet. Add your first record or adjust the filters.',
    '暂无符合条件的记录。创建第一条记录，或调整筛选条件。',
  ],
  create: ['Create', '新建'],
  update: ['Update', '修改'],
  edit: ['Edit', '编辑'],
  remove: ['Remove', '移除'],
  delete: ['Delete', '删除'],
  save: ['Save', '保存'],
  saving: ['Saving…', '正在保存…'],
  cancel: ['Cancel', '取消'],
  confirm: ['Confirm', '确认'],
  yes: ['Yes', '是'],
  no: ['No', '否'],
  choose: ['Select…', '请选择…'],
  selectCountryFirst: ['Select a country first', '请先选择国家 / 地区'],
  // The lead timeline's menu of asks to the AI.
  moreActions: ['More…', '更多…'],
  expand: ['Show details', '展开详情'],
  // Notes in a record's activity feed.
  mail: {
    tab: ['Mail', '邮件'],
    write: ['Write email', '写邮件'],
    send: ['Send email', '发送邮件'],
    to: ['To', '收件人'],
    noSubject: ['(No subject)', '（无主题）'],
    sent: ['Email sent', '邮件已发出'],
    logged: [
      'It shows in the timeline of the records it concerns.',
      '它会出现在相关记录的动态里。',
    ],
    outcomeSent: [
      'Email sent to {{to}}: {{subject}}',
      '已发邮件给 {{to}}：{{subject}}',
    ],
    partial: [
      'The provider rejected these recipients: {{recipients}}.',
      '邮件服务拒收了这些收件人：{{recipients}}。',
    ],
    unknown: [
      'Whether the email was sent could not be confirmed. Check your mailbox before sending again.',
      '无法确认邮件是否已发出，请先到邮箱里确认，再决定是否重发。',
    ],
    failed: [
      'The email could not be sent. Check the delivery result in your mailbox.',
      '邮件没有发出，请到邮箱查看发送结果。',
    ],
    logFailed: [
      'The email was sent, but what was to follow it could not be done. Refresh and try again.',
      '邮件已发出，但后续操作没有完成，请刷新后重试。',
    ],
    noAccount: [
      'Connect your mailbox to see your mail with this record here.',
      '连接你的邮箱后，这里会显示你与这条记录的往来邮件。',
    ],
    connect: ['Connect a mailbox', '连接邮箱'],
    noAddress: [
      'This record has no email address to look for.',
      '这条记录没有可查找的邮箱地址。',
    ],
    empty: [
      'Your mailboxes have no mail with this record yet.',
      '你的邮箱里还没有与这条记录的往来邮件。',
    ],
    loadFailed: ['Mail could not be loaded.', '邮件加载失败。'],
    scope: ['Your mail with {{terms}}', '你与 {{terms}} 的往来邮件'],
    scopeCompany: ['Your mail with {{name}}', '你与{{name}}的往来邮件'],
    scopeContacts: ['{{count}} contacts', '{{count}} 位联系人'],
    scopeDomain: ['everyone at @{{domain}}', '@{{domain}} 的所有人'],
    scopeAnd: [' and ', '和'],
    scopeDeal: [
      "Your mail with the deal's {{count}} contacts",
      '你与本商机 {{count}} 位联系人的往来邮件',
    ],
    scopeDealCompany: [
      "Your mail with the company's {{count}} contacts",
      '你与公司的 {{count}} 位联系人的往来邮件',
    ],
  },
  notes: {
    label: ['Note', '备注'],
    placeholder: ['Leave a note, @ a colleague...', '留言，可 @ 同事...'],
    add: ['Add note', '添加备注'],
    // The note box's button.
    post: ['Post', '发布'],
    shortcut: ['⌘/Ctrl + Enter to add', '⌘/Ctrl + Enter 添加'],
    edited: ['Edited', '已编辑'],
    confirmDelete: ['Delete it?', '确认删除'],
  },
  collapse: ['Hide details', '收起详情'],
  leadGroups: {
    general: ['General', '概况'],
    contact: ['Contact', '联系人'],
    company: ['Company', '公司'],
  },
  // The task page's particulars, grouped as the lead's.
  // A task's time in its whole form.
  taskTime: {
    pickDate: ['Pick a date', '选择日期'],
    timeOfDay: ['Time of day', '时刻'],
    noTime: ['No time', '不定时刻'],
    clear: ['Clear the time', '清除时间'],
  },
  // The task list: what is to do, then what is done or cancelled.
  taskList: {
    open: ['Not done', '未完成'],
    done: ['Closed', '已结束'],
    nothingOpen: ['Nothing left to do', '没有未完成的任务'],
    nothingDone: ['Nothing closed', '没有已结束的任务'],
    complete: ['Mark as completed', '标记为已完成'],
    reopen: ['Open again', '重新打开'],
  },
  // A new task's quick form: a title, a description and chips.
  taskQuick: {
    titlePlaceholder: ['Task title', '任务标题'],
    descriptionPlaceholder: [
      'Add a description or attach files…',
      '添加描述或上传附件…',
    ],
    attach: ['Attach files', '上传附件'],
    record: ['Record', '关联记录'],
    clear: ['Clear', '清除'],
    searchRecords: [
      'Search leads, companies, opportunities…',
      '搜索线索、公司、商机…',
    ],
    searchPeople: ['Search colleagues…', '搜索同事…'],
    searchContacts: ['Search contacts…', '搜索联系人…'],
    add: ['Add', '添加'],
  },
  // The overview's reports beyond its counts (dashboard-reports.tsx).
  reports: {
    revenueSection: ['Revenue and forecast', '业绩与预测'],
    wonByMonth: ['Won in the last six months', '近 6 个月成交金额'],
    dealsCount: ['{{count}} deals', '{{count}} 个商机'],
    forecast: ['Forecast', '成交预测'],
    thisMonth: ['This month', '本月'],
    thisQuarter: ['This quarter', '本季度'],
    won: ['Won', '已成交'],
    commit: ['Commit', '较有把握'],
    commitHint: [
      'Open deals from proposal on, expected to close in the period',
      '提案及以后阶段、预计本期成交的进行中商机',
    ],
    weighted: ['Weighted', '加权预测'],
    weightedHint: ['Amount × stage probability', '金额 × 阶段赢率'],
    bestCase: ['Best case', '全部可能'],
    bestCaseHint: [
      'Every open deal expected to close in the period',
      '预计本期成交的全部进行中商机',
    ],
    forecastHint: [
      "By each open deal's expected close date; won by the date it was won.",
      '按进行中商机的预计成交日期统计；已成交按成交日期。',
    ],
    lossSection: ['Losses and pace', '输单与销售周期'],
    lostReasons: ['Lost in the last 90 days', '近 90 天输单原因'],
    pausedReasons: ['Paused now', '当前暂停原因'],
    noLost: ['No deals lost in the last 90 days.', '近 90 天没有输单。'],
    noPaused: ['No paused deals.', '没有暂停的商机。'],
    unspecified: ['Not given', '未填写'],
    cycle: ['Sales cycle', '销售周期'],
    days: ['{{days}} days', '{{days}} 天'],
    cycleNote: [
      'Average from creation to won, over {{count}} deals won in the last year',
      '近一年 {{count}} 个赢单从创建到成交的平均天数',
    ],
    noCycle: ['No deals won in the last year.', '近一年没有赢单。'],
    stage: ['Stage', '阶段'],
    averageStay: ['Average stay', '平均停留'],
    openNow: ['Open now', '当前数量'],
    waitingLong: ['Waiting too long', '停留过久'],
    waitingDeals: ['Waiting longest', '停留最久的商机'],
    waitingHint: [
      'In their stage over 1.5 times its average stay, and at least 14 days',
      '在当前阶段超过平均停留的 1.5 倍，且至少 14 天',
    ],
    noWaiting: ['No deal is waiting too long.', '没有停留过久的商机。'],
    activity: ['Team activity', '团队活动量'],
    activityHint: [
      'The last four weeks and this week, Monday to Sunday',
      '近四周合计及本周，按周一至周日统计',
    ],
    tasksDone: ['Tasks completed', '完成任务'],
    notesWritten: ['Notes', '备注'],
    mailThreads: ['Mail conversations', '邮件会话'],
    thisWeekCount: ['{{count}} this week', '本周 {{count}}'],
  },
  // The Agents section (pages/crm-agents.tsx, server/providers/crm/agents.ts).
  agents: {
    leads: {
      title: ['Lead follow-up', '线索跟进'],
      description: [
        'Reads a lead with its tasks, notes and mail, looks the company up on the web when it is new or out of date, and recommends following up, nurturing, converting or closing it as invalid, with a grade and the next step.',
        '读取线索及其任务、备注和邮件，公司信息缺失或过期时联网调研，给出继续跟进、放入培育、转化或无效的建议，附等级和下一步。',
      ],
      skill: ['Skill: Follow up a lead', '技能：跟进线索'],
    },
    opportunities: {
      title: ['Opportunity follow-up', '商机跟进'],
      description: [
        'Reads a deal with its company, contacts, tasks, notes, approvals and mail, checks its terms against the approval standards, and recommends advancing, keeping at it, pausing or losing it, with the approvals to submit and the next step.',
        '读取商机及其公司、联系人、任务、备注、审批和邮件，按审批标准核对商务条款，给出推进、继续、暂停或输单的建议，以及需要提交的审批和下一步。',
      ],
      skill: ['Skill: Follow up an opportunity', '技能：跟进商机'],
    },
    approvals: {
      title: ['Approval review', '审批助手'],
      description: [
        'Reviews an approval for its approver: the terms asked for against the standard and their cost, the deal, earlier decisions of the same kind and the risks, with a recommendation and a drafted comment. Only the approver sees it.',
        '为审批人分析审批申请：申请条件与标准的差距和代价、商机情况、以往同类审批的结果和风险，给出建议和审批意见草稿。只有审批人能看到。',
      ],
      skill: ['Skill: Review an approval', '技能：审批辅助'],
    },
    duty: ['What it does', '职责'],
    // Who runs it and who decides, on every agent's page.
    byNoco: [
      'Run by the AI employee Noco. It only suggests: the owner decides in the inbox whether to accept.',
      '由 AI 员工 Noco 执行；它只提出建议，由负责人在收件箱里决定是否采纳。',
    ],
    runsOnItsOwn: ['Runs on its own', '自动运行'],
    // The menu's badge: runs under way.
    runningHint: ['{{count}} running', '{{count}} 个正在运行'],
    enabledTag: ['On', '已启用'],
    off: ['Off', '已停用'],
    triggersTitle: ['When it runs', '触发方式'],
    adminOnly: [
      'Only an administrator may switch these.',
      '只有管理员可以修改开关。',
    ],
    manualNote: [
      'A person can always ask for a follow-up on a record, whatever is switched off.',
      '在记录上点「跟进」随时可以手动发起，不受这些开关影响。',
    ],
    triggers: {
      created: {
        label: ['A lead is created', '新建线索时'],
        hint: [
          'From the form, the AI capture or the assistant; not imports or demo data.',
          '通过表单、AI 整理或 AI 助手新建；导入和演示数据不触发。',
        ],
      },
      opened: {
        label: ['An opportunity is opened', '新开商机时'],
        hint: [
          'Created, or a lead converted into it.',
          '新建商机或线索转化开出商机。',
        ],
      },
      daily: {
        label: ['The daily check', '每日巡检'],
        hint: [
          'Every day at 09:00 in the business time zone ({{zone}}), at most 20 a day.',
          '每天 09:00（业务时区 {{zone}}）巡检，每天最多 20 条。',
        ],
      },
      dailyLeads: {
        hint: [
          'A new lead not contacted in time, a lead gone quiet, a nurtured lead due for review.',
          '新线索超时未联系、跟进中的线索停滞、培育中的线索复查到期。',
        ],
      },
      dailyOpportunities: {
        hint: [
          'A deal gone quiet, an expected close date near or past, a paused deal due to resume.',
          '商机停滞、预计成交日期临近或已过、暂停的商机到期恢复。',
        ],
      },
      taskDone: {
        label: ['A task is completed', '任务完成后'],
        hint: [
          'Its outcome recorded, or the task marked done.',
          '记录了任务结果或把任务标为完成。',
        ],
      },
      customerReplied: {
        label: ['The customer writes', '客户来信时'],
        hint: [
          'A message from one of its people reaches the timeline.',
          '客户方联系人的邮件同步到动态时。',
        ],
      },
      companyChanged: {
        label: ['The company changes', '公司信息变化时'],
        hint: [
          'Someone changes its company or website; the AI looks it up again.',
          '有人修改了公司名称或网站，AI 重新调研。',
        ],
      },
      merged: {
        label: ['Leads are merged', '合并线索后'],
        hint: ['The lead kept is followed up anew.', '对保留的线索重新跟进。'],
      },
      approvalDecided: {
        label: ['Its approvals are decided', '审批有结果后'],
        hint: [
          'Once the approvals submitted together have all been decided.',
          '一起提交的审批全部有了结果后。',
        ],
      },
      submitted: {
        label: ['An approval is submitted', '提交审批时'],
        hint: ['Reviewed for its approver right away.', '立即为审批人分析。'],
      },
    },
    // How a run started, in the runs list.
    started: {
      asked: ['Asked by a person', '手动发起'],
      revised: ['Redone as instructed', '按意见重做'],
    },
    statsTitle: ['How it did', '运行情况'],
    lastWeek: ['Last 7 days', '近 7 天'],
    lastMonth: ['Last 30 days', '近 30 天'],
    runs: ['Runs', '运行次数'],
    acceptance: ['Accepted', '采纳率'],
    acceptanceNote: [
      'Of the suggestions someone decided',
      '在已处理的建议中被采纳的比例',
    ],
    statuses: {
      running: ['Working', '运行中'],
      pending: ['Waiting', '待处理'],
      accepted: ['Accepted', '已采纳'],
      dismissed: ['Dismissed', '已忽略'],
      failed: ['Failed', '失败'],
      retired: ['Settled elsewhere', '已在别处处理'],
    },
    all: ['All', '全部'],
    runsTitle: ['Runs', '运行记录'],
    when: ['When', '时间'],
    record: ['Record', '记录'],
    trigger: ['Started by', '触发'],
    outcome: ['Suggestion', '建议'],
    status: ['Status', '状态'],
    noRuns: ['No runs yet.', '还没有运行记录。'],
    runsScope: [
      'Runs on the records you may read, over the last 90 days',
      '近 90 天、你有权查看的记录上的运行',
    ],
    runsScopeApprovals: [
      'Reviews of the approvals submitted to you, over the last 90 days',
      '近 90 天提交给你的审批的分析',
    ],
  },
  // An email follow-up step, changed and sent on its card (email-step.tsx).
  emailStep: {
    from: ['From', '发件人'],
    to: ['To', '收件人'],
    cc: ['Cc', '抄送'],
    subject: ['Subject', '主题'],
    body: ['Message', '正文'],
    toPlaceholder: [
      'Name <address>, separated by commas',
      '姓名 <邮箱>，多个用逗号分隔',
    ],
    send: ['Send email', '发送邮件'],
    sent: [
      'Email sent; the suggestion is accepted.',
      '邮件已发送，建议已采纳。',
    ],
    openComposer: ['Edit in the mail composer', '在邮件窗口中编辑'],
    noMailbox: [
      'Connect a mailbox to send it from here; for now, copy the draft.',
      '连接邮箱后可直接在这里发送；现在可以先复制草稿。',
    ],
    noIdentity: [
      'This mailbox has no address it may send from.',
      '这个邮箱没有可用于发送的地址。',
    ],
  },
  // A new approval's quick dialog, laid out as a new task's.
  approvalQuick: {
    titlePlaceholder: ['What is the approval for', '审批主题'],
    descriptionPlaceholder: [
      'The condition asked for and why, or attach files…',
      '说明申请的条件和理由，或上传附件…',
    ],
    searchTopics: ['Search types…', '搜索类型…'],
    searchDeals: ['Search opportunities…', '搜索商机…'],
    saveDraft: ['Save draft', '保存草稿'],
    submit: ['Submit', '提交审批'],
    approverFirst: ['Choose an approver to submit', '选择审批人后才能提交'],
  },
  // The opportunity page's particulars, grouped as the lead's.
  // The company, contact and approval pages' particulars, likewise.
  companyGroups: {
    general: ['General', '概况'],
    company: ['Company', '公司'],
  },
  region: ['Region', '地区'],
  loadMore: ['Load more', '加载更多'],
  justNow: ['just now', '刚刚'],
  // The line heading a record's tab, as the Mail tab's does: what the tab
  // lists, by the record's kind.
  tabScope: {
    tasks: ['Tasks linked to this {{entity}}', '关联到此{{entity}}的任务'],
    approvals: ['Approvals for this {{entity}}', '此{{entity}}的审批'],
    contacts: ['Contacts at this {{entity}}', '此{{entity}}的联系人'],
    opportunities: [
      'Opportunities with this {{entity}}',
      '关联到此{{entity}}的商机',
    ],
    leads: ['Leads converted into this {{entity}}', '转化为此{{entity}}的线索'],
    dealContacts: [
      'The people on this opportunity and the others at its company',
      '参与此商机的人，以及其公司的其他联系人',
    ],
  },
  // The heading over a record page's particulars when they are one list.
  detailsGroup: ['Details', '详情'],
  requiredField: ['This field is required', '此字段必填'],
  openWebsite: ['Open website in a new tab', '在新窗口打开网站'],
  noTasks: ['No tasks yet', '暂无任务'],
  noTasksOnDay: ['No tasks on this day', '这一天没有任务'],
  dayTotal: ['Total {{count}}', '共 {{count}} 项'],
  todayButton: ['Today', '今天'],
  noAttachments: ['No attachments yet', '暂无附件'],
  // Beside the button that creates a lead.
  leadFollowUpNow: ['AI follows up at once', 'AI 立刻跟进'],
  // Under a conversion that opens an opportunity.
  dealFollowUpNow: ['AI follows up the opportunity at once', 'AI 立刻跟进商机'],
  historyTab: ['Timeline', '动态'],
  feed: {
    // A field an update emptied, after its name.
    cleared: ['cleared', '已清空'],
    // Who did an AI entry on the timeline.
    ai: ['AI', 'AI'],
    aiProposed: ['AI proposed', 'AI 提议'],
    aiCaptured: ['Organised by AI', 'AI 整理'],
    addedFiles: ['added', '添加了附件'],
    removedFiles: ['removed', '删除了附件'],
    evaluated: ['recommended a follow-up', '给出了跟进建议'],
    // An approval's review for its approver.
    reviewed: ['reviewed the request', '给出了审批建议'],
    reviewing: ['is reviewing the request…', '正在分析这个申请…'],
    reviewFailed: ['could not review the request', '没能给出审批建议'],
    evaluating: ['is preparing a follow-up…', '正在准备跟进建议…'],
    evaluationFailed: ['could not finish a follow-up', '没能给出跟进建议'],
    fieldCount: ['{{count}} fields', '{{count}} 个字段'],
    // One of the record's tasks, after who did it.
    task: {
      planned: ['planned the task', '安排任务'],
      completed: ['completed the task', '完成任务'],
      cancelled: ['cancelled the task', '取消任务'],
      moved: ['moved the task', '改期任务'],
      edited: ['edited the task', '修改任务'],
      deleted: ['deleted the task', '删除任务'],
      to: ['to {{time}}', '改到 {{time}}'],
    },
    // A deal's contact with their role, in a change of the deal's contacts.
    contactRole: ['{{name}} ({{role}})', '{{name}}（{{role}}）'],
    // A mail conversation with the record's people, after the mailbox
    // owner's name.
    mail: {
      exchanged: ['exchanged mail', '往来邮件'],
      noSubject: ['(No subject)', '（无主题）'],
      count: ['{{count}} messages', '{{count}} 封'],
      countOne: ['1 message', '1 封'],
      // Mail from before the record existed, as one entry.
      before: ['Mail from before this record', '记录创建前的往来邮件'],
      conversations: ['{{count}} conversations', '{{count}} 个会话'],
      conversationsOne: ['1 conversation', '1 个会话'],
      lastFrom: ['last from {{name}}', '最后由 {{name}} 回复'],
    },
    // One of a deal's approvals, read after the person's name.
    approval: {
      pending: ['submitted', '提交了'],
      approved: ['approved', '批准了'],
      rejected: ['rejected', '驳回了'],
      withdrawn: ['withdrew', '撤回了'],
      noun: ['approval', '审批'],
    },
    // What a person did, read after their name on the timeline.
    did: {
      created: ['created the record', '创建了记录'],
      updated: ['updated', '更新'],
      deleted: ['deleted the record', '删除了记录'],
      converted: ['converted the lead', '转化了线索'],
      note: ['note:', '备注：'],
      noteEdited: ['edited a note', '编辑了备注'],
      noteDeleted: ['removed a note', '删除了一条备注'],
      aiRevise: ['asked the AI to revise the suggestion', '让 AI 修改建议'],
      merged: ['merged in the lead', '合并了线索'],
    },
    // What a merge moved over, after the lead merged in.
    mergedMoved: [
      '{{tasks}} tasks and {{notes}} notes moved over',
      '移入任务 {{tasks}} 条、备注 {{notes}} 条',
    ],
    empty: ['Nothing here yet.', '还没有记录。'],
  },
  evaluation: {
    title: ['AI follow-up', 'AI 跟进建议'],
    // The lead timeline's status chip, short beside the verdict.
    chip: ['AI suggestion', 'AI 建议'],
    waiting: ['AI follow-up waiting for you', 'AI 跟进建议待处理'],
    onCard: {
      running: ['AI working', 'AI 跟进中'],
      pending: ['AI suggestion', 'AI 建议待处理'],
    },
    again: ['Follow up', '跟进'],
    running: [
      'The AI is reviewing it and preparing a suggestion…',
      'AI 正在查看、准备跟进建议…',
    ],
    // A follow-up waiting for its turn behind others.
    queued: [
      'Waiting its turn behind other follow-ups…',
      '排队中，前面还有其他跟进…',
    ],
    failed: [
      'The follow-up did not finish. Follow up again to retry.',
      '这次跟进没有完成，可以重新跟进。',
    ],
    follow: ['Keep following up', '继续跟进'],
    nurture: ['Nurture', '放入培育'],
    convert: ['Convert', '转化'],
    invalid: ['Invalid', '无效'],
    grade: ['Grade {{grade}}', '{{grade}} 级'],
    edition: ['Edition', '建议版本'],
    reason: ['Why', '理由'],
    reasons: ['Reasons', '依据'],
    findings: ['Found on the web', '联网查到'],
    // A lead's suggested values, from its own material as well as the web.
    fieldSuggestions: ['Suggested field updates', '建议更新的字段'],
    basis: ['from {{basis}}', '出自 {{basis}}'],
    findingsDone: ['written by {{name}}, {{time}}', '{{name}} {{time}} 已写入'],
    source: ['Source', '来源'],
    writePicked: ['Write {{count}} into the lead', '写入所选 {{count}} 项'],
    // A deal's: about its company, written into the company.
    findingsCompany: [
      'Found on the web about the company',
      '联网查到的公司信息',
    ],
    writePickedCompany: [
      'Write {{count}} into the company',
      '写入公司 {{count}} 项',
    ],
    written: ['Written', '已写入'],
    nextStep: ['Next step', '下一步'],
    stepTask: ['Task', '任务'],
    stepEmail: ['Email', '邮件'],
    today: ['today', '今天'],
    inDays: ['in {{count}} days', '{{count}} 天后'],
    questions: ['To ask', '要问的问题'],
    prep: ['To prepare', '准备要点'],
    changes: ['Since last time', '和上次比'],
    opportunity: ['Opportunity', '商机'],
    // What accepting a conversion would create, before the dialog confirms
    // it, and what the duplicate check found.
    conversion: {
      company: ['Company', '公司'],
      contact: ['Contact', '联系人'],
      create: ['New', '新建'],
      link: ['Link to', '关联'],
      duplicates: ['Duplicates', '查重'],
      noDuplicates: [
        'No possible duplicate company, contact or opportunity',
        '没有可能重复的公司、联系人或商机',
      ],
      possible: ['Possible duplicates:', '可能重复：'],
      openDeals: ['Open at this company:', '该公司进行中的商机：'],
      confirm: [
        'Accepting opens the conversion, where these can be checked and changed before anything is saved.',
        '采纳后先打开转化窗口，确认或修改后才保存。',
      ],
    },
    // A value the AI left empty, in its own words of what changed.
    none: ['none', '无'],
    // What started a follow-up the system ran on its own (lead-signals.ts,
    // a task marked done, a company changed).
    trigger: {
      created: ['New lead: the AI followed it up.', '新线索，AI 自动跟进。'],
      opened: [
        'New opportunity: the AI followed it up.',
        '新商机，AI 自动跟进。',
      ],
      uncontacted: [
        'New lead not contacted in 2 days: the AI followed it up.',
        '新线索 2 天还没联系，AI 自动跟进。',
      ],
      silent: [
        'No contact in 14 days: the AI followed it up.',
        '14 天没有联系，AI 自动跟进。',
      ],
      nurtureDue: [
        'Nurture review due: the AI looked the company up again and followed it up.',
        '培育复查到期，AI 重新调研并跟进。',
      ],
      companyChanged: [
        'The company changed: the AI looked it up again and followed it up.',
        '公司信息有变化，AI 重新调研并跟进。',
      ],
      taskDone: [
        'A task was done: the AI followed up again.',
        '任务已完成，AI 继续跟进。',
      ],
      customerReplied: [
        'The customer wrote: the AI followed up again.',
        '客户来信，AI 继续跟进。',
      ],
      approvalDecided: [
        'An approval was decided: the AI followed up again.',
        '审批有了结果，AI 继续跟进。',
      ],
      closeDue: [
        'The expected close date is near or past: the AI followed it up.',
        '预计成交日期快到或已过，AI 自动跟进。',
      ],
      resumeDue: [
        'The pause is due to end: the AI followed it up.',
        '暂停到了预计恢复日期，AI 自动跟进。',
      ],
      approvalsDecided: [
        'Approvals decided ({{approvals}}): the AI followed up again.',
        '审批有了结果（{{approvals}}），AI 继续跟进。',
      ],
      merged: [
        'Leads merged: the AI followed up again.',
        '线索已合并，AI 重新跟进。',
      ],
    },
    // An opportunity's follow-up (opportunity-evaluation.ts): its
    // recommendations, how likely it is to close, and what accepting does.
    deal: {
      // Approvals the AI would request before promising the customer.
      approvals: ['Approvals to request', '建议发起的审批'],
      terms: ['Terms', '条款核对'],
      contacts: ['Contacts and roles', '联系人和角色'],
      newContact: ['New contact', '新建联系人'],
      addContact: ['Add to the opportunity', '加到商机'],
      termStatus: {
        standard: ['Within the standard', '标准内'],
        approved: ['Approved', '已批准'],
        pending: ['Awaiting approval', '审批中'],
        rejected: ['Rejected', '已驳回'],
        needed: ['Needs approval', '需审批'],
      },
      approvalsHint: [
        'submitted to the approver with the accept',
        '采纳时提交给审批人',
      ],
      confirmTitle: ['Submit {{count}} approvals?', '提交 {{count}} 个审批？'],
      confirmHint: [
        'Accepting applies the recommendation and submits these approvals; each approver is notified. Promise the customer none of these terms before they are approved.',
        '采纳会执行这条建议，并提交下面的审批，审批人会收到通知。审批通过前，不要向客户答应这些条件。',
      ],
      confirmSubmit: ['Accept and submit', '采纳并提交审批'],
      advance: ['Advance', '推进'],
      advanceTo: ['Advance to {{stage}}', '推进到{{stage}}'],
      continue: ['Keep at it', '继续推进'],
      pause: ['Pause', '暂停'],
      lose: ['Mark lost', '输单'],
      confidence: {
        high: ['Likely', '把握较大'],
        medium: ['Possible', '把握一般'],
        low: ['Unlikely', '把握不大'],
      },
      toStage: ['Move to {{stage}}', '改为{{stage}}'],
      risks: ['Risks', '风险'],
      resume: ['Resume', '恢复跟进'],
      revisit: ['Revisit', '回访'],
      updates: ['Suggested changes', '建议调整'],
      acceptAdvance: ['Accept and advance', '采纳并推进'],
      acceptPause: ['Accept and pause', '采纳并暂停'],
      acceptLose: ['Accept and mark lost', '采纳并标为输单'],
      // The task accepting plans to come back to the deal, after its name.
      resumeName: ['resume', '恢复跟进'],
      revisitName: ['revisit', '回访'],
    },
    review: ['Review', '复查'],
    acceptFollow: ['Accept and plan the contact', '采纳并安排联系'],
    acceptNurture: ['Accept and nurture', '采纳并放入培育'],
    acceptConvert: ['Accept and convert', '采纳并转化'],
    acceptUpdate: ['Accept and update the task', '采纳并更新任务'],
    acceptOnly: ['Accept', '采纳'],
    acceptEmailed: [
      'Accept: I will send the email myself',
      '采纳（自行发送邮件）',
    ],
    acceptReschedule: ['Accept and move it', '采纳并改期'],
    acceptReport: ['Record the outcome', '记录结果'],
    acceptInvalid: ['Accept and mark invalid', '采纳并标记无效'],
    dismiss: ['Dismiss', '忽略'],
    ask: ['Ask AI', '问 AI'],
    revise: ['Adjust', '调整'],
    adjusting: ['Adjusting…', '正在调整…'],
    revisePlaceholder: ['Tell the AI what to change', '告诉 AI 怎么改'],
    revising: ['The AI is revising the suggestion…', 'AI 正在修改建议…'],
    instructionBy: ['{{name}} asked: {{text}}', '{{name}} 的意见：{{text}}'],
    email: ['Email draft', '邮件草稿'],
    plannedTask: ['Task to create', '将创建的任务'],
    existingTask: ['Planned task to follow up', '跟进的任务（已安排）'],
    afterAccept: ['On accepting', '采纳后'],
    noChange: [
      'The task is ready as it is: accepting changes nothing on it.',
      '任务内容已经准备好，无需改动。',
    ],
    change: {
      added: ['added', '新增'],
      changed: ['updated', '更新'],
      kept: ['unchanged', '不变'],
    },
    overdueTask: ['Overdue task', '逾期的任务'],
    doneOrNot: ['Done or not', '是否已完成'],
    done: ['Done', '已完成'],
    notDone: ['Not done, move it', '未完成，改期'],
    notDoneYet: ['Not done', '未完成'],
    organiseOutcome: ['AI organise', 'AI 整理'],
    organising: ['Organising…', '正在整理…'],
    followUpAfter: [
      'Let the AI follow up again once recorded',
      '记录后让 AI 继续跟进',
    ],
    recordOutcome: ['Record the outcome', '记录结果'],
    recordOutcomeOf: ['Record the outcome: {{name}}', '记录结果：{{name}}'],
    recordOutcomeHint: [
      'Recording it marks the task done.',
      '记录后任务标为已完成。',
    ],
    outcomePlaceholder: [
      'What came of it: what they said, what was agreed',
      '结果如何：对方怎么说、约定了什么',
    ],
    // A nurtured lead's review task, after the company's name.
    reviewName: ['nurture review', '培育复查'],
    copy: ['Copy', '复制'],
    copied: ['Copied', '已复制'],
    statuses: {
      superseded: ['Replaced', '已被新建议替代'],
      running: ['Working', '跟进中'],
      pending: ['Waiting for you', '待处理'],
      accepted: ['Accepted', '已采纳'],
      dismissed: ['Dismissed', '已忽略'],
      failed: ['Not finished', '未完成'],
    },
    decidedBy: [
      '{{status}} by {{name}}, {{time}}',
      '{{name}} {{time}} {{status}}',
    ],
  },
  all: ['All', '全部'],
  mine: ['Mine', '我负责的'],
  participating: ['Participating', '我参与的'],
  // An approval the reader decides.
  approving: ['To decide', '我审批的'],
  // The header's control choosing whose records a list page shows.
  listScope: ['Whose records', '谁的记录'],
  team: ['Team', '团队'],
  search: ['Search records…', '搜索记录…'],
  list: ['List', '列表'],
  board: ['Board', '看板'],
  calendar: ['Calendar', '日历'],
  total: ['Total records', '记录总数'],
  export: ['Export CSV', '导出 CSV'],
  import: ['Import CSV', '导入 CSV'],
  previous: ['Previous', '上一页'],
  next: ['Next', '下一页'],
  page: ['Page {{page}} of {{pages}}', '第 {{page}} / {{pages}} 页'],
  newRecord: ['New {{entity}}', '新建{{entity}}'],
  editRecord: ['Edit {{entity}}', '编辑{{entity}}'],
  deleteRecord: ['Delete {{entity}}', '删除{{entity}}'],
  changeCompanyTitle: ['Change the company?', '更换所属公司？'],
  changeCompanyContacts: [
    "The deal's contacts belong to the current company and will be removed from it: {{names}}.",
    '此商机的联系人属于原公司，更换后将从此商机移除：{{names}}。',
  ],
  deleteRecordTitle: [
    'Delete {{entity}} "{{name}}"?',
    '删除{{entity}}「{{name}}」？',
  ],
  localTimeHint: [
    'Enter times in your laptop timezone: {{zone}}.',
    '请按电脑时区 {{zone}} 输入时间。',
  ],
  pickDateTime: ['Pick date and time', '选择日期时间'],
  hour: ['Hour', '时'],
  minute: ['Minute', '分'],
  dateTimeFormatInvalid: [
    'Enter a date and time as yyyy-mm-dd HH:mm, for example 2026-09-24 14:30.',
    '请按 yyyy-mm-dd HH:mm 输入日期时间，如 2026-09-24 14:30。',
  ],
  noRelatedRecords: [
    'No eligible records. Select the company first, or create a related record.',
    '没有可选记录。请先选择公司，或创建相关记录。',
  ],
  addContact: ['Add contact role', '添加联系人角色'],
  attachment: ['Attachment', '附件'],
  openFullPage: ['Open full page', '整页打开'],
  uploadFile: ['Upload file', '上传文件'],
  uploading: ['Uploading…', '上传中…'],
  dropFilesHere: ['Drop files here, or', '将文件拖到这里，或'],
  chooseFiles: ['choose files', '点击选择文件'],
  removeFileTitle: ['Remove this attachment?', '移除此附件？'],
  removeFileHint: [
    'The file stays in the system and is only unlinked from this record.',
    '文件仍保留在系统中，仅解除与此记录的关联。',
  ],
  removeFileFromRecord: [
    'This removes the attachment from the {{entity}} “{{name}}”.',
    '将从{{entity}}「{{name}}」移除此附件。',
  ],
  attachmentsOwn: ['Uploaded to this {{entity}}', '本{{entity}}的附件'],
  attachmentsFromTasks: ['From linked tasks', '来自关联任务的附件'],
  attachmentsFromOpportunities: [
    'From linked opportunities',
    '来自关联商机的附件',
  ],
  attachmentsFromApprovals: ['From linked approvals', '来自关联审批的附件'],
  deleteCompanyTasks: [
    'This also deletes {{count}} task record(s) linked only to this {{entity}}.',
    '将同时删除 {{count}} 条仅关联此{{entity}}的任务。',
  ],
  deleteCompanyKeptTasks: [
    '{{count}} task record(s) also linked to another record are kept; only the {{entity}} link is cleared.',
    '{{count}} 条同时关联其他记录的任务将保留，只清空{{entity}}关联。',
  ],
  deleteOpportunityBlocked: [
    'Cannot delete: approvals are an audit trail and stay with the opportunity. Mark it as lost instead.',
    '无法删除：审批是审计记录，须随商机保留。请改为将商机标为输单。',
  ],
  deleteApprovalHint: [
    'This request and its attachments and history are deleted; nothing else changes. This cannot be undone.',
    '这条申请及其附件、变更记录将被删除，所属商机不受影响。此操作无法撤销。',
  ],
  deleteDecidedApprovalHint: [
    'This request has been submitted or decided. Deleting it removes the decision and its history for the applicant and the approver too; the opportunity is untouched. This cannot be undone.',
    '这条申请已提交或已有审批结果。删除后申请人和审批人都不再看到它及其审批记录，所属商机不受影响。此操作无法撤销。',
  ],
  deleteTaskHint: [
    'This task and its attachments and history are deleted; the lead, company or opportunity it was linked to is untouched. This cannot be undone.',
    '这条任务及其附件、变更记录将被删除，关联的线索、公司或商机不受影响。此操作无法撤销。',
  ],
  deleteContactHint: [
    'This permanently deletes the contact and cannot be undone.',
    '将永久删除此联系人，操作不可撤销。',
  ],
  deleteContactUnlinks: [
    'The contact is also removed from {{count}} linked {{entity}}; those records are kept.',
    '同时从 {{count}} 条关联的{{entity}}中移除此联系人，那些记录保留。',
  ],
  deleteLeadHint: [
    'This permanently deletes the lead and cannot be undone.',
    '将永久删除此线索，操作不可撤销。',
  ],
  deleteLeadTasks: [
    'This also deletes {{count}} task record(s) that belong only to this lead.',
    '将同时删除 {{count}} 条仅属于此线索的任务记录。',
  ],
  deleteLeadKeptTasks: [
    '{{count}} task record(s) are kept and unlinked from this lead, because they are also linked to a company or opportunity.',
    '另有 {{count}} 条任务因同时关联公司或商机而保留，仅解除与此线索的关联。',
  ],
  timeline: ['History', '变更记录'],
  related: ['Related records', '关联记录'],
  andMore: ['and {{count}} more', '等 {{count}} 个，查看'],
  deleteBlocked: [
    'Cannot delete: these records point at it and would be left without a parent. Remove or move them first.',
    '无法删除：以下记录关联着它，删除后会成为孤儿记录。请先删除或转移它们。',
  ],
  deleteHint: [
    'This deletes the record. Related records must be removed or unlinked first.',
    '记录将被删除。存在关联记录时，请先解除关联或删除相关记录。',
  ],
  convert: ['Convert lead', '转化线索'],
  // The lead page's button, beside the heading that names the lead.
  convertShort: ['Convert', '转化'],
  convertedHint: [
    'This lead has been converted and is read-only. Continue from the records it was converted into.',
    '此线索已转化，为只读状态，请在转化的记录中继续跟进。',
  ],
  conversionHint: [
    'Create or link a company and contact. Existing values are preserved unless you select fields to overwrite. All changes are saved together.',
    '创建或关联公司与联系人。已有值默认保留，勾选的字段将被覆盖。所有变更将在同一事务中保存。',
  ],
  possibleDuplicates: ['Possible matches', '可能重复的记录'],
  // Leads that repeat a lead, and their merge (lead-merge.tsx).
  merge: {
    notice: ['Possible duplicate leads', '可能重复的线索'],
    matched: {
      email: ['same email', '邮箱相同'],
      phone: ['same phone', '电话相同'],
      person: ['same person and company', '同一公司同一人'],
    },
    action: ['Merge', '合并'],
    title: ['Merge duplicate leads', '合并重复线索'],
    hint: [
      'Keep one lead and pick the value to keep for each field. The other lead’s tasks, notes and attachments move to the lead kept, and the other lead is deleted; what it held is recorded on the kept lead’s timeline.',
      '保留一条线索，逐项选择要保留的值。另一条线索的任务、备注和附件会移到保留的线索，然后删除它；它原来的信息记在保留线索的动态里。',
    ],
    // From the capture review: what the AI organised, into a lead held.
    hintUnsaved: [
      'What the AI organised goes into the lead the CRM already holds: pick the value to keep for each field. No new lead is created; what was organised is recorded on that lead’s timeline.',
      '把 AI 整理的内容并入已有线索，逐项选择要保留的值。不会新建线索；整理的内容记在这条线索的动态里。',
    ],
    keep: ['Keep', '保留'],
    thisLead: ['this page', '本页'],
    // A lead not yet saved, organised by the AI in the capture review.
    newLabel: ['new', '新整理'],
    unsaved: ['Not saved yet, organised by the AI', '尚未保存，由 AI 整理'],
    history: [
      'Created {{date}} · {{tasks}} tasks · {{notes}} notes',
      '创建于 {{date}} · 任务 {{tasks}} · 备注 {{notes}}',
    ],
    both: ['Keep both', '两段都保留'],
    rest: [
      'The other {{count}} fields are the same. Attachments of both are kept.',
      '其余 {{count}} 项相同；两边的附件都会保留。',
    ],
    thinking: ['The AI is comparing the two leads…', 'AI 正在比较两条线索…'],
    comparing: ['Comparing the two leads…', '正在比较两条线索…'],
    followUp: ['AI follows up the merged lead', '合并后 AI 重新跟进'],
    confirm: ['Merge', '合并'],
  },
  // The AI's review of an approval request for its approver
  // (approval-review.tsx).
  approvalReview: {
    title: ['AI review', 'AI 审批建议'],
    running: ['The AI is reviewing the request…', 'AI 正在分析这个申请…'],
    failed: ['The AI could not review it', '没能给出审批建议'],
    superseded: ['decided on the approval itself', '已在审批上直接处理'],
    // Voided because the approval left the queue without the card.
    retired: {
      withdrawn: [
        '{{name}} withdrew the request {{time}}; this review no longer applies',
        '{{name}} {{time}} 撤回了审批，这条建议已作废',
      ],
      approved: [
        '{{name}} approved it on the request {{time}}; this review no longer applies',
        '{{name}} {{time}} 在审批上直接批准，这条建议已作废',
      ],
      rejected: [
        '{{name}} rejected it on the request {{time}}; this review no longer applies',
        '{{name}} {{time}} 在审批上直接驳回，这条建议已作废',
      ],
    },
    // What the approver did from the card, in the card's heading.
    statuses: {
      approve: ['Approved', '已批准'],
      reject: ['Rejected', '已驳回'],
    },
    recommendations: {
      approve: ['Approve', '建议批准'],
      conditional: ['Approve on conditions', '建议有条件批准'],
      reject: ['Reject', '建议驳回'],
      needMore: ['Ask for more', '建议补充信息'],
    },
    summary: ['Why', '理由'],
    asked: ['Asked vs standard', '申请与标准'],
    conditions: ['Conditions', '批准条件'],
    reasons: ['Grounds', '依据'],
    together: ['Taken together', '合在一起看'],
    precedents: ['Earlier requests', '以往同类'],
    risks: ['Risks', '风险'],
    missing: ['To add', '需补充'],
    comment: ['Decision comment', '审批意见'],
    revisePlaceholder: ['Tell the AI what to change', '告诉 AI 怎么改'],
    // On an approval's row in the list, for its approver.
    onRow: {
      running: ['AI reviewing', 'AI 生成建议中'],
      pending: ['AI suggestion', 'AI 建议待处理'],
    },
    // The card's accept: what the review recommends, with its comment.
    accept: {
      approve: ['Approve as advised', '按建议批准'],
      reject: ['Reject as advised', '按建议驳回'],
    },
    // Asking for a review, the first or another, as "Follow up" is for a
    // lead or a deal.
    ask: ['Review with AI', '辅助审批'],
    applicant: ['Applicant', '申请人'],
  },
  // The conversion dialog's duplicate check, when it found nothing.
  noDuplicateCompanies: [
    'Checked: no possible duplicate company',
    '已查重：没有可能重复的公司',
  ],
  noDuplicateContacts: [
    'Checked: no possible duplicate contact',
    '已查重：没有可能重复的联系人',
  ],
  openOpportunities: [
    'This company already has open opportunities:',
    '该公司已有进行中的商机：',
  ],
  // An empty field the conversion needs, in its row.
  requiredEmpty: ['Required', '必填'],
  createOpportunity: ['Also create an opportunity', '同时创建商机'],
  overwriteFields: ['Overwrite these existing values', '覆盖以下已有值'],
  submit: ['Submit for approval', '提交审批'],
  saveAndSubmit: ['Save and submit', '保存并提交'],
  withdraw: ['Withdraw request', '撤回审批'],
  approve: ['Approve', '通过'],
  reject: ['Reject', '拒绝'],
  decisionTitle: {
    submit: ['Submit "{{name}}" for approval?', '提交审批「{{name}}」？'],
    withdraw: ['Withdraw "{{name}}"?', '撤回审批「{{name}}」？'],
    approve: ['Approve "{{name}}"?', '通过「{{name}}」？'],
    reject: ['Reject "{{name}}"?', '拒绝「{{name}}」？'],
  },
  decisionHint: {
    submit: [
      'It goes to {{approver}} for a decision. Once submitted it cannot be edited — only withdrawn.',
      '提交给 {{approver}} 审批。提交后不能再修改，只能撤回。',
    ],
    withdraw: [
      'The approver will no longer act on it. It returns to "withdrawn", where you can edit it and submit again.',
      '审批人将不再处理。申请回到「已撤回」，可修改后重新提交。',
    ],
    approve: [
      'A comment is optional. The decision is final; the applicant is notified.',
      '审批意见选填。通过后不可更改，申请人会收到通知。',
    ],
    reject: [
      'Say why, so the applicant knows what to change. The decision is final; a new request is needed to try again.',
      '请写明拒绝原因，方便申请人调整。拒绝后不可更改，需要重新发起申请。',
    ],
  },
  comment: ['Comment', '审批意见'],
  active: ['Active', '有效'],
  completed: ['Completed', '已完成'],
  overdue: ['Overdue', '已逾期'],
  open: ['Open', '进行中'],
  weighted: ['Weighted pipeline', '加权进行中商机金额'],
  pipeline: ['Open pipeline', '进行中商机金额'],
  won: ['Won revenue', '赢单金额'],
  winRate: ['Win rate', '赢单率'],
  today: ["Today's tasks", '今日任务'],
  todaysWork: ["Today's work", '今日工作'],
  monthBusiness: ['This month', '本月生意'],
  overall: ['Sales performance', '销售表现'],
  leadConversionRate: ['Lead conversion rate', '线索转化率'],
  teamSection: ['Team', '团队'],
  scopeMine: ['Mine', '我负责的'],
  scopeTeam: ['Team', '团队'],
  newLeads: ['New leads this month', '本月新增线索'],
  convertedLeads: ['Converted this month', '本月转化'],
  staleLeads: ['Stalled leads', '停滞线索'],
  staleCompanies: ['Quiet companies', '公司久未联系'],
  amount: ['Amount', '金额'],
  count: ['Count', '数量'],
  overdueApprovalHint: ['Nothing waiting for you', '没有待你审批的申请'],
  noOverdue: ['Nothing overdue', '没有逾期的任务'],
  noToday: ['Nothing scheduled today', '今天没有安排'],
  pendingApprovals: ['Waiting for your approval', '待你审批'],
  pendingApprovalsTeam: ['Pending approvals', '待审批'],
  risks: ['Needs attention', '需要关注'],
  funnel: ['Opportunity funnel', '商机漏斗'],
  trends: ['Win / loss trend', '输赢趋势'],
  sources: ['Source performance', '来源表现'],
  sellers: ['Team performance', '团队业绩'],
  noRate: ['No closed opportunities', '暂无已关闭商机'],
  askHint: [
    'Ask about customers, prepare a follow-up, or review your pipeline…',
    '分析客户、准备跟进计划，或复盘商机…',
  ],
  send: ['Send', '发送'],
  assistantExpand: ['Expand the assistant', '放大 AI 助手'],
  assistantCollapse: ['Back to the side panel', '收回到侧边栏'],
  assistantClose: ['Close the assistant', '关闭 AI 助手'],
  assumptions: ['Assumptions to verify', '待核实的推测'],
  toolCard: {
    awaiting: ['Waiting for you', '待你确认'],
    done: ['Done', '已执行'],
    confirmed: ['Confirmed', '已确认'],
    failed: ['Not applied', '未执行'],
    confirmHint: ['Nothing is written until you confirm.', '确认后才会写入'],
    // Declining a proposal, worded as on the evaluation card.
    dismiss: ['Dismiss', '忽略'],
    blocked: [
      'You cannot make this change. Dismiss it and tell the assistant what to do instead.',
      '你没有权限执行这项修改。请忽略，并告诉助手换个做法。',
    ],
    delete: [
      'Confirming deletes this record right away. This cannot be undone; records that pointed at it lose the link.',
      '确认后将立即删除这条记录，无法撤销；关联它的记录会解除关联。',
    ],
  },
  // The CRM's permission model as the Permission Sets page shows it.
  authz: {
    group: ['CRM', 'CRM'],
    capabilities: ['CRM capabilities', 'CRM 能力'],
    sales: ['Sales capabilities', '销售能力'],
    // The two sales permission sets (an existing set keeps its stored
    // title; provisioning never rewrites one).
    roles: {
      salesManager: ['Sales manager', '销售经理'],
      salesRepresentative: ['Salesperson', '销售人员'],
    },
    actions: {
      view: ['View', '查看'],
      create: ['Create', '新建'],
      edit: ['Edit', '编辑'],
      delete: ['Delete', '删除'],
      assign: ['Assign records to others', '分配记录给他人'],
      approve: ['Decide approvals', '审批'],
      export: ['Export records', '导出记录'],
      manage: ['Manage', '管理'],
    },
    pages: {
      home: ['Overview', '工作台'],
      record: ['Record pages', '记录详情页'],
      decisions: ['AI suggestions in the inbox', '收件箱的 AI 建议'],
      agents: ['Agents', 'Agents'],
      reports: ['Reports', '报表'],
    },
  },
  aiLanguages: {
    'zh-CN': ['Chinese', '中文'],
    'en-US': ['English', 'English'],
  },
  // The AI's suggestions in the inbox's To do view.
  inbox: {
    suggestions: ['AI suggestions', 'AI 建议'],
    showHandled: ['Show handled suggestions', '查看已处理的建议'],
    hideHandled: ['Hide', '收起'],
    noHandled: ['No handled suggestions yet.', '还没有已处理的建议。'],
  },
  decisions: {
    empty: ['Nothing is waiting on you.', '没有等你处理的事。'],
    openRecord: ['Open', '打开'],
    evaluatedAt: ['Suggested', '建议时间'],
    handled: ['Handled', '已处理'],
  },
  settings: ['System settings', '系统设置'],
  leadCapture: {
    aiTab: ['Organise with AI', 'AI 整理'],
    formTab: ['Fill in a form', '表单录入'],
    placeholder: [
      'Paste anything: an email, a chat, notes from a fair or a call. The AI turns each person into a lead, and you check it before it is saved.',
      '粘贴任何内容：邮件、聊天记录、展会或电话记录。AI 会把每个人整理成一条线索，你核对后再保存。',
    ],
    input: ['Text to organise', '要整理的内容'],
    organise: ['Organise', '整理'],
    organising: ['The AI is organising…', 'AI 正在整理…'],
    check: ['Check', '请核对'],
    filledNotice: [
      'The AI filled this from your text. Fields marked Check are its guesses; empty fields were not in the text.',
      'AI 根据原文填写。标记"请核对"的是推测，空的是原文里没有的。',
    ],
    fillRequired: ['Still required: {{fields}}', '需补充必填项：{{fields}}'],
    duplicates: ['Possibly already in the CRM:', 'CRM 里可能已有：'],
    // Merge the lead, not yet saved, into the one the CRM holds instead of
    // creating it.
    mergeInto: ['Merge into it…', '合并到这条…'],
    merged: ['Merged', '已合并'],
    found: [
      'The AI found {{count}} leads. Check them, then create the ones you want.',
      'AI 整理出 {{count}} 条线索，核对后创建需要的。',
    ],
    forAll: ['Set for all', '统一设置'],
    unassigned: ['No owner', '未指派'],
    missing: ['{{count}} required missing', '缺 {{count}} 项必填'],
    checkCount: ['{{count}} to check', '核对 {{count}} 处'],
    duplicate: ['Possible duplicate', '可能重复'],
    aiChanged: ['AI changed', 'AI 刚改'],
    createOne: ['Create lead', '创建线索'],
    createCount: ['Create {{count}}', '创建 {{count}} 条'],
    pendingCount: ['{{count}} incomplete', '{{count}} 条待补'],
    created: ['Created', '已创建'],
    createFailed: ['Not created', '创建失败'],
    openRecord: ['Open the lead', '打开线索'],
    adjust: ['Adjust', '调整'],
    adjusting: ['Adjusting…', '正在调整…'],
    adjustPlaceholder: ['Tell the AI what to change', '告诉 AI 怎么改'],
    original: ['Your text', '原文'],
    adjustTitle: ['Adjust with the AI', '让 AI 调整'],
    noneLeft: [
      'No leads are left. Organise the text again, or cancel.',
      '没有剩下的线索了。可以重新整理原文，或者取消。',
    ],
    reorganise: ['Organise again', '重新整理'],
    reorganiseHint: [
      'Replaces the leads not yet created.',
      '会替换还没创建的线索',
    ],
  },
  // New opportunity with the AI (opportunity-capture.tsx).
  dealCapture: {
    placeholder: [
      'Paste anything: a customer email about buying more, a renewal, a tender notice, call notes. The AI fills in the opportunity, matches the company and its contacts, and you check it before saving.',
      '粘贴任何内容：客户要增购的邮件、续约、招标公告、沟通记录。AI 会整理成一个商机，匹配公司和联系人，你核对后再保存。',
    ],
    noCompany: [
      'The company “{{company}}” in the text is not in the CRM: pick a company, or create it first.',
      '原文里的公司「{{company}}」在 CRM 里没有找到：请选择公司，没有的话先新建公司。',
    ],
    severalCompanies: [
      'Several companies may be “{{company}}”: pick the right one.',
      '有几个公司可能是「{{company}}」：请选择正确的那个。',
    ],
    duplicates: [
      'This company already has open opportunities:',
      '这个公司已有进行中的商机：',
    ],
    newContact: ['New', '新建'],
    newContactHint: [
      'Created as the company’s contact with the opportunity; remove the row to leave them out.',
      '创建商机时新建为这个公司的联系人；不需要就删掉这一行。',
    ],
    newContactNeedsCompany: [
      'Pick the company first: new people become its contacts.',
      '先选择公司：新联系人会建在这个公司下。',
    ],
    reorganiseHint: [
      'The text changed: organise it again to replace the opportunity.',
      '原文改过了，重新整理会替换上面的商机。',
    ],
    create: ['Create opportunity', '创建商机'],
  },
  settingsDescription: [
    'Business defaults, reminders, and the demo dataset.',
    '配置业务选项、提醒和演示数据',
  ],
  business: ['Business defaults', '业务配置'],
  reminders: ['Reminders', '提醒设置'],
  settingsSaved: ['Settings saved', '设置已保存'],
  searchRecords: ['Type to search', '输入关键字搜索'],
  noMatches: ['No matching records', '没有匹配的记录'],
  clearChoice: ['Clear', '清除选择'],
  demoData: ['Demo data', '演示数据'],
  demoDescription: [
    'A dataset of NocoBase selling its own licences and services to fictional customers, in Chinese or in English: leads, companies, contacts, opportunities, tasks and approvals, and mail in demo mailboxes, dated relative to the day it is imported. Importing creates the demo companies below when they do not exist; the password is the username followed by 123.',
    '一套以 NocoBase 自己的销售（商业授权与服务，客户均为虚构）为背景的演示数据，有中文和英文两种，包含线索、公司、联系人、商机、任务和审批，以及演示邮箱里的往来邮件，日期以导入当天为基准。导入时会自动创建下列演示账号（已存在的直接使用），密码为用户名加 123。',
  ],
  demoLanguage: ['Demo data language', '演示数据语言'],
  demoAbsent: ['No demo data has been imported.', '尚未导入演示数据。'],
  demoPresent: [
    'Demo data imported on {{date}}: {{count}} records.',
    '演示数据已于 {{date}} 导入，共 {{count}} 条记录。',
  ],
  demoAccounts: ['Demo accounts', '演示账号'],
  demoImport: ['Import demo data', '导入演示数据'],
  demoImportTitle: ['Import the demo data?', '导入演示数据？'],
  demoImportHint: [
    'The records are added to the current database and belong to the demo accounts and to you: you become a sales manager as well, keeping your administrator role, and own a share of them. Nothing existing is changed, and the import can be removed again from here. The demo accounts and you each get a demo mailbox holding mail with the demo customers; it sends only to the demo’s people, and nothing is ever delivered.',
    '演示记录将加入当前数据库，负责人为演示账号和你：你会同时成为销售经理（管理员身份不变），负责其中一部分记录；现有数据不会被修改，之后可以在此清除。演示账号和你会各获得一个演示邮箱，里面是与演示客户的往来邮件；演示邮箱只能发给演示数据里的人，邮件不会真正寄出。',
  ],
  demoImported: ['Demo data imported', '演示数据已导入'],
  demoReset: ['Remove demo data', '清除演示数据'],
  demoResetTitle: ['Remove the demo data?', '清除演示数据？'],
  demoResetHint: [
    'Every record the import created is deleted, including changes made to them since, and the demo accounts it created are disabled: they no longer sign in or appear as owners, and importing again enables them. The sales manager role the import gave you is removed. The demo mailboxes and their mail are removed too. Records created by hand stay.',
    '导入创建的全部记录（含之后对它们的修改）都会被删除，导入时新建的演示账号会被停用：不能再登录，也不会出现在负责人等选项里，再次导入时会重新启用；导入时给你加上的销售经理角色会被移除；演示邮箱及其中的邮件也会一并删除。手工创建的记录保留。',
  ],
  demoRemoved: ['Demo data removed', '演示数据已清除'],
  demoBanner: [
    'No demo data yet. Import a sample dataset to try leads, opportunities and the AI’s follow-ups with realistic records.',
    '还没有演示数据。导入一套演示数据，用接近真实的记录体验线索、商机和 AI 跟进。',
  ],
  demoBannerAction: ['Import demo data', '导入演示数据'],
  demoBannerDismiss: ['Dismiss', '不再显示'],
  enabled: ['Enabled', '启用'],
  disabled: ['Disabled', '停用'],
  role: ['Sales role', '销售角色'],
  importHint: [
    'Use field keys as column headers. Download a template below. Related records use their IDs; array fields use JSON. Up to 500 rows, saved together or rolled back together.',
    '使用字段键作为表头，可下载模板。关联字段填写记录 ID，数组字段使用 JSON。最多 500 行，全部成功才保存，否则整体回滚。',
  ],
  template: ['Download template', '下载模板'],
  importPreview: ['{{count}} rows ready to import', '{{count}} 行记录待导入'],
  download: ['Download', '下载'],
  preview: ['Preview', '预览'],
  close: ['Close', '关闭'],
  month: ['Month', '月份'],
  previousMonth: ['Previous month', '上个月'],
  nextMonth: ['Next month', '下个月'],
  thisMonth: ['This month', '本月'],
  changed: ['Changed fields', '变更字段'],
  owner: ['Owner', '负责人'],
  newTask: ['New task', '新建任务'],
  completeTask: ['Complete', '完成'],
  completeTaskOf: ['Complete: {{name}}', '完成：{{name}}'],
  newApproval: ['Request approval', '申请审批'],
  linkExisting: ['Link existing', '关联已有'],
  opportunitySuffix: [' opportunity', '商机'],
  conversionImpact: [
    'On conversion the lead becomes read-only, {{tasks}} linked tasks move to the company, and the contact and opportunity are attached to it.',
    '转化后线索永久只读；{{tasks}} 条关联任务将挂到公司下；联系人和商机归属该公司。',
  ],
  noRecords: ['None yet', '暂无'],
  showing: ['Showing', '当前显示'],
  metricNotes: {
    uncontacted: ['No follow-up yet', '没有任何跟进'],
    conversionRate: [
      'All time: converted ÷ all leads except invalid',
      '全部时间：已转化 ÷ 无效外的全部线索',
    ],
    customers: [
      'Status is customer; {{share}} of all companies',
      '状态为成交客户，占全部 {{share}}',
    ],
    contactsNewThisMonth: ['Contacts created this month', '本月创建的联系人'],
    churnedThisMonth: [
      'Moved to churned this month; {{added}} new this month',
      '本月转为流失；本月新增 {{added}}',
    ],
    noContacts: ['Companies with no contacts yet', '公司下还没有联系人'],
    noOpenOpportunity: [
      'Qualified or customer, no open opportunity',
      '有意向或已成交，但没有进行中的商机',
    ],
    staleLeads: [
      'No contact for {{days}}+ days, nothing planned',
      '{{days}} 天没联系，也没安排下一步',
    ],
    staleCompanies: ['No contact for {{days}}+ days', '{{days}} 天没联系'],
    staleOpportunities: [
      'No contact for {{days}}+ days, nothing planned',
      '{{days}} 天没联系，也没安排下一步',
    ],
    newLeads: ['Leads created this month', '本月创建的线索'],
    convertedLeads: ['Leads converted this month', '本月转化的线索'],
    pipeline: ['All open opportunities added up', '所有进行中商机的金额合计'],
    missingContact: ['Contacts with no phone or email', '联系人没有电话和邮箱'],
    inactiveContacts: ['Marked as left the company', '标记为已离职'],
    open: ['Open opportunities', '进行中的商机'],
    weighted: [
      'Amount × stage probability, open opportunities',
      '金额 × 阶段概率，进行中的商机',
    ],
    closingSoon: [
      'Expected to close within {{days}} days',
      '{{days}} 天内预计成交',
    ],
    overdueOpportunities: ['Expected close date passed', '预计成交日已过'],
    wonThisMonth: ['Amount closed as won this month', '本月赢单的金额'],
    winRate: [
      'All time: won ÷ (won + lost)',
      '全部时间：赢单 ÷（赢单 + 输单）',
    ],
    todayTasks: ['Tasks for today', '今天的任务'],
    myDecisions: [
      'Pending, with me as approver; {{waiting}} waiting over 3 days',
      '审批中且审批人是我；其中 {{waiting}} 条已等待超过 3 天',
    ],
    awaitingApproval: [
      'Raised by me, pending a decision',
      '我发起、正在审批中的申请',
    ],
    toSubmit: ['Drafts and withdrawn approvals', '草稿和撤回的审批'],
    approvedThisMonth: ['Decided as approved this month', '本月通过的审批'],
    rejectedThisMonth: [
      'Decided as rejected this month; approval rate {{rate}}',
      '本月拒绝的审批；本月通过率 {{rate}}',
    ],
    overdueTasks: ['Open, and its time has passed', '未完成，且时间已过'],
    upcoming: ['Open, coming up', '未完成，时间在后'],
    completedThisMonth: ['Tasks completed this month', '本月完成的任务'],
  },
  allOf: ['All: {{what}}', '{{what}}：全部'],
  leadTitle: ['Name / Company', '姓名 / 公司'],
  leftCompany: ['Left the company', '已离职'],
  onThisOpportunity: ['On this opportunity', '参与此商机'],
  otherCompanyContacts: ['Other contacts at the company', '公司的其他联系人'],
  addToOpportunity: ['Add', '加入'],
  yourDecision: ['Waiting for you', '待你审批'],
  youApprove: ['You are the approver', '你是审批人'],
  joinOpportunityTitle: [
    'Add {{name}} to this opportunity',
    '将 {{name}} 加入本商机',
  ],
  joinOpportunityHint: [
    'Choose the role this person plays in the deal.',
    '选择此人在商机中的角色。',
  ],
  removeContactTitle: [
    'Remove {{name}} from this opportunity?',
    '从本商机移除 {{name}}？',
  ],
  removeContactHint: [
    'The contact itself is kept; only its role on this opportunity is removed.',
    '联系人本身保留，只移除其在本商机中的角色。',
  ],
  convertedFrom: ['Converted from lead', '转化自线索'],
  companyPrimary: ["The company's primary contact", '公司的主要联系人'],
  setPrimary: ['Set as primary contact', '设为主要联系人'],
  unsetPrimary: ['Primary contact (click to clear)', '主要联系人（点击取消）'],
  setPrimaryTitle: ['Set primary contact', '设为主要联系人'],
  unsetPrimaryTitle: ['Clear primary contact', '取消主要联系人'],
  setPrimaryDetail: [
    '{{name}} becomes the primary contact of this company.',
    '{{name}} 将成为本公司的主要联系人。',
  ],
  replacePrimaryDetail: [
    '{{name}} becomes the primary contact; {{previous}} no longer is.',
    '{{name}} 将成为主要联系人，{{previous}} 不再是主要联系人。',
  ],
  unsetPrimaryDetail: [
    '{{name}} will no longer be the primary contact; this company will have none.',
    '{{name}} 将不再是主要联系人，本公司将没有主要联系人。',
  ],
  moveTo: ['Move to {{stage}}', '移到「{{stage}}」'],
  moveToDetail: ['{{name}}: a reason is required.', '{{name}}：必须填写原因。'],
  noContacts: ['No contacts', '公司无联系人'],
  noOpenOpportunity: ['No open opportunity', '无进行中商机'],
  staleOpportunities: ['Stalled opportunities', '商机停滞'],
  closingSoon: ['Closing soon', '商机即将到期'],
  overdueOpportunities: ['Past close date', '商机已逾期'],
  wonThisMonth: ['Won this month', '本月赢单'],
  upcoming: ['Upcoming', '待进行'],
  completedThisMonth: ['Completed this month', '本月完成'],
  updatedSuffix: ['updated', '更新'],
  more: ['View all', '查看全部'],
  showMore: ['Show more', '展开'],
  moreFields: ['More: {{fields}}', '更多：{{fields}}'],
  fewerFields: ['Fewer fields', '收起'],
  showLess: ['Show less', '收起'],
  prompts: {
    analyzeSales: [
      'Analyze the sales situation and build it as a report, with charts: the funnel by stage, this month against the pipeline, where deals are stuck, and the three most useful next actions. Look the records up rather than guessing.',
      '分析销售情况，生成一份带图表的报告：各阶段商机分布、本月进展与在手商机、卡在哪里、最有价值的三项下一步行动。需要的记录先查再说，不要猜。',
    ],
    companies: [
      'Summarize this company and suggest opportunities to deepen the relationship.',
      '总结此公司，并建议深化客户关系的机会。',
    ],
    contacts: [
      'Prepare a conversation brief for this contact using their company and opportunity history.',
      '根据此联系人的公司和商机记录，准备一份沟通简报。',
    ],
    opportunities: [
      'Review this opportunity, its contacts, tasks and approvals. Suggest the next actions to move it forward.',
      '分析此商机及联系人、任务和审批记录，建议下一步推进动作。',
    ],
    tasks: [
      'Summarize this task and suggest a concrete next step.',
      '总结这个任务，并建议具体的下一步。',
    ],
    approvals: [
      'Review this approval request. Summarize the risks and missing information without making the decision.',
      '审阅此审批申请，总结风险与缺失信息，不替审批人做决定。',
    ],
  },
  // Singular, for "New lead" / "Delete contact"; Chinese has no plural.
  entity: {
    leads: ['lead', '线索'],
    companies: ['company', '公司'],
    contacts: ['contact', '联系人'],
    opportunities: ['opportunity', '商机'],
    tasks: ['task', '任务'],
    approvals: ['approval', '审批'],
  },
  navigation: {
    reports: ['Reports', '报表'],
    inbox: ['Inbox', '收件箱'],
    agents: ['Agents', 'Agents'],
    action: ['Action', '行动'],
    records: ['Records', '记录'],
    // Where the user's connected services sit: mail now, other channels
    // (WhatsApp, LinkedIn) later.
    integrations: ['Integrations', '集成'],
    mailbox: ['Mailbox', '邮箱'],
  },
  entities: {
    leads: ['Leads', '线索'],
    companies: ['Companies', '公司'],
    contacts: ['Contacts', '联系人'],
    opportunities: ['Opportunities', '商机'],
    tasks: ['Tasks', '任务'],
    approvals: ['Approvals', '审批'],
  },

  fields: {
    id: ['Record ID', '记录 ID'],
    name: ['Name', '名称'],
    leadName: ['Name', '姓名'],
    companyDescription: ['Introduction', '公司介绍'],
    taskName: ['Title', '标题'],
    approvalSubject: ['Subject', '审批主题'],
    contactName: ['Name', '姓名'],
    company: ['Company', '公司'],
    // Under the lead card's Company heading, where "Company" would repeat
    // it; "Company name" would not fit the label column in English.
    companyName: ['Name', '公司名'],
    companyIntro: ['Introduction', '介绍'],
    phone: ['Phone', '电话'],
    email: ['Email', '邮箱'],
    jobTitle: ['Job title', '职位'],
    ownerId: ['Owner', '负责人'],
    source: ['Source', '来源'],
    status: ['Status', '状态'],
    invalidReason: ['Invalid reason', '无效原因'],
    industry: ['Industry', '行业'],
    country: ['Country / region', '国家 / 地区'],
    state: ['State / province', '省份'],
    city: ['City', '城市'],
    website: ['Website', '网站'],
    description: ['Description', '描述'],
    // The enquiry as it arrived, kept as it is.
    message: ['Original message', '原始信息'],
    attachments: ['Attachments', '附件'],
    lostReason: ['Lost reason', '输单原因'],
    churnReason: ['Churn reason', '流失原因'],
    type: ['Type', '类型'],
    employees: ['Employees', '员工数'],
    address: ['Address', '地址'],
    notes: ['Notes', '备注'],
    companyId: ['Company', '所属公司'],
    related: {
      leadId: ['Related lead', '关联线索'],
      companyId: ['Related company', '关联公司'],
      opportunityId: ['Related opportunity', '关联商机'],
    },
    contactId: ['Contact', '联系人'],
    newCompanyName: ['New company name', '新公司名称'],
    opportunityName: ['Opportunity name', '商机名称'],
    createOpportunity: ['Create opportunity', '创建商机'],
    gender: ['Gender', '性别'],
    employed: ['Employed', '在职'],
    stage: ['Stage', '阶段'],
    amount: ['Amount', '金额'],
    currency: ['Currency', '币种'],
    expectedCloseAt: ['Expected close date', '预计成交日期'],
    businessType: ['Business type', '业务类型'],
    contacts: ['Opportunity contacts', '商机联系人'],
    pauseReason: ['Pause reason', '暂停原因'],
    resumeAt: ['Expected resume date', '预计恢复日期'],
    time: ['Time', '时间'],
    dueAt: ['Time', '时间'],
    endAt: ['End time', '结束时间'],
    leadId: ['Lead', '线索'],
    opportunityId: ['Opportunity', '商机'],
    internalParticipants: ['Participants', '参与人'],
    result: ['Result', '结果'],
    topic: ['Approval topic', '审批事项'],
    approverId: ['Approver', '审批人'],
    applicant: ['Applicant', '申请人'],
    opportunityAmount: ['Opportunity amount', '商机金额'],
    createdAt: ['Created', '创建时间'],
    updatedAt: ['Updated', '更新时间'],
    closedAt: ['Closed', '关闭时间'],
    // The current stage's chance of winning, from the stage settings.
    probability: ['Win probability', '成交概率'],
    completedAt: ['Completed', '完成时间'],
    submittedAt: ['Submitted', '提交时间'],
    decidedAt: ['Decided', '审批时间'],
    decisionComment: ['Decision comment', '审批意见'],
    convertedAt: ['Converted', '转化时间'],
    convertedCompanyId: ['Converted company', '转化后的公司'],
    convertedContactId: ['Converted contact', '转化联系人'],
    convertedOpportunityId: ['Converted opportunity', '转化商机'],
    role: ['Contact role', '联系人角色'],
    primary: ['Primary contact', '主要联系人'],
    createdById: ['Created by', '创建人'],
    actorId: ['Operator', '操作人'],
    timeZone: ['Business timezone', '业务时区'],
    aiLanguage: ['AI working language', 'AI 工作语言'],
    decision: ['Decision', '处理'],
    comment: ['Comment', '意见'],
    taskReminderMinutes: [
      'Task reminder (minutes before)',
      '任务提前提醒（分钟）',
    ],
    closeReminderDays: [
      'Opportunity close reminder (days before)',
      '商机到期提醒（天）',
    ],
    uncontactedDays: [
      'New lead uncontacted after (days)',
      '新线索未联系阈值（天）',
    ],
    leadStaleDays: [
      'Lead and opportunity stall threshold (days)',
      '线索、商机停滞阈值（天）',
    ],
    staleDays: [
      'Company inactivity threshold (days)',
      '公司长期未联系阈值（天）',
    ],
    nurtureReviewDays: ['Nurture review after (days)', '培育复查间隔（天）'],
    companyType: ['Company type', '公司类型'],
  },
  options: {
    manufacturing: ['Manufacturing', '制造业'],
    technology: ['Technology / software', '科技 / 软件'],
    telecommunications: ['Telecommunications', '通信'],
    financialServices: ['Financial services', '金融服务'],
    insurance: ['Insurance', '保险'],
    healthcare: ['Healthcare', '医疗健康'],
    pharmaceuticals: ['Pharmaceuticals', '医药'],
    retail: ['Retail', '零售'],
    wholesale: ['Wholesale / distribution', '批发 / 分销'],
    foodAndBeverage: ['Food and beverage', '食品饮料'],
    agriculture: ['Agriculture', '农业'],
    energy: ['Energy', '能源'],
    construction: ['Construction', '建筑工程'],
    realEstate: ['Real estate', '房地产'],
    automotive: ['Automotive', '汽车'],
    logistics: ['Logistics / transport', '物流运输'],
    hospitality: ['Hospitality / travel', '酒店旅游'],
    media: ['Media / entertainment', '传媒娱乐'],
    education: ['Education', '教育'],
    professionalServices: ['Professional services', '专业服务'],
    government: ['Government / public sector', '政府 / 公共部门'],
    nonprofit: ['Non-profit', '非营利组织'],
    website: ['Website', '官网'],
    marketing: ['Marketing', '营销'],
    exhibition: ['Exhibition', '展会'],
    search: ['Search engine', '搜索引擎'],
    ai: ['AI', 'AI'],
    customerReferral: ['Customer referral', '客户推荐'],
    employeeReferral: ['Employee referral', '员工推荐'],
    partner: ['Partner', '合作伙伴'],
    outbound: ['Outbound', '主动开发'],
    other: ['Other', '其他'],
    new: ['New', '新线索'],
    working: ['Working', '跟进中'],
    nurturing: ['Nurturing', '培育中'],
    converted: ['Converted', '已转化'],
    invalid: ['Invalid', '无效'],
    price: ['Price', '价格'],
    toCompetitor: ['Moved to a competitor', '转向竞品'],
    businessChange: ['Business change', '业务调整'],
    serviceDissatisfied: ['Dissatisfied with service', '服务不满意'],
    closedOrMerged: ['Closed or merged', '停业或并购'],
    notTarget: ['Not target customer', '非目标客户'],
    badContact: ['Invalid contact details', '联系方式无效'],
    duplicate: ['Duplicate', '重复'],
    noNeed: ['No need', '无需求'],
    student: ['Student / research', '学生 / 调研'],
    competitor: ['Competitor', '竞争对手'],
    prospect: ['Prospect', '潜在客户'],
    qualified: ['Qualified', '已确认意向'],
    customer: ['Customer', '成交客户'],
    inactive: ['Inactive', '休眠客户'],
    churned: ['Churned', '流失客户'],
    direct: ['Direct customer', '直客'],
    reseller: ['Reseller', '经销商'],
    male: ['Male', '男'],
    noBudget: ['Budget cancelled', '预算取消'],
    noDecision: ['No decision', '无决策'],
    requirementMismatch: ['Requirements did not match', '需求不匹配'],
    timing: ['Wrong timing', '时机不对'],
    budgetDeferred: ['Budget deferred', '预算推迟'],
    priorityChanged: ['Priorities changed', '优先级调整'],
    decisionDelayed: ['Decision delayed', '决策延期'],
    waitingOnCustomer: ['Waiting on the customer', '等待客户'],
    female: ['Female', '女'],
    unknown: ['Unknown', '未知'],
    contact: ['Initial contact', '初步接触'],
    qualification: ['Qualification', '需求确认'],
    validation: ['Validation', '方案验证'],
    proposal: ['Proposal', '方案报价'],
    negotiation: ['Negotiation', '商务谈判'],
    contract: ['Contract', '合同签署'],
    won: ['Won', '赢单'],
    lost: ['Lost', '输单'],
    paused: ['Paused', '暂停'],
    newBusiness: ['New business', '新业务'],
    expansion: ['Expansion', '增购'],
    crossSell: ['Cross-sell', '交叉销售'],
    renewal: ['Renewal', '续约'],
    tender: ['Tender', '招投标'],
    decisionMaker: ['Decision maker', '决策'],
    champion: ['Champion', '推动'],
    evaluator: ['Evaluator', '评估'],
    influencer: ['Influencer', '影响'],
    user: ['End user', '使用'],
    blocker: ['Blocker', '阻碍'],
    email: ['Email', '邮件'],
    open: ['Not done', '未完成'],
    completed: ['Completed', '已完成'],
    cancelled: ['Cancelled', '已取消'],
    discount: ['Discount', '折扣'],
    paymentTerms: ['Payment terms', '付款条款'],
    contractTerms: ['Contract terms', '合同条款'],
    commitment: ['Commitment', '商务承诺'],
    draft: ['Draft', '草稿'],
    pending: ['Pending approval', '审批中'],
    approved: ['Approved', '已通过'],
    rejected: ['Rejected', '已拒绝'],
    withdrawn: ['Withdrawn', '已撤回'],
    executed: ['Executed', '已执行'],
    dismissed: ['Dismissed', '已忽略'],
    superseded: ['Replaced', '已替换'],
    executing: ['Executing', '执行中'],
    'sales-representative': ['Salesperson', '销售人员'],
    'sales-manager': ['Sales manager', '销售经理'],
    'system-administrator': ['Administrator', '管理员'],
  },
  events: {
    created: ['Created', '创建'],
    updated: ['Updated', '更新'],
    deleted: ['Deleted', '删除'],
    stage: ['Stage changed', '阶段变更'],
    status: ['Status changed', '状态变更'],
    converted: ['Lead converted', '线索转化'],
    ai: ['AI follow-up', 'AI 跟进建议'],
    merged: ['Leads merged', '线索合并'],
  },
  errors: {
    serverError: [
      'Something went wrong. Please try again.',
      '操作失败，请重试。',
    ],
    invalidInput: ['Check the values and try again.', '请检查填写内容后重试。'],
    evaluationDecided: [
      'This recommendation has already been decided.',
      '这条建议已经处理过了。',
    ],
    taskChanged: [
      'The task has changed since this suggestion. Follow up again.',
      '这个任务在建议给出后已经有了变化，请重新跟进。',
    ],
    convertFirst: [
      'Convert the lead first; accepting records it.',
      '请先完成转化，采纳会在转化后记录。',
    ],
    opportunityClosed: [
      'This opportunity is won or lost; there is nothing to follow up.',
      '这个商机已经赢单或输单，不需要再跟进。',
    ],
    assistantUnavailable: [
      'The AI assistant is off or has no model configured. Enter the lead in the form instead.',
      'AI 助手未启用或没有配置模型，请改用表单录入。',
    ],
    captureNothing: [
      'The AI found no lead in this text.',
      'AI 没有从这段内容里找到线索。',
    ],
    feedbackFailed: [
      'The AI could not organise these notes. Try again, or write the outcome yourself.',
      'AI 没能整理这段内容，请重试，或者直接填写结果。',
    ],
    captureFailed: [
      'The AI could not organise this text. Try again, or enter the lead in the form.',
      'AI 没能整理这段内容，请重试或改用表单录入。',
    ],
    requiredField: ['This field is required', '此字段必填'],
    required: ['A required field is missing.', '请填写必填字段。'],
    forbidden: [
      'You do not have permission for this action.',
      '你没有执行此操作的权限。',
    ],
    unauthorized: ['Please sign in to continue.', '请先登录。'],
    notFound: [
      'The record is unavailable or you do not have access.',
      '记录不存在，或你没有访问权限。',
    ],
    invalidOwner: [
      'Choose an active sales user as owner.',
      '请选择有效的销售人员作为负责人。',
    ],
    convertedReadOnly: [
      'Converted leads are read-only.',
      '已转化线索为只读状态。',
    ],
    approvalLocked: [
      'This approval cannot be changed in its current state.',
      '当前审批状态不允许此操作。',
    ],
    relatedRecords: [
      'Related records prevent this change. Unlink them first.',
      '存在关联记录，请先解除关联。',
    ],
    companyMismatch: [
      'The related contacts and opportunities must belong to the same company.',
      '关联联系人和商机必须属于同一公司。',
    ],
    leadOrCompany: [
      'A task concerns a lead, or a company and its opportunity, not both.',
      '任务关联线索，或关联公司及其商机，二者不能同时关联。',
    ],
    opportunityHasTasks: [
      'This deal has tasks with its current company, so it cannot move to another company.',
      '此商机已有与当前公司的任务，不能更换到其他公司。',
    ],
    endBeforeStart: [
      "The end time must come after the task's time.",
      '结束时间不能早于任务时间。',
    ],
    selfApproval: [
      'You cannot approve your own request.',
      '不能审批自己发起的申请。',
    ],
    approvalOpportunity: [
      'An approval can only be raised for an opportunity you may edit.',
      '只能为自己负责的商机发起审批。',
    ],
    invalidApprover: [
      'Choose an active manager or administrator.',
      '请选择有效的经理或管理员作为审批人。',
    ],
    conflict: [
      'This record changed. Refresh and try again.',
      '记录已变更，请刷新后重试。',
    ],
    aiBusy: [
      'The previous message is still waiting for its reply.',
      '上一条消息还在等待回复，请稍候。',
    ],
    aiDisabled: [
      'The AI assistant is disabled in system settings.',
      '系统设置中已停用 AI 助手。',
    ],
    aiNotConfigured: [
      'No AI model is configured. Add a model service in config.yml, then select it in system settings.',
      '尚未配置 AI 模型。请在 config.yml 添加模型服务，并在系统设置中选择。',
    ],
    aiAuthFailed: [
      'The model provider rejected the API key. Check ai.llmServices in config.yml and restart the server.',
      '模型服务拒绝了 API 密钥。请检查 config.yml 中的 ai.llmServices，并重启服务。',
    ],
    aiRateLimited: [
      'The model provider is rate limiting or out of quota. Try again later.',
      '模型服务触发了限流或额度不足，请稍后再试。',
    ],
    aiProviderError: [
      'The model provider returned an error.',
      '模型服务返回了错误。',
    ],
    aiInvalidResponse: [
      'The model returned an unreadable response. Try again.',
      '模型返回的内容无法解析，请重试。',
    ],
    confirmationRequired: [
      'Confirm this action before executing it.',
      '执行前请确认此操作。',
    ],
    fileTooLarge: ['The upload exceeds 20 MB.', '上传文件超过 20 MB。'],
    importLimit: [
      'Import between 1 and 500 records at a time.',
      '每次可导入 1 至 500 条记录。',
    ],
    demoExists: [
      'The demo data is already imported. Remove it before importing again.',
      '演示数据已导入，请先清除后再导入。',
    ],
    demoMissing: ['There is no demo data to remove.', '没有可清除的演示数据。'],
    demoAccounts: [
      'The demo accounts could not be created.',
      '无法创建演示账号。',
    ],
  },
} as const;
type Translated<T> = T extends readonly [string, string]
  ? string
  : { [K in keyof T]: Translated<T[K]> };
function translate<T>(value: T, index: 0 | 1): Translated<T> {
  if (Array.isArray(value)) return value[index] as Translated<T>;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      translate(child, index),
    ]),
  ) as Translated<T>;
}
export const crmEn = translate(wording, 0);
export const crmZh = translate(wording, 1);
