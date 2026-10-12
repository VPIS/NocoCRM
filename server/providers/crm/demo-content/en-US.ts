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
        "Northfield Precision Manufacturing is based in Shanghai and makes precision automotive components in three nearby factories, with about 450 employees and annual revenue of about RMB 380 million; its customers are tier-one suppliers to several joint-venture carmakers.\n\nProduction reporting, equipment inspections and quality incidents still run on Excel and an OA system that is ten years old:\n\n- team leaders total the production reports by hand every day, so yesterday's output is only visible at noon and the month-end reconciliation rarely matches;\n- equipment checks are done on paper forms and photographed into group chats, so issues are hard to follow to closure; last year a press fault that was not acted on stopped a line for two days;\n- a quality incident takes three days on average to reach the person responsible, which makes customer audits hard work.\n\nThe IT centre plans a unified production management system on NocoBase. Phase one covers production reporting and inspections on the 12 lines of the three factories; phase two connects the MES and the ERP so that work orders, materials and costs line up.\n\nIt must be deployed in their own data centre on an Enterprise cluster, keep an audit log of every change, and import three years of Excel production reports. The budget was approved at the start of the year; the head of the IT centre decides and the production manager joins the requirement reviews. We met them at the Shanghai industrial trade show; the deal is at proposal, competing with another low-code vendor.",
      address:
        '218 Huting North Road, Jiuting, Songjiang District, Shanghai\nNorthfield Precision, Building 1, 3rd floor, IT Centre',
    },
    {
      name: 'Brightway Retail Group',
      domain: 'brightway-retail',
      description:
        "Brightway Retail Group is based in Hangzhou and runs 460 neighbourhood stores, two-thirds of them franchised, with about 800 head-office and regional staff and annual revenue of about RMB 1.2 billion.\n\nTwo years ago its IT team built a store inspection app on NocoBase Community: store managers submit inspections from their phones and area managers follow the fixes. It has run smoothly for over a year, with more than ten thousand inspections a month.\n\nThis year they want to extend the same platform to two new areas:\n\n1. Membership: points, coupon redemption and in-store event sign-ups in one place, replacing the current mini-app back office;\n2. Supplier collaboration: more than 300 suppliers confirming orders, uploading delivery notes and reconciling invoices in a portal, saving purchasing dozens of confirmation calls a day.\n\nThe users will grow from a few dozen to over a thousand, so they need single sign-on with the group's directory and multi-level approval workflows for orders and reconciliation, which is why they are upgrading from Community to Professional.\n\nThe customer came through a referral and likes the product; its concerns are the price and whether the existing data carries over smoothly. Finance would like to pay the upgrade on 60-day terms, which is in approval.",
      address:
        '186 Hushu South Road, Gongshu District, Hangzhou\nBrightway Retail Group headquarters, 8th floor',
    },
    {
      name: 'Stonebridge Medical Group',
      domain: 'stonebridge-medical',
      description:
        "Stonebridge Medical Group is a private healthcare group in Beijing with three specialist hospitals and five clinics, about 450 staff and annual revenue of about RMB 650 million.\n\nIts IT department is choosing one workflow platform for administrative processes (equipment repairs, supply requests, meeting rooms and official vehicles), replacing the separate systems each site bought on its own. Every hospital has a different repair system today, the group cannot see equipment failure rates or repair costs, and part of the supply requests are still on paper.\n\nThree things matter most:\n\n- permissions down to site, department and role, with some fields hidden from certain roles;\n- an audit log of every action kept for at least six years and searchable by person and time;\n- support for the Kingbase database, which the group's IT localisation programme requires.\n\nLaura Hughes from the IT department is our main contact, and the decision goes through the group's IT committee. The deal is in negotiation; the customer would like an on-site technical session next month with the equipment managers of several sites.",
      address:
        '38 East 3rd Ring North Road, Chaoyang District, Beijing\nStonebridge Medical Group headquarters, 5th floor, IT department',
    },
    {
      name: 'Bluecrest Information Technology',
      domain: 'bluecrest-it',
      description:
        'Bluecrest Information Technology is a system integrator in Shenzhen with about 80 people and annual revenue of about RMB 85 million, building custom management systems for manufacturing and public-sector customers. It used to write every project from scratch, which made delivery slow and maintenance expensive.\n\nSince last year it has used NocoBase as its delivery platform and has already launched equipment registers, project management and contract approval apps for three end customers, cutting delivery from four months to six weeks on average and halving the maintenance effort.\n\nIt buys Professional licences per project and expects three new projects this year. Each contract has to state:\n\n- whether Bluecrest or the end customer holds the licence;\n- whether Bluecrest may keep developing for the customer after delivery;\n- who owns the source code and the plugins Bluecrest writes, and whether they can be reused in other projects.\n\nThose terms are in contract review. Bluecrest is also our partner and has referred two customers to us, so the relationship is close.',
      address:
        'Shenzhen Software Park, Building 2, 9 Gaoxin South 7th Road, Nanshan District, Shenzhen\n7th floor',
    },
    {
      name: 'Clearpath Education Group',
      domain: 'clearpath-education',
      description:
        "Clearpath Education Group is based in Suzhou and runs 8 campuses in Suzhou and Wuxi, mostly K-12 tutoring, with about 180 teachers and staff, about 4,000 students and annual revenue of about RMB 60 million.\n\nAdmissions, class scheduling and parent communication each run on a different SaaS product, so student and parent details are kept in three places. Every term the academic staff export and reconcile timetables by hand, the two weeks before term are overtime for the whole team, and parents complain about installing several apps to see timetables and homework.\n\nThe group wants all three on a platform of its own:\n\n- one record per student and parent;\n- scheduling that respects room clashes and teachers' maximum hours, with timetables sent straight to parents;\n- admissions figures for every campus as they happen.\n\nRyan Cooper, who leads IT at the group, contacted us through the website; we are at first contact and they are still comparing Professional and Enterprise.",
      address:
        'Creative Industry Park, Building 11, 328 Xinghu Street, Suzhou Industrial Park\n3rd floor, Clearpath Education Group headquarters',
    },
    {
      name: 'Silverline Data Services',
      domain: 'silverline-data',
      description:
        "Silverline Data Services is a data consulting team in Chengdu with about 30 people and annual revenue of about RMB 18 million, doing business analytics and data governance projects for retail and consumer goods clients.\n\nThe team built its internal delivery workspace on NocoBase to manage client requests, delivery milestones, timesheets and invoices, replacing a set of shared spreadsheets. Since then, project managers' weekly reports take half an hour instead of half a day.\n\nIt started on Standard with a dozen users. Next it wants a portal where clients follow delivery progress and download reports themselves, which needs Professional; that upgrade is signed.",
      address:
        'Meinian Plaza, Tower A, 1388 Middle Tianfu Avenue, High-tech Zone, Chengdu\n22nd floor',
    },
    {
      name: 'Sunridge Energy',
      domain: 'sunridge-energy',
      description:
        "Sunridge Energy is based in Nanjing and operates and maintains more than 60 solar plants in the north-west, with about 400 employees, most of them spread across the sites, and annual revenue of about RMB 900 million.\n\nIt evaluated NocoBase for a plant inspection and project collaboration platform: inspectors log and photograph defects on tablets, the project office tracks the fixes and head office sees an overall dashboard. Today this runs on group chats and a weekly Excel summary, and a defect takes two weeks on average from discovery to closure.\n\nThe technical evaluation is done and the operations department liked the demo; the customer also wants the contract to commit to the inspection dashboard going live within six weeks, which is in internal review.\n\nThe group tightened its budget for the second half of the year and postponed the purchase approval to next year's first quarter, so the project is paused. The customer's contact says it will restart as soon as the budget comes through and suggests we keep in touch monthly.",
      address:
        'Sunridge Energy Tower, 68 Shengtai Road, Moling, Jiangning District, Nanjing\n12th floor, Operations Management',
    },
    {
      name: 'Goldleaf Foods',
      domain: 'goldleaf-foods',
      description:
        "Goldleaf Foods is a condiment maker based in Guangzhou with about 900 employees, annual revenue of about RMB 1.5 billion and more than 2,000 dealers. Its custom-built dealer management system had become expensive to maintain, and new requests often waited months.\n\nWe reached the final round of the selection; the sales and channel teams liked both the demo and the proof of concept, especially the dealer portal and the flexible order approvals.\n\nTo keep one technology stack, the group's IT finally chose the low-code platform another subsidiary already uses, and the opportunity is closed. The customer said it would evaluate us again for a separate project, and we will keep in touch every quarter.",
      address:
        '1001 Yayun Avenue, Shilou, Panyu District, Guangzhou\nGoldleaf Foods, Administration Building, 4th floor, IT department',
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
    "The group standardised on another low-code platform, and the dealer management system moved with it.\n\nLooking back: the business teams rated us highly, but we reached the group's IT too late and did not learn about its plan to standardise on one stack. Their head of IT only joined the evaluation in the last round, by which time the competitor was already live at other subsidiaries.\n\nNext: a quarterly check-in to catch any separate project, and share the lesson with the team.",
  companyNotes: [
    [
      {
        heading: 'First visit',
        body: "Met the head of the IT centre and the production manager at Northfield's Shanghai head office and walked two lines in the main factory. Team leaders spend forty minutes at the end of every shift totalling production reports in Excel, and the equipment check sheets taped to the machines have plenty of empty boxes.\n\nThey care about two things: whether the three factories' figures can be totalled as they happen, and whether the system can run in their own data centre. I presented Enterprise clustering and the audit log, and the head of IT said on the spot that this is the right direction and asked for a proposal.\n\nNext: send the proposal within two weeks and book a detailed requirements interview with the production manager.",
        reply:
          'Put the phase-two MES integration into the proposal as well; their head of IT cares a lot about the long-term plan.',
      },
      {
        heading: 'Requirements interview',
        body: "Went through production reporting step by step with the production manager: one report per line per shift, recording output, defects and downtime, with every defect linked to a quality incident. Equipment checks are daily, weekly and monthly, and the weekly and monthly ones need the equipment department's sign-off.\n\nThey would also like to scan a machine's QR code on a phone to open its check sheet, fill it in when the network is poor and sync later. The offline part needs confirming with the implementation team.\n\nSent the requirements list to the customer for confirmation.",
      },
      {
        heading: 'Proposal meeting',
        body: 'Demonstrated the prototype built from the requirements list: the production dashboard, the check forms and how quality incidents are assigned. The head of IT liked the dashboard and asked whether it can drill down by factory, line and team.\n\nOn the commercial side, the customer let slip that a competitor quoted about 15% below us, though it cannot run as a private cluster. We offered a discount in exchange for a joint case study; the customer is open to it, and the 18% discount exception is submitted.\n\nThey want the formal quotation next week.',
        reply:
          "I'll look at the discount soon. Agree the form of the case study with their marketing team first and put it in a contract annex.",
      },
    ],
    [
      {
        heading: 'Account review',
        body: "Visited Brightway's IT team. The store inspection app on Community has run smoothly for over a year with more than ten thousand inspections a month, and the area managers say fixes are followed much faster than before.\n\nThey are planning membership and supplier collaboration and asked whether they can keep the same platform. I presented Professional's single sign-on, approval workflows and support for many more users; they are very interested.\n\nNext: prepare the upgrade proposal and quotation, explaining how the existing data and pages carry over.",
      },
      {
        heading: 'Upgrade proposal review',
        body: "Reviewed the upgrade proposal with the customer's head of IT and finance. No technical objections: single sign-on with the company directory and multi-level approvals were both confirmed in the demo.\n\nFinance wants to pay the upgrade on 60-day terms, its standard for every supplier. The customer has always paid reliably, so I submitted the payment terms for review.\n\nThey also want the upgrade downtime under two hours, on a weekend night.",
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
        body: "Had an online session with Laura Hughes about the group's localisation requirements and current systems. Each of the three hospitals and five clinics has its own repair system, part of the supply requests are still on paper, and the group has no shared data.\n\nLaura stressed that Kingbase is mandatory and the audit log must be kept for six years. I confirmed our deployment references in localised environments and promised a compatibility note.",
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
        body: "Quarterly review with Bluecrest's general manager and technical lead. They have delivered three projects on NocoBase this year in six weeks each on average, and their customers are happy.\n\nThey expect three more projects this year, want to buy licences annually, and want the contract to state who holds the licence and who owns the plugins they write. We promised a partner licensing proposal.",
      },
      {
        heading: 'Licence terms',
        body: "Went through Bluecrest's three licence terms one by one: Bluecrest buys the licence and hands it to the end customer, may keep developing after delivery, and owns and may reuse the plugins it writes.\n\nThe first two match our partner policy; the third goes beyond the standard licence agreement, so it is in contract terms review, waiting for legal's wording.",
        reply:
          'Legal leans towards "Bluecrest owns the IP of the plugins it writes; the NocoBase licence terms are unchanged". Please run that direction past the customer first.',
      },
      {
        heading: 'Client project kick-off',
        body: "Bluecrest presented its first new project this year: a park management app for a logistics park. They would like our technical support to join a requirements review to confirm how to connect the park's access control system.\n\nThe online review is booked for next Tuesday; I'll bring a solutions engineer.",
      },
    ],
    [
      {
        heading: 'First call',
        body: "Called Ryan Cooper back. Clearpath has 8 campuses, with admissions, scheduling and parent communication each on a different SaaS product, and the academic staff work overtime for two weeks before every term reconciling data.\n\nRyan is most interested in scheduling and asked a lot about room clashes and teachers' maximum hours. I promised a scheduling prototype and sent two education case studies first.",
      },
      {
        heading: 'Demo preparation',
        body: "Built a scheduling prototype with a delivery colleague: classes scheduled by campus, room, teacher and group, clashes flagged as they happen, and each finished timetable turned into a version parents can see.\n\nAlso prepared a comparison of Professional and Enterprise. At Clearpath's size Professional covers almost everything; Enterprise mainly adds clustering and finer auditing.",
        reply:
          "In the demo, spend more time on the parents' side; school principals usually care most about the parent experience.",
      },
    ],
    [
      {
        heading: 'Three-month review',
        body: "Silverline's delivery workspace has been live for three months, and I reviewed it with their delivery director. Project managers' weekly reports take half an hour instead of half a day, and timesheets no longer need totalling by hand at month end.\n\nNext they want a client portal where clients follow delivery progress and download reports, which needs Professional.",
      },
      {
        heading: 'Upgrade signed',
        body: 'The customer confirmed the upgrade to Professional and the contract is signed. The client portal goes live next month, first for three key clients.\n\nThe delivery director asked for a training session on portal permissions, which is booked with the delivery team.',
        reply:
          "This could be our consulting case study; once it's live, ask whether they'd be willing to share it.",
      },
    ],
    [
      {
        heading: 'Technical evaluation',
        body: "Sunridge's operations department finished the technical evaluation. Inspectors tried logging and photographing defects on tablets, offline at sites with poor connections, and the evaluation concluded that it meets their needs.\n\nThe head of operations wants the contract to commit to the inspection dashboard going live within six weeks. Our standard is 8 to 10 weeks, so the go-live commitment is in internal review.",
      },
      {
        heading: 'Budget postponed',
        body: "The customer's contact told us the group has tightened its budget for the second half of the year and postponed all new IT purchases to next year's first quarter. The project is paused, and they will contact us as soon as the budget comes through.\n\nI suggest keeping in touch monthly during the pause and putting the evaluation material in order so we can move fast when it restarts.",
        reply:
          'Agreed. We can also invite them to our online sessions during the pause to keep them warm.',
      },
    ],
    [
      {
        heading: 'POC results',
        body: "Goldleaf's proof of concept is over. The sales and channel teams rated the dealer portal and the flexible order approvals highly, especially adding approval rules without development.\n\nThe group's IT, however, wants to weigh consistency with the systems other subsidiaries use, so the decision moves to group level.",
      },
      {
        heading: 'Selection result',
        body: "The customer told us formally that, to keep one technology stack, the group's IT chose the low-code platform another subsidiary already uses. They thanked us for the product and the service and will evaluate us again for a separate project.\n\nI marked the opportunity as lost and booked a quarterly check-in.",
        reply:
          "A pity. Lesson for next time: with group customers, learn the group IT's technology plans early.",
      },
    ],
  ],
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
      companyDescription:
        'Northfield Precision Manufacturing is a Shanghai maker of precision automotive components with three factories nearby, supplying tier-one suppliers to joint-venture carmakers; its products include precision stampings for steering and braking systems.\n\nRevenue has grown steadily over the past three years, and last year it passed its IATF 16949 re-audit; customer audits ask more and more about production traceability. Its systems are mostly Excel and an old OA system, with no MES.\n\nIts website lists open roles in IT development and data analysis, a sign of planned digital investment this year.',
      address:
        '218 Huting North Road, Jiuting, Songjiang District, Shanghai\nNorthfield Precision, Building 1, 3rd floor, IT Centre',
    },
    {
      name: 'Ryan Cooper',
      mailbox: 'ryan.cooper',
      company: 'Clearpath Education Group',
      message:
        "Website message:\n\nHello, I'm Ryan Cooper, head of IT at Clearpath Education Group. We have 8 campuses in Suzhou and Wuxi. Admissions run on one SaaS product, scheduling on another and parent communication on a third; reconciling the data takes two weeks every term, and parents complain about installing several apps.\n\nWe want one system of our own and would like to ask:\n\n- What are the main differences between Professional and Enterprise? About 150 teachers and staff would use it.\n- Can it handle complex scheduling rules, such as room clashes, teachers' maximum hours and a student never booked into two classes at once?\n- Can parents use it from a mobile app to see timetables, homework and payments?\n- We have no full-time developers, just one person each in academic affairs and IT; can we maintain it ourselves?\n\nIf it fits, we'd like to see education case studies first and then an online demo. Please send a quotation and material to my email. Thank you.",
      companyDescription:
        "Clearpath Education Group is a K-12 tutoring group based in Suzhou, with 8 campuses in Suzhou and Wuxi, about 180 teachers and staff and about 4,000 students.\n\nThe group is preparing a Beijing branch this year; Ryan Cooper is in Beijing setting up the new campus's systems while overseeing the group's overall IT plans.\n\nPublic sources say the group raised a funding round last year and plans to grow to 20 campuses within three years, so it needs a management system it can roll out quickly.",
      address:
        'Zhongguancun Building, 27 Zhongguancun Street, Haidian District, Beijing\nRoom 1206, 12th floor (Clearpath Education, Beijing branch)',
    },
    {
      name: 'Chloe Adams',
      mailbox: 'chloe.adams',
      company: 'Brightway Retail Group',
      message:
        'We already run our store inspections on Community; more than 400 store managers use it every day and it has been very stable.\n\nWe now plan to put membership and supplier collaboration on the same platform, which will bring many more users and needs single sign-on with our company directory. Two questions: how is the Professional upgrade priced, per user or per instance? And how is SSO set up in Professional; does it need an extra plugin?\n\nAlso, will our existing data and pages carry over after the upgrade?',
      companyDescription:
        'Brightway Retail Group is based in Hangzhou and runs 460 neighbourhood stores in East and South China, two-thirds of them franchised, selling fresh food and household goods.\n\nIt started building its own systems two years ago with an IT team of about 12, built its store inspection app on NocoBase Community, and plans to extend it to membership and supplier collaboration this year.\n\nChloe Adams leads digital rollout for South China from the Shenzhen regional office, which manages more than 80 stores.',
      address:
        'Changhong Science Building, 18 Keji South 12th Road, Nanshan District, Shenzhen\n9th floor, Brightway Retail South China regional office',
    },
    {
      name: 'Nathan Reed',
      mailbox: 'nathan.reed',
      company: 'Farreach Logistics',
      message:
        'Trade show visitor: Nathan Reed, head of operations at Farreach Logistics, which runs more than 400 long-haul trucks between the east coast and the south-west.\n\nDispatch runs on phone calls and Excel: dispatchers phone each driver for a location, and customers keep calling to ask when deliveries will arrive, which overloads customer service. He wants a dispatch and customer collaboration system where dispatchers assign trucks on one screen and customers track their shipments and arrival times themselves.\n\nHe left a business card and would like a qualification call soon; the first call is not booked yet.',
      companyDescription:
        'Farreach Logistics is a Hangzhou long-haul carrier with more than 400 trucks of its own, running between the east coast and the south-west for consumer goods and appliance brands.\n\nDispatch runs on phone calls and Excel, and customer service takes a hundred calls a day asking when deliveries will arrive. Trackers were fitted to the trucks last year, but their data is not connected to dispatch or customer service.\n\nNathan Reed is head of operations and asked about dispatch and customer collaboration at the trade show.',
      address:
        '733 Jianshe 3rd Road, Economic and Technological Development Zone, Xiaoshan District, Hangzhou\nFarreach Logistics Park, Main Building, 2nd floor, Operations Centre',
    },
    {
      name: 'Hannah Price',
      mailbox: 'hannah.price',
      company: 'Maple Lane Retail',
      message:
        'Downloaded the white paper "Building Internal Business Systems with NocoBase" from the website; the form gave the purpose as "learning about low-code platforms for next year\'s digital plan".\n\nThe company is Maple Lane Retail; its size and needs were left blank, and there has been no other contact yet.',
      companyDescription:
        "Maple Lane Retail is a regional convenience store chain in Shanghai with more than 120 stores, mostly in Pudong and Minhang.\n\nThere is little public information; its website mentions store digitalisation and a recent opening for a digital project manager. The white paper form gave the purpose as preparing next year's digital plan.",
      address:
        'China Resources Times Square, 500 Zhangyang Road, Pudong New Area, Shanghai\n15th floor',
    },
    {
      name: 'Marcus Bell',
      mailbox: 'marcus.bell',
      company: 'Greenacre Agriculture',
      message:
        "Discovery done: Greenacre Agriculture is an agricultural supplies dealer selling fertiliser, seed and crop protection through more than 800 village stores.\n\nOrders and inventory are all in Excel, each warehouse keeps its own copy, the monthly stocktake closes the business for a day, and store reconciliations often do not match. They want orders, inventory and store reconciliation in one system first, with delivery route planning later.\n\nMarcus is the owner's son and leads the digital work; he decides quickly but is price-sensitive.",
      companyDescription:
        'Greenacre Agriculture is an agricultural supplies dealer headquartered in Hebei, selling fertiliser, seed and crop protection through more than 800 village stores, with annual sales of about RMB 300 million.\n\nIt is a family business; Marcus Bell is the second generation and is pushing to digitalise orders and inventory. A Beijing office handles sales and purchasing with the manufacturers.\n\nOrders and inventory are all in Excel, each warehouse keeps its own copy, and the monthly stocktake closes the business for a day.',
      address:
        '188 South 4th Ring West Road, Fengtai District, Beijing\nHeadquarters Base, Zone 12, Building 25, 3rd floor (Greenacre Agriculture Beijing office)',
    },
    {
      name: 'Laura Hughes',
      mailbox: 'laura.hughes',
      company: 'Stonebridge Medical Group',
      message:
        "Hello, I am Laura Hughes from the IT department of Stonebridge Medical Group. The group runs three specialist hospitals and five clinics and is choosing one platform for its administrative processes; NocoBase is on our shortlist.\n\nBefore the next round we need to confirm a few hard requirements:\n\n1. Permissions. Data visibility controlled by site, department and role, and some form fields hidden from certain roles; purchase prices, for example, only for the equipment department and finance.\n\n2. Approval workflows. Equipment repairs and supply requests need multi-level approval, amounts above RMB 50,000 need the hospital director to countersign, approvers should be able to act from their phones, and overdue approvals should send reminders.\n\n3. Audit. Every create, update, delete and export logged and kept for at least six years, searchable by person and time and exportable for security assessments.\n\n4. Localisation. Kingbase database support is mandatory, ideally with a deployment reference on Kylin OS.\n\nIf all of these are met, we would like an on-site technical session next month with the IT department and the equipment managers of several sites. We would also like to understand the implementation timeline: we hope to have the first processes live before the end of next year's first quarter.",
      companyDescription:
        "Stonebridge Medical Group is a private healthcare group in Beijing with three specialist hospitals and five clinics and about 450 staff. It is replacing foreign software with domestic alternatives and requires any new system to support a domestic database.\n\nLaura Hughes leads the workflow platform selection in the IT department. The group opened a clinic in Shenzhen this year, and she is based there for now, setting up its systems.\n\nThe decision goes through the group's IT committee and is expected next quarter.",
      address:
        'Fortune Plaza, 88 Fuhua 3rd Road, Futian District, Shenzhen\n21st floor, Stonebridge Medical Shenzhen Clinic, IT department',
    },
    {
      name: 'Kevin Foster',
      mailbox: 'kevin.foster',
      company: 'Trailhead Software',
      message:
        "Hello, we are Trailhead Software, a software company of about 50 people building custom management systems for small and mid-sized manufacturers.\n\nWe recently evaluated NocoBase and think it suits us well as a delivery platform. Some questions about the Professional licence for client applications:\n\n1. Is the licence for an application we deliver bought in our name or the client's?\n2. Can one licence cover several client projects?\n3. Can the plugins we write be reused in other client projects, and who owns them?\n4. Do you have partner pricing?\n\nWe expect six to eight projects this year and are looking for a long-term partnership.",
      companyDescription:
        'Trailhead Software is a Hangzhou software company of about 50 people building custom ERP and production systems for small and mid-sized manufacturers in the Yangtze River Delta.\n\nIt used to deliver on an in-house Java framework that was expensive to maintain, and this year it is looking for a low-code platform to build on. Kevin Foster is the CEO and Ethan Walsh the technical lead, both on the same evaluation.\n\nIt expects six to eight client projects this year and wants a long-term platform partner.',
      address:
        'Huaxing Times Square, Tower A, 478 Wensan Road, Xihu District, Hangzhou\n16th floor',
    },
    {
      name: 'Rachel Morgan',
      mailbox: 'rachel.morgan',
      company: 'Brightway Education',
      message:
        "Head of academic affairs at Brightway Education, comparing three low-code platforms (NocoBase and two others) for course management and teacher evaluation.\n\nStill gathering information; the budget waits for next quarter's management meeting. She would like product material and a price range first and does not need a demo yet.",
      companyDescription:
        "Brightway Education is a vocational training provider in Shanghai offering accounting, design and IT courses at five sites, mostly to working adults.\n\nRachel Morgan heads academic affairs and is comparing three low-code platforms for course management and teacher evaluation. The budget waits for next quarter's management meeting.",
      address:
        "Sheng'ai Building, 88 Caoxi North Road, Xuhui District, Shanghai\n7th floor",
    },
    {
      name: 'Adam Sullivan',
      mailbox: 'adam.sullivan',
      company: 'Riverbend Electronics',
      message:
        'A development engineer at Riverbend Electronics trying Community to build a prototype for R&D project management; he already has a backlog and an iteration board.\n\nThe project is not approved internally yet. He will get back in touch about a purchase once his department heads have seen the prototype and the project is approved, probably in one to two months.',
      companyDescription:
        'Riverbend Electronics is a Beijing electronic components R&D company of about 300 people, more than half of them in R&D, making industrial sensors.\n\nAdam Sullivan is a development engineer building a prototype for R&D project management on Community, with a backlog and an iteration board. The project is not approved internally yet.',
      address:
        'Zhongguancun Venture Building, 26 Xinxi Road, Shangdi, Haidian District, Beijing\n5th floor',
    },
    {
      name: 'Megan Ward',
      mailbox: 'megan.ward',
      company: 'Polaris Properties',
      message:
        'IT manager at Polaris Properties, doing early research on digitalising property and construction management while looking at several SaaS and low-code products.\n\nThe group will have a formal budget only next year. She would like industry case studies and product updates once a quarter, without frequent calls.',
      companyDescription:
        'Polaris Properties is a regional property developer headquartered in Shenzhen, building residential and commercial projects in the Pearl River Delta, with its own property management company.\n\nMegan Ward is IT manager and doing early research on digitalising property and construction management. The group will have a formal budget only next year.',
      address:
        'Taiping Finance Tower, 6001 Yitian Road, Futian District, Shenzhen\n32nd floor, Polaris Properties IT department',
    },
    {
      name: 'Tyler Grant',
      mailbox: 'tyler.grant',
      company: 'Bayside Consulting',
      message:
        'A website enquiry from someone with two years of NocoBase plugin development experience looking for part-time or contract development work, with a link to his portfolio.\n\nThis is not a purchase; we replied pointing him to our partner programme and the community job board.',
      companyDescription:
        'Bayside Consulting is a small management consulting studio in Hangzhou with fewer than ten people.\n\nTyler Grant says he has two years of NocoBase plugin development experience and is looking for part-time or contract work; this is not a purchase.',
      address:
        'Hengxin Building, 588 Jiangnan Avenue, Binjiang District, Hangzhou\n10th floor',
    },
    {
      name: 'Jason Palmer',
      mailbox: 'jason.palmer',
      company: 'Highridge Textiles',
      message:
        'A lead from a trade show badge scan: the phone number does not exist and the email bounced.\n\nThe company, Highridge Textiles, is in the business register, but no other contact details could be found, so it cannot be followed up for now.',
      companyDescription:
        'Highridge Textiles is a textile company registered in Shanghai according to the business register, making and trading home textile fabrics.\n\nThe phone number left at the trade show badge scan does not exist and the email bounced; no other contact details could be found.',
      address: '1288 Huateng Road, Huaxin, Qingpu District, Shanghai',
    },
    {
      name: 'Ethan Walsh',
      mailbox: 'ethan.walsh',
      company: 'Trailhead Software',
      message:
        "I am Ethan Walsh, technical lead at Trailhead Software, on the same project as our CEO Kevin.\n\nI am evaluating the technical side: can plugins be developed, built and released independently in TypeScript? Does Enterprise include the source code? We need to customise on the client's site, so I would like to know how to set up the development environment and how our plugins stay compatible when NocoBase is upgraded.",
      companyDescription:
        'Trailhead Software is a Hangzhou software company building custom systems for small and mid-sized manufacturers. This year it opened a technical support centre in Beijing for its North China client projects.\n\nEthan Walsh is the technical lead, based at the Beijing centre, evaluating plugin development and source code delivery on the same evaluation as the CEO, Kevin Foster.',
      address:
        'Wangjing SOHO, Tower 2, 10 Wangjing Street, Chaoyang District, Beijing\nZone B, Room 1803 (Trailhead Software Beijing technical support centre)',
    },
    {
      name: 'Natalie Shaw',
      mailbox: 'natalie.shaw',
      company: 'Fairharvest Agriculture',
      message:
        "Referred by our partner Bluecrest IT: Fairharvest Agriculture's service centre has 30 agents answering more than a thousand dealer questions a day about orders and shipping, most of them repeated.\n\nThey want to know whether AI employees can read their order data, answer the common questions and open tickets, leaving only the complex cases to people. No first conversation yet; the referrer says they have time this month.",
      companyDescription:
        "Fairharvest Agriculture is an agricultural services company headquartered in Shenzhen, supplying growers and dealers in South China with farm inputs and technical services; its service centre has 30 agents.\n\nReferred by our partner Bluecrest IT. Natalie Shaw runs the service centre and wants to know whether AI employees can read the order data and answer dealers' common questions.",
      address:
        '4012 Wuhe Avenue, Bantian, Longgang District, Shenzhen\nFairharvest Agriculture headquarters, 6th floor, Service Centre',
    },
    {
      name: 'Brian Fisher',
      mailbox: 'brian.fisher',
      company: 'Pinecrest Manufacturing',
      message:
        'We are a team of 20 selling and servicing industrial equipment.\n\nOur customers are in Excel, project delivery happens in group chats, and the month-end report takes a whole day to put together by hand. The owner wants one system for customers, project delivery and reporting.\n\nThe budget is limited, so we would like to know how far Standard goes, whether you have a plan for small teams, and whether we can try it free for a while.',
      companyDescription:
        'Pinecrest Manufacturing is a Hangzhou distributor and service company for industrial equipment with about 20 people, representing several imported brands of air compressors and vacuum pumps.\n\nCustomers are in Excel, project delivery happens in group chats, and the month-end report is assembled by hand. The owner wants one system for customers, delivery and reporting, on a limited budget.',
      address:
        'Xixi Science and Innovation Park, Building 3, 175 Wuchang Avenue, Yuhang District, Hangzhou\n4th floor',
    },
  ],
  leadJobTitles: ['IT Manager', 'Head of IT'],
  taskDescription:
    "**Goal**\nReview the latest progress, confirm what the customer needs and what worries them, and agree on the next steps and when.\n\n**Before**\n- Go through the recent conversations and emails and list the questions the customer has not answered;\n- Confirm who joins from their side and what each of them cares about;\n- Bring the latest version of the proposal or quotation.\n\n**After**\nWrite the conclusions and to-dos into this task's result, and submit any terms that need approval.",
  discoveryCall: {
    name: 'Discovery call',
    feedback:
      'Confirmed about 200 people reporting production across three factories; leaning towards Enterprise deployed privately, with an initial budget of RMB 300,000.\n\nTheir pain points, in order: production reports arrive late, equipment checks are not followed to closure, and quality incidents are assigned slowly. The head of the IT centre decides, and the production manager joins the evaluation.\n\nNext: send a manufacturing case study and book a product demo focused on the production dashboard and the check process.',
  },
  productDemo: {
    name: 'Product demo',
    feedback:
      "Demonstrated the admissions and scheduling prototype; the team confirmed its interest and introduced the director of academic affairs.\n\nThe director was most interested in clash warnings and the parents' timetable, and asked a lot about teachers' maximum hours. The admissions lead wants to see each campus's lead conversion funnel.\n\nNext: adjust the prototype to the director's rules, give a second demo in two weeks, and prepare a Professional quotation.",
  },
  convertedLeadTasks: [
    [
      {
        name: 'First call back',
        result:
          'Reached Grace Mitchell by phone. She saw the demo at the industrial trade show and is most interested in production reporting and equipment checks.\n\nWe booked a discovery call for the day after tomorrow; she will bring the production manager and gather the reporting spreadsheets the three factories use today.',
      },
      {
        name: 'Send manufacturing case studies and a price range',
        result:
          'Sent Grace Mitchell two case studies from automotive parts customers and the price range for Enterprise deployed privately.\n\nShe replied that the budget is within the range and the head of the IT centre agreed to go ahead; next, we open an opportunity and arrange a demo for the production department.',
      },
    ],
    [
      {
        name: 'Confirm the demo time and attendees',
        result:
          "Confirmed the online demo on Thursday afternoon with Ryan Cooper: the admissions lead and two academic staff will join, and the director of academic affairs will try to.\n\nRyan wants to focus on clash warnings and the parents' timetable, so both come in the first half of the demo.",
      },
      {
        name: 'Write up the demo feedback',
        result:
          "Sent Ryan Cooper a list of the questions raised in the demo: the rules for teachers' maximum hours, moving classes between campuses, and payment records for parents.\n\nHe replied that the team has confirmed its interest and the director of academic affairs will lead the evaluation, so it can move on as an opportunity.",
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
        'The phone number from the trade show scan does not exist, and the email sent to the registered address bounced.\n\nHighridge Textiles is in the business register, but no other contact details could be found; the lead is marked invalid.',
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
    'Agreed the scope of the first phase and recorded the acceptance criteria.\n\nPhase one covers production reporting, equipment checks and quality incidents on the 12 lines of the three factories; acceptance means two weeks of same-day production figures and 90% of check issues closed within 48 hours. The MES integration is a separate project.',
    'Legal review is done; waiting for procurement to sign off.\n\nLegal changed two points, responsibility for the data migration and support for the existing apps after the upgrade, both adjusted as the customer asked. Procurement says sign-off usually takes three to five working days.',
    'The customer asked for deployment notes on audit logs, SSO and domestic Chinese databases.\n\nIn the assessment the IT department went through each security requirement: audit logs kept for six years and exportable, SSO with the company directory, and Kingbase as the database. We promised written notes within a week, with references for localised environments.',
    "The integrator confirmed the plugin development approach; deployment is still to be verified in the end customer's environment.\n\nBluecrest's technical lead built an access control plugin in TypeScript, and packaging and release both worked. Next is a deployment test on the end customer's internal network, where the main risk is the few ports their servers open.",
    "The director of academic affairs wants a lightweight proof of concept first.\n\nShe suggests scheduling one campus for two weeks to check the rules cover real life before rolling out further. We agreed to a single-campus POC, and the academic staff will provide last term's real timetables.",
    'Delivery complete; the customer is happy with the go-live and the reports.\n\nIn the retrospective the delivery director said weekly reports take far less time and timesheets are much more accurate. Two improvements were requested, timesheets on the phone and per-client PDF exports, both recorded for the next phase.',
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
