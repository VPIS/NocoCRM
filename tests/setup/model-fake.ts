// A stand-in for the Agents plugin's model gateway in server tests: the CRM's
// background AI (server/providers/crm/ai-model.ts) asks it, through
// `agentsToken`, for the reply to each turn. `reply` gives a turn's answer:
// a value is answered as its JSON, `{ asText }` as that text, and a function
// is called with the turn's prompt (the latest question alone) and the
// call. The container also gets a logger whose warnings are kept.
import { agentsToken } from '@nocobase/app-plugin-agents/server/tokens';
import { loggingToken } from '@nocobase/app-server/logging';
import type { ServiceContainer } from '@nocobase/service-provider';

export interface ModelCall {
  // The whole prompt the gateway was given (earlier turns as a transcript).
  readonly prompt: string;
  readonly system?: string;
  readonly signal?: AbortSignal;
}

type Reply =
  unknown | ((prompt: string, call: ModelCall) => unknown | Promise<unknown>);

// The latest question of a prompt that carries earlier turns.
function latest(prompt: string): string {
  const at = prompt.lastIndexOf('\n\nUser:\n');
  return at === -1 ? prompt : prompt.slice(at + '\n\nUser:\n'.length);
}

function asText(answer: unknown): string {
  if (typeof answer === 'string') return answer;
  if (answer && typeof answer === 'object' && 'asText' in answer)
    return String((answer as { asText: unknown }).asText);
  return JSON.stringify(answer);
}

export function fakeModel(
  container: ServiceContainer,
  reply: Reply,
): { prompts: string[]; calls: ModelCall[]; warnings: unknown[] } {
  const prompts: string[] = [];
  const calls: ModelCall[] = [];
  const warnings: unknown[] = [];
  container.instance(agentsToken, {
    chat: { settings: async () => ({ defaultAgentId: null }) },
    agents: { get: async () => Promise.reject(new Error('none')) },
    online: {
      gateway: {
        catalog: async () => ({
          services: [],
          defaultModel: { modelService: 'test', model: 'test-model' },
        }),
        generate: async (call: ModelCall) => {
          // A model call gives up on a signal already aborted, as one does
          // when the application stops.
          if (call.signal?.aborted) throw new Error('aborted');
          calls.push(call);
          const prompt = latest(call.prompt);
          prompts.push(prompt);
          const answer =
            typeof reply === 'function'
              ? await (reply as (p: string, c: ModelCall) => unknown)(
                  prompt,
                  call,
                )
              : reply;
          return { text: asText(answer) };
        },
      },
    },
  } as unknown as ReturnType<typeof container.resolve<typeof agentsToken>>);
  container.instance(loggingToken, {
    getLogger: () => ({
      warn: (entry: unknown) => warnings.push(entry),
      info: () => undefined,
      debug: () => undefined,
      error: () => undefined,
    }),
  } as unknown as ReturnType<typeof container.resolve<typeof loggingToken>>);
  return { prompts, calls, warnings };
}
