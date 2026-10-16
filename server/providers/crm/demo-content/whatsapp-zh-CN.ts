import type { DemoContent } from './types.js';

// The demo's WhatsApp conversations in Chinese (demo-whatsapp.ts), in the
// order of its schedule.
export const zhWhatsApp: DemoContent['whatsapp'] = {
  displayNames: ['NocoBase 销售', 'NocoBase 海外'],
  conversations: [
    // Shanghai Electric's decision maker, about the deal at proposal.
    {
      messages: [
        '您好，方案收到了。生产部想先确认一下私有化部署需要几台服务器，有清单吗？',
        '陈总您好，三家工厂一起上的话，按 3 台应用服务器加 1 台数据库估算，详细的配置清单我今天发到您邮箱。',
        '好的，谢谢。',
        '清单看过了。IT 那边问数据库能不能用我们现有的达梦，麻烦确认一下。',
        '另外下周三下午方便来厂里过一下方案吗？',
      ],
    },
    // United Family Healthcare's decision maker, about the contract.
    {
      messages: [
        '合同里的付款节点，我们财务希望改成 3-4-3。',
        '收到，我和公司确认后回复您。',
        '王经理，付款节点按 3-4-3 可以，修订版合同已经发到您邮箱，请查收。',
        '好的，我们法务这周内看完。',
        '好的，有问题随时找我。',
      ],
    },
    // The working lead from Tongwei.
    {
      messages: [
        '白天电话没接到，不好意思。经销商对账那块，我们有 6 个仓库，月底对账单能自动生成吗？',
        '郑总您好，可以按经销商和仓库自动汇总，月底直接导出对账单。我们有一个饲料经销商的类似案例，方便的话演示给您看。',
        '可以，周四下午两点吧。',
      ],
    },
    // H World's IT director, the importer's own deal.
    {
      messages: [
        '报价收到了，评审会定在下周一。',
        '好的陆总，评审会上需要我们远程参加讲解吗？',
        '需要的，采购邵佳也会参加，主要会问三年运维服务的内容。',
        '麻烦提前把运维服务的 SLA 发我一份。',
      ],
    },
    // Someone nobody knows yet, by username alone.
    {
      username: 'kevin_zhou',
      messages: [
        '你好，在官网看到这个号码。想问一下社区版可以商用吗？',
        '我们是一家 20 人的设计公司，想搭一个项目管理系统。',
      ],
    },
    // A systems integrator abroad, in English.
    {
      profileName: 'Ahmed Rahman',
      messages: [
        'Hello, we are a systems integrator in Dubai. Do you have a partner program for the Middle East?',
        "Hi Ahmed, yes we do. Could you tell me which industries you serve? I'll send you the details of our partner program.",
        'Mainly hospitals and logistics companies in the UAE and Saudi Arabia. We have about 30 engineers.',
      ],
    },
    // A job seeker, set aside as not a customer.
    {
      profileName: '小刘',
      messages: [
        '您好，请问你们还招实施工程师吗？简历发给谁比较合适？',
        '您好，招聘信息在官网的“加入我们”页面，可以直接在那里投递。这个号码只处理客户咨询，谢谢。',
      ],
    },
  ],
};
