// How a control shows its focus inside the CRM's own editors (an inline
// field, a record form): a lighter border and a faint halo, as the comment
// box does, instead of the primitives' heavier ring.
export const LIGHT_FOCUS =
  '[&_:focus-visible]:border-ring/50! [&_:focus-visible]:ring-2! [&_:focus-visible]:ring-ring/10!';
