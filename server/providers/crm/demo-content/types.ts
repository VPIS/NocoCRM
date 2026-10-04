// Every piece of text the demo dataset writes, in one language, with what
// is derived from a name (the demo accounts' usernames, mailboxes, website
// and email domains), so each language has people and companies of its own.
// The data that is neither (amounts, days, stages, option values, phone
// numbers) lives in demo.ts and is shared by every language; each list here
// follows the order of the matching list there.

// The part a demo account plays: the manager owns records and decides the
// sellers' approvals, the second manager decides the manager's own, and the
// two sellers own the rest.
export type DemoSeat =
  'manager' | 'secondManager' | 'firstSeller' | 'secondSeller';

export interface DemoAccountText {
  // 3 to 30 lowercase letters, digits, underscores or dots, and at least 5
  // long: the password is the username followed by 123, at least 8.
  readonly username: string;
  readonly name: string;
}

export interface DemoPerson {
  readonly name: string;
  // The local part of the person's email address.
  readonly mailbox: string;
}

export type DemoCity =
  | 'beijing'
  | 'shanghai'
  | 'nanjing'
  | 'suzhou'
  | 'hangzhou'
  | 'guangzhou'
  | 'shenzhen'
  | 'chengdu';

export interface DemoCompany {
  // The account's name.
  readonly name: string;
  // How an activity name refers to the account.
  readonly activitySubject: string;
  // The website's and the email addresses' domain, before .example.
  readonly domain: string;
  readonly description: string;
}

export interface DemoLead {
  readonly name: string;
  // The local part of the lead's email address.
  readonly mailbox: string;
  readonly company: string;
  // The lead's original message.
  readonly message: string;
}

export interface DemoNamedText {
  readonly name: string;
  readonly description: string;
}

export interface DemoContent {
  // The manifest's label for the import.
  readonly label: string;
  // The demo accounts.
  readonly accounts: Readonly<Record<DemoSeat, DemoAccountText>>;
  readonly cities: Readonly<Record<DemoCity, string>>;
  // The eight accounts, by index.
  readonly companies: readonly DemoCompany[];
  // Each account's two contacts: the decision maker, then the technical one.
  readonly people: readonly (readonly [DemoPerson, DemoPerson])[];
  readonly contactJobTitles: readonly [string, string];
  readonly contactNotes: readonly [string, string];
  // The notes on the account that churned.
  readonly churnNotes: string;
  // The opportunities' names, by index.
  readonly deals: readonly string[];
  readonly leads: readonly DemoLead[];
  // A lead's job title: even positions, then odd ones.
  readonly leadJobTitles: readonly [string, string];
  // An activity's name: who it concerns and the matter.
  readonly activityName: (subject: string, matter: string) => string;
  // The description every demo activity carries.
  readonly activityDescription: string;
  // The two activities placed on the first leads.
  readonly discoveryCall: { readonly name: string; readonly feedback: string };
  readonly productDemo: { readonly name: string; readonly feedback: string };
  // The matters of the completed and planned activities on the first deals.
  readonly completedMatters: readonly string[];
  readonly completedFeedback: readonly string[];
  readonly plannedMatters: readonly string[];
  // Today's two late-evening activities.
  readonly eveningCall: string;
  readonly ssoConfirmation: string;
  // The matter of a lead's activity, by its status.
  readonly leadActivityMatters: {
    readonly completed: string;
    readonly cancelled: string;
    readonly planned: string;
  };
  readonly leadActivityFeedback: string;
  // The steady cadence of activities around the hand-placed ones.
  readonly cadenceMatters: readonly string[];
  readonly cadenceFeedback: readonly string[];
  readonly approvals: {
    readonly discount: DemoNamedText;
    readonly paymentTerms: DemoNamedText & { readonly comment: string };
    readonly contractTerms: DemoNamedText;
  };
}
