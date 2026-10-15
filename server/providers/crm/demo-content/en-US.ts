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
      name: 'Shanghai Electric',
      domain: 'shanghai-electric',
      website: 'https://www.shanghai-electric.com',
      description:
        "Shanghai Electric is one of China's largest industrial equipment groups, headquartered in Shanghai, making power generation equipment, industrial equipment and integrated solutions, with a workforce in the tens of thousands and annual revenue of over RMB 100 billion.\n\nThe IT centre of one of its manufacturing businesses wants production reporting, equipment inspections and quality issues for several factories in one system:\n\n- each factory's output should be totalled on the same day, without collecting spreadsheets by hand;\n- equipment checks should be filled in on the phone, with every issue followed to closure;\n- a quality issue should reach the person responsible quickly, with a complete trail for customer audits.\n\nThe IT centre plans a unified production management platform on NocoBase. Phase one covers production reporting and inspections on the pilot lines; phase two connects the MES and the ERP so that work orders, materials and costs line up.\n\nIt must be deployed in their own data centre on an Enterprise cluster, keep an audit log of every change, and import the historical production reports. The project budget is approved; the head of the IT centre decides and the production manager joins the requirement reviews. We met them at the Shanghai industrial trade show; the deal is at proposal, competing with another low-code vendor.",
      address: 'Shanghai\nShanghai Electric, IT Centre',
    },
    {
      name: 'Intime Department Store',
      domain: 'intime',
      website: 'https://www.intime.com.cn',
      description:
        'Intime Department Store is a department store and shopping centre chain headquartered in Hangzhou, with stores in Zhejiang and other provinces.\n\nTwo years ago its IT team built a store inspection app on NocoBase Community: floor managers submit inspections from their phones and store managers follow the fixes. It has run smoothly for over a year, with thousands of inspections a month.\n\nThis year they want to extend the same platform to two new areas:\n\n1. Membership: points, coupon redemption and in-store event sign-ups managed in one place;\n2. Supplier collaboration: brand suppliers confirming orders, uploading delivery notes and reconciling statements in a portal, saving purchasing many confirmation calls a day.\n\nThe users will grow from a few dozen to over a thousand, so they need single sign-on with the company directory and multi-level approval workflows for orders and reconciliation, which is why they are upgrading from Community to Professional.\n\nThe customer came through a referral and likes the product; its concerns are the price and whether the existing data carries over smoothly. Finance would like to pay the upgrade on 60-day terms, which is in approval.',
      address: 'Hangzhou\nIntime Department Store headquarters, IT department',
    },
    {
      name: 'United Family Healthcare',
      domain: 'ufh',
      website: 'https://www.ufh.com.cn',
      description:
        "United Family Healthcare is a private healthcare network headquartered in Beijing, with hospitals and clinics in several Chinese cities.\n\nIts IT department is choosing one workflow platform for administrative processes (equipment repairs, supply requests, meeting rooms and vehicles), so that every hospital and clinic follows the same processes and the group can see equipment repairs and their costs across sites.\n\nThree things matter most:\n\n- permissions down to site, department and role, with some fields hidden from certain roles;\n- an audit log of every action kept for at least six years and searchable by person and time;\n- support for a domestic database such as Kingbase, which the project's requirements include.\n\nLaura Hughes from the IT department is our main contact, and the decision goes through the group's IT committee. The deal is in negotiation; the customer would like an on-site technical session next month with the equipment managers of several sites.",
      address:
        'Chaoyang District, Beijing\nUnited Family Healthcare, IT department',
    },
    {
      name: 'Digital China',
      domain: 'digitalchina',
      website: 'https://www.digitalchina.com',
      description:
        'Digital China is a major Chinese IT services group based in Shenzhen, offering cloud, digital transformation and system integration services to enterprise and public-sector customers.\n\nOne of its solution delivery teams uses NocoBase as its delivery base, so that custom management systems start from a platform rather than from scratch. Since last year the team has launched equipment registers, project management and contract approval apps for three end customers on it, with shorter delivery and lighter maintenance than fully custom code.\n\nIt buys Professional licences per project and expects three new projects this year. Each contract has to state:\n\n- whether Digital China or the end customer holds the licence;\n- whether Digital China may keep developing for the customer after delivery;\n- who owns the source code and the plugins the team writes, and whether they can be reused in other projects.\n\nThose terms are in contract review. Digital China is also our partner and has referred two customers to us, so the relationship is close.',
      address: 'Shenzhen\nDigital China, solution delivery team',
    },
    {
      name: "Xi'an Jiaotong-Liverpool University",
      domain: 'xjtlu',
      website: 'https://www.xjtlu.edu.cn',
      description:
        "Xi'an Jiaotong-Liverpool University (XJTLU) is an international joint-venture university in Suzhou, founded by Xi'an Jiaotong University and the University of Liverpool, teaching in English.\n\nIts IT team wants admissions, course scheduling and notices to students and staff on one platform of its own:\n\n- one record per applicant and student, from first enquiry to enrolment;\n- scheduling that respects classroom clashes and teaching-hour limits, with timetables published straight to students and staff;\n- admissions figures for every programme as they come in.\n\nToday each of these lives in a separate tool, and the academic staff would like to stop reconciling timetables by hand before every semester.\n\nRyan Cooper, an IT manager at the university, contacted us through the website; we are at first contact and they are still comparing Professional and Enterprise.",
      address:
        "111 Ren'ai Road, Suzhou Industrial Park, Suzhou\nXi'an Jiaotong-Liverpool University, IT department",
    },
    {
      name: 'XGIMI Technology',
      domain: 'xgimi',
      website: 'https://www.xgimi.com',
      description:
        "XGIMI Technology is a Chengdu-based maker of smart projectors and home entertainment devices, selling in China and abroad.\n\nIts commercial projects and after-sales team built an internal workbench on NocoBase to manage customer and partner requests, delivery milestones, timesheets and service tickets, replacing a set of shared spreadsheets. Since then, project managers' weekly reports take half an hour instead of half a day.\n\nIt started on Standard with a dozen users. Next it wants a portal where customers and partners follow delivery progress and download reports themselves, which needs Professional; that upgrade is signed.",
      address:
        'High-tech Zone, Chengdu\nXGIMI Technology, project delivery team',
    },
    {
      name: 'NARI Technology',
      domain: 'naritech',
      website: 'https://www.naritech.cn',
      description:
        "NARI Technology is a Nanjing-based supplier of power grid automation, control and energy information systems.\n\nOne of its project delivery units evaluated NocoBase for a field inspection and project collaboration platform: field engineers log and photograph issues on tablets at project sites, the project office tracks the fixes and management sees an overall dashboard. The unit wants every issue followed from discovery to closure in one place, instead of across group chats and a weekly spreadsheet.\n\nThe technical evaluation is done and the operations team liked the demo; the customer also wants the contract to commit to the inspection dashboard going live within six weeks, which is in internal review.\n\nThe purchase has moved to the next budget cycle, so the project is paused. The customer's contact says it will restart when the new cycle opens and suggests we keep in touch monthly.",
      address:
        'Jiangning District, Nanjing\nNARI Technology, project delivery unit',
    },
    {
      name: 'Guangzhou Restaurant Group',
      domain: 'gzr',
      website: 'https://www.gzr.com.cn',
      description:
        'Guangzhou Restaurant Group is a long-established Cantonese food company headquartered in Guangzhou, known for its restaurants, mooncakes and packaged and frozen foods, sold through its own shops and through distributors.\n\nIts sales and channel teams were selecting a new distributor management system, with orders, approvals and statements for distributors in one place.\n\nWe reached the final round of the selection; the sales and channel teams liked both the demo and the proof of concept, especially the distributor portal and the flexible order approvals.\n\nIn the end the group decided to build the distributor system in-house with its own IT team, and the opportunity is closed. The customer said it would be glad to look at us again for an independent project, and we will keep in touch every quarter.',
      address: 'Guangzhou\nGuangzhou Restaurant Group, IT department',
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
    'Main business decision maker.\n\nOwns the overall IT plan and approves the budget; cares about return on investment and long-term scalability rather than technical detail. Likes to see the conclusion and a reference case before the proposal.\n\nHer department meets at the start of every month, so important proposals should reach her a week before.',
    'Contact for the technical evaluation.\n\nOwns technology choices and integration, and asks detailed questions about deployment architecture, data security and interfaces; his assessment weighs heavily with the decision maker.\n\nPrefers email for technical questions and answers quickly; avoids meetings on Friday afternoons.',
  ],
  churnComments:
    "The group decided to build its distributor system in-house with its own IT team, and the account has churned.\n\nLooking back: the business teams rated us highly, but we reached the group's IT late and only learned of its in-house plan in the last round. Their IT lead joined the evaluation at the very end.\n\nNext: a quarterly check-in to catch any independent project, and share the lesson with the team.",
  companyNotes: [
    [
      {
        heading: 'First visit',
        body: "Met the head of the IT centre and the production manager at Shanghai Electric and walked two pilot lines. Team leaders total each shift's production report in spreadsheets, and equipment check sheets are kept on paper at the machines.\n\nThey care about two things: whether the factories' figures can be totalled as they happen, and whether the system can run in their own data centre. I presented Enterprise clustering and the audit log, and the head of IT said on the spot that this is the right direction and asked for a proposal.\n\nNext: send the proposal within two weeks and book a detailed requirements interview with the production manager.",
        reply:
          'Put the phase-two MES integration into the proposal as well; their head of IT cares a lot about the long-term plan.',
      },
      {
        heading: 'Requirements interview',
        body: "Went through production reporting step by step with the production manager: one report per line per shift, recording output, defects and downtime, with every defect linked to a quality issue. Equipment checks are daily, weekly and monthly, and the weekly and monthly ones need the equipment department's sign-off.\n\nThey would also like to scan a machine's QR code on a phone to open its check sheet, fill it in when the network is poor and sync later. The offline part needs confirming with the implementation team.\n\nSent the requirements list to the customer for confirmation.",
      },
      {
        heading: 'Proposal meeting',
        body: 'Demonstrated the prototype built from the requirements list: the production dashboard, the check forms and how quality issues are assigned. The head of IT liked the dashboard and asked whether it can drill down by factory, line and team.\n\nOn the commercial side, the customer mentioned that a competitor quoted about 15% below us, though it cannot run as a private cluster. We offered a discount in exchange for a joint case study; the customer is open to it, and the 18% discount exception is submitted.\n\nThey want the formal quotation next week.',
        reply:
          "I'll look at the discount soon. Agree the form of the case study with their marketing team first and put it in a contract annex.",
      },
    ],
    [
      {
        heading: 'Account review',
        body: "Visited Intime's IT team. The store inspection app on Community has run smoothly for over a year with thousands of inspections a month, and the store managers say fixes are followed much faster than before.\n\nThey are planning membership and supplier collaboration and asked whether they can keep the same platform. I presented Professional's single sign-on, approval workflows and support for many more users; they are very interested.\n\nNext: prepare the upgrade proposal and quotation, explaining how the existing data and pages carry over.",
      },
      {
        heading: 'Upgrade proposal review',
        body: "Reviewed the upgrade proposal with the customer's head of IT and finance. No technical objections: single sign-on with the company directory and multi-level approvals were both confirmed in the demo.\n\nFinance asked to pay the upgrade on 60-day terms. The customer has always paid reliably, so I submitted the payment terms for review.\n\nThey also want the upgrade downtime under two hours, on a weekend night.",
        reply:
          "I've approved the 60-day terms; remember to put the first invoice amount in the contract. Confirm the upgrade window with them in writing a week ahead.",
      },
      {
        heading: 'Contract details',
        body: "The customer's legal team asked for two changes: who is responsible for the data migration, and whether the apps they built on Community stay supported after the upgrade. We replied that we handle the migration and that the existing apps fall under Professional support.\n\nThey have no other questions and expect to finish their internal sign-off this week.",
      },
    ],
    [
      {
        heading: 'First call with IT',
        body: "Had an online session with Laura Hughes about the project's requirements. The group wants equipment repairs and supply requests handled the same way at every hospital and clinic, with the data in one place.\n\nLaura stressed that a domestic database such as Kingbase is mandatory and the audit log must be kept for six years. I confirmed our deployment references in localised environments and promised a compatibility note.",
      },
      {
        heading: 'On-site demo',
        body: "Gave an on-site demo to the IT department and the equipment managers of two hospitals: permissions by site, department and role, and repair approvals handled from the phone.\n\nThe equipment managers care about dispatching contractors and measuring their response times, and asked whether outside contractors could get an entry that shows only their own tickets. Professional's permissions do that, and I showed it briefly.\n\nThey want a complete implementation plan, including when the first processes go live.",
        reply:
          'Make deployment testing in the localised environment a separate phase in the plan; their IT committee will certainly ask.',
      },
      {
        heading: 'Commercial negotiation',
        body: 'Negotiated the commercial terms with IT and procurement. They broadly accept the price but want the implementation paid in two parts, the first after the first processes go live.\n\nProcurement also asked for our security assessment documents. The delivery team confirmed we can provide them; they go out next week.',
      },
    ],
    [
      {
        heading: 'Partner quarterly review',
        body: "Quarterly review with the general manager and the technical lead of Digital China's solution delivery team. They have delivered three projects on NocoBase this year, and their customers are happy.\n\nThey expect three more projects this year, want to buy licences annually, and want the contract to state who holds the licence and who owns the plugins they write. We promised a partner licensing proposal.",
      },
      {
        heading: 'Licence terms',
        body: "Went through Digital China's three licence terms one by one: Digital China buys the licence and hands it to the end customer, may keep developing after delivery, and owns and may reuse the plugins it writes.\n\nThe first two match our partner policy; the third goes beyond the standard licence agreement, so it is in contract terms review, waiting for legal's wording.",
        reply:
          'Legal leans towards "Digital China owns the IP of the plugins it writes; the NocoBase licence terms are unchanged". Please run that direction past the customer first.',
      },
      {
        heading: 'Client project kick-off',
        body: "Digital China presented its first new project this year: a park management app for a logistics park. They would like our technical support to join a requirements review to confirm how to connect the park's access control system.\n\nThe online review is booked for next Tuesday; I'll bring a solutions engineer.",
      },
    ],
    [
      {
        heading: 'First call',
        body: 'Called Ryan Cooper back. XJTLU wants admissions, course scheduling and notices to students and staff on one platform, so that the academic staff no longer reconcile timetables by hand before each semester.\n\nRyan is most interested in scheduling and asked a lot about classroom clashes and teaching-hour limits. I promised a scheduling prototype and sent two education case studies first.',
      },
      {
        heading: 'Demo preparation',
        body: 'Built a scheduling prototype with a delivery colleague: courses scheduled by classroom, teacher and student group, clashes flagged as they happen, and each finished timetable published to students and staff.\n\nAlso prepared a comparison of Professional and Enterprise. For this scope Professional covers almost everything; Enterprise mainly adds clustering and finer auditing.',
        reply:
          "In the demo, spend more time on the students' side; universities usually care most about what students and teachers see.",
      },
    ],
    [
      {
        heading: 'Three-month review',
        body: "XGIMI's delivery workbench has been live for three months, and I reviewed it with the team's delivery director. Project managers' weekly reports take half an hour instead of half a day, and timesheets no longer need totalling by hand at month end.\n\nNext they want a portal where customers and partners follow delivery progress and download reports, which needs Professional.",
      },
      {
        heading: 'Upgrade signed',
        body: 'The customer confirmed the upgrade to Professional and the contract is signed. The portal goes live next month, first for three key partners.\n\nThe delivery director asked for a training session on portal permissions, which is booked with the delivery team.',
        reply:
          "This could be a good case study; once it's live, ask whether they'd be willing to share it.",
      },
    ],
    [
      {
        heading: 'Technical evaluation',
        body: "NARI's project delivery unit finished the technical evaluation. Field engineers tried logging and photographing issues on tablets, offline at sites with poor connections, and the evaluation concluded that it meets their needs.\n\nThe head of operations wants the contract to commit to the inspection dashboard going live within six weeks. Our standard is 8 to 10 weeks, so the go-live commitment is in internal review.",
      },
      {
        heading: 'Moved to the next budget cycle',
        body: "The customer's contact told us the purchase has moved to the next budget cycle, so the project is paused. They will contact us as soon as the new cycle opens.\n\nI suggest keeping in touch monthly during the pause and putting the evaluation material in order so we can move fast when it restarts.",
        reply:
          'Agreed. We can also invite them to our online sessions during the pause to keep them warm.',
      },
    ],
    [
      {
        heading: 'POC results',
        body: "Guangzhou Restaurant Group's proof of concept is over. The sales and channel teams rated the distributor portal and the flexible order approvals highly, especially adding approval rules without development.\n\nThe group's IT, however, is weighing whether to build the system itself, so the decision moves to group level.",
      },
      {
        heading: 'Selection result',
        body: 'The customer told us formally that the group has decided to build the distributor system in-house with its own IT team. They thanked us for the product and the service and are open to working with us on an independent project later.\n\nI marked the opportunity as lost and booked a quarterly check-in.',
        reply:
          "A pity. Lesson for next time: with group customers, learn the group IT's plans early.",
      },
    ],
  ],
  deals: [
    'Production management platform (Enterprise + implementation)',
    'Membership and supplier collaboration (upgrade to Professional)',
    'Hospital workflow platform (Enterprise)',
    'Integrator annual project licences (Professional × 3)',
    'Admissions and course scheduling platform (Professional)',
    'Delivery workbench (upgrade to Professional)',
    'Custom store inspection plugin',
    'Field inspection and project collaboration platform (Enterprise)',
    'Distributor management system (Professional + implementation)',
    'Implementation services renewal',
    'Delivery workbench (Standard + training)',
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
    'Distributor portal (Enterprise)',
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
      company: 'Shanghai Electric',
      message:
        "Hello, I am Grace Mitchell, IT manager in one of Shanghai Electric's manufacturing businesses. I saw your demo at the industrial trade show last week and would like to know more.\n\nWe want production reporting, equipment checks and quality issues for several factories in one system, with the figures available the same day and every problem traceable. A few questions:\n\n1. Can it be deployed in our own data centre, and what servers does an Enterprise cluster need?\n2. Can we import our existing production reports from spreadsheets? There are several years of history.\n3. We want to connect our MES and ERP later; are there existing integrations or case studies?\n\nWe plan to start next quarter and the project budget is approved. Could you arrange an online demo, ideally with our production manager attending too?",
      companyDescription:
        "Shanghai Electric is one of China's largest industrial equipment groups, headquartered in Shanghai, making power generation equipment, industrial equipment and integrated solutions.\n\nGrace Mitchell is an IT manager in one of its manufacturing businesses, which wants a unified production management platform for several factories: production reporting, equipment checks and quality issues, deployed in its own data centre.\n\nShe met us at the Shanghai industrial trade show and asked for a demo with the production manager.",
      address: 'Shanghai\nShanghai Electric, IT Centre',
    },
    {
      name: 'Ryan Cooper',
      mailbox: 'ryan.cooper',
      company: "Xi'an Jiaotong-Liverpool University",
      message:
        "Website message:\n\nHello, I'm Ryan Cooper, an IT manager at Xi'an Jiaotong-Liverpool University. Admissions, course scheduling and notices to students and staff each run in a different tool today, and we would like to bring them onto one platform of our own.\n\nA few questions:\n\n- What are the main differences between Professional and Enterprise for a university our size?\n- Can it handle complex scheduling rules, such as classroom clashes, teachers' teaching-hour limits and a student never booked into two courses at once?\n- Can students and staff see their timetables and notices on their phones?\n- Our team is small; can we maintain it ourselves?\n\nIf it fits, we'd like to see education case studies first and then an online demo. Please send a quotation and material to my email. Thank you.",
      companyDescription:
        "Xi'an Jiaotong-Liverpool University (XJTLU) is an international joint-venture university in Suzhou Industrial Park, founded by Xi'an Jiaotong University and the University of Liverpool, teaching in English.\n\nRyan Cooper is an IT manager at the university, looking at one platform for admissions, course scheduling and notices to students and staff.\n\nHe contacted us through the website and is comparing Professional and Enterprise.",
      address:
        "111 Ren'ai Road, Suzhou Industrial Park, Suzhou\nXi'an Jiaotong-Liverpool University, IT department",
    },
    {
      name: 'Chloe Adams',
      mailbox: 'chloe.adams',
      company: 'Intime Department Store',
      message:
        'We already run our store inspections on Community; our store managers use it every day and it has been very stable.\n\nWe now plan to put membership and supplier collaboration on the same platform, which will bring many more users and needs single sign-on with our company directory. Two questions: how is the Professional upgrade priced, per user or per instance? And how is SSO set up in Professional; does it need an extra plugin?\n\nAlso, will our existing data and pages carry over after the upgrade?',
      companyDescription:
        'Intime Department Store is a department store and shopping centre chain headquartered in Hangzhou, with stores in Zhejiang and other provinces.\n\nIts IT team built its store inspection app on NocoBase Community and plans to extend the platform to membership and supplier collaboration this year.\n\nChloe Adams leads the digital rollout to the stores from the Hangzhou head office.',
      address: 'Hangzhou\nIntime Department Store headquarters, IT department',
    },
    {
      name: 'Nathan Reed',
      mailbox: 'nathan.reed',
      company: 'SF Express',
      message:
        'Trade show visitor: Nathan Reed, an operations manager at SF Express whose team looks after contract logistics customers.\n\nHis team coordinates onboarding requests, special handling and service reviews for these customers across email and spreadsheets, and wants a collaboration workspace where tasks are assigned on one screen and customers can follow their own requests.\n\nHe left a business card and would like a qualification call soon; the first call is not booked yet.',
      companyDescription:
        "SF Express is one of China's largest express delivery and logistics companies, headquartered in Shenzhen.\n\nNathan Reed is an operations manager whose team looks after contract logistics customers. He asked at the trade show about a workspace for coordinating customer requests with his team.",
      address: 'Shenzhen\nSF Express, operations',
    },
    {
      name: 'Hannah Price',
      mailbox: 'hannah.price',
      company: 'Freshippo (Hema)',
      message:
        'Downloaded the white paper "Building Internal Business Systems with NocoBase" from the website; the form gave the purpose as "learning about low-code platforms for next year\'s digital plan".\n\nThe company is Freshippo (Hema); the department and needs were left blank, and there has been no other contact yet.',
      companyDescription:
        "Freshippo (Hema) is a fresh-food grocery retailer headquartered in Shanghai, with stores in many Chinese cities and online ordering with home delivery.\n\nWe know little about the contact's team yet. The white paper form gave the purpose as preparing next year's digital plan.",
      address: 'Shanghai\nFreshippo (Hema)',
    },
    {
      name: 'Marcus Bell',
      mailbox: 'marcus.bell',
      company: 'Tongwei',
      message:
        "Discovery done: Marcus Bell works in a regional sales team of Tongwei's feed business, which sells to dealers and farms.\n\nThe team wants orders, regional inventory and dealer reconciliation in one system instead of separate spreadsheets for each warehouse, with delivery route planning later.\n\nMarcus leads the digital work for the region; he decides quickly and watches cost closely.",
      companyDescription:
        "Tongwei is a Chengdu-based group with businesses in agriculture, chiefly aquatic and livestock feed, and in solar energy.\n\nMarcus Bell works in a regional sales team of the feed business and is pushing to bring the team's orders, inventory and dealer reconciliation into one system.",
      address: 'Chengdu\nTongwei, feed business',
    },
    {
      name: 'Laura Hughes',
      mailbox: 'laura.hughes',
      company: 'United Family Healthcare',
      message:
        "Hello, I am Laura Hughes from the IT department of United Family Healthcare. We are choosing one platform for the administrative processes of our hospitals and clinics, and NocoBase is on our shortlist.\n\nBefore the next round we need to confirm a few hard requirements:\n\n1. Permissions. Data visibility controlled by site, department and role, and some form fields hidden from certain roles; purchase prices, for example, only for the equipment department and finance.\n\n2. Approval workflows. Equipment repairs and supply requests need multi-level approval, larger amounts need a hospital director's countersignature, approvers should be able to act from their phones, and overdue approvals should send reminders.\n\n3. Audit. Every create, update, delete and export logged and kept for at least six years, searchable by person and time and exportable for security assessments.\n\n4. Database. Support for a domestic database such as Kingbase is mandatory for this project, ideally with a deployment reference on Kylin OS.\n\nIf all of these are met, we would like an on-site technical session next month with the IT department and the equipment managers of several sites. We would also like to understand the implementation timeline: we hope to have the first processes live before the end of next year's first quarter.",
      companyDescription:
        "United Family Healthcare is a private healthcare network headquartered in Beijing, with hospitals and clinics in several Chinese cities.\n\nLaura Hughes leads the workflow platform selection in the IT department; the project's requirements include support for a domestic database.\n\nThe decision goes through the group's IT committee and is expected next quarter.",
      address:
        'Chaoyang District, Beijing\nUnited Family Healthcare, IT department',
    },
    {
      name: 'Kevin Foster',
      mailbox: 'kevin.foster',
      company: 'Kingsoft Office',
      message:
        "Hello, I lead an enterprise solutions team at Kingsoft Office. Our enterprise customers often ask us for custom business applications alongside their office suite deployments.\n\nWe recently evaluated NocoBase and think it suits us well as a delivery platform for those applications. Some questions about the Professional licence for client applications:\n\n1. Is the licence for an application we deliver bought in our name or the client's?\n2. Can one licence cover several client projects?\n3. Can the plugins we write be reused in other client projects, and who owns them?\n4. Do you have partner pricing?\n\nWe expect several such projects this year and are looking for a long-term partnership.",
      companyDescription:
        "Kingsoft Office is a Beijing-based office software company, best known for WPS Office, serving individuals, enterprises and public-sector organisations.\n\nKevin Foster leads an enterprise solutions team that wants a low-code platform for the custom applications its enterprise customers request; Ethan Walsh, the team's technical lead, is on the same evaluation.\n\nThe team expects several client projects this year and wants a long-term platform partner.",
      address:
        'Haidian District, Beijing\nKingsoft Office, enterprise solutions team',
    },
    {
      name: 'Rachel Morgan',
      mailbox: 'rachel.morgan',
      company: 'New Oriental',
      message:
        "Head of academic affairs in one of New Oriental's training businesses, comparing three low-code platforms (NocoBase and two others) for course management and teacher evaluation.\n\nStill gathering information; the budget waits for next quarter's planning meeting. She would like product material and a price range first and does not need a demo yet.",
      companyDescription:
        "New Oriental is an education company headquartered in Beijing, offering language training, test preparation and other education services across China.\n\nRachel Morgan heads academic affairs in one of its training businesses and is comparing three low-code platforms for course management and teacher evaluation. The budget waits for next quarter's planning meeting.",
      address: 'Haidian District, Beijing\nNew Oriental, academic affairs',
    },
    {
      name: 'Adam Sullivan',
      mailbox: 'adam.sullivan',
      company: 'Luxshare Precision',
      message:
        "A development engineer at Luxshare Precision trying Community to build a prototype for his R&D team's project management; he already has a backlog and an iteration board.\n\nThe project is not approved internally yet. He will get back in touch about a purchase once his department heads have seen the prototype and the project is approved, probably in one to two months.",
      companyDescription:
        "Luxshare Precision is a large precision manufacturer of connectors, cables, consumer electronics and automotive components.\n\nAdam Sullivan is a development engineer building a prototype for his R&D team's project management on Community, with a backlog and an iteration board. The project is not approved internally yet.",
      address: 'Shenzhen\nLuxshare Precision, R&D',
    },
    {
      name: 'Megan Ward',
      mailbox: 'megan.ward',
      company: 'Vanke',
      message:
        'IT manager at Vanke, doing early research on digitalising property and construction management while looking at several SaaS and low-code products.\n\nHer department plans its formal budget for next year. She would like industry case studies and product updates once a quarter, without frequent calls.',
      companyDescription:
        "Vanke is one of China's best-known property developers, headquartered in Shenzhen, with residential and commercial projects and property services.\n\nMegan Ward is an IT manager doing early research on digitalising property and construction management. Her department plans its formal budget for next year.",
      address: 'Yantian District, Shenzhen\nVanke, IT department',
    },
    {
      name: 'Tyler Grant',
      mailbox: 'tyler.grant',
      company: 'Deloitte China',
      message:
        'A personal website enquiry from someone with two years of NocoBase plugin development experience looking for part-time or contract development work, with a link to his portfolio.\n\nThis is not a purchase; we replied pointing him to our partner programme and the community job board.',
      companyDescription:
        'Deloitte China is a professional services firm offering audit, tax, consulting and advisory services, with offices in Shanghai and other Chinese cities.\n\nThe form named Deloitte China as the company, but the enquiry is a personal one: Tyler Grant says he has two years of NocoBase plugin development experience and is looking for part-time or contract work; this is not a purchase.',
      address: 'Shanghai',
    },
    {
      name: 'Jason Palmer',
      mailbox: 'jason.palmer',
      company: 'Hengli Group',
      message:
        'A lead from a trade show badge scan: the phone number does not exist and the email bounced.\n\nThe badge names Hengli Group, but with no working contact details this person cannot be followed up for now.',
      companyDescription:
        'Hengli Group is a large petrochemical and textile group headquartered in Suzhou.\n\nThe phone number left at the trade show badge scan does not exist and the email bounced; we have no other way to reach this contact.',
      address: 'Wujiang District, Suzhou',
    },
    {
      name: 'Ethan Walsh',
      mailbox: 'ethan.walsh',
      company: 'Kingsoft Office',
      message:
        "I am Ethan Walsh, technical lead of an enterprise solutions team at Kingsoft Office, on the same project as Kevin.\n\nI am evaluating the technical side: can plugins be developed, built and released independently in TypeScript? Does Enterprise include the source code? We need to customise on the client's site, so I would like to know how to set up the development environment and how our plugins stay compatible when NocoBase is upgraded.",
      companyDescription:
        'Kingsoft Office is a Beijing-based office software company, best known for WPS Office.\n\nEthan Walsh is the technical lead of an enterprise solutions team, evaluating plugin development and source code delivery on the same evaluation as the team lead, Kevin Foster.',
      address:
        'Haidian District, Beijing\nKingsoft Office, enterprise solutions team',
    },
    {
      name: 'Natalie Shaw',
      mailbox: 'natalie.shaw',
      company: 'COFCO',
      message:
        "Referred by our partner Digital China: a customer service team in one of COFCO's businesses answers many questions a day from distributors about orders and shipping, most of them repeated.\n\nThey want to know whether AI employees can read their order data, answer the common questions and open tickets, leaving only the complex cases to people. No first conversation yet; the referrer says they have time this month.",
      companyDescription:
        "COFCO is a state-owned agriculture and food group headquartered in Beijing, working across grain, oilseeds, food processing and trading.\n\nReferred by our partner Digital China. Natalie Shaw runs a customer service team in one of its businesses and wants to know whether AI employees can read the order data and answer distributors' common questions.",
      address: 'Dongcheng District, Beijing\nCOFCO, customer service centre',
    },
    {
      name: 'Brian Fisher',
      mailbox: 'brian.fisher',
      company: 'ZPMC',
      message:
        'We are a 20-person after-sales service team at ZPMC.\n\nOur team keeps its customer list, service projects and month-end report in separate spreadsheets and chats, and wants one system for customers, project delivery and reporting.\n\nOur department budget is limited, so we would like to know how far Standard goes, whether you have a plan for small teams, and whether we can try it free for a while.',
      companyDescription:
        'ZPMC is a Shanghai-based maker of port cranes and heavy machinery.\n\nBrian Fisher leads a 20-person after-sales service team that wants one system for its customers, service projects and reports, on a limited department budget.',
      address: 'Pudong New Area, Shanghai\nZPMC, after-sales service',
    },
  ],
  leadJobTitles: ['IT Manager', 'Head of IT'],
  taskDescription:
    "**Goal**\nReview the latest progress, confirm what the customer needs and what worries them, and agree on the next steps and when.\n\n**Before**\n- Go through the recent conversations and emails and list the questions the customer has not answered;\n- Confirm who joins from their side and what each of them cares about;\n- Bring the latest version of the proposal or quotation.\n\n**After**\nWrite the conclusions and to-dos into this task's result, and submit any terms that need approval.",
  discoveryCall: {
    name: 'Discovery call',
    feedback:
      'Confirmed about 200 people reporting production across the pilot factories; leaning towards Enterprise deployed privately, with an initial budget of RMB 300,000.\n\nTheir priorities, in order: same-day production figures, equipment checks followed to closure, and quality issues assigned quickly. The head of the IT centre decides, and the production manager joins the evaluation.\n\nNext: send a manufacturing case study and book a product demo focused on the production dashboard and the check process.',
  },
  productDemo: {
    name: 'Product demo',
    feedback:
      "Demonstrated the admissions and scheduling prototype; the team confirmed its interest and introduced the director of academic affairs.\n\nThe director was most interested in clash warnings and the students' timetable, and asked a lot about teaching-hour limits. The admissions lead wants to see each programme's applicant conversion funnel.\n\nNext: adjust the prototype to the director's rules, give a second demo in two weeks, and prepare a Professional quotation.",
  },
  convertedLeadTasks: [
    [
      {
        name: 'First call back',
        result:
          'Reached Grace Mitchell by phone. She saw the demo at the industrial trade show and is most interested in production reporting and equipment checks.\n\nWe booked a discovery call for the day after tomorrow; she will bring the production manager and gather the reporting spreadsheets the pilot factories use today.',
      },
      {
        name: 'Send manufacturing case studies and a price range',
        result:
          'Sent Grace Mitchell two case studies from equipment manufacturing customers and the price range for Enterprise deployed privately.\n\nShe replied that the budget is within the range and the head of the IT centre agreed to go ahead; next, we open an opportunity and arrange a demo for the production department.',
      },
    ],
    [
      {
        name: 'Confirm the demo time and attendees',
        result:
          "Confirmed the online demo on Thursday afternoon with Ryan Cooper: the admissions lead and two academic staff will join, and the director of academic affairs will try to.\n\nRyan wants to focus on clash warnings and the students' timetable, so both come in the first half of the demo.",
      },
      {
        name: 'Write up the demo feedback',
        result:
          'Sent Ryan Cooper a list of the questions raised in the demo: the rules for teaching-hour limits, courses shared between departments, and notices to students and staff.\n\nHe replied that the team has confirmed its interest and the director of academic affairs will lead the evaluation, so it can move on as an opportunity.',
      },
    ],
  ],
  invalidLeadTasks: [
    {
      name: 'Reply to the partnership enquiry',
      result:
        'Replied to Tyler Grant, pointing him to the partner programme and the community job board, and explained that we have no contract work to offer.\n\nThis is not a purchase; the lead is marked invalid.',
    },
    {
      name: 'Check the contact details by phone',
      result:
        'The phone number from the trade show scan does not exist, and the email sent to the address on the badge bounced.\n\nThe badge names Hengli Group, but we have no other way to reach this contact; the lead is marked invalid.',
    },
  ],
  completedMatters: [
    'requirements workshop',
    'contract review',
    'security and compliance assessment',
    'plugin development review',
    'admissions POC',
    'delivery retrospective',
  ],
  completedFeedback: [
    'Agreed the scope of the first phase and recorded the acceptance criteria.\n\nPhase one covers production reporting, equipment checks and quality issues on the pilot lines; acceptance means two weeks of same-day production figures and 90% of check issues closed within 48 hours. The MES integration is a separate project.',
    'Legal review is done; waiting for procurement to sign off.\n\nLegal changed two points, responsibility for the data migration and support for the existing apps after the upgrade, both adjusted as the customer asked. Procurement says sign-off usually takes three to five working days.',
    'The customer asked for deployment notes on audit logs, SSO and domestic Chinese databases.\n\nIn the assessment the IT department went through each security requirement: audit logs kept for six years and exportable, SSO with the company directory, and Kingbase as the database. We promised written notes within a week, with references for localised environments.',
    "The integrator confirmed the plugin development approach; deployment is still to be verified in the end customer's environment.\n\nDigital China's technical lead built an access control plugin in TypeScript, and packaging and release both worked. Next is a deployment test on the end customer's internal network, where the main risk is the few ports their servers open.",
    "The director of academic affairs wants a lightweight proof of concept first.\n\nShe suggests scheduling one school's courses for two weeks to check the rules cover real life before rolling out further. We agreed to a single-school POC, and the academic staff will provide last semester's real timetables.",
    'Delivery complete; the customer is happy with the go-live and the reports.\n\nIn the retrospective the delivery director said weekly reports take far less time and timesheets are much more accurate. Two improvements were requested, timesheets on the phone and per-customer PDF exports, both recorded for the next phase.',
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
    'The contact confirmed their interest. Send brief minutes and agree on the next step.\n\nThey confirmed the budget range and the decision process and would like to see a case from their industry first. Minutes are sent; another call next week to go through the proposal.',
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
    "Went through this week's progress and confirmed the next step.\n\nThe customer's internal requirement review is done; our contact is on leave next week and their technical lead takes over. We owe them the revised proposal by Friday.",
    'The customer added two requirements, now recorded.\n\nThey want approvals on the phone and a company watermark on exported reports. Neither changes the current scope; both are on the requirements list to confirm at the next call.',
    'Confirmed the timeline and the participants.\n\nFrom their side the head of IT, a business manager and procurement; from ours, me, a solutions engineer and the implementation manager. The meeting is next Wednesday afternoon, two hours.',
    "Adjusted the demo materials to the feedback.\n\nFollowing last time's feedback, the generic feature tour is gone and the customer's own scenarios and sample data are in; the demo is down from an hour to forty minutes, leaving time for questions.",
  ],
  replyPrefix: 'Re: ',
  mail: enMail,
  mailSenders: enMailSenders,
  approvals: {
    discount: {
      name: 'Shanghai Electric Enterprise discount exception',
      description:
        "The first phase of Shanghai Electric's production management platform is a RMB 280,000 contract. We request an 18% discount, beyond the 10% a sales manager may approve.\n\nWhy:\n\n- the customer is a reference account in equipment manufacturing and plans to extend to the MES and ERP integration after the pilot factories go live;\n- it commits to a joint manufacturing case study after go-live and to hosting two peer visits;\n- a competitor quoted about 15% below us, and the customer says price is the final deciding factor.\n\nIf approved, the contract will state that the discount applies to the first phase only and renewals are at list price.",
    },
    paymentTerms: {
      name: 'Intime Department Store payment terms review',
      description:
        'Intime Department Store is upgrading from Community to Professional for RMB 45,000. Its finance team asked to pay 60 days after the invoice, beyond our standard 30 days.\n\nThe customer has used Community steadily for over a year and pays reliably, and the extension will bring many more users and likely renewals. We recommend accepting 60-day terms, with the first invoice issued when the contract is signed.',
      comment:
        '60-day payment terms approved; state the first invoice amount in the contract.',
    },
    contractTerms: {
      name: 'Digital China client project licence terms review',
      description:
        'Digital China buys Professional licences per project as a system integrator and delivers custom applications to its end customers. It wants the contract to state that:\n\n1. Digital China buys the licence and hands it to the end customer after delivery;\n2. Digital China may keep developing for that customer after delivery;\n3. Digital China owns the plugins it writes and may reuse them in other projects.\n\nPoints 1 and 2 match our partner policy; point 3 goes beyond the standard licence agreement, and legal needs to confirm the wording.',
    },
    commitment: {
      name: 'NARI Technology go-live commitment review',
      description:
        'NARI Technology wants the contract to state that "the inspection dashboard goes live within 6 weeks of signing", with a daily service-fee deduction for any delay.\n\nOur standard delivery takes 8 to 10 weeks. The implementation team\'s first estimate: if the customer provides the equipment registers of the pilot sites within a week of signing and assigns a dedicated contact, the dashboard can go live in 6 weeks, with the full inspection process moving to a second phase.\n\nThe implementation team needs to confirm the schedule, and the contract should spell out what the customer must provide.',
    },
  },
  projects: enProjects,
};
