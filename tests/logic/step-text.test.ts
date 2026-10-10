import { describe, expect, it } from 'vitest';
import { stepWords } from '../../client/components/crm/agent-chat/step-text.js';

// The steps a run of the CRM's agent showed, as the plugin sums them up, and
// what the conversation says of them.
describe('a run step in plain words', () => {
  it('names what a CRM command looks at, not the command', () => {
    expect(
      stepWords({
        kind: 'reading',
        subject: 'crm lead list --q "SF Express" --json',
      }),
    ).toEqual({ key: 'find', values: { object: 'leads', q: 'SF Express' } });
    expect(
      stepWords({
        kind: 'reading',
        subject: 'crm search --q "SF Express" --json 2>&1 | head -50',
      }),
    ).toEqual({ key: 'search', values: { q: 'SF Express' } });
    expect(
      stepWords({
        kind: 'working',
        subject:
          'crm leads history 81cd4652-362a-4bb5-b03c-c4b116052d26 --json 2>&1 | head -100',
      }),
    ).toEqual({ key: 'history', values: { object: 'leads' } });
    expect(
      stepWords({ kind: 'reading', subject: 'crm leads get 81cd --json' }),
    ).toEqual({ key: 'get', values: { object: 'leads' } });
    expect(
      stepWords({ kind: 'reading', subject: 'crm tasks list --json' }),
    ).toEqual({ key: 'list', values: { object: 'tasks' } });
    expect(
      stepWords({ kind: 'reading', subject: 'crm tasks list --help' }),
    ).toEqual({ key: 'help' });
    expect(
      stepWords({ kind: 'working', subject: 'crm plan create --json' }),
    ).toEqual({ key: 'plan' });
  });

  it('says a skill is the method it reads, and thinking as thinking', () => {
    expect(stepWords({ kind: 'working', subject: 'skill' })).toEqual({
      key: 'skill',
    });
    expect(stepWords({ kind: 'thinking' })).toEqual({ key: 'thinking' });
  });

  it('never shows a command line, whatever the step', () => {
    expect(
      stepWords({
        kind: 'working',
        subject: 'crm docs leads create 2>&1 | tail -30',
      }),
    ).toEqual({ key: 'help' });
    expect(
      stepWords({ kind: 'reading', subject: 'crm leads summary --json' }),
    ).toEqual({ key: 'summary', values: { object: 'leads' } });
    expect(
      stepWords({ kind: 'reading', subject: 'crm colleagues list --json' }),
    ).toEqual({ key: 'colleagues' });
    expect(stepWords({ kind: 'reading', subject: 'crm widgets list' })).toEqual(
      { key: 'crm' },
    );
    expect(stepWords({ kind: 'working', subject: 'ls -la' })).toEqual({
      key: 'working',
    });
    expect(stepWords({ kind: 'reading', subject: 'cat notes.md' })).toEqual({
      key: 'reading',
    });
  });
});
