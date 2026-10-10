import type { Pair } from './index.js';

// A few of the lead form's labels as the user sees them, for the model to
// call the fields by in its reply (client/locales/crm has them all).
export const captureFormLabels: readonly Pair[] = [
  ['原始信息', 'Original message'],
  ['职位', 'Job title'],
  ['公司', 'Company'],
  ['负责人', 'Owner'],
];
