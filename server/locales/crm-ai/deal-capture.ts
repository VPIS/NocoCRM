import type { Pair } from './index.js';

// A few of the opportunity form's labels as the user sees them, for the
// model to call the fields by in its reply.
export const dealCaptureFormLabels: readonly Pair[] = [
  ['商机名称', 'Opportunity name'],
  ['公司', 'Company'],
  ['阶段', 'Stage'],
  ['金额', 'Amount'],
  ['预计成交日期', 'Expected close date'],
  ['业务类型', 'Business type'],
  ['描述', 'Description'],
  ['联系人', 'Contacts'],
];
