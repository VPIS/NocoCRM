import type { DemoContent } from './types.js';

// The demo's WhatsApp conversations in English (demo-whatsapp.ts), in the
// order of its schedule.
export const enWhatsApp: DemoContent['whatsapp'] = {
  displayNames: ['NocoBase Sales', 'NocoBase International'],
  conversations: [
    // Shanghai Electric's decision maker, about the deal at proposal.
    {
      messages: [
        'Hi, we got the proposal. Production wants to know first how many servers the on-premises deployment needs. Is there a list?',
        "Hi Sarah, for all three plants we estimate three application servers and one database server. I'll email you the detailed list today.",
        'Great, thanks.',
        "We've looked at the list. IT asks whether the database can run on the Dameng instance we already have. Could you check?",
        'Also, could you come to the plant next Wednesday afternoon to walk us through the plan?',
      ],
    },
    // United Family Healthcare's decision maker, about the contract.
    {
      messages: [
        'Our finance team would like the payment milestones in the contract to be 30/40/30.',
        "Noted. I'll check with my side and get back to you.",
        "Amanda, 30/40/30 works for us. I've emailed you the revised contract.",
        'Thanks, our legal team will review it this week.',
        'Sounds good. Message me if anything comes up.',
      ],
    },
    // The working lead from Tongwei.
    {
      messages: [
        'Sorry I missed your call today. About dealer reconciliation: we have six warehouses. Can the month-end statements be generated automatically?',
        'Hi Marcus, yes. It totals by dealer and by warehouse, and the month-end statement exports directly. We have a similar case with a feed distributor I could show you.',
        'Sure, Thursday at 2 pm works.',
      ],
    },
    // H World's IT director, the importer's own deal.
    {
      messages: [
        'Got the quote. The review meeting is set for next Monday.',
        'Thanks, Chen. Would you like us to join the review remotely to walk through it?',
        'Yes please. Joy Shao from procurement will be there too, and will mostly ask about the three years of support.',
        'Could you send me the support SLA beforehand?',
      ],
    },
    // Someone nobody knows yet, by username alone.
    {
      username: 'kevin_zhou',
      messages: [
        'Hi, I found this number on your website. Can the community edition be used commercially?',
        "We're a design studio of 20 people and want to build a project management system.",
      ],
    },
    // A systems integrator abroad.
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
      profileName: 'Leo',
      messages: [
        'Hi, are you still hiring implementation engineers? Who should I send my CV to?',
        'Hi Leo, our openings are on the Careers page of our website, where you can apply directly. This number is for customer enquiries only. Thanks!',
      ],
    },
  ],
};
