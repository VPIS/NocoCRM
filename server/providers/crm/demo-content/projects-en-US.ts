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
        "H World's IT department plans to bring store inspections, maintenance tickets and franchisee collaboration from several SaaS tools onto a platform of its own, deployed privately, with audit logs and a link to the membership system.",
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
      'We saw your demo at the digital hospitality expo in Shanghai. We have more than 9,000 stores, with inspections and maintenance tickets spread across three systems, and want to see whether one platform can cover them. It must be deployed privately and keep complete audit logs.',
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
      'Review the solution and the quotation with Chen Lu, Howard Cheng and Joy Shao; agree phase one scope, rollout timing and commercial terms.',
    approval: {
      name: 'H World Enterprise first-year 15% discount',
      description:
        '9,000 stores, 2,000 in phase one, rolled out in waves; to win phase one we ask for 15% off Enterprise in the first year, with the customer signing three years of support.',
    },
    mention:
      "@{{name}} I'm inclined to approve the 15% for H World, as long as the three years of support go into the main contract. Can you confirm the customer will accept that?",
  },
  gac: {
    company: {
      name: 'GAC Group',
      domain: 'gac',
      description:
        "GAC's digital department leads a dealer collaboration platform that unifies lead distribution, stock transfers and service tickets, on a domestic database with cluster deployment.",
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
        "The customer's finance process pays 60 days after acceptance, beyond the 30-day standard; 30% is paid on signing, so the collection risk is contained.",
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
        "After its farm inspection system went live, New Hope's information centre plans to bring feed mill quality checks and equipment inspections onto the same platform.",
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
