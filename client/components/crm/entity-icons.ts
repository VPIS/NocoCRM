import {
  Building2,
  Handshake,
  ListChecks,
  Radar,
  SquareCheckBig,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { Entity } from './api.js';

// Each record kind's menu icon (client/routes.ts), for wherever a record is
// named by its kind: the global search's groups, a WhatsApp customer's link.
export const ENTITY_ICONS: Record<Entity, LucideIcon> = {
  leads: Radar,
  opportunities: Handshake,
  companies: Building2,
  contacts: UserRound,
  tasks: SquareCheckBig,
  approvals: ListChecks,
};
