import type { QueryAdapter, Row } from '@nocobase/db';
import type { AppAuthorization } from '@nocobase/app-plugin-authorization/server';
import { convertLead } from './conversion.js';
import { CrmError, definitions, object, stages, toText } from './schema.js';
import { CrmService } from './service.js';
import {
  demoContent,
  type DemoCity,
  type DemoLanguage,
  type DemoSeat,
} from './demo-content/index.js';
import {
  listUsers,
  requireCapability,
  roleKey,
  type Actor,
} from './authorization.js';

// The demo dataset: NocoBase selling its own licences and services (the
// editions and prices of nocobase.com/cn/commercial) to fictional customers,
// with accounts, contacts, leads, opportunities, activities and approvals
// dated relative to the day it is imported. It follows the business guidance
// in server/ai/employees/crm-guidance.ts. Imported and removed from the settings
// page by an administrator; a manifest row in crm_settings records exactly
// which rows the import created, so removal touches nothing else.
export const DEMO_MARKER = 'demo-dataset-v1';

export const demoPassword = (username: string): string => `${username}123`;

export interface DemoAccount {
  readonly seat: DemoSeat;
  readonly username: string;
  readonly name: string;
  readonly role: 'sales-manager' | 'sales-representative';
}

// The people the dataset belongs to, each language its own. The
// administrator importing it owns nothing, as administrators do; the manager
// and the two sellers own the records, and the other manager decides the
// manager's approvals. The password is the username followed by 123
// (liming123): the users plugin wants eight characters, and the platform's
// own administrator is admin123.
const demoSeats: readonly (readonly [DemoSeat, DemoAccount['role']])[] = [
  ['manager', 'sales-manager'],
  ['secondManager', 'sales-manager'],
  ['firstSeller', 'sales-representative'],
  ['secondSeller', 'sales-representative'],
];

// The demo accounts of a language.
export const demoAccountsIn = (
  language: DemoLanguage,
): readonly DemoAccount[] =>
  demoSeats.map(([seat, role]) => ({
    seat,
    ...demoContent(language).accounts[seat],
    role,
  }));

export const demoAccounts: readonly DemoAccount[] = demoAccountsIn('zh-CN');

// How the import gets an account it needs: the users plugin in the running
// application, a stub in tests.
export interface DemoAccountCreator {
  create(input: {
    name: string;
    username: string;
    email: string;
    password: string;
    role: string;
  }): Promise<{ id: string }>;
  // An account that already exists is reused, and its password set back to
  // the demo one, so the password the settings page states always holds.
  resetPassword(id: string, password: string): Promise<void>;
  // And its name set back to the demo one, should it have been changed.
  rename(id: string, name: string): Promise<void>;
}

export interface DemoStatus {
  present: boolean;
  // The language the present import was made in.
  language: DemoLanguage | null;
  createdAt: string | null;
  records: number;
  accounts: readonly { username: string; name: string; role: string }[];
  // Each language's accounts, so the settings page lists the ones the
  // import it is about to make will create.
  accountsByLanguage: Record<
    DemoLanguage,
    readonly { username: string; name: string; role: string }[]
  >;
}

interface Manifest {
  version: number;
  // Absent on an import made before the dataset had a language: Chinese.
  language?: DemoLanguage;
  label: string;
  createdAt: string;
  businessDate: string;
  ownerId: string;
  records: { entity: string; id: string; name: string }[];
}

// Whether a demo dataset is imported, for the banner that offers one to
// whoever may import it (the metadata route asks only for them).
export async function demoPresent(service: CrmService): Promise<boolean> {
  return Boolean(
    await service.database
      .query()
      .selectFrom('crmSettings')
      .select('id')
      .where('id', '=', DEMO_MARKER)
      .executeTakeFirst(),
  );
}

export async function demoStatus(
  service: CrmService,
  actor: Actor,
): Promise<DemoStatus> {
  await requireCapability(actor, 'manage', 'settings');
  const row = await service.database
    .query()
    .selectFrom('crmSettings')
    .select('value')
    .where('id', '=', DEMO_MARKER)
    .executeTakeFirst();
  const manifest = row ? (parseManifest(row.value) ?? null) : null;
  // The accounts of the language of the import present, else of the
  // reader's.
  const language: DemoLanguage | null = manifest
    ? (manifest.language ?? 'zh-CN')
    : null;
  const names = language ?? (actor.locale.startsWith('zh') ? 'zh-CN' : 'en-US');
  return {
    present: Boolean(manifest),
    language,
    createdAt: manifest?.createdAt ?? null,
    records: manifest?.records.length ?? 0,
    accounts: listed(names),
    accountsByLanguage: { 'zh-CN': listed('zh-CN'), 'en-US': listed('en-US') },
  };
}
const listed = (language: DemoLanguage) =>
  demoAccountsIn(language).map(({ username, name, role }) => ({
    username,
    name,
    role,
  }));

function parseManifest(value: unknown): Manifest | undefined {
  const parsed: unknown = typeof value === 'string' ? JSON.parse(value) : value;
  const record = object(parsed);
  return Array.isArray(record.records)
    ? (record as unknown as Manifest)
    : undefined;
}

// The offset of a zone on a given instant, so days can be built at local
// midnight in the business timezone without a calendar library.
function zoneOffsetMinutes(timeZone: string, date: Date): number {
  const part = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')?.value;
  const match = /GMT([+-])(\d{2}):?(\d{2})?/.exec(part ?? '');
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === '-' ? -minutes : minutes;
}

export async function populateDemo(
  service: CrmService,
  authz: AppAuthorization,
  actor: Actor,
  accounts: DemoAccountCreator,
  language: DemoLanguage = 'zh-CN',
): Promise<DemoStatus> {
  await requireCapability(actor, 'manage', 'settings');
  const text = demoContent(language);
  const query = service.database.query();
  if (
    await query
      .selectFrom('crmSettings')
      .select('id')
      .where('id', '=', DEMO_MARKER)
      .executeTakeFirst()
  )
    throw new CrmError('demoExists', 409);

  // Accounts: reuse one that exists by username, create the rest, and make
  // sure each holds its demo role and nothing else among the CRM roles.
  const existing = await listUsers(service.database);
  const userIds = {} as Record<DemoSeat, string>;
  for (const account of demoAccountsIn(language)) {
    const found = existing.find((u) => u.username === account.username);
    if (found) {
      await accounts.resetPassword(found.id, demoPassword(account.username));
      if (found.name !== account.name)
        await accounts.rename(found.id, account.name);
    }
    const id = found
      ? found.id
      : (
          await accounts.create({
            name: account.name,
            username: account.username,
            email: `${account.username}@demo.example`,
            password: demoPassword(account.username),
            role: roleKey(account.role),
          })
        ).id;
    await authz.permissionSets.replaceSubjectAssignments({
      subject: { type: 'user', id },
      managedPermissionSets: [
        'sales-representative',
        'sales-manager',
        'system-administrator',
      ].map(roleKey),
      permissionSets: [roleKey(account.role)],
    });
    userIds[account.seat] = id;
  }
  const actorFor = (id: string): Actor => ({
    id,
    locale: language,
    scope: authz.for({
      principal: { type: 'user', id },
      subjects: [{ type: 'authenticated', id: '*' }],
    }),
  });
  const owner = actorFor(actor.id);
  const managerActor = actorFor(userIds.manager);
  const manager2 = { id: userIds.secondManager };
  const sellerActors = [
    actorFor(userIds.firstSeller),
    actorFor(userIds.secondSeller),
  ];

  const settings = await service.settings();
  const timeZone = settings.timeZone || 'Asia/Shanghai';
  const now = new Date();
  const calendarDay = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  // Local midnight of today in the business timezone.
  const base =
    Date.parse(`${calendarDay}T00:00:00Z`) -
    zoneOffsetMinutes(timeZone, now) * 60000;
  const at = (day: number, hour = 10, minute = 0): string =>
    new Date(
      base + day * 86400000 + hour * 3600000 + minute * 60000,
    ).toISOString();
  const started = now.toISOString();
  const manifest: Manifest = {
    version: 6,
    language,
    label: text.label,
    createdAt: started,
    businessDate: calendarDay,
    ownerId: actor.id,
    records: [],
  };
  const track = (entity: string, record: Row): Row => {
    if (!manifest.records.some((r) => r.id === record.id))
      manifest.records.push({
        entity,
        id: toText(record.id),
        name: toText(record.name),
      });
    return record;
  };
  const ids = (): string[] => manifest.records.map((r) => r.id);
  const historyAt = async (q: QueryAdapter, date: string): Promise<void> => {
    if (manifest.records.length)
      await q
        .updateTable('crmHistory')
        .set({ createdAt: date })
        .where('recordId', 'in', ids())
        .where('createdAt', '>=', started)
        .execute();
  };
  type Entity = keyof typeof definitions;
  const saver =
    (prepared: Actor, q: QueryAdapter) =>
    async (entity: Entity, input: Row, day = -1, id?: string): Promise<Row> => {
      const record = track(
        entity,
        await service.save(prepared, entity, input, id, q),
      );
      const date = at(day);
      const patch: Row = { updatedAt: date };
      if (!id) patch.createdAt = date;
      if (
        entity === 'opportunities' &&
        ['won', 'lost'].includes(toText(record.stage))
      )
        patch.closedAt = date;
      if (entity === 'activities' && record.status === 'completed')
        patch.completedAt = input.endAt ?? record.endAt;
      await q
        .updateTable(definitions[entity].table)
        .set(patch)
        .where('id', '=', record.id)
        .execute();
      await historyAt(q, date);
      return service.get(prepared, entity, toText(record.id), q);
    };

  // Who owns which account (by index): the first seller 0,1,4 · the second
  // seller 2,5,7 · the manager 3,6.
  // Leads rotate the same way by position; activities follow their record.
  const accountOwner = (i: number): Actor =>
    [0, 1, 4].includes(i)
      ? sellerActors[0]
      : [2, 5, 7].includes(i)
        ? sellerActors[1]
        : managerActor;
  const leadOwner = (i: number): Actor =>
    [sellerActors[0], sellerActors[1], managerActor][i % 3];
  const accounts_: Row[] = [];
  const contacts: Row[][] = [];
  const opportunities: Row[] = [];
  const leads: Row[] = [];
  // [industry, city, status, source, employees]; the names, domains and
  // descriptions are the language's, and so are the contacts.
  const companies: [string, DemoCity, string, string, string][] = [
    ['manufacturing', 'shanghai', 'qualified', 'exhibition', '201-500'],
    ['retail', 'hangzhou', 'qualified', 'customerReferral', '501-1000'],
    ['healthcare', 'beijing', 'qualified', 'website', '201-500'],
    ['technology', 'shenzhen', 'qualified', 'partner', '51-200'],
    ['education', 'suzhou', 'prospect', 'marketing', '51-200'],
    ['professionalServices', 'chengdu', 'qualified', 'outbound', '11-50'],
    ['energy', 'nanjing', 'inactive', 'search', '201-500'],
    ['foodAndBeverage', 'guangzhou', 'qualified', 'partner', '501-1000'],
  ];
  // [account, amount, stage, close day, business type, created day, last
  // change day, lost reason]; the names are the language's, by index.
  const deals: [
    number,
    number,
    string,
    number,
    string,
    number,
    number,
    string?,
  ][] = [
    [0, 280000, 'proposal', 28, 'newBusiness', -28, -4],
    [1, 45000, 'contract', 5, 'expansion', -25, -2],
    [2, 360000, 'negotiation', -3, 'newBusiness', -22, -3],
    [3, 150000, 'validation', 20, 'newBusiness', -18, -5],
    [4, 50000, 'contact', 45, 'newBusiness', -5, -5],
    [5, 45000, 'won', -18, 'expansion', -42, -18],
    [1, 88000, 'won', -3, 'crossSell', -30, -3],
    [6, 260000, 'paused', 60, 'tender', -26, -8],
    [7, 65000, 'lost', -22, 'newBusiness', -48, -22],
    [0, 42000, 'lost', -4, 'renewal', -20, -4],
    // Closed in the five months before: enough won and lost each month for the
    // workspace's trend to have a shape. Appended so the indexes above hold.
    [5, 16000, 'won', -152, 'newBusiness', -185, -152],
    [3, 50000, 'lost', -148, 'newBusiness', -178, -148, 'price'],
    [1, 36000, 'won', -140, 'newBusiness', -172, -140],
    [2, 50000, 'won', -122, 'newBusiness', -160, -122],
    [7, 47000, 'lost', -118, 'newBusiness', -150, -118, 'noBudget'],
    [4, 50000, 'lost', -112, 'newBusiness', -145, -112, 'timing'],
    [0, 175000, 'won', -95, 'newBusiness', -130, -95],
    [6, 230000, 'won', -88, 'tender', -125, -88],
    [3, 50000, 'won', -84, 'crossSell', -115, -84],
    [5, 39000, 'lost', -80, 'expansion', -110, -80, 'noDecision'],
    [1, 118000, 'lost', -62, 'newBusiness', -95, -62, 'requirementMismatch'],
    [2, 64000, 'won', -55, 'expansion', -90, -55],
    [7, 150000, 'won', -40, 'newBusiness', -75, -40],
    [0, 98000, 'lost', -36, 'newBusiness', -70, -36, 'toCompetitor'],
    // Early-stage deals, so the first board columns carry more than one card.
    [6, 50000, 'qualification', 35, 'newBusiness', -6, -2],
    [6, 35000, 'contact', 55, 'newBusiness', -2, -2],
    [2, 68000, 'contact', 50, 'newBusiness', -3, -3],
    [4, 52000, 'qualification', 40, 'crossSell', -9, -4],
    [3, 50000, 'validation', 32, 'crossSell', -14, -6],
    [1, 156000, 'proposal', 24, 'newBusiness', -20, -5],
  ];
  // [status, source, created day]; the name, mailbox, company and message
  // are the language's, by index.
  const leadSpecs: [string, string, number][] = [
    ['new', 'exhibition', -16],
    ['working', 'website', -7],
    ['new', 'website', -1],
    ['new', 'exhibition', -6],
    ['new', 'marketing', -2],
    ['working', 'outbound', -9],
    ['working', 'customerReferral', -12],
    ['working', 'partner', -8],
    ['nurturing', 'search', -17],
    ['nurturing', 'exhibition', -19],
    ['nurturing', 'marketing', -8],
    ['invalid', 'website', -10],
    ['invalid', 'outbound', -13],
    ['working', 'employeeReferral', -4],
    ['new', 'partner', -5],
    ['working', 'search', -3],
  ];
  // The province of each demo city (ISO 3166-2, as the region field
  // stores it), so a demo record carries the whole region: country,
  // province and city.
  const provinceOf: Record<DemoCity, string> = {
    beijing: 'CN-11',
    shanghai: 'CN-31',
    nanjing: 'CN-32',
    suzhou: 'CN-32',
    hangzhou: 'CN-33',
    guangzhou: 'CN-44',
    shenzhen: 'CN-44',
    chengdu: 'CN-51',
  };
  const phone = (n: number): string =>
    `138 0${String(100 + n).slice(-3)} ${String(2000 + n * 37).slice(-4)}`;

  await service.mutate(owner, async (prepared, q) => {
    const save = saver(prepared, q);
    for (let i = 0; i < companies.length; i++) {
      const [industry, city, status, source, employees] = companies[i];
      const { name, domain, description } = text.companies[i];
      const ownerId = accountOwner(i).id;
      const account = await save(
        'accounts',
        {
          name,
          ownerId,
          industry,
          city: text.cities[city],
          state: provinceOf[city],
          country: 'CN',
          status,
          source,
          employees,
          type: i === 3 ? 'partner' : 'direct',
          website: `https://www.${domain}.example`,
          description,
          notes: null,
        },
        -75 + i * 5,
      );
      accounts_.push(account);
      const pair: Row[] = [];
      for (let j = 0; j < 2; j++) {
        const { name: personName, mailbox } = text.people[i][j];
        pair.push(
          await save(
            'contacts',
            {
              name: personName,
              ownerId,
              accountId: account.id,
              jobTitle: text.contactJobTitles[j],
              gender: j === 0 ? 'female' : 'male',
              source,
              email: i === 4 && j === 1 ? null : `${mailbox}@${domain}.example`,
              phone: i === 4 && j === 1 ? null : phone(i * 2 + j),
              employed: !(i === 7 && j === 1),
              primary: j === 0,
              notes: text.contactNotes[j],
            },
            i === 4 ? -4 - j : -70 + i * 5 + j,
          ),
        );
      }
      contacts.push(pair);
    }
    for (const [
      d,
      [
        a,
        amount,
        stage,
        close,
        businessType,
        created,
        changed,
        lostReason = 'toCompetitor',
      ],
    ] of deals.entries()) {
      const name = text.deals[d];
      const ownerId = accountOwner(a).id;
      let deal = await save(
        'opportunities',
        {
          name,
          ownerId,
          accountId: accounts_[a].id,
          amount,
          currency: 'CNY',
          source: companies[a][3],
          businessType,
          expectedCloseAt: at(close, 17),
          description: text.companies[a].description,
          contacts: [
            { contactId: contacts[a][0].id, role: 'decisionMaker' },
            { contactId: contacts[a][1].id, role: 'evaluator' },
          ],
        },
        created,
      );
      const progression = ['won', 'lost', 'paused'].includes(stage)
        ? ['qualification', 'proposal', stage]
        : stages.slice(1, stages.indexOf(stage) + 1);
      for (let i = 0; i < progression.length; i++) {
        const next = progression[i];
        const day = Math.round(
          created + ((changed - created) * (i + 1)) / progression.length,
        );
        deal = await save(
          'opportunities',
          {
            stage: next,
            ...(next === 'lost' ? { lostReason } : {}),
            ...(next === 'paused'
              ? { pauseReason: 'budgetDeferred', resumeAt: at(30) }
              : {}),
          },
          day,
          toText(deal.id),
        );
      }
      opportunities.push(deal);
    }
    await save(
      'accounts',
      {
        status: 'churned',
        churnReason: 'toCompetitor',
        notes: text.churnNotes,
      },
      -20,
      toText(accounts_[7].id),
    );
    // Chronology on automatically promoted accounts follows the associated won deal.
    for (const [i, day] of [
      [5, -18],
      [1, -3],
    ] as const)
      await q
        .updateTable('crmAccounts')
        .set({ updatedAt: at(day) })
        .where('id', '=', accounts_[i].id)
        .execute();
    const leadCities: DemoCity[] = [
      'shanghai',
      'beijing',
      'shenzhen',
      'hangzhou',
    ];
    for (let i = 0; i < leadSpecs.length; i++) {
      const [status, source, day] = leadSpecs[i];
      const { name, mailbox, company, message } = text.leads[i];
      leads.push(
        await save(
          'leads',
          {
            name,
            company,
            status,
            source,
            ownerId: leadOwner(i).id,
            email: `${mailbox}@lead-${i + 1}.example`,
            phone: i % 4 === 0 ? null : phone(40 + i),
            jobTitle: text.leadJobTitles[i % 2],
            country: 'CN',
            state: provinceOf[leadCities[i % 4]],
            city: text.cities[leadCities[i % 4]],
            industry: ['manufacturing', 'education', 'retail', 'technology'][
              i % 4
            ],
            message,
            ...(status === 'invalid'
              ? { invalidReason: i === 12 ? 'badContact' : 'notTarget' }
              : {}),
          },
          day,
        ),
      );
    }
    const activity = async (
      name: string,
      links: Row,
      day: number,
      hour: number,
      status = 'planned',
      type = 'call',
      feedback?: string | null,
    ): Promise<Row> =>
      save(
        'activities',
        {
          name,
          ...links,
          startAt: at(day, hour),
          endAt: at(day, hour + 1),
          status,
          type,
          description: text.activityDescription,
          feedback: feedback ?? null,
        },
        Math.min(day - 2, -1),
      );
    const leadLinks = (i: number): Row => ({
      leadId: leads[i].id,
      ownerId: leadOwner(i).id,
    });
    await activity(
      text.discoveryCall.name,
      leadLinks(0),
      -12,
      10,
      'completed',
      'call',
      text.discoveryCall.feedback,
    );
    await activity(
      text.productDemo.name,
      leadLinks(1),
      -5,
      14,
      'completed',
      'meeting',
      text.productDemo.feedback,
    );
    for (const [i, accountIndex, contactIndex, day] of [
      [0, 0, 0, -10],
      [1, 4, 0, -4],
    ] as const) {
      const converted = await convertLead(
        service,
        prepared,
        toText(leads[i].id),
        {
          accountId: accounts_[accountIndex].id,
          contactId: contacts[accountIndex][contactIndex].id,
          createOpportunity: false,
        },
        q,
      );
      await q
        .updateTable('crmLeads')
        .set({ convertedAt: at(day), updatedAt: at(day) })
        .where('id', '=', converted.id)
        .execute();
      await q
        .updateTable('crmActivities')
        .set({ updatedAt: at(day) })
        .where('leadId', '=', converted.id)
        .execute();
      await historyAt(q, at(day));
      leads[i] = converted;
    }
    // Completed notes and upcoming meetings across the active pipeline.
    for (let i = 0; i < 6; i++) {
      const a = deals[i][0];
      const links: Row = {
        accountId: accounts_[a].id,
        opportunityId: opportunities[i].id,
        ownerId: accountOwner(a).id,
        externalParticipants: [contacts[a][0].id, contacts[a][1].id],
      };
      await activity(
        text.activityName(
          text.companies[a].activitySubject,
          text.completedMatters[i],
        ),
        links,
        -6 - i,
        10,
        'completed',
        i % 2 ? 'meeting' : 'demo',
        text.completedFeedback[i],
      );
      if (i < 5)
        await activity(
          text.activityName(
            text.companies[a].activitySubject,
            text.plannedMatters[i],
          ),
          links,
          [0, 0, -2, 2, 5][i],
          [10, 15, 11, 14, 10][i],
          'planned',
          i === 3 ? 'meeting' : 'call',
        );
    }
    // Two late-evening calls today, so the workspace's "upcoming today" list
    // still has entries at the end of the working day.
    await activity(
      text.eveningCall,
      {
        accountId: accounts_[0].id,
        opportunityId: opportunities[0].id,
        ownerId: accountOwner(0).id,
        externalParticipants: [contacts[0][0].id],
      },
      0,
      21.5,
      'planned',
      'call',
    );
    await activity(
      text.ssoConfirmation,
      {
        accountId: accounts_[1].id,
        opportunityId: opportunities[1].id,
        ownerId: accountOwner(1).id,
        externalParticipants: [contacts[1][1].id],
      },
      0,
      23.5,
      'planned',
      'meeting',
    );
    const leadActivities: [number, number, number, string, string][] = [
      [2, 1, 11, 'planned', 'call'],
      [5, -5, 10, 'completed', 'call'],
      [5, 0, 16, 'planned', 'meeting'],
      [6, -7, 14, 'completed', 'email'],
      [7, 3, 11, 'planned', 'demo'],
      [8, -10, 10, 'completed', 'call'],
      [9, -14, 15, 'completed', 'call'],
      [10, -3, 10, 'completed', 'email'],
      [13, -2, 11, 'completed', 'meeting'],
      [13, 2, 15, 'planned', 'demo'],
      [15, 4, 10, 'planned', 'call'],
      [4, -1, 14, 'cancelled', 'meeting'],
      [14, -2, 11, 'cancelled', 'call'],
      [7, -1, 16, 'planned', 'task'],
      [6, 7, 10, 'planned', 'call'],
    ];
    const activityLabel = (status: string): string =>
      status === 'completed'
        ? text.leadActivityMatters.completed
        : status === 'cancelled'
          ? text.leadActivityMatters.cancelled
          : text.leadActivityMatters.planned;
    for (const [i, day, hour, status, type] of leadActivities)
      await activity(
        text.activityName(text.leads[i].company, activityLabel(status)),
        leadLinks(i),
        day,
        hour,
        status,
        type,
        status === 'completed' ? text.leadActivityFeedback : null,
      );
    // A steady cadence beyond the hand-placed fortnight, so the calendar
    // and the day's agenda have something on every working day from a
    // month back to three months ahead, whichever day the demo is opened
    // on: past days are completed (with the odd no-show or cancellation),
    // future days are planned. The work rotates over the live deals and
    // the open leads, owned by whoever owns the record.
    const activeDeals = opportunities
      .map((deal, index) => ({ deal, index }))
      .filter(
        ({ index }) => !['won', 'lost', 'paused'].includes(deals[index][2]),
      );
    const openLeads = leads
      .map((lead, index) => ({ lead, index }))
      .filter(
        ({ lead }) => !['converted', 'invalid'].includes(toText(lead.status)),
      );
    const cadenceTypes = [
      'call',
      'meeting',
      'demo',
      'email',
      'task',
      'call',
      'meeting',
    ];
    const weekdayOf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    });
    let n = 0;
    for (let day = -30; day <= 90; day++) {
      if (day >= -14 && day <= 7) continue;
      // Noon, so the weekday is the business day whatever the zone offset.
      const weekday = weekdayOf.format(
        new Date(base + day * 86400000 + 12 * 3600000),
      );
      if (weekday === 'Sat' || weekday === 'Sun') continue;
      const perDay = day % 3 === 0 ? 2 : 1;
      for (let k = 0; k < perDay; k++, n++) {
        const hour = [9, 10, 11, 14, 15, 16][n % 6];
        const name = text.cadenceMatters[n % text.cadenceMatters.length];
        const type = cadenceTypes[n % cadenceTypes.length];
        const status =
          day < 0
            ? n % 9 === 4 || n % 11 === 6
              ? 'cancelled'
              : 'completed'
            : 'planned';
        const feedback =
          status === 'completed'
            ? text.cadenceFeedback[n % text.cadenceFeedback.length]
            : null;
        if (n % 3 === 2 && openLeads.length) {
          const { lead, index } = openLeads[n % openLeads.length];
          await activity(
            text.activityName(toText(lead.company), name),
            leadLinks(index),
            day,
            hour,
            status,
            type,
            feedback,
          );
        } else {
          const { deal, index } = activeDeals[n % activeDeals.length];
          const a = deals[index][0];
          await activity(
            text.activityName(text.companies[a].activitySubject, name),
            {
              accountId: accounts_[a].id,
              opportunityId: deal.id,
              ownerId: accountOwner(a).id,
              externalParticipants: [contacts[a][0].id],
            },
            day,
            hour,
            status,
            type,
            feedback,
          );
        }
      }
    }
  });

  // Approvals are raised by whoever owns the deal, submitted to the manager;
  // one of them the manager has already decided, and one the manager raised
  // goes to the second manager (an administrator is not an approver).
  const raise = (
    who: Actor,
    input: Row,
    day: number,
    submitDay: number,
  ): Promise<Row> =>
    service.mutate(who, async (prepared, q) => {
      const save = saver(prepared, q);
      const record = await save('approvals', input, day);
      // Demo data starts no AI review (Actor.quiet).
      await service.approvalAction(
        { ...prepared, quiet: true },
        toText(record.id),
        'submit',
        '',
        q,
      );
      await q
        .updateTable('crmApprovals')
        .set({ submittedAt: at(submitDay, 11), updatedAt: at(submitDay, 11) })
        .where('id', '=', record.id)
        .execute();
      await historyAt(q, at(submitDay, 11));
      return record;
    });
  await raise(
    accountOwner(0),
    {
      name: text.approvals.discount.name,
      opportunityId: opportunities[0].id,
      topic: 'discount',
      approverId: managerActor.id,
      description: text.approvals.discount.description,
    },
    -1,
    -1,
  );
  const paymentTerms = await raise(
    accountOwner(1),
    {
      name: text.approvals.paymentTerms.name,
      opportunityId: opportunities[1].id,
      topic: 'paymentTerms',
      approverId: managerActor.id,
      description: text.approvals.paymentTerms.description,
    },
    -6,
    -6,
  );
  await service.mutate(managerActor, async (prepared, q) => {
    await service.approvalAction(
      { ...prepared, quiet: true },
      toText(paymentTerms.id),
      'approve',
      text.approvals.paymentTerms.comment,
      q,
    );
    await q
      .updateTable('crmApprovals')
      .set({ decidedAt: at(-5, 15), updatedAt: at(-5, 15) })
      .where('id', '=', paymentTerms.id)
      .execute();
    await historyAt(q, at(-5, 15));
  });
  await raise(
    managerActor,
    {
      name: text.approvals.contractTerms.name,
      opportunityId: opportunities[3].id,
      topic: 'contractTerms',
      approverId: manager2.id,
      description: text.approvals.contractTerms.description,
    },
    -2,
    -2,
  );

  // The manifest makes the import repeat-safe and records exactly which rows
  // it created, so removal can find them again.
  await query
    .insertInto('crmSettings')
    .values({
      id: DEMO_MARKER,
      value: JSON.stringify(manifest),
      updatedAt: new Date(),
    })
    .execute();
  // The import queued a notification for every assignment; a demo inbox
  // full of "assigned to you" would drown what the demo is meant to show.
  await query.deleteFrom('crmOutbox').where('recordId', 'in', ids()).execute();
  return demoStatus(service, actor);
}

// Removes exactly the rows the import created, in dependency order. The demo
// accounts stay: they are ordinary accounts now, and deleting people is the
// Users page's job.
export async function resetDemo(
  service: CrmService,
  actor: Actor,
): Promise<DemoStatus> {
  await requireCapability(actor, 'manage', 'settings');
  const query = service.database.query();
  const row = await query
    .selectFrom('crmSettings')
    .select('value')
    .where('id', '=', DEMO_MARKER)
    .executeTakeFirst();
  const manifest = row ? parseManifest(row.value) : undefined;
  if (!manifest) throw new CrmError('demoMissing', 404);
  const byEntity = new Map<string, string[]>();
  for (const record of manifest.records) {
    const list = byEntity.get(record.entity) ?? [];
    list.push(record.id);
    byEntity.set(record.entity, list);
  }
  const all = manifest.records.map((r) => r.id);
  await service.database.transaction(async ({ query: q }) => {
    if (all.length) {
      await q.deleteFrom('crmHistory').where('recordId', 'in', all).execute();
      await q.deleteFrom('crmOutbox').where('recordId', 'in', all).execute();
    }
    for (const [entity, table] of [
      ['activities', 'crmActivities'],
      ['approvals', 'crmApprovals'],
      ['opportunities', 'crmOpportunities'],
      ['contacts', 'crmContacts'],
      ['leads', 'crmLeads'],
      ['accounts', 'crmAccounts'],
    ] as const) {
      const ids = byEntity.get(entity) ?? [];
      if (ids.length)
        await q.deleteFrom(table).where('id', 'in', ids).execute();
    }
    await q.deleteFrom('crmSettings').where('id', '=', DEMO_MARKER).execute();
  });
  return demoStatus(service, actor);
}
