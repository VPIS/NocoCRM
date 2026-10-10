import type { DemoContent } from './types.js';
import { enMail, enMailSenders } from './mail-en-US.js';
import { enProjects } from './projects-en-US.js';

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
        "Northfield Precision Manufacturing makes precision automotive components in three factories, with about 2,600 employees; its customers are tier-one suppliers to several joint-venture carmakers.\n\nProduction reporting, equipment inspections and quality incidents still run on Excel and an OA system that is ten years old:\n\n- team leaders total the production reports by hand every day, so yesterday's output is only visible at noon;\n- equipment checks are done on paper forms and photographed into group chats, so issues are hard to follow to closure;\n- a quality incident takes three days on average to reach the person responsible.\n\nThe IT centre plans a unified production management system on NocoBase: production reporting and inspections first, then the MES and ERP integration. It must be deployed in their own data centre on an Enterprise cluster, with an audit log of every change. The budget was approved at the start of the year; the head of the IT centre decides.",
    },
    {
      name: 'Brightway Retail Group',
      domain: 'brightway-retail',
      description:
        "Brightway Retail Group runs 460 neighbourhood stores. Two years ago its IT team built a store inspection app on NocoBase Community: store managers submit inspections from their phones and area managers follow the fixes. It has run smoothly for over a year.\n\nThis year they want to extend the same platform to two new areas:\n\n1. **Membership**: points, coupon redemption and in-store event sign-ups in one place;\n2. **Supplier collaboration**: more than 300 suppliers confirming orders, uploading delivery notes and reconciling invoices in a portal.\n\nThe users will grow from a few dozen to over a thousand, so they need single sign-on with the group's directory and multi-level approval workflows for orders and reconciliation, which is why they are upgrading from Community to Professional. Finance would like to pay the upgrade on 60-day terms.",
    },
    {
      name: 'Stonebridge Medical Group',
      domain: 'stonebridge-medical',
      description:
        "Stonebridge Medical Group runs five tertiary hospitals and two community health centres, with about 9,000 staff.\n\nIts IT department is choosing one workflow platform for the hospitals' administrative processes (equipment repairs, supply requests, meeting rooms and official vehicles), replacing the separate systems each hospital bought on its own. Today every hospital has a different repair system, and the group cannot see equipment failure rates or repair costs.\n\nThree things matter most: permissions down to hospital, department and role; an audit log of every action kept for at least six years; and support for the Kingbase database, which the group's IT localisation programme requires.",
    },
    {
      name: 'Bluecrest Information Technology',
      domain: 'bluecrest-it',
      description:
        'Bluecrest Information Technology is a system integrator of about 80 people that builds custom management systems for manufacturing and public-sector customers. It used to write every project from scratch, which made delivery slow and maintenance expensive.\n\nSince last year it has used NocoBase as its delivery platform and has already launched equipment registers, project management and contract approval apps for three end customers, cutting delivery from four months to six weeks on average.\n\nIt buys Professional licences per project, and each contract has to state:\n\n- whether Bluecrest or the end customer holds the licence;\n- whether Bluecrest may keep developing for the customer after delivery;\n- who owns the source code and the plugins Bluecrest writes.\n\nThose terms are in contract review.',
    },
    {
      name: 'Clearpath Education Group',
      domain: 'clearpath-education',
      description:
        'Clearpath Education Group runs more than 40 campuses in 12 cities, mostly K-12 tutoring, with about 30,000 students enrolled.\n\nAdmissions, class scheduling and parent communication each run on a different SaaS product, so student and parent details are kept in three places, and every term the academic staff export and reconcile timetables by hand; the two weeks before term are overtime for the whole team.\n\nThe group wants all three on a platform of its own: one record per student and parent, timetables sent straight to parents, and admissions figures for every campus as they happen.',
    },
    {
      name: 'Silverline Data Services',
      domain: 'silverline-data',
      description:
        'Silverline Data Services is a data consulting team of about 30 people doing business analytics and data governance projects for retail and consumer goods clients.\n\nThe team built its internal delivery workspace on NocoBase to manage client requests, delivery milestones, timesheets and invoices, replacing a set of shared spreadsheets. It started on Standard with a dozen users and will consider upgrading as the team grows and clients ask for a portal.',
    },
    {
      name: 'Sunridge Energy',
      domain: 'sunridge-energy',
      description:
        "Sunridge Energy operates and maintains more than 60 solar plants in the north-west, with its maintenance staff spread across the sites.\n\nIt evaluated NocoBase for a plant inspection and project collaboration platform: inspectors log defects on tablets, the project office tracks the fixes and head office sees an overall dashboard. The technical evaluation is done and the operations department liked the demo; the customer also wants the contract to commit to the inspection dashboard going live within six weeks.\n\nThe group tightened its budget for the second half of the year and postponed the purchase approval to next year's first quarter, so the project is paused until the budget comes through.",
    },
    {
      name: 'Goldleaf Foods',
      domain: 'goldleaf-foods',
      description:
        "Goldleaf Foods makes condiments and sells through more than 2,000 dealers. Its custom-built dealer management system had become expensive to maintain.\n\nWe reached the final round of the selection, and the business teams liked both the demo and the proof of concept. To keep one technology stack, the group's IT finally chose the low-code platform another subsidiary already uses, and the opportunity is closed. The customer said it would evaluate us again for a separate project.",
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
        'Hello, I am Grace Mitchell, IT manager at Northfield Precision Manufacturing. I saw your demo at the industrial trade show last week and would like to know more.\n\nWe have three factories, and production reporting, equipment checks and quality incidents all run on Excel and an old OA system, so the figures arrive a day late and problems are hard to trace. A few questions:\n\n1. Can it be deployed in our own data centre, and what servers does an Enterprise cluster need?\n2. Can we import our existing Excel production reports? There are about three years of history.\n3. We want to connect our MES and ERP later; are there existing integrations or case studies?\n\nWe plan to start next quarter and the budget was approved at the start of the year. Could you arrange an online demo, ideally with our production manager attending too?',
    },
    {
      name: 'Ryan Cooper',
      mailbox: 'ryan.cooper',
      company: 'Clearpath Education Group',
      message:
        "Website message:\n\nWe are Clearpath Education Group, with more than 40 campuses. Admissions run on one SaaS product, scheduling on another and parent communication on a third, and reconciling the data takes two weeks every term. We want one system of our own and would like to ask:\n\n- What are the main differences between Professional and Enterprise? About 600 teachers would use it.\n- Can it handle complex scheduling rules, such as room clashes and teachers' maximum hours?\n- Can parents use it from a mobile app?\n\nPlease send a quotation and education case studies to my email. Thank you.",
    },
    {
      name: 'Chloe Adams',
      mailbox: 'chloe.adams',
      company: 'Brightway Retail Group',
      message:
        'We already run our store inspections on Community; more than 400 store managers use it every day and it has been very stable.\n\nWe now plan to put membership and supplier collaboration on the same platform, which will bring many more users and needs single sign-on with our company directory. Two questions: how is the Professional upgrade priced, per user or per instance? And how is SSO set up in Professional; does it need an extra plugin?\n\nAlso, will our existing data and pages carry over after the upgrade?',
    },
    {
      name: 'Nathan Reed',
      mailbox: 'nathan.reed',
      company: 'Farreach Logistics',
      message:
        'Trade show visitor: Nathan Reed, head of operations at Farreach Logistics, which runs more than 400 long-haul trucks between the east coast and the south-west.\n\nDispatch runs on phone calls and Excel: dispatchers phone each driver for a location, and customers keep calling to ask when deliveries will arrive, which overloads customer service. He wants a dispatch and customer collaboration system where dispatchers assign trucks on one screen and customers track their shipments and arrival times themselves.\n\nHe left a business card and would like a qualification call soon; the first call is not booked yet.',
    },
    {
      name: 'Hannah Price',
      mailbox: 'hannah.price',
      company: 'Maple Lane Retail',
      message:
        'Downloaded the white paper "Building Internal Business Systems with NocoBase" from the website; the form gave the purpose as "learning about low-code platforms for next year\'s digital plan".\n\nThe company is Maple Lane Retail; its size and needs were left blank, and there has been no other contact yet.',
    },
    {
      name: 'Marcus Bell',
      mailbox: 'marcus.bell',
      company: 'Greenacre Agriculture',
      message:
        "Discovery done: Greenacre Agriculture is an agricultural supplies dealer selling fertiliser, seed and crop protection through more than 800 village stores.\n\nOrders and inventory are all in Excel, each warehouse keeps its own copy, the monthly stocktake closes the business for a day, and store reconciliations often do not match. They want orders, inventory and store reconciliation in one system first, with delivery route planning later.\n\nMarcus is the owner's son and leads the digital work; he decides quickly but is price-sensitive.",
    },
    {
      name: 'Laura Hughes',
      mailbox: 'laura.hughes',
      company: 'Stonebridge Medical Group',
      message:
        'Hello, I am Laura Hughes from the IT department of Stonebridge Medical Group. The group is choosing one platform for the administrative processes of its five hospitals, and NocoBase is on our shortlist.\n\nBefore the next round we need to confirm a few hard requirements:\n\n**1. Permissions**: data visibility controlled by hospital, department and role, and some form fields hidden from certain roles.\n\n**2. Approval workflows**: equipment repairs and supply requests need multi-level approval, amounts above a limit need a hospital director to countersign, and approvers should be able to act from their phones.\n\n**3. Audit**: every create, update, delete and export logged and kept for at least six years, searchable by person and time.\n\n**4. Localisation**: Kingbase database support is mandatory, ideally with a deployment reference on Kylin OS.\n\nIf all of these are met, we would like an on-site technical session next month with the IT department and the equipment managers of several hospitals.',
    },
    {
      name: 'Kevin Foster',
      mailbox: 'kevin.foster',
      company: 'Trailhead Software',
      message:
        "Hello, we are Trailhead Software, a software company of about 50 people building custom management systems for small and mid-sized manufacturers.\n\nWe recently evaluated NocoBase and think it suits us well as a delivery platform. Some questions about the Professional licence for client applications:\n\n1. Is the licence for an application we deliver bought in our name or the client's?\n2. Can one licence cover several client projects?\n3. Can the plugins we write be reused in other client projects, and who owns them?\n4. Do you have partner pricing?\n\nWe expect six to eight projects this year and are looking for a long-term partnership.",
    },
    {
      name: 'Rachel Morgan',
      mailbox: 'rachel.morgan',
      company: 'Brightway Education',
      message:
        "Head of academic affairs at Brightway Education, comparing three low-code platforms (NocoBase and two others) for course management and teacher evaluation.\n\nStill gathering information; the budget waits for next quarter's management meeting. She would like product material and a price range first and does not need a demo yet.",
    },
    {
      name: 'Adam Sullivan',
      mailbox: 'adam.sullivan',
      company: 'Riverbend Electronics',
      message:
        'A development engineer at Riverbend Electronics trying Community to build a prototype for R&D project management; he already has a backlog and an iteration board.\n\nThe project is not approved internally yet. He will get back in touch about a purchase once his department heads have seen the prototype and the project is approved, probably in one to two months.',
    },
    {
      name: 'Megan Ward',
      mailbox: 'megan.ward',
      company: 'Polaris Properties',
      message:
        'IT manager at Polaris Properties, doing early research on digitalising property and construction management while looking at several SaaS and low-code products.\n\nThe group will have a formal budget only next year. She would like industry case studies and product updates once a quarter, without frequent calls.',
    },
    {
      name: 'Tyler Grant',
      mailbox: 'tyler.grant',
      company: 'Bayside Consulting',
      message:
        'A website enquiry from someone with two years of NocoBase plugin development experience looking for part-time or contract development work, with a link to his portfolio.\n\nThis is not a purchase; we replied pointing him to our partner programme and the community job board.',
    },
    {
      name: 'Jason Palmer',
      mailbox: 'jason.palmer',
      company: 'Highridge Textiles',
      message:
        'A lead from a trade show badge scan: the phone number does not exist and the email bounced.\n\nThe company, Highridge Textiles, is in the business register, but no other contact details could be found, so it cannot be followed up for now.',
    },
    {
      name: 'Ethan Walsh',
      mailbox: 'ethan.walsh',
      company: 'Trailhead Software',
      message:
        "I am Ethan Walsh, technical lead at Trailhead Software, on the same project as our CEO Kevin.\n\nI am evaluating the technical side: can plugins be developed, built and released independently in TypeScript? Does Enterprise include the source code? We need to customise on the client's site, so I would like to know how to set up the development environment and how our plugins stay compatible when NocoBase is upgraded.",
    },
    {
      name: 'Natalie Shaw',
      mailbox: 'natalie.shaw',
      company: 'Fairharvest Agriculture',
      message:
        "Referred by our partner Bluecrest IT: Fairharvest Agriculture's service centre has 30 agents answering more than a thousand dealer questions a day about orders and shipping, most of them repeated.\n\nThey want to know whether AI employees can read their order data, answer the common questions and open tickets, leaving only the complex cases to people. No first conversation yet; the referrer says they have time this month.",
    },
    {
      name: 'Brian Fisher',
      mailbox: 'brian.fisher',
      company: 'Pinecrest Manufacturing',
      message:
        'We are a team of 20 selling and servicing industrial equipment.\n\nOur customers are in Excel, project delivery happens in group chats, and the month-end report takes a whole day to put together by hand. The owner wants one system for customers, project delivery and reporting.\n\nThe budget is limited, so we would like to know how far Standard goes, whether you have a plan for small teams, and whether we can try it free for a while.',
    },
  ],
  leadJobTitles: ['IT Manager', 'Head of IT'],
  taskDescription:
    "**Goal**\nReview the latest progress, confirm what the customer needs and what worries them, and agree on the next steps and when.\n\n**Before**\n- Go through the recent conversations and emails and list the questions the customer has not answered;\n- Confirm who joins from their side and what each of them cares about;\n- Bring the latest version of the proposal or quotation.\n\n**After**\nWrite the conclusions and to-dos into this task's result, and submit any terms that need approval.",
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
        "The first phase of Northfield Precision's production management platform is a RMB 280,000 contract. We request an 18% discount, beyond the 10% a sales manager may approve.\n\nWhy:\n\n- the customer is a reference account in automotive components and plans to extend to the MES and ERP integration after the three factories go live;\n- it commits to a joint manufacturing case study after go-live and to hosting two peer visits;\n- a competitor quoted about 15% below us, and the customer says price is the final deciding factor.\n\nIf approved, the contract will state that the discount applies to the first phase only and renewals are at list price.",
    },
    paymentTerms: {
      name: 'Brightway Retail payment terms review',
      description:
        'Brightway Retail is upgrading from Community to Professional for RMB 45,000. Its finance policy pays suppliers 60 days after the invoice, beyond our standard 30 days.\n\nThe customer has used Community steadily for over a year and pays reliably, and the extension will bring many more users and likely renewals. We recommend accepting 60-day terms, with the first invoice issued when the contract is signed.',
      comment:
        '60-day payment terms approved; state the first invoice amount in the contract.',
    },
    contractTerms: {
      name: 'Bluecrest IT client project licence terms review',
      description:
        'Bluecrest IT buys Professional licences per project as a system integrator and delivers custom applications to its end customers. It wants the contract to state that:\n\n1. Bluecrest buys the licence and hands it to the end customer after delivery;\n2. Bluecrest may keep developing for that customer after delivery;\n3. Bluecrest owns the plugins it writes and may reuse them in other projects.\n\nPoints 1 and 2 match our partner policy; point 3 goes beyond the standard licence agreement, and legal needs to confirm the wording.',
    },
    commitment: {
      name: 'Sunridge Energy go-live commitment review',
      description:
        'Sunridge Energy wants the contract to state that "the inspection dashboard goes live within 6 weeks of signing", with a daily service-fee deduction for any delay.\n\nOur standard delivery takes 8 to 10 weeks. The implementation team\'s first estimate: if the customer provides the equipment registers of all 60 plants within a week of signing and assigns a dedicated contact, the dashboard can go live in 6 weeks, with the full inspection process moving to a second phase.\n\nThe implementation team needs to confirm the schedule, and the contract should spell out what the customer must provide.',
    },
  },
  projects: enProjects,
};
