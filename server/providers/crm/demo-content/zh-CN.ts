import type { DemoContent } from './types.js';
import { zhMail, zhMailSenders } from './mail-zh-CN.js';

export const zhCN: DemoContent = {
  label: 'NocoBase 销售演示数据',
  accounts: {
    manager: { username: 'liming', name: '李明' },
    secondManager: { username: 'zhaomin', name: '赵敏' },
    firstSeller: { username: 'wangxiaofang', name: '王小芳' },
    secondSeller: { username: 'chenxiaohao', name: '陈小浩' },
  },
  cities: {
    beijing: '北京',
    shanghai: '上海',
    nanjing: '南京',
    suzhou: '苏州',
    hangzhou: '杭州',
    guangzhou: '广州',
    shenzhen: '深圳',
    chengdu: '成都',
  },
  companies: [
    {
      name: '华策精密制造',
      domain: 'huace-precision',
      description:
        '三家工厂用 Excel 和旧 OA 管报工与设备巡检，计划用 NocoBase 搭统一的生产管理系统，要求私有化部署。',
    },
    {
      name: '星桥连锁零售',
      domain: 'xingqiao-retail',
      description:
        '已用社区版搭了门店巡检应用，准备扩展到会员与供应商协同，需要 SSO 和审批流。',
    },
    {
      name: '安和医疗集团',
      domain: 'anhe-health',
      description:
        '信息科在选院内流程平台，关注权限、审计日志和人大金仓数据库适配。',
    },
    {
      name: '云帆信息科技',
      domain: 'yunfan-tech',
      description:
        '系统集成商，用 NocoBase 为最终客户交付定制应用，按项目采购专业版授权。',
    },
    {
      name: '知行教育集团',
      domain: 'zhixing-edu',
      description: '教育集团想把招生、排课和家校沟通从多个 SaaS 迁到自建平台。',
    },
    {
      name: '视界数据服务',
      domain: 'shijie-data',
      description: '数据咨询团队用 NocoBase 搭交付工作台，从标准版起步。',
    },
    {
      name: '昊阳能源',
      domain: 'haoyang-energy',
      description: '能源企业的巡检与项目协同平台已完成评估，预算审批延后。',
    },
    {
      name: '丰味食品',
      domain: 'fengwei-foods',
      description: '经销商管理系统选型，集团最终统一采用了另一家低代码平台。',
    },
  ],
  people: [
    [
      { name: '陈曼云', mailbox: 'chen.manyun' },
      { name: '吴逸辰', mailbox: 'wu.yichen' },
    ],
    [
      { name: '林欣怡', mailbox: 'lin.xinyi' },
      { name: '周昊', mailbox: 'zhou.hao' },
    ],
    [
      { name: '王思菲', mailbox: 'wang.sifei' },
      { name: '刘骁', mailbox: 'liu.xiao' },
    ],
    [
      { name: '张立昂', mailbox: 'zhang.liang' },
      { name: '孙怡宁', mailbox: 'sun.yining' },
    ],
    [
      { name: '徐雅琳', mailbox: 'xu.yalin' },
      { name: '唐睿', mailbox: 'tang.rui' },
    ],
    [
      { name: '赵陆', mailbox: 'zhao.lu' },
      { name: '郭萌', mailbox: 'guo.meng' },
    ],
    [
      { name: '黄雅雯', mailbox: 'huang.yawen' },
      { name: '何威', mailbox: 'he.wei' },
    ],
    [
      { name: '邓晓萱', mailbox: 'deng.xiaoxuan' },
      { name: '钱佳明', mailbox: 'qian.jiaming' },
    ],
  ],
  contactJobTitles: ['信息化负责人', '技术经理'],
  contactComments: ['主要业务决策人。', '技术评估对接人。'],
  churnComments: '集团统一采用了另一家低代码平台，经销商管理系统随之迁移。',
  deals: [
    '生产管理平台（企业版 + 实施）',
    '会员与供应商协同（升级专业版）',
    '院内流程平台（企业版）',
    '集成商年度项目授权（专业版 × 3）',
    '招生与排课平台（专业版）',
    '交付工作台（升级专业版）',
    '门店巡检插件定制开发',
    '巡检与项目协同平台（企业版）',
    '经销商管理系统（专业版 + 实施）',
    '实施服务续期',
    '数据交付平台（标准版 + 培训）',
    '客户项目：物流调度应用授权',
    '门店巡检应用（标准版 + 实施）',
    '科室排班系统（专业版）',
    '渠道订单看板',
    '校区管理系统（专业版）',
    '设备巡检应用（专业版 + 实施）',
    '项目协同平台一期（企业版）',
    '客户项目：园区管理应用授权',
    '报表自动化插件开发',
    '门店排班系统',
    '审计日志与安全加固服务',
    '经销商门户（企业版）',
    '供应链协同试点',
    '巡检数据看板（专业版）',
    '安全培训系统（标准版 + 实施）',
    '患者随访应用定制开发',
    '招生数据看板插件开发',
    '客户项目：网点绩效应用授权',
    '供应商协同门户（企业版）',
  ],
  leads: [
    {
      name: '李佳恩',
      mailbox: 'li.jiaen',
      company: '华策精密制造',
      message:
        '展会上咨询私有化部署和企业版集群，想替换三家工厂的 Excel 报工。',
    },
    {
      name: '高晗',
      mailbox: 'gao.han',
      company: '知行教育集团',
      message: '官网留言：招生和排课想自建系统，问专业版和企业版的区别。',
    },
    {
      name: '沈可心',
      mailbox: 'shen.kexin',
      company: '星桥连锁零售',
      message: '已在用社区版，询问升级专业版的价格和 SSO 配置。',
    },
    {
      name: '蒋煜',
      mailbox: 'jiang.yu',
      company: '远航物流',
      message: '展会到访，想做车队调度和客户协同，首次需求确认电话待安排。',
    },
    {
      name: '罗雨萱',
      mailbox: 'luo.yuxuan',
      company: '新域零售',
      message: '下载了《用 NocoBase 搭建企业内部系统》白皮书。',
    },
    {
      name: '郑亮',
      mailbox: 'zheng.liang',
      company: '禾丰农业',
      message: '已完成需求摸底：农资经销商想把订单和库存从 Excel 迁出来。',
    },
    {
      name: '韩宓',
      mailbox: 'han.mi',
      company: '安和医疗集团',
      message: '关注审批流、权限、审计日志和人大金仓数据库支持。',
    },
    {
      name: '于杰',
      mailbox: 'yu.jie',
      company: '佳拓软件',
      message:
        '软件公司想基于 NocoBase 给客户交付应用，咨询专业版的客户应用开发授权。',
    },
    {
      name: '秦思菲',
      mailbox: 'qin.sifei',
      company: '星桥教育',
      message: '在比较几款低代码平台，预算下季度才决策。',
    },
    {
      name: '方博',
      mailbox: 'fang.bo',
      company: '汇川电子',
      message: '社区版试用中，等内部项目立项后再联系。',
    },
    {
      name: '彭雅然',
      mailbox: 'peng.yaran',
      company: '北辰地产',
      message: '处于早期调研阶段，希望按季度跟进。',
    },
    {
      name: '魏飞',
      mailbox: 'wei.fei',
      company: '江湾咨询',
      message: '想找 NocoBase 的兼职开发工作，不是采购需求。',
    },
    {
      name: '谢卓',
      mailbox: 'xie.zhuo',
      company: '华岭纺织',
      message: '联系方式无效。',
    },
    {
      name: '冯睿',
      mailbox: 'feng.rui',
      company: '佳拓软件',
      message: '技术负责人在评估插件开发方式和源码交付。',
    },
    {
      name: '曹薇',
      mailbox: 'cao.wei',
      company: '丰年农业',
      message: '合作伙伴推荐，想了解 AI 员工在客服场景的用法，待首次沟通。',
    },
    {
      name: '杜楠',
      mailbox: 'du.nan',
      company: '森岳制造',
      message: '20 人团队，想用一套系统管客户、项目交付和报表，预算有限。',
    },
  ],
  leadJobTitles: ['信息化主管', 'IT 负责人'],
  taskDescription: '回顾最新进展，确认需求，并约定下一步行动。',
  discoveryCall: {
    name: '需求摸底电话',
    feedback:
      '确认三家工厂约 200 名报工人员，倾向企业版私有化部署，初步预算 30 万元。',
  },
  productDemo: {
    name: '产品演示',
    feedback: '演示了招生和排课原型，团队确认意向，并引荐了教务总监。',
  },
  completedMatters: [
    '需求梳理工作坊',
    '合同评审',
    '安全与合规评估',
    '插件开发方式评审',
    '招生场景 POC',
    '交付复盘',
  ],
  completedFeedback: [
    '确定了一期应用范围，并记录了验收标准。',
    '法务评审已完成，等待采购签批。',
    '客户要求提供审计日志、SSO 和国产数据库的部署说明。',
    '集成商确认了插件开发方式，待在最终客户环境验证部署。',
    '教务总监希望先做一个轻量的概念验证。',
    '交付完成，客户对上线与报表都比较满意。',
  ],
  plannedMatters: [
    '方案跟进',
    '最终条款沟通',
    '采购决策跟进',
    '技术集成工作坊',
    '产品演示',
  ],
  eveningCall: '晚间电话回访',
  ssoConfirmation: 'SSO 方案确认',
  leadTaskMatters: {
    completed: '需求记录',
    cancelled: '改期的初次沟通',
    planned: '下一次跟进',
  },
  leadTaskFeedback: '联系人已确认意向。发送简要纪要并约定下一步。',
  cadenceMatters: [
    '周度进展沟通',
    '方案细节确认',
    '需求澄清会议',
    '演示准备',
    '合同条款跟进',
    '试点验收',
    '阶段复盘',
    '采购流程跟进',
    '培训计划沟通',
    '升级服务续期沟通',
  ],
  cadenceFeedback: [
    '同步了本周进展，确认了下一步。',
    '客户补充了两条需求，已记录。',
    '确认了时间表与参与人。',
    '演示材料已按反馈调整。',
  ],
  replyPrefix: '回复：',
  mail: zhMail,
  mailSenders: zhMailSenders,
  approvals: {
    discount: {
      name: '华策精密 企业版折扣特批',
      description: '申请 10% 折扣，客户承诺上线后作为制造业案例联合发布。',
    },
    paymentTerms: {
      name: '星桥零售 付款节奏评审',
      description: '客户要求升级款采用 60 天账期。',
      comment: '同意 60 天账期，请在合同中注明首期发票金额。',
    },
    contractTerms: {
      name: '云帆信息 客户项目授权条款评审',
      description: '集成商希望在合同中写明为最终客户交付应用的授权范围。',
    },
    commitment: {
      name: '昊阳能源 上线时间承诺评审',
      description:
        '客户要求合同写明 6 周内完成巡检看板上线，短于标准交付周期，需要实施团队确认排期。',
    },
  },
};
