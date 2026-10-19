// The demo dataset as GET /demoData reports it (server/providers/crm/demo.ts
// `DemoStatus`): the settings page's card and the banner read it.
export interface DemoStatus {
  present: boolean;
  createdAt: string | null;
  records: number;
  accounts: { username: string; name: string; role: string }[];
  accountsByLanguage?: Record<
    string,
    { username: string; name: string; role: string }[]
  >;
  // An import under way: how far it has got, 0 to 100, or null when another
  // server process runs it; null when none runs.
  importing?: { percent: number | null } | null;
  // The business settings the present import set.
  settings?: string[];
}
