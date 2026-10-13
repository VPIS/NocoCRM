import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import enUS from '../../client/locales/en-US.js';
import { ActivityPanel } from '../../client/pages/auth/activity-panel.js';

// The English copy, looked up by its dotted key.
const read = (key: string): string =>
  key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      enUS,
    ) as string;

vi.mock('@nocobase/i18n/client', () => ({
  useTranslation: () => ({ t: read, i18n: { language: 'en-US' } }),
}));

afterEach(() => {
  vi.useRealTimers();
});

// One step after another: each waits for the one before to have drawn.
const advance = (steps: number, ms = 2200) => {
  for (let i = 0; i < steps; i += 1)
    act(() => {
      vi.advanceTimersByTime(ms);
    });
};

// The sign-in page's right side tells one customer's way from a lead to an
// opportunity to a closed deal on a record card, step by step, and starts
// again.
it('turns the lead into an opportunity and closes it, step by step', () => {
  vi.useFakeTimers();
  render(<ActivityPanel />);
  expect(
    screen.getByRole('heading', {
      name: 'From the first lead to the signed deal.',
    }),
  ).toBeTruthy();
  // A lead first, the AI's capture its only step.
  expect(screen.getByText('Emma Walsh / Northwind Logistics')).toBeTruthy();
  expect(screen.getByText('organised the lead out of an email')).toBeTruthy();
  // Converted: the card is the opportunity now.
  advance(2);
  expect(screen.getByText('Fleet dispatch platform (Enterprise)')).toBeTruthy();
  expect(screen.queryByText('Emma Walsh / Northwind Logistics')).toBeNull();
  // Won at the end, its contract back.
  advance(6);
  expect(screen.getByText('the signed contract is back')).toBeTruthy();
  expect(screen.getAllByText('Won').length).toBeGreaterThan(0);
  // And again from the lead.
  advance(1, 5000);
  expect(screen.getByText('Emma Walsh / Northwind Logistics')).toBeTruthy();
});
