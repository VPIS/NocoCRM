import type { DemoProjects } from './types.js';

export const enProjects: DemoProjects = {
  sf: {
    company: 'SF Express',
    domain: 'sf-express',
    person: {
      name: 'Kevin Liang',
      mailbox: 'kevin.liang',
      jobTitle: 'Operations Digitalisation Manager, South China',
    },
    message:
      "Hello, this is SF Express's South China operations centre. Inspection records and incident tickets for our 300+ outlets still move through spreadsheets and group chats, and regional managers can't see the whole picture. We'd like to know whether NocoBase can be deployed privately in our own data centre and connected to our existing single sign-on. I'm presenting a plan to the regional head next month, so a call this week would be great.",
  },
  hworld: {
    company: {
      name: 'H World Group',
      domain: 'h-world',
      description:
        "H World Group runs more than ten hotel brands, including Hanting, JI Hotel and Orange, with over 9,000 hotels in China, most of them franchised.\n\nIts IT department plans to bring store inspections, maintenance tickets and franchisee collaboration from three SaaS tools onto one platform of its own:\n\n- **Inspections**: area supervisors check each hotel against its brand standard, photograph issues and follow the fixes;\n- **Maintenance tickets**: a hotel's repair request goes to the nearest contractor automatically and is measured against its deadline;\n- **Franchisee collaboration**: franchisees see their hotels' inspection scores and ticket progress in a portal.\n\nIt must be deployed privately on H World's own cloud as a cluster, keep audit logs for three years, and sign people in through the membership system's identity service. Phase one covers 2,000 hotels in East China, followed by regional waves.",
      address:
        'Minhang District, Shanghai\nH World Group headquarters, IT department',
    },
    people: [
      { name: 'Chen Lu', mailbox: 'chen.lu', jobTitle: 'IT Director' },
      {
        name: 'Howard Cheng',
        mailbox: 'howard.cheng',
        jobTitle: 'Head of Data Platform',
      },
      {
        name: 'Joy Shao',
        mailbox: 'joy.shao',
        jobTitle: 'Procurement Manager',
      },
    ],
    message:
      "We saw your demo at the digital hospitality expo in Shanghai and were impressed.\n\nWe have more than 9,000 hotels, and inspections, maintenance tickets and franchisee communication are spread across three systems, so supervisors, hotels and contractors switch between them all day and head office can't see the whole picture. We want to see whether one platform can cover them.\n\nOur baseline: private deployment, complete audit logs, and sign-in through our membership system's identity service. If possible, we'd like to start with a requirements session; Howard Cheng, our data platform lead, would join me.",
    deal: 'Store operations and ticketing platform (Enterprise)',
    discovery: {
      heading: 'Discovery session',
      body: 'Mapped inspections, maintenance tickets and franchisee repair requests with Chen Lu and Howard Cheng; phase one covers 2,000 stores in East China, needs single sign-on with the membership system, and keeps audit logs for 3 years.',
    },
    poc: {
      heading: 'Proof of concept',
      body: "Demonstrated ticket flows and cluster deployment in H World's test environment; Howard Cheng confirmed the performance. Chen Lu would like room on the first-year price and will bring Joy Shao from procurement to the next review.",
    },
    quoteSent: {
      heading: 'Quotation sent',
      body: 'Sent the Enterprise quotation with three years of support, RMB 720,000 in total; Chen Lu will go through it with procurement at the solution review.',
    },
    review: 'Solution review meeting',
    reviewDescription:
      "Review the solution and the quotation with Chen Lu, Howard Cheng and Joy Shao.\n\n**To settle**\n- Phase one scope: inspections, maintenance tickets and the franchisee portal for 2,000 hotels in East China;\n- Rollout timing: the POC conclusion, the pilot region and the dates of the full rollout;\n- Commercial terms: the first-year discount (in approval), whether the three years of support go into the main contract, and the payment schedule.\n\n**After**\nWrite the review's conclusions and the material still owed into the result, and note the steps of Joy Shao's procurement process.",
    approval: {
      name: 'H World Enterprise first-year 15% discount',
      description:
        "H World's store operations and ticketing platform: Enterprise plus three years of support, RMB 720,000 in total. We ask for 15% off Enterprise in the first year.\n\n**Background**\nThe customer has more than 9,000 hotels; phase one covers 2,000 in East China, the POC has passed, and the rollout will continue region by region, so the long-term value is large.\n\n**Why**\n- Joy Shao in procurement has made clear the first-year budget is capped, so the quotation must come down to enter procurement;\n- the customer will put three years of support into the main contract, so the three-year revenue barely changes;\n- winning H World gives us a reference account in hospitality.\n\nThe discount applies only to the first-year Enterprise licence; support and later expansion are at list price.",
    },
    mention:
      "@{{name}} I'm inclined to approve the 15% for H World, as long as the three years of support go into the main contract. Can you confirm the customer will accept that?",
  },
  gac: {
    company: {
      name: 'GAC Group',
      domain: 'gac',
      description:
        "GAC Group's digital department leads a dealer collaboration platform for the more than 1,000 dealers of the group's passenger car brands.\n\nLead distribution, vehicle stock transfers and after-sales service tickets each run in a different system today, so dealers log in to several back offices and the group cannot see each dealer's stock and lead conversion as it happens. The platform brings the three together behind one entry point for dealers.\n\nIt must run on a domestic database as a cluster and meet the group's data security rules; the contract is in legal review, paid in 30-40-30 instalments.",
      address:
        'Tianhe District, Guangzhou\nGAC Group headquarters, Digital department',
    },
    people: [
      {
        name: 'Victor Feng',
        mailbox: 'victor.feng',
        jobTitle: 'Head of Digital',
      },
      { name: 'Linda Mo', mailbox: 'linda.mo', jobTitle: 'Legal Manager' },
    ],
    deal: 'Dealer collaboration platform (Enterprise)',
    alignment: {
      heading: 'Contract terms alignment',
      body: 'Went through the contract clause by clause with Victor Feng and Linda Mo: payment in three instalments, the balance 60 days after acceptance (approval submitted); legal wants a data security clause added, and we promised a revised draft within three working days.',
    },
    legal: {
      heading: 'Legal feedback',
      body: 'Linda Mo replied to the revised draft: the data security clause is accepted, but she wants the liquidated damages cap raised from 5% to 10%, which we need to assess internally.',
    },
    signing: 'Push the contract signature',
    followLegal: 'Follow up the liquidated damages clause',
    approval: {
      name: 'GAC balance on 60-day terms',
      description:
        "GAC's dealer collaboration platform, an Enterprise contract of RMB 1,200,000, paid 30-40-30: 30% on signing, 40% at go-live, 30% on acceptance.\n\nThe customer's finance process pays the balance 60 days after acceptance, beyond our standard 30 days.\n\n**Risk**\n- 30% is paid as soon as the contract is signed, so the collection risk is contained;\n- the customer is a large state-owned group with a good payment record;\n- the balance is RMB 360,000, so 30 more days has little effect on cash flow.\n\nWe recommend approving, with the acceptance criteria and the acceptance deadline written into the contract so acceptance cannot drag on.",
      comment:
        'Approved at 60 days with at least 30% on signing; please write the acceptance criteria into the contract.',
    },
    note: "The customer wants the damages cap at 10%. I'd rather hold 5% and offer an extra year of upgrades in exchange. Thoughts?",
    reply:
      "Agreed, hold 5%. I'll join you tomorrow when we meet Victor about the signature; bring the upgrade offer.",
  },
  newHope: {
    company: {
      name: 'New Hope Group',
      domain: 'newhope',
      description:
        'New Hope Group is an agriculture and food company with many livestock farms and feed mills.\n\nThis year its information centre launched a farm inspection system on NocoBase Professional: the first 12 farms went live within three weeks, the inspection submission rate holds above 90%, and farm managers find it much easier than the paper forms.\n\nBuilding on that, the information centre plans to bring feed mill quality checks and equipment inspections onto the same platform, linking quality data with the farms. Quality requirement interviews are under way and a renewal and expansion proposal is being prepared.',
      address: 'Jinjiang District, Chengdu\nNew Hope Group, Information Centre',
    },
    people: [
      {
        name: 'Laura Zhong',
        mailbox: 'laura.zhong',
        jobTitle: 'Director of Information Centre',
      },
      {
        name: 'Frank Tang',
        mailbox: 'frank.tang',
        jobTitle: 'Digital Project Manager',
      },
    ],
    deal: 'Farm inspection system (Professional)',
    expansion: 'Feed mill quality check extension (Professional)',
    kickoff: {
      heading: 'Project kickoff',
      body: 'Agreed the rollout with Laura Zhong and Frank Tang: 12 farms first, inspection forms and incident reporting live within three weeks; Frank drives adoption internally.',
    },
    training: {
      heading: 'Go-live training',
      body: 'Ran two sessions for farm managers; 92% of inspections were submitted in the first week. Laura Zhong would like feed mill quality checks on the same platform.',
    },
    interview: 'Quality check requirements interview',
    renewal: 'Prepare the New Hope renewal and extension plan',
  },
  chats: [
    {
      title: 'Negotiating the H World discount',
      messages: [
        {
          role: 'user',
          text: "Chen Lu will raise the first-year price again at tomorrow's H World review. How should I handle it?",
        },
        {
          role: 'assistant',
          text: "From the deal's record, I'd prepare this way:\n\n1. **Value before price**: open with Howard Cheng presenting the proof of concept (performance and cluster deployment both verified), so Joy Shao from procurement accepts the solution first.\n2. **The discount isn't approved yet, so don't promise 15%**: say \"we're working on the first-year price internally, provided phase one and the three years of support are agreed together\".\n3. **Trade the discount for three years of support**: Daniel Brooks commented on the deal that he leans towards approving 15% if the three years of support go into the main contract, which makes a natural exchange.\n4. **Bring two quotations**: list price, and 15% off with three years of support, so procurement chooses between them rather than shopping around.\n\nShall I turn this into an agenda in the task's description?",
        },
        {
          role: 'user',
          text: "It's Joy Shao's first meeting. What will she care about?",
        },
        {
          role: 'assistant',
          text: "Procurement usually cares about three things: **total price and payment**, **comparable quotes**, and **contract risk**. Prepare:\n\n- a clear breakdown: licence, implementation and three years of support;\n- a case from a chain of a similar size, to support the price;\n- the standard contract, sent to her in advance.\n\nShe isn't among the deal's contacts yet; the AI follow-up proposes adding her as an influencer, which you can accept with the deal's suggestion.",
        },
      ],
    },
    {
      title: "This month's forecast",
      messages: [
        { role: 'user', text: 'How much can I close this month?' },
        {
          role: 'assistant',
          text: "From your opportunities and their expected close dates:\n\n| Opportunity | Stage | Amount | Expected close |\n| --- | --- | --- | --- |\n| GAC dealer collaboration platform | Negotiation | RMB 1.2M | in 12 days |\n| H World store operations platform | Proposal | RMB 680K | in 25 days |\n\n- **Commit**: GAC, RMB 1.2M. The payment terms are approved; only the damages clause and the signature remain.\n- **Best case**: with H World, RMB 1.88M; but H World is still at proposal with the discount undecided, so closing it this month is unlikely.\n\nFocus on GAC's signature first: the task to push it is a day overdue.",
        },
      ],
    },
    {
      title: 'Signing email to Victor Feng',
      messages: [
        {
          role: 'user',
          text: 'Draft an email to Victor Feng at GAC to move the contract to signature. We hold the damages cap at 5% and can add an extra year of upgrades.',
        },
        {
          role: 'assistant',
          text: "**Subject**: Signing the dealer collaboration platform contract\n\nDear Victor,\n\nThank you and Linda for your careful review of the contract over the past two weeks. The data security clause has been revised as you asked.\n\nOn the liquidated damages, we propose keeping the cap at 5% of the contract value, the standard we apply to every enterprise customer. As a sign of our commitment, we will add **an extra year of upgrades** on top of the first, so the platform receives new versions for two years.\n\nIf this works for you, we would like to sign this week, at a time that suits you.\n\nBest regards\n\n---\n\nShall I save it as an email task on the deal, or open it in your mailbox's composer?",
        },
      ],
    },
    {
      title: 'Following up the SF Express lead',
      messages: [
        {
          role: 'user',
          text: 'Is the new SF Express lead worth following up?',
        },
        {
          role: 'assistant',
          text: "Yes, and quickly. The AI follow-up graded it **A, follow up**:\n\n- Kevin Liang runs operations digitalisation for 300+ outlets in South China and presents a plan to the regional head next month;\n- he asks for private deployment and single sign-on, both Enterprise strengths;\n- a successful pilot in South China could spread to other regions.\n\nThe AI has drafted a reply proposing a call on Wednesday or Thursday afternoon. Check it in your inbox's AI suggestions and send it from there.",
        },
      ],
    },
  ],
  ai: {
    sfLead: {
      recommendation: 'follow',
      grade: 'A',
      summary:
        'A large enterprise with a clear need for private deployment and single sign-on, a fit for Enterprise: worth following up at once.',
      brief:
        "Kevin Liang runs operations digitalisation for SF Express's 300+ outlets in South China, where inspections and incident tickets move through spreadsheets and group chats, and he presents a plan to the regional head next month. He asks for private deployment and single sign-on, both Enterprise strengths. SF is a leading logistics company; a successful pilot in South China could spread to other regions.",
      reasons: [
        'Scale: 300+ outlets and a regional-level plan, with room to roll out nationwide (original message)',
        'A clear need: inspections and incident tickets, private deployment and single sign-on (original message)',
        'Urgent: a plan due next month, a call wanted this week (original message)',
      ],
      edition: 'Enterprise',
      invalidReason: null,
      nextStep: {
        type: 'email',
        subject: 'Reply to Kevin Liang and book a call this week',
        inDays: 0,
      },
      prep: [
        'A demo app for outlet inspections and incident tickets',
        'The private deployment architecture and the single sign-on (OIDC/SAML) setup',
        'A cluster deployment case from a large enterprise',
      ],
      questions: [
        'When is the regional presentation, and what will the regional head look for?',
        'Which protocol does the existing single sign-on use?',
        'Is phase one all of South China, or a few pilot outlets first?',
        'Which database and operating system does the data centre run?',
      ],
      opportunity: null,
      reviewInDays: null,
      changes: [],
      email: {
        subject: 'Your outlet inspection and incident ticket platform',
        body: "Dear Kevin,\n\nThank you for your message. Moving inspections and incident tickets for 300+ outlets from spreadsheets onto one platform is exactly what many NocoBase customers do: it deploys privately in your own data centre and connects to your existing single sign-on through OIDC or SAML.\n\nTo help you prepare the regional presentation, could we have a 30-minute call on Wednesday or Thursday afternoon this week? I'd like to understand the outlets, your single sign-on and the data centre, and I can show a sample inspection ticket app.\n\nWhich time suits you?\n\nNocoBase Sales",
      },
      enrich: [
        {
          field: 'industry',
          value: 'logistics',
          source: 'https://www.sf-express.com',
          current: null,
        },
        {
          field: 'employees',
          value: '5000+',
          source: 'https://www.sf-express.com',
          current: null,
        },
        {
          field: 'website',
          value: 'https://www.sf-express.com',
          source: 'https://www.sf-express.com',
          current: null,
        },
      ],
    },
    hworldLead: {
      recommendation: 'convert',
      grade: 'A',
      summary:
        'Need, scale, budget and the decision maker are all clear: convert it and open an Enterprise opportunity.',
      brief:
        "Chen Lu is H World's IT Director. The two calls after the expo confirmed inspections, maintenance tickets and franchisee repairs, phase one for 2,000 stores in East China, with private deployment and audit logs, within the annual budget. He decides himself; Howard Cheng evaluates the technology.",
      reasons: [
        'The decision maker is involved: Chen Lu is IT Director (original message, discovery session)',
        'A clear phase one: 2,000 stores in East China, three lines of business (discovery session)',
        'Private deployment, audit logs and clustering point to Enterprise (discovery session)',
      ],
      edition: 'Enterprise',
      invalidReason: null,
      nextStep: null,
      prep: [],
      questions: [],
      opportunity: {
        name: 'Store operations and ticketing platform (Enterprise)',
        amount: 680000,
      },
      reviewInDays: null,
      changes: [],
      email: null,
      enrich: [],
    },
    hworldDeal: {
      recommendation: 'advance',
      confidence: 'medium',
      stage: 'negotiation',
      summary:
        'The quotation is out, the proof of concept passed and the discount approval is under way: move it to negotiation.',
      brief:
        "The proof of concept in H World's test environment passed on performance and cluster deployment, and the quotation (Enterprise with three years of support, RMB 720,000) went to Chen Lu two days ago. He wants room on the first-year price; the 15% discount approval is with Daniel Brooks, still pending. Joy Shao from procurement joins tomorrow's solution review and is not yet among the deal's contacts.",
      reasons: [
        'The proof of concept passed; Howard Cheng confirmed it (proof of concept)',
        'The quotation is out and will be reviewed at the meeting (quotation sent)',
        'Price is under discussion and the discount approval is submitted (approval)',
      ],
      risks: [
        'Do not promise 15% before the approval is decided',
        'Procurement joins for the first time and may ask for competing quotes',
      ],
      nextStep: {
        type: 'task',
        subject: 'Confirm the commercial terms after the solution review',
        inDays: 1,
      },
      prep: [
        'Two quotations: list price, and 15% off with three years of support',
        'Rollout times of chains of a similar size',
      ],
      questions: [
        'How does procurement compare quotes and decide?',
        'Can the three years of support go into the main contract?',
        'Is there a hard date for phase one?',
      ],
      email: null,
      updates: [
        {
          field: 'amount',
          value: '720000',
          reason:
            'The quotation is Enterprise with three years of support, RMB 720,000 (quotation sent)',
          current: '680000',
        },
      ],
      pauseReason: null,
      resumeInDays: null,
      lostReason: null,
      revisitInDays: null,
      changes: [
        'The quotation is out; the amount is now RMB 720,000',
        'The discount approval is submitted, awaiting Daniel Brooks',
      ],
      approvals: [],
      terms: [
        {
          topic: 'discount',
          term: '15% off Enterprise in the first year',
          status: 'pending',
          approval: 'H World Enterprise first-year 15% discount',
        },
      ],
      contacts: [
        {
          name: 'Joy Shao',
          role: 'influencer',
          contactId: null,
          currentRole: null,
          jobTitle: 'Procurement Manager',
          phone: null,
          email: null,
          reason:
            'Chen Lu will bring Joy Shao from procurement to the next review (proof of concept)',
        },
      ],
    },
    hworldPrep: {
      summary:
        'Agree phase one scope and rollout timing at the review, and get procurement to accept the structure of the quotation.',
      brief:
        "After the discovery session and the proof of concept, Howard Cheng confirmed the technology; two days ago the Enterprise quotation with three years of support went out, RMB 720,000. Chen Lu wants room on the first-year price, and the 15% discount approval is still with Daniel Brooks. It is Joy Shao's first meeting.",
      people: [
        {
          name: 'Chen Lu',
          note: 'IT Director, the decision maker; minds the first-year budget and timing',
        },
        {
          name: 'Howard Cheng',
          note: 'Head of Data Platform; confirmed performance and clustering in the proof of concept',
        },
        {
          name: 'Joy Shao',
          note: 'Procurement Manager, first meeting; may ask for competing quotes',
        },
      ],
      company:
        'H World recently reported more than 9,000 stores and keeps investing in digital operations (https://ir.hworld.com).',
      questions: [
        "How long do procurement's comparison and approval take?",
        'Can the three years of support go into the main contract?',
        'Is there a hard date for the 2,000 stores of phase one?',
      ],
      bring: [
        'Both quotations (list price / discount with three years of support)',
        'The cluster architecture and the audit log description',
        'A rollout case from a chain of a similar size',
      ],
      risks: [
        'The discount approval is not decided: do not promise 15% at the meeting',
        'Procurement may compare against other platforms',
      ],
      agenda: [
        'The proof of concept results (Howard Cheng)',
        'Phase one scope: 2,000 stores in East China, three lines of business',
        'Rollout plan and milestones',
        'Quotation structure and payment',
        'A date for the contract review',
      ],
    },
    gacDeal: {
      recommendation: 'continue',
      confidence: 'high',
      stage: null,
      summary:
        'The customer is discussing contract terms: align payment and data security first, then push the signature.',
      brief:
        "Victor Feng confirmed Enterprise with cluster deployment; the customer's finance team pays the balance 60 days after acceptance, and Linda Mo in legal wants a data security clause added. Both need agreeing before signature.",
      reasons: [
        'The decision maker Victor Feng confirmed the solution (email)',
        'Legal is reviewing the contract, so signature is under way (email)',
      ],
      risks: [
        '60-day terms are beyond the standard and need approval',
        'A slow data security clause would delay the signature',
      ],
      nextStep: {
        type: 'task',
        subject: 'Contract terms alignment',
        inDays: 1,
      },
      prep: ['A revised data security clause', 'An instalment payment plan'],
      questions: [
        'Who confirms the acceptance criteria?',
        "How long is legal's review?",
      ],
      email: null,
      updates: [],
      pauseReason: null,
      resumeInDays: null,
      lostReason: null,
      revisitInDays: null,
      changes: [],
      approvals: [
        {
          topic: 'paymentTerms',
          name: 'GAC balance on 60-day terms',
          description:
            "The customer's finance process pays 60 days after acceptance, beyond the 30-day standard; 30% is paid on signing, so the collection risk is contained.",
        },
      ],
      terms: [
        {
          topic: 'paymentTerms',
          term: 'Balance paid 60 days after acceptance',
          status: 'needed',
        },
      ],
      contacts: [],
    },
    newHopeExpansion: {
      recommendation: 'pause',
      confidence: 'low',
      stage: null,
      summary:
        'The extension is still an intention: pause it until the feed mills have a budget.',
      brief:
        'The farm inspection system went live smoothly; Laura Zhong mentioned feed mill quality checks on the same platform, with no scope or budget yet.',
      reasons: [
        'Only a spoken intention, with no scope or budget (go-live training)',
      ],
      risks: ['Quoting too early could weigh on the renewal'],
      nextStep: null,
      prep: [],
      questions: [],
      email: null,
      updates: [],
      pauseReason: 'waitingOnCustomer',
      resumeInDays: 30,
      lostReason: null,
      revisitInDays: null,
      changes: [],
      approvals: [],
      terms: [],
      contacts: [],
    },
    reviewDiscount: {
      recommendation: 'conditional',
      summary:
        'The case study is worth having, but 18% is well beyond the standard: approve with 15% as the limit.',
      asked:
        'Phase one is RMB 280,000 at 18% off: 8 points beyond the 10% limit, RMB 22,400 less. At 10% it would be 252,000, as asked 229,600, at 15% 238,000.',
      reasons: [
        'The customer will publish a manufacturing case study with us after go-live (approval description)',
        'Three factories and about 200 reporting staff, with room to grow (discovery call)',
        'No evidence of a competing quote so far (opportunity record)',
      ],
      together: null,
      precedents:
        'Discount approvals of the last six months were all capped at 15%; 18% is looser, and 15% keeps to the precedent.',
      risks: ['Without competing quotes, 18% lacks a reason'],
      missing: ['The form and timing of the joint case study'],
      conditions:
        'At most 15% off, with the form and timing of the joint case study written into the contract.',
      comment:
        'Approved up to 15%; please write the form and timing of the joint case study into the contract. If the customer insists on 18%, submit again with the competing quote.',
    },
    reviewContract: {
      recommendation: 'approve',
      summary:
        "The licence scope is within Professional's rights, and writing it down helps the integrator deliver: approve.",
      asked:
        'The integrator wants the contract to state the licence scope for applications delivered to end customers; Professional already allows building applications for clients, with no change to amount or collection.',
      reasons: [
        'A Professional licence already allows delivering applications to clients (editions and pricing)',
        'The integrator buys Professional per project; a written scope makes each project repeatable (company description)',
      ],
      together: null,
      precedents: 'No precedent.',
      risks: [
        'Loose wording could read as unlimited projects; limit it to a licence per project',
      ],
      missing: [],
      conditions: null,
      comment:
        "Approved. Please state in the contract that the licence is per project: one Professional licence for each end customer's project.",
    },
    reviewPayment: {
      recommendation: 'approve',
      summary:
        'A small expansion for an existing customer with a good payment record: 60-day terms can be approved.',
      asked:
        'An expansion of RMB 45,000, terms extended from the standard 30 days to 60: 30 more days outstanding on RMB 45,000.',
      reasons: [
        'Brightway Retail is a signed customer that has paid on time (opportunity record)',
        'A small amount, so the collection risk is limited (opportunity amount)',
      ],
      together: null,
      precedents:
        'Earlier payment term approvals were capped at 60 days, as this one is.',
      risks: [],
      missing: ['The first invoice amount'],
      conditions: null,
      comment:
        'Approved at 60 days; please state the first invoice amount in the contract.',
    },
  },
};
