import { Building2, UserRound, Info, type LucideIcon } from 'lucide-react';

// Each particulars group's icon on a record page, by what it holds: how the
// record stands, the person, the company; the Contacts and Accounts menu
// icons for the latter two.
export const GROUP_ICONS = {
  general: Info,
  contact: UserRound,
  company: Building2,
} as const satisfies Record<string, LucideIcon>;
