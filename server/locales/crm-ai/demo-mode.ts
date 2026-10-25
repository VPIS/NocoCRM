import type { Pairs } from './index.js';

export const demoRoleTitles = {
  'sales-manager': ['销售经理', 'Sales manager'],
  'sales-representative': ['销售代表', 'Sales representative'],
} as const satisfies Pairs;
