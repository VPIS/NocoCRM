import type { AppResource } from './en-US.js';
import { crmZh } from './crm/index.js';
import deviceApprovalZhCN from '#extensions/nocobase-device-approval/locales/zh-CN';
import inboxZhCN from '#extensions/nocobase-inbox/locales/zh-CN';

const zhCN: AppResource = {
  crm: crmZh,
  // The UI Library block of the `/device` page; the keys below may reword it.
  ...deviceApprovalZhCN,
  // The UI Library block of the `/inbox` page; the keys below may reword it.
  ...inboxZhCN,
  // The UI Library component of the header's inbox button.
  'inboxButton.title': '收件箱',
  'inboxButton.pending': '收件箱，{{count}} 项待处理',
  'inboxButton.unread': '收件箱，{{count}} 条未读',
  'inboxButton.pendingHint': '{{count}} 项等你处理，处理后减少。',
  'inboxButton.unreadHint': '{{count}} 条未读，阅读后减少。',
  'auth.welcome': '欢迎回来',
  'auth.loginDescription': '使用用户名或邮箱和密码登录。',
  'auth.forgotTitle': '忘记密码',
  'auth.forgotDescription': '输入邮箱，如果账户存在，我们将发送重置链接。',
  'auth.resetDescription': '为账户设置新密码。',
  'auth.resetTitle': '重置密码',
  'auth.identifier': '用户名或邮箱',
  'auth.password': '密码',
  'auth.signIn': '登录',
  'auth.signingIn': '正在登录…',
  'auth.hidePassword': '隐藏密码',
  'auth.showPassword': '显示密码',
  'auth.forgotLink': '忘记密码？',
  'auth.noAccount': '还没有账户？',
  'auth.signUp': '注册',
  'auth.createAccount': '创建账户',
  'auth.creatingAccount': '正在创建账户…',
  'auth.name': '姓名',
  'auth.username': '用户名',
  'auth.email': '邮箱',
  'auth.confirmPassword': '确认密码',
  'auth.existingAccount': '已有账户？',
  'auth.passwordMismatch': '两次输入的密码不一致。',
  'auth.resetting': '正在重置…',
  'auth.newPassword': '新密码',
  'auth.confirmNewPassword': '确认新密码',
  'auth.invalidResetLink': '此密码重置链接无效或已过期。',
  'auth.backToSignIn': '返回登录',
  'auth.sendResetLink': '发送重置链接',
  'auth.sending': '正在发送…',
  'auth.resetSent': '如果账户存在，重置链接已发送。',
  'auth.rememberPassword': '记得密码？',
  'auth.methods': '登录方式',
  'auth.or': '或使用以下方式继续',
  'auth.continueWith': '使用 {provider} 继续',
  'auth.about': '关于此应用',
  'auth.platform': 'AI 原生应用平台',
  'auth.marketingTitleFirst': '让 AI 自由构建。',
  'auth.marketingTitleSecond': 'NocoBase 保障',
  'auth.marketingTitleThird': '可靠运行。',
  'auth.marketingDescription':
    '让 AI 在灵活的前端框架上构建体验，由 NocoBase 保障底层数据、权限、工作流与治理。',
  'auth.frontend': 'AI 原生前端',
  'auth.frontendDescription': '在灵活的框架上自由构建界面。',
  'auth.foundation': 'NocoBase 基础能力',
  'auth.foundationDescription': '可靠的数据、访问控制、工作流与治理。',
  'auth.marketingFooter': '自由构建，可靠支撑。',
  'status.loading': '加载中',
  'status.loadingPage': '正在加载页面',
  'status.loadingSettings': '正在加载设置',
  'status.denied': '无权访问',
  'status.pageFailed': '无法加载页面',
  'status.retry': '重试',
  // Display text of the CRM's AI skills (ai/skills/<name>): the title and
  // description of each SKILL.md, keyed by that English text as the AI
  // Employee plugin requires; the Chinese is SKILL-zh.md's.
  'Lead follow-up': '跟进线索',
  'Review everything a lead has now (the lead itself, its tasks, comments and related records in the CRM) and recommend the next step — keep following up, nurture, convert or invalid — with the reasons; when following up, say clearly how to follow up and what exactly to do. Use when a new lead comes in, when the user asks to follow up a lead or follow it up again, or asks "what should I do next with this lead".':
    '综合查看一条线索现在的全部信息（线索本身、任务、备注和 CRM 里的相关记录），给出下一步建议：继续跟进、放入培育、转化还是无效，以及理由；继续跟进时写清楚怎么跟、具体做什么。新线索进来、用户要求跟进或重新跟进、或问"这条线索下一步怎么做"时使用。',
  'Opportunity follow-up': '跟进商机',
  'Reviews everything about an opportunity as it now stands (the opportunity itself, the company, contacts and their roles, tasks, comments, approvals, the source lead) and judges whether its stage holds up and what to do next — advance to the next stage, keep at it in the current stage, pause, or mark it lost — with the reasons, risks and gaps to fill; when advancing, spells out exactly what to do. Use when a lead\'s conversion opens a new opportunity, when the outcome of an opportunity\'s task has been recorded, when the user asks for a follow-up, or when asked "what is the next step for this opportunity?".':
    '综合查看一个商机现在的全部信息（商机本身、公司、联系人和角色、任务、备注、审批、来源线索），判断它的阶段站不站得住、下一步做什么：推进到下一阶段、留在本阶段继续推进、暂停还是输单，以及理由、风险和要补的缺口；推进时写清楚具体做什么。线索转化出新商机、记录了商机任务的结果、用户要求跟进，或问"这个商机下一步怎么做"时使用。',
  'Approval review': '审批辅助',
  'Helps an approver judge whether an approval request (discount, payment terms, contract terms, delivery commitment) is worth approving — how far the asked terms are from the standard, the effect on the amount and on collection, the opportunity\'s situation and the evidence supporting this concession, the other approvals submitted with it on the same opportunity, how earlier requests of the same kind were decided, the risks and what the applicant left unclear — then recommends approve, approve on conditions, reject or ask for more information, and drafts the decision comment. Use it after an approval is submitted, or when the approver asks "should this approval be approved?".':
    '帮审批人看一个审批申请（折扣、账期、合同条款、交付承诺）值不值得批：申请的条件和标准差多少、对金额和回款的影响、商机的情况和支撑这次让步的证据、同一商机一起提交的其他审批、以往同类审批是怎么批的、风险和申请人没说清的地方，最后给出批准、有条件批准、驳回或需要补充信息的建议，并写好审批意见。审批提交后、审批人问"这个审批该不该批"时使用。',
  'Task preparation': '任务准备',
  "Prepares a salesperson for a task they are about to do with a customer (a call, a meeting, a visit, a demo) — what the task should achieve, where things stand from the record's tasks, comments and mail, who is on the other side and what part each plays, the questions to ask, what to bring, the risks, and the points to cover in order. Use it on the morning of a task, or when the task's owner asks to be prepared.":
    '为销售即将和客户进行的任务（电话、会议、拜访、演示）做准备：任务要达成什么、从记录的任务、评论和邮件看事情进展到哪一步、对方都有谁以及各自的角色、要问的问题、要带的材料、风险，以及按顺序要讲的要点。在任务当天早上，或任务负责人要求准备时使用。',
  'navigation.brandHome': 'NocoCRM 首页',
  'navigation.brandApps': 'NocoBase 应用',
  'routeOverlay.close': '关闭',
  'status.deniedDescription': '你没有访问 {{label}} 的权限。',
  'status.routeFailedDescription':
    '无法加载 {{packageName}} 的路由 {{label}}。',
  shell: {
    buildFreely: 'AI 自由构建。',
    reliability: '<brand>NocoBase</brand> 保障可靠。',
  },
  surface: {
    backToApp: '返回应用',
    loading: '正在加载{{title}}',
    navigation: '{{title}}导航',
    page: '{{title}}页面',
  },
  settings: {
    title: '设置',
    emptyTitle: '暂无可用设置',
    emptyDescription: '没有已启用的插件提供你有权访问的设置页面。',
  },

  appearance: {
    title: '外观',
    mode: '颜色模式',
    preset: '主题',
    light: '浅色',
    dark: '深色',
    system: '跟随系统',
    themes: { default: '宽松', compact: '紧凑' },
  },
  app: {
    title: 'NocoCRM',
  },
  actions: {
    close: '关闭',
    save: '保存',
    cancel: '取消',
    confirm: '确认',
    language: '语言',
  },
  notices: {
    serverLocaleFallback: '服务端不支持该语言，服务端内容已回落为英文。',
    languageChangeFailed: '未能完成语言切换，请重试。',
  },
  account: {
    signOutFailed: '退出登录失败，请重试。',
    openMenu: '打开账户菜单',
    fallback: '账户',
    signOut: '退出登录',
    signingOut: '正在退出…',
  },
  navigation: {
    home: '工作台',
    open: '打开导航',
    close: '关闭导航',
    expand: '展开导航',
    collapse: '收起导航',
    toggle: '展开或收起导航',
    label: '应用导航',
    description: '前往本应用的页面。',
    breadcrumb: '面包屑',
    breadcrumbMore: '显示中间层级',
    back: '返回',
  },
};

export default zhCN;
