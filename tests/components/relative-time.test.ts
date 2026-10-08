import { describe, expect, it } from 'vitest';
import { relativeTime } from '../../client/components/crm/api.js';

// The timeline's "how long ago", counted from a fixed moment.
const now = Date.parse('2026-10-08T12:00:00.000Z');
const ago = (seconds: number): string =>
  new Date(now - seconds * 1000).toISOString();

describe('relativeTime', () => {
  it('says "just now" within a minute', () => {
    expect(relativeTime(ago(30), 'zh-CN', now, '刚刚')).toBe('刚刚');
  });

  it('counts minutes, hours, days, weeks, months and years', () => {
    const say = (seconds: number): string =>
      relativeTime(ago(seconds), 'en-US', now, 'just now');
    expect(say(5 * 60)).toBe('5 minutes ago');
    expect(say(3 * 3600)).toBe('3 hours ago');
    expect(say(86400)).toBe('yesterday');
    expect(say(3 * 86400)).toBe('3 days ago');
    expect(say(14 * 86400)).toBe('2 weeks ago');
    expect(say(60 * 86400)).toBe('2 months ago');
    expect(say(400 * 86400)).toBe('last year');
  });

  it('reads in the interface language and leaves no date blank', () => {
    expect(relativeTime(ago(3 * 3600), 'zh-CN', now, '刚刚')).toBe('3小时前');
    expect(relativeTime('not a date', 'zh-CN', now, '刚刚')).toBe('');
  });
});
