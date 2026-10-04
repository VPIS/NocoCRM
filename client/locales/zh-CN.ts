import authUi from '../extensions/nocobase-auth-ui/locales/zh-CN.js';
import type { AppResource } from './en-US.js';
import { crmZh } from './crm/index.js';

const zhCN: AppResource = {
  ...authUi,
  crm: crmZh,
  'auth.welcome': '欢迎回来',
  'auth.loginDescription': '使用用户名或邮箱和密码登录。',
  'auth.forgotTitle': '忘记密码',
  'auth.forgotDescription': '输入邮箱，如果账户存在，我们将发送重置链接。',
  'auth.resetDescription': '为账户设置新密码。',
  'status.loading': '加载中',
  'status.loadingPage': '正在加载页面',
  'status.loadingSettings': '正在加载设置',
  'status.loadingDev': '正在加载开发工具',
  'status.denied': '无权访问',
  'status.pageFailed': '无法加载页面',
  'status.retry': '重试',
  // Display text of the CRM's AI skills (ai/skills/<name>): the title and
  // description of each SKILL.md, keyed by that English text as the AI
  // Employee plugin requires; the Chinese is SKILL-zh.md's.
  'Lead follow-up': '跟进线索',
  'Review everything a lead has now (the lead itself, its activities, notes, related records in the CRM and public information) and recommend the next step — keep following up, nurture, convert or invalid — with the reasons; when following up, say clearly how to follow up and what exactly to do. Use when a new lead comes in, when the user asks to follow up a lead or follow it up again, or asks "what should I do next with this lead".':
    '综合查看一条线索现在的全部信息（线索本身、活动、备注、CRM 里的相关记录和公开信息），给出下一步建议：继续跟进、放入培育、转化还是无效，以及理由；继续跟进时写清楚怎么跟、具体做什么。新线索进来、用户要求跟进或重新跟进、或问"这条线索下一步怎么做"时使用。',
  'Opportunity follow-up': '跟进商机',
  'Reviews everything about an opportunity as it now stands (the opportunity itself, the account, contacts and their roles, activities, notes, approvals, the source lead) and judges whether its stage holds up and what to do next — advance to the next stage, keep at it in the current stage, pause, or mark it lost — with the reasons, risks and gaps to fill; when advancing, spells out exactly what to do. Use when a lead\'s conversion opens a new opportunity, when the outcome of an opportunity\'s activity has been recorded, when the user asks for a follow-up, or when asked "what is the next step for this opportunity?".':
    '综合查看一个商机现在的全部信息（商机本身、客户、联系人和角色、活动、备注、审批、来源线索），判断它的阶段站不站得住、下一步做什么：推进到下一阶段、留在本阶段继续推进、暂停还是输单，以及理由、风险和要补的缺口；推进时写清楚具体做什么。线索转化出新商机、记录了商机活动的结果、用户要求跟进，或问"这个商机下一步怎么做"时使用。',
  'Approval review': '审批辅助',
  'Helps an approver judge whether an approval request (discount, payment terms, contract terms, delivery commitment) is worth approving — how far the asked terms are from the standard, the effect on the amount and on collection, the opportunity\'s situation and the evidence supporting this concession, the other approvals submitted with it on the same opportunity, how earlier requests of the same kind were decided, the risks and what the applicant left unclear — then recommends approve, approve on conditions, reject or ask for more information, and drafts the decision comment. Use it after an approval is submitted, or when the approver asks "should this approval be approved?".':
    '帮审批人看一个审批申请（折扣、账期、合同条款、交付承诺）值不值得批：申请的条件和标准差多少、对金额和回款的影响、商机的情况和支撑这次让步的证据、同一商机一起提交的其他审批、以往同类审批是怎么批的、风险和申请人没说清的地方，最后给出批准、有条件批准、驳回或需要补充信息的建议，并写好审批意见。审批提交后、审批人问"这个审批该不该批"时使用。',
  // Display text of the CRM's AI tools (server/ai/tools), keyed by their
  // English source text as the AI Employee plugin requires.
  'Search CRM records': '搜索 CRM 记录',
  'Finds leads, accounts, contacts, opportunities, activities and approvals the current user may read, a page at a time.':
    '按页查找当前用户可读的线索、客户、联系人、商机、活动和审批。',
  'Read a CRM record': '读取一条 CRM 记录',
  'Reads one record in full, with its change history, related records and what the current user may do to it.':
    '完整读取一条记录，包括变更历史、关联记录和当前用户可执行的操作。',
  'Create a CRM record': '创建 CRM 记录',
  'Creates a lead, account, contact, opportunity, activity or approval once the user confirms the values.':
    '在用户确认字段值后创建线索、客户、联系人、商机、活动或审批。',
  'Update a CRM record': '修改 CRM 记录',
  'Changes the fields of an existing record once the user confirms the new values.':
    '在用户确认新值后修改已有记录的字段。',
  'Delete a CRM record': '删除 CRM 记录',
  'Deletes one record once the user confirms; it cannot be undone.':
    '在用户确认后删除一条记录，无法撤销。',
  'Convert a lead': '转化线索',
  'Turns a lead into an account and a contact, optionally with an opportunity, once the user confirms.':
    '在用户确认后把线索转化为客户和联系人，可同时创建商机。',
  'Decide on an approval': '处理审批',
  'Submits, withdraws, approves or rejects an approval request once the user confirms.':
    '在用户确认后提交、撤回、通过或拒绝一条审批申请。',
  'List CRM users': '列出 CRM 用户',
  'Lists the users who hold a CRM role, with their ids, so a record can be given an owner or an approver by name.':
    '列出拥有 CRM 角色的用户及其 ID，以便按姓名指定负责人或审批人。',
  'navigation.brandHome': 'NocoCRM 首页',
  'navigation.brandApps': 'NocoBase 应用',
  'routeOverlay.close': '关闭',
  'status.deniedDescription': '你没有访问 {{label}} 的权限。',
  'status.routeFailedDescription':
    '无法加载 {{packageName}} 的路由 {{label}}。',
  shell: {
    workspace: 'AI 应用工作区',
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
  dev: {
    componentExamples: '组件示例',
    title: '开发工具',
    emptyTitle: '暂无可用开发工具',
    emptyDescription: '没有已启用的插件提供你有权访问的开发页面。',
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
    label: '应用导航',
    breadcrumb: '面包屑',
    back: '返回',
  },
};

export default zhCN;
