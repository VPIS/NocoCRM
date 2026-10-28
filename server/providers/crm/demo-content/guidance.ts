import {
  chineseFollowUp,
  englishFollowUp,
  type GuidanceDays,
} from '../guidance.js';

// The business guidance the demo dataset is written for: the sales rules of
// Loomstack, the fictional software company it sells for (its editions and
// prices are made up), with the follow-up rules every deployment shares. The
// import writes it over the shipped template while that is unchanged
// (demoSettings in demo.ts), and a removal takes it back.
export const demoGuidance = (days: GuidanceDays, language: string): string =>
  language.startsWith('zh')
    ? `${chinese}\n\n${chineseFollowUp(days)}\n\n${chineseBoundaries}`
    : `${english}\n\n${englishFollowUp(days)}\n\n${englishBoundaries}`;

const chinese = `# 公司定位
- 公司名称：Loomstack（开源、AI 驱动的企业应用平台，用于搭建企业内部系统和业务应用）。
- 版本与授权：
  - 社区版：免费、开源，含数据建模、所见即所得界面、工作流和 AI 员工，只有社区支持，须保留 Loomstack 标识。
  - 标准版：5,000 元；自定义品牌、外部数据源、大数据量导入导出；仅限内部使用。
  - 专业版：50,000 元；可为客户开发应用，含 SSO、审批、版本管理、多环境、国产数据库（人大金仓、OceanBase）等。
  - 企业版：按需报价；集群部署、完整审计日志、多应用与多空间、全部源码、路线图优先级。
  - 商业版均为永久授权，含 1 年升级期；不限用户数、应用数和数据量。升级到更高版本时，已付金额的剩余部分可以抵扣。
- 服务：技术支持、插件与定制开发、实施与培训，按项目报价。官网没有公布的价格（服务、续期、插件）不要向客户报出，先和销售经理确认。
- 目标客户：
  - 要搭内部业务系统、替换 Excel 或旧系统的企业 IT/信息化团队；
  - 用 Loomstack 为最终客户交付应用的软件公司和集成商（需要专业版及以上）；
  - 对私有化部署、数据安全、审计和国产化有要求的政企与大型企业（通常是企业版）。
- 典型决策角色：IT/信息化负责人、技术负责人（评估插件开发、部署和源码）、业务负责人、采购/法务。`;

const english = `# Company profile
- Company: Loomstack (an open-source, AI-driven enterprise application platform for building internal enterprise systems and business applications).
- Editions and licences:
  - Community: free and open source, with data modelling, a WYSIWYG interface, workflows and AI employees; community support only; the Loomstack branding must stay.
  - Standard: RMB 5,000; custom branding, external data sources, large-volume import and export; internal use only.
  - Professional: RMB 50,000; may be used to build applications for clients; includes SSO, approvals, version management, multiple environments and domestic Chinese databases (Kingbase, OceanBase), among others.
  - Enterprise: quoted on request; cluster deployment, full audit logs, multiple applications and spaces, the complete source code, roadmap priority.
  - Every commercial edition is a perpetual licence with 1 year of upgrades, with no limit on users, applications or data volume. When upgrading to a higher edition, the unused remainder of what was paid is credited.
- Services: technical support, plugin and custom development, implementation and training, quoted per project. Never quote a customer a price the website does not publish (services, renewals, plugins); check with a sales manager first.
- Target customers:
  - enterprise IT teams building internal business systems or replacing spreadsheets or legacy systems;
  - software companies and system integrators delivering applications to their own clients with Loomstack (Professional or higher);
  - government bodies and large enterprises that require private deployment, data security, auditing or domestic Chinese technology (usually Enterprise).
- Typical decision roles: the head of IT, the technical lead (who evaluates plugin development, deployment and the source code), the business owner, procurement and legal.`;

const chineseBoundaries = `# 记录边界
- 不猜预算、决策人、竞争对手和项目进度；推测必须标成"推测"，并说明依据。
- 不报官网没有公布的价格，不承诺路线图上的功能和上线时间。
- 商机名称用"要搭的系统或服务 +（版本）"，例如"生产报工系统（专业版）"；标准版和专业版金额按官网价格填，企业版和服务金额留空。
- 所有新增、修改、删除、线索转化和审批操作都必须等待用户确认。`;

const englishBoundaries = `# Record boundaries
- Do not guess the budget, the decision maker, competitors or the project's progress; an inference must be marked "Assumption", with its basis stated.
- Do not quote prices the website does not publish, and do not promise roadmap features or release dates.
- Opportunity names: "the system or service being built + (edition)", e.g. "Production reporting system (Professional)"; Standard and Professional amounts follow the website's prices, Enterprise and service amounts stay empty.
- Every create, update, delete, lead conversion and approval action waits for the user's confirmation.`;
