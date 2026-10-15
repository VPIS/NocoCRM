import { randomUUID } from 'node:crypto';
import type { Row } from '@nocobase/db';
import {
  createServiceToken,
  type ServiceResolver,
  type ServiceToken,
} from '@nocobase/service-provider';
import { recordUse } from './ai-model.js';
import type { Actor } from './authorization.js';
import { CrmError, toText } from './schema.js';
import type { CrmService } from './service.js';
import {
  readSignals,
  signalJsonQuestion,
  signalQuestion,
  type FoundSignal,
} from './signal-reading.js';
import { jsonValue } from './values.js';
import {
  searchWeb,
  WebSearchError,
  type WebAnswer,
  type WebSearcher,
} from './web-research.js';

// Company signals: what happened to a customer's company that a salesperson
// would act on (a funding round, hiring, a new executive, a launch, a risk),
// found on the web and put before the company's owner with the pages that
// say so. The company's collaborator in the guideline's terms (1.1): it
// watches the company and hands what it finds to its owner; a signal changes
// no field of the company and starts nothing on its own.
//
// Which companies: those with an open deal, and those someone switched
// `signalsWatched` on; each looked at again a week after the last check,
// the longest unchecked first, at most `limit` a pass. The daily pass is a
// scheduler task (CrmProvider), so administrators see each pass and may
// switch it off; someone who may edit a company may also check it at once.
// A signal is found once: its event key stays when it is dismissed, and the
// events already known are named to the search, which should not repeat
// them. Each found signal is a line on the company's timeline (action
// `signal`) and a notice to the company's owner and its open deals' owners.

const DAY = 86_400_000;
export const CHECK_EVERY_DAYS = 7;
const KNOWN_NAMED = 20;
const STATUSES = ['new', 'seen', 'dismissed'] as const;
export type SignalStatus = (typeof STATUSES)[number];

export interface SignalView {
  id: string;
  companyId: string;
  type: string;
  title: string;
  summary: string;
  occurredOn: string;
  sources: { title: string; url: string; site: string }[];
  status: SignalStatus;
  createdAt: string;
  decidedById: string | null;
  decidedAt: string | null;
}

export interface CompanySignalsView {
  // Whether anything can search: a configured Qwen service with a key.
  available: boolean;
  watched: boolean;
  // Watched by the daily check, by an open deal or by the switch.
  inDailyCheck: boolean;
  checkedAt: string | null;
  canEdit: boolean;
  signals: SignalView[];
}

export interface SignalPass {
  available: boolean;
  checked: number;
  found: number;
  failed: number;
}

export interface CheckResult {
  found: SignalView[];
}

function view(row: Row): SignalView {
  const sources = jsonValue(row.sources);
  return {
    id: toText(row.id),
    companyId: toText(row.companyId),
    type: toText(row.type),
    title: toText(row.title),
    summary: toText(row.summary ?? ''),
    occurredOn: toText(row.occurredOn),
    sources: Array.isArray(sources) ? (sources as SignalView['sources']) : [],
    status: STATUSES.includes(row.status as SignalStatus)
      ? (row.status as SignalStatus)
      : 'new',
    createdAt: toText(row.createdAt),
    decidedById: row.decidedById ? toText(row.decidedById) : null,
    decidedAt: row.decidedAt ? toText(row.decidedAt) : null,
  };
}

// The day an instant falls on in the CRM's time zone (YYYY-MM-DD).
function dayIn(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

export const companySignalsToken: ServiceToken<CompanySignals> =
  createServiceToken<CompanySignals>('crm.companySignals');

export class CompanySignals {
  constructor(
    private readonly service: CrmService,
    // The search the checks ask, read when asked so a configuration change
    // applies at the next restart without wiring; null when there is none.
    private readonly searcher: () => WebSearcher | null,
    private readonly options: {
      container?: ServiceResolver;
      fetch?: typeof fetch;
    } = {},
  ) {}

  available(): boolean {
    return this.searcher() !== null;
  }

  // A company's signals, newest first, for whoever may read the company.
  async of(actor: Actor, companyId: string): Promise<CompanySignalsView> {
    // Read for its access check: only who may read the company.
    await this.service.get(actor, 'companies', companyId);
    const query = this.service.database.query();
    const [rows, stored, open, canEdit] = await Promise.all([
      query
        .selectFrom('crmSignals')
        .selectAll()
        .where('companyId', '=', companyId)
        .orderBy('occurredOn', 'desc')
        .orderBy('createdAt', 'desc')
        .execute(),
      query
        .selectFrom('crmCompanies')
        .select(['signalsWatched', 'signalsCheckedAt'])
        .where('id', '=', companyId)
        .executeTakeFirst(),
      query
        .selectFrom('crmOpportunities')
        .select('id')
        .where('companyId', '=', companyId)
        .where('stage', 'not in', ['won', 'lost'])
        .executeTakeFirst(),
      this.service
        .get(actor, 'companies', companyId, query, 'update')
        .then(() => true)
        .catch(() => false),
    ]);
    const watched = Boolean(stored?.signalsWatched);
    return {
      available: this.available(),
      watched,
      inDailyCheck: watched || Boolean(open),
      checkedAt: stored?.signalsCheckedAt
        ? toText(stored.signalsCheckedAt)
        : null,
      canEdit,
      signals: rows.map(view),
    };
  }

  // Someone who may edit the company switches its watching on or off.
  async watch(
    actor: Actor,
    companyId: string,
    watched: boolean,
  ): Promise<CompanySignalsView> {
    await this.service.get(actor, 'companies', companyId, undefined, 'update');
    await this.service.database
      .query()
      .updateTable('crmCompanies')
      .set({ signalsWatched: watched })
      .where('id', '=', companyId)
      .execute();
    return this.of(actor, companyId);
  }

  // Someone who may edit the company marks a signal seen or dismisses it; a
  // dismissed event is not proposed again.
  async decide(
    actor: Actor,
    signalId: string,
    status: SignalStatus,
  ): Promise<SignalView> {
    if (status === 'new' || !STATUSES.includes(status))
      throw new CrmError('invalidInput', 400, 'status');
    const query = this.service.database.query();
    const row = await query
      .selectFrom('crmSignals')
      .selectAll()
      .where('id', '=', signalId)
      .executeTakeFirst();
    if (!row) throw new CrmError('notFound', 404);
    await this.service.get(
      actor,
      'companies',
      toText(row.companyId),
      query,
      'update',
    );
    const now = new Date().toISOString();
    await query
      .updateTable('crmSignals')
      .set({ status, decidedById: actor.id, decidedAt: now, updatedAt: now })
      .where('id', '=', signalId)
      .execute();
    return view({
      ...row,
      status,
      decidedById: actor.id,
      decidedAt: now,
      updatedAt: now,
    });
  }

  // Someone who may edit the company has it checked now, whether or not
  // the daily check watches it.
  async checkNow(actor: Actor, companyId: string): Promise<CheckResult> {
    await this.service.get(actor, 'companies', companyId, undefined, 'update');
    const searcher = this.searcher();
    if (!searcher) throw new CrmError('signalsUnavailable', 409);
    const company = await this.company(companyId);
    if (!company) throw new CrmError('notFound', 404);
    try {
      return await this.check(searcher, company, new Date());
    } catch (error) {
      throw error instanceof WebSearchError
        ? new CrmError('signalsFailed', 503, undefined, error.message)
        : error;
    }
  }

  // The daily pass over the watched companies.
  async scan(now = new Date(), limit = 20): Promise<SignalPass> {
    const searcher = this.searcher();
    const pass: SignalPass = {
      available: Boolean(searcher),
      checked: 0,
      found: 0,
      failed: 0,
    };
    if (!searcher) return pass;
    for (const company of await this.due(now, limit)) {
      pass.checked += 1;
      try {
        pass.found += (await this.check(searcher, company, now)).found.length;
      } catch {
        // Left unchecked, so the next pass looks at it first; the pass's
        // counts say how many failed.
        pass.failed += 1;
      }
    }
    return pass;
  }

  // The companies the daily check looks at now, longest unchecked first.
  async due(now: Date, limit: number): Promise<Row[]> {
    const query = this.service.database.query();
    const withDeals = new Set(
      (
        await query
          .selectFrom('crmOpportunities')
          .select('companyId')
          .where('stage', 'not in', ['won', 'lost'])
          .where('companyId', 'is not', null)
          .execute()
      ).map((row) => toText(row.companyId)),
    );
    const companies = await query
      .selectFrom('crmCompanies')
      .selectAll()
      .execute();
    const since = now.getTime() - CHECK_EVERY_DAYS * DAY;
    const at = (row: Row) =>
      row.signalsCheckedAt ? Date.parse(toText(row.signalsCheckedAt)) : 0;
    return companies
      .filter(
        (row) =>
          (row.signalsWatched || withDeals.has(toText(row.id))) &&
          at(row) < since,
      )
      .sort((a, b) => at(a) - at(b))
      .slice(0, limit);
  }

  private async company(id: string): Promise<Row | undefined> {
    return this.service.database
      .query()
      .selectFrom('crmCompanies')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  // One company searched: its new signals kept, put on its timeline and told
  // to the people who sell to it.
  private async check(
    searcher: WebSearcher,
    company: Row,
    now: Date,
  ): Promise<CheckResult> {
    const service = this.service;
    const settings = await service.settings();
    const today = dayIn(now, settings.timeZone);
    const companyId = toText(company.id);
    const query = service.database.query();
    const known = await query
      .selectFrom('crmSignals')
      .select(['eventKey', 'title', 'createdAt'])
      .where('companyId', '=', companyId)
      .orderBy('createdAt', 'desc')
      .execute();
    const question = signalQuestion(
      {
        name: toText(company.name),
        website: company.website ? toText(company.website) : null,
        industry: company.industry ? toText(company.industry) : null,
        city: company.city ? toText(company.city) : null,
      },
      today,
      known.slice(0, KNOWN_NAMED).map((row) => toText(row.title)),
      settings.aiLanguage.startsWith('zh'),
    );
    const keys = new Set(known.map((row) => toText(row.eventKey)));
    const answer = await this.ask(searcher, question);
    let read = readSignals(answer, today, keys);
    // An answer in prose: reshaped without searching, its [ref_n] marks
    // still naming the first answer's pages.
    if (read.unreadable) {
      const reshaped = await this.ask(
        searcher,
        signalJsonQuestion(answer.text),
        false,
      );
      read = readSignals({ ...reshaped, pages: answer.pages }, today, keys);
    }
    const found: SignalView[] = [];
    for (const signal of read.signals)
      found.push(await this.keep(companyId, signal, now));
    await query
      .updateTable('crmCompanies')
      .set({ signalsCheckedAt: now.toISOString() })
      .where('id', '=', companyId)
      .execute();
    if (found.length) await this.tell(company, found);
    return { found };
  }

  private async ask(
    searcher: WebSearcher,
    prompt: string,
    search = true,
  ): Promise<WebAnswer> {
    const answer = await searchWeb(searcher, prompt, {
      search,
      ...(this.options.fetch ? { fetch: this.options.fetch } : {}),
    });
    // Recorded as the CRM's other model calls are, on the usage page.
    if (this.options.container)
      await recordUse(
        this.options.container,
        { modelService: searcher.service, model: searcher.model },
        {
          inputTokens: answer.usage.inputTokens,
          outputTokens: answer.usage.outputTokens,
        } as Parameters<typeof recordUse>[2],
      ).catch(() => undefined);
    return answer;
  }

  private async keep(
    companyId: string,
    signal: FoundSignal,
    now: Date,
  ): Promise<SignalView> {
    const id = randomUUID();
    const runId = randomUUID();
    const at = now.toISOString();
    const row = {
      id,
      companyId,
      type: signal.type,
      title: signal.title,
      summary: signal.summary,
      occurredOn: signal.occurredOn,
      sources: JSON.stringify(signal.sources),
      eventKey: signal.eventKey,
      status: 'new',
      runId,
      createdAt: at,
      updatedAt: at,
    };
    await this.service.database.transaction(async ({ query }) => {
      await query.insertInto('crmSignals').values(row).execute();
      // The company's timeline line, the AI's finding (source `ai`).
      await query
        .insertInto('crmHistory')
        .values({
          id: runId,
          entity: 'companies',
          recordId: companyId,
          actorId: 'system',
          action: 'signal',
          fromValue: null,
          toValue: signal.type,
          changes: JSON.stringify({
            signalId: id,
            type: signal.type,
            title: signal.title,
            occurredOn: signal.occurredOn,
            source: signal.sources[0] ?? null,
          }),
          previous: null,
          source: 'ai',
          origin: null,
          createdAt: at,
        })
        .execute();
    });
    return view({ ...row, decidedById: null, decidedAt: null });
  }

  // A notice to the company's owner and its open deals' owners, once per
  // signal and person.
  private async tell(company: Row, found: SignalView[]): Promise<void> {
    const companyId = toText(company.id);
    const recipients = new Set<string>();
    if (company.ownerId) recipients.add(toText(company.ownerId));
    for (const deal of await this.service.database
      .query()
      .selectFrom('crmOpportunities')
      .select('ownerId')
      .where('companyId', '=', companyId)
      .where('stage', 'not in', ['won', 'lost'])
      .execute())
      if (deal.ownerId) recipients.add(toText(deal.ownerId));
    for (const signal of found)
      for (const recipientId of recipients)
        await this.service
          .notifySignal(companyId, signal.id, recipientId)
          .catch(() => false);
  }
}
