import type { DemoContent } from './types.js';
import { enMail, enMailSenders } from './mail-en-US.js';

export const enUS: DemoContent = {
  label: 'NocoBase sales demo data',
  accounts: {
    manager: { username: 'daniel', name: 'Daniel Brooks' },
    secondManager: { username: 'emily', name: 'Emily Carter' },
    firstSeller: { username: 'sophie', name: 'Sophie Bennett' },
    secondSeller: { username: 'oliver', name: 'Oliver Hayes' },
  },
  cities: {
    beijing: 'Beijing',
    shanghai: 'Shanghai',
    nanjing: 'Nanjing',
    suzhou: 'Suzhou',
    hangzhou: 'Hangzhou',
    guangzhou: 'Guangzhou',
    shenzhen: 'Shenzhen',
    chengdu: 'Chengdu',
  },
  companies: [
    {
      name: 'Northfield Precision Manufacturing',
      domain: 'northfield-precision',
      description:
        'Three factories track production reporting and equipment inspections in Excel and an old OA system; plans a unified production management system on NocoBase, deployed privately.',
    },
    {
      name: 'Brightway Retail Group',
      domain: 'brightway-retail',
      description:
        'Built a store inspection app on Community and plans to extend it to membership and supplier collaboration; needs SSO and approval workflows.',
    },
    {
      name: 'Stonebridge Medical Group',
      domain: 'stonebridge-medical',
      description:
        'The IT department is choosing an in-hospital workflow platform, focused on permissions, audit logs and Kingbase database support.',
    },
    {
      name: 'Bluecrest Information Technology',
      domain: 'bluecrest-it',
      description:
        'A system integrator delivering custom applications to its end customers on NocoBase, buying Professional licences per project.',
    },
    {
      name: 'Clearpath Education Group',
      domain: 'clearpath-education',
      description:
        'The education group wants to move admissions, scheduling and parent communication from several SaaS tools to a platform of its own.',
    },
    {
      name: 'Silverline Data Services',
      domain: 'silverline-data',
      description:
        'A data consulting team building its delivery workspace on NocoBase, starting with Standard.',
    },
    {
      name: 'Sunridge Energy',
      domain: 'sunridge-energy',
      description:
        'The energy company has finished evaluating an inspection and project collaboration platform; budget approval is postponed.',
    },
    {
      name: 'Goldleaf Foods',
      domain: 'goldleaf-foods',
      description:
        'Evaluated a dealer management system; the group finally standardised on another low-code platform.',
    },
  ],
  people: [
    [
      { name: 'Sarah Collins', mailbox: 'sarah.collins' },
      { name: 'James Porter', mailbox: 'james.porter' },
    ],
    [
      { name: 'Jessica Lane', mailbox: 'jessica.lane' },
      { name: 'Michael Dunn', mailbox: 'michael.dunn' },
    ],
    [
      { name: 'Amanda Ross', mailbox: 'amanda.ross' },
      { name: 'Peter Lawson', mailbox: 'peter.lawson' },
    ],
    [
      { name: 'Karen Doyle', mailbox: 'karen.doyle' },
      { name: 'Steven Clarke', mailbox: 'steven.clarke' },
    ],
    [
      { name: 'Lisa Warren', mailbox: 'lisa.warren' },
      { name: 'Andrew Pierce', mailbox: 'andrew.pierce' },
    ],
    [
      { name: 'Rebecca Hall', mailbox: 'rebecca.hall' },
      { name: 'Thomas Reid', mailbox: 'thomas.reid' },
    ],
    [
      { name: 'Melissa Burke', mailbox: 'melissa.burke' },
      { name: 'Robert Neal', mailbox: 'robert.neal' },
    ],
    [
      { name: 'Victoria Stone', mailbox: 'victoria.stone' },
      { name: 'Paul Jennings', mailbox: 'paul.jennings' },
    ],
  ],
  contactJobTitles: ['Head of IT', 'Technical Manager'],
  contactComments: [
    'Main business decision maker.',
    'Contact for the technical evaluation.',
  ],
  churnComments:
    'The group standardised on another low-code platform, and the dealer management system moved with it.',
  deals: [
    'Production management platform (Enterprise + implementation)',
    'Membership and supplier collaboration (upgrade to Professional)',
    'In-hospital workflow platform (Enterprise)',
    'Integrator annual project licences (Professional × 3)',
    'Admissions and scheduling platform (Professional)',
    'Delivery workspace (upgrade to Professional)',
    'Custom store inspection plugin',
    'Inspection and project collaboration platform (Enterprise)',
    'Dealer management system (Professional + implementation)',
    'Implementation services renewal',
    'Data delivery platform (Standard + training)',
    'Client project: logistics dispatch app licence',
    'Store inspection app (Standard + implementation)',
    'Department rostering system (Professional)',
    'Channel order dashboard',
    'Campus management system (Professional)',
    'Equipment inspection app (Professional + implementation)',
    'Project collaboration platform, phase 1 (Enterprise)',
    'Client project: industrial park management app licence',
    'Report automation plugin',
    'Store rostering system',
    'Audit log and security hardening services',
    'Dealer portal (Enterprise)',
    'Supply chain collaboration pilot',
    'Inspection data dashboard (Professional)',
    'Safety training system (Standard + implementation)',
    'Custom patient follow-up app',
    'Admissions data dashboard plugin',
    'Client project: branch performance app licence',
    'Supplier collaboration portal (Enterprise)',
  ],
  leads: [
    {
      name: 'Grace Mitchell',
      mailbox: 'grace.mitchell',
      company: 'Northfield Precision Manufacturing',
      message:
        'Asked at the trade show about private deployment and Enterprise clustering; wants to replace Excel production reporting at three factories.',
    },
    {
      name: 'Ryan Cooper',
      mailbox: 'ryan.cooper',
      company: 'Clearpath Education Group',
      message:
        'Website message: wants to build its own admissions and scheduling system and asked how Professional differs from Enterprise.',
    },
    {
      name: 'Chloe Adams',
      mailbox: 'chloe.adams',
      company: 'Brightway Retail Group',
      message:
        'Already uses Community; asked about the price of upgrading to Professional and about setting up SSO.',
    },
    {
      name: 'Nathan Reed',
      mailbox: 'nathan.reed',
      company: 'Farreach Logistics',
      message:
        'Visited our trade show stand; wants fleet dispatch and customer collaboration. The first qualification call is still to be arranged.',
    },
    {
      name: 'Hannah Price',
      mailbox: 'hannah.price',
      company: 'Maple Lane Retail',
      message:
        'Downloaded the white paper "Building Internal Business Systems with NocoBase".',
    },
    {
      name: 'Marcus Bell',
      mailbox: 'marcus.bell',
      company: 'Greenacre Agriculture',
      message:
        'Discovery done: an agricultural supplies dealer wants to move orders and inventory out of Excel.',
    },
    {
      name: 'Laura Hughes',
      mailbox: 'laura.hughes',
      company: 'Stonebridge Medical Group',
      message:
        'Interested in approval workflows, permissions, audit logs and Kingbase database support.',
    },
    {
      name: 'Kevin Foster',
      mailbox: 'kevin.foster',
      company: 'Trailhead Software',
      message:
        'A software company that wants to deliver applications to its clients on NocoBase; asked about the Professional licence for building client applications.',
    },
    {
      name: 'Rachel Morgan',
      mailbox: 'rachel.morgan',
      company: 'Brightway Education',
      message:
        'Comparing several low-code platforms; the budget will not be decided until next quarter.',
    },
    {
      name: 'Adam Sullivan',
      mailbox: 'adam.sullivan',
      company: 'Riverbend Electronics',
      message:
        'Trying Community; get back in touch once the internal project is approved.',
    },
    {
      name: 'Megan Ward',
      mailbox: 'megan.ward',
      company: 'Polaris Properties',
      message: 'Early research stage; would like a follow-up every quarter.',
    },
    {
      name: 'Tyler Grant',
      mailbox: 'tyler.grant',
      company: 'Bayside Consulting',
      message:
        'Looking for part-time NocoBase development work, not for a purchase.',
    },
    {
      name: 'Jason Palmer',
      mailbox: 'jason.palmer',
      company: 'Highridge Textiles',
      message: 'The contact details are invalid.',
    },
    {
      name: 'Ethan Walsh',
      mailbox: 'ethan.walsh',
      company: 'Trailhead Software',
      message:
        'The technical lead is evaluating how plugins are developed and how the source code is delivered.',
    },
    {
      name: 'Natalie Shaw',
      mailbox: 'natalie.shaw',
      company: 'Fairharvest Agriculture',
      message:
        'Referred by a partner; wants to see how AI employees work in customer service. First conversation still to come.',
    },
    {
      name: 'Brian Fisher',
      mailbox: 'brian.fisher',
      company: 'Pinecrest Manufacturing',
      message:
        'A team of 20 that wants one system for customers, project delivery and reporting, on a limited budget.',
    },
  ],
  leadJobTitles: ['IT Manager', 'Head of IT'],
  taskDescription:
    'Review the latest progress, confirm the requirements and agree on the next steps.',
  discoveryCall: {
    name: 'Discovery call',
    feedback:
      'Confirmed about 200 people reporting production across three factories; leaning towards Enterprise deployed privately, with an initial budget of RMB 300,000.',
  },
  productDemo: {
    name: 'Product demo',
    feedback:
      'Demonstrated the admissions and scheduling prototype; the team confirmed its interest and introduced the director of academic affairs.',
  },
  completedMatters: [
    'requirements workshop',
    'contract review',
    'security and compliance assessment',
    'plugin development review',
    'admissions POC',
    'delivery retrospective',
  ],
  completedFeedback: [
    'Agreed the scope of the first phase and recorded the acceptance criteria.',
    'Legal review is done; waiting for procurement to sign off.',
    'The customer asked for deployment notes on audit logs, SSO and domestic Chinese databases.',
    "The integrator confirmed the plugin development approach; deployment is still to be verified in the end customer's environment.",
    'The director of academic affairs wants a lightweight proof of concept first.',
    'Delivery complete; the customer is happy with the go-live and the reports.',
  ],
  plannedMatters: [
    'proposal follow-up',
    'final terms discussion',
    'purchase decision follow-up',
    'technical integration workshop',
    'product demo',
  ],
  eveningCall: 'Evening follow-up call',
  ssoConfirmation: 'SSO plan confirmation',
  leadTaskMatters: {
    completed: 'requirements notes',
    cancelled: 'rescheduled first conversation',
    planned: 'next follow-up',
  },
  leadTaskFeedback:
    'The contact confirmed their interest. Send brief minutes and agree on the next step.',
  cadenceMatters: [
    'weekly progress check-in',
    'proposal details confirmation',
    'requirements clarification meeting',
    'demo preparation',
    'contract terms follow-up',
    'pilot acceptance',
    'phase review',
    'procurement follow-up',
    'training plan discussion',
    'upgrade and renewal discussion',
  ],
  cadenceFeedback: [
    "Went through this week's progress and confirmed the next step.",
    'The customer added two requirements, now recorded.',
    'Confirmed the timeline and the participants.',
    'Adjusted the demo materials to the feedback.',
  ],
  replyPrefix: 'Re: ',
  mail: enMail,
  mailSenders: enMailSenders,
  approvals: {
    discount: {
      name: 'Northfield Precision Enterprise discount exception',
      description:
        'Requesting a 10% discount; the customer commits to a joint manufacturing case study after go-live.',
    },
    paymentTerms: {
      name: 'Brightway Retail payment terms review',
      description: 'The customer asks for 60-day payment terms on the upgrade.',
      comment:
        '60-day payment terms approved; state the first invoice amount in the contract.',
    },
    contractTerms: {
      name: 'Bluecrest IT client project licence terms review',
      description:
        'The integrator wants the contract to state the licence scope for applications delivered to end customers.',
    },
    commitment: {
      name: 'Sunridge Energy go-live commitment review',
      description:
        'The customer wants the contract to commit to go-live within 6 weeks, shorter than the standard delivery schedule; the implementation team needs to confirm capacity.',
    },
  },
};
