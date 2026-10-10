import { fieldLabelKey, linkOf, toText } from '../components/crm/api.js';
import { TaskCards } from '../components/crm/task-list.js';
import { AutoLoadMore } from '../components/crm/auto-load.js';
import { MentionTextarea } from '../components/crm/mention-textarea.js';
import {
  markdownMentions,
  mentionsIn,
  withMentions,
} from '../components/crm/mentions.js';
import { markdownLine } from '../components/crm/line-breaks.js';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useTranslation } from '@nocobase/i18n/client';
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router';
import { Sheet, SheetContent, SheetTitle } from '../components/ui/sheet.js';
import {
  RecordDrawerContext,
  useRecordDrawer,
  resolveTab,
  useDetailTab,
  useRecordDrawerState,
  useRecordLink,
  type RecordDrawerApi,
} from '../components/crm/record-drawer.js';
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Mail,
  Merge,
  ListChecks,
  UserRound,
  CirclePlus,
  ChevronDown,
  Ellipsis,
  History,
  Paperclip,
  MessageCircle,
  PencilLine,
  MessageSquareText,
  Maximize2,
  X,
  Plus,
  Sparkles,
  Trash2,
  type LucideIcon,
  SquareCheckBig,
} from 'lucide-react';
import { Button, buttonVariants } from '../components/ui/button.js';
import { useFollowUpRequest } from '../components/crm/follow-up-request.js';
import { FieldIcon } from '../components/crm/field-icons.js';
import { LocationField } from '../components/crm/location-field.js';
import { Spinner } from '../components/ui/spinner.js';
import { LONG_TEXT_LIMIT } from '../../server/providers/crm/limits.js';
import { Badge } from '../components/ui/badge.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog.js';
import {
  useCrmApi,
  useCrmQuery,
  useMore,
  useCrmText,
  useMetadata,
  useRefresh,
  sentence,
  localDate,
  relativeTime,
  rows,
  arrayValues,
  errorCode,
  type Entity,
  type Data,
  type Detail,
  type Field,
  type CrmRecord,
} from '../components/crm/api.js';
import {
  CrmFrame,
  LongText,
  Loading,
  ErrorNotice,
  RecordLink,
  Status,
  Value,
} from '../components/crm/common.js';
import { revealScrollbar } from '../components/crm/scrollbar.js';
import { RecordForm } from '../components/crm/form.js';
import {
  EvaluateButton,
  EvaluationStatus,
  EvaluationFeedEntry,
  VerdictPanel,
  type EvaluationEntry,
} from '../components/crm/lead-evaluation.js';
import { FileLinks, UploadZone } from '../components/crm/attachments.js';
import EntityDetail from './crm-entity-detail.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu.js';
import { InlineField } from '../components/crm/inline.js';
import { useAnnounceRecord } from '../components/crm/current-record.js';
import { ConfirmDialog } from '../components/crm/confirm-dialog.js';
import { useRecordBreadcrumb } from '../components/crm/record-breadcrumb.js';
import { ConvertDialog } from '../components/crm/conversion.js';
import { LeadDuplicates } from '../components/crm/lead-merge.js';
import { RecordMailPanel } from '../components/crm/record-mail.js';
import {
  emailsOf,
  useMailSetup,
  useRecordMessages,
} from '../components/crm/mail.js';
import type { MailTarget } from '../../server/providers/crm/mail-target.js';
import {
  ReviewFeedEntry,
  ReviewPanel,
  type ReviewEntry,
} from '../components/crm/approval-review.js';

const drawerEntities: Entity[] = [
  'leads',
  'companies',
  'contacts',
  'opportunities',
  'tasks',
  'approvals',
];

export default function CrmDetailPage(): ReactElement {
  const params = useParams();
  const { opened, open, close } = useRecordDrawerState();
  const entity = params.entity as Entity;
  const key = `${toText(params.entity)}/${toText(params.id)}`;
  // The route can render once more with empty params while it is being left
  // (after a delete); without both there is nothing to load.
  if (!params.entity || !params.id) return <></>;
  return (
    <RecordDrawerContext.Provider value={{ open, close, inDrawer: false }}>
      {entity === 'leads' ? (
        <LeadDetail key={key} id={params.id} />
      ) : (
        <EntityDetail key={key} entity={entity} id={params.id} />
      )}
      <RecordDrawer target={opened} open={open} close={close} />
      {/* The tab's child route (crm-record-tab) draws nothing; the page
          shows the tab its address names. */}
      <Outlet />
    </RecordDrawerContext.Provider>
  );
}

// The drawer a detail page or the workspace opens records in: the same
// detail component as the full page, over the page the reader came from.
// Links inside it replace what it shows (the back button steps back through
// them), and the toolbar offers the full page.
export function RecordDrawer({
  target,
  open,
  close,
}: {
  target: string;
  open: RecordDrawerApi['open'];
  close: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const [entity, id] = target.split('/') as [Entity, string | undefined];
  const valid = Boolean(id) && drawerEntities.includes(entity);
  return (
    <Sheet open={valid} onOpenChange={(next) => !next && close()}>
      <SheetContent
        side='right'
        showCloseButton={false}
        // The primitive sizes a right sheet with side-scoped classes, so the
        // wider drawer has to override them at the same specificity. Its body
        // is on the page's tint, so a record reads the same here as on its
        // page: the particulars' white card, the tabs on the tint; its bar
        // stays white.
        className='crm-record-drawer gap-0 overflow-y-auto bg-background p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-none data-[side=right]:md:w-[72vw] data-[side=right]:lg:w-[64vw] data-[side=right]:xl:w-[56vw] data-[side=right]:2xl:max-w-[1100px]'
      >
        {valid && (
          <RecordDrawerContext.Provider value={{ open, close, inDrawer: true }}>
            <div className='sticky top-0 z-10 flex items-center gap-2 border-b bg-popover/95 px-4 py-2 backdrop-blur'>
              <SheetTitle className='flex-1 text-sm text-muted-foreground'>
                {text(`entities.${toText(entity)}`)}
              </SheetTitle>
              <Button
                variant='ghost'
                size='sm'
                nativeButton={false}
                render={<Link to={`/crm/${toText(entity)}/${toText(id)}`} />}
              >
                <Maximize2 />
                {text('openFullPage')}
              </Button>
              <Button
                variant='ghost'
                size='icon-sm'
                aria-label={text('close')}
                onClick={close}
              >
                <X />
              </Button>
            </div>
            {entity === 'leads' ? (
              <LeadDetail key={target} id={toText(id)} />
            ) : (
              <EntityDetail key={target} entity={entity} id={toText(id)} />
            )}
          </RecordDrawerContext.Provider>
        )}
      </SheetContent>
    </Sheet>
  );
}

// The lead's particulars in groups, each under its heading (its original
// message heads the tab column instead): how the lead stands (after owner and status), the
// person, their company. Name and
// company head the page as well and lead their groups here too, so the
// column reads whole on its own. When it came and last changed close the
// column as a group of their own.
const leadGroups = [
  ['general', ['source']],
  ['contact', ['name', 'jobTitle', 'phone', 'email']],
  [
    'company',
    [
      'company',
      'website',
      'industry',
      'employees',
      'location',
      'companyDescription',
    ],
  ],
] as const;
type LeadField = (typeof leadGroups)[number][1][number];
// Under the Company heading its fields drop the word: "Name", not "Company
// name". The region's three parts and the street address share one row,
// the location.
const groupLabels: Partial<Record<LeadField, string>> = {
  location: 'location',
  company: 'fields.companyName',
  companyDescription: 'fields.companyIntro',
};

function LeadDetail({ id }: { id: string }): ReactElement {
  const {
    data: detail,
    error: loadError,
    isLoading,
  } = useCrmQuery<Detail>(`leads/${toText(id)}`);
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  const navigate = useNavigate();
  const drawer = useRecordDrawer();
  const { text } = useCrmText();
  const mailSetup = useMailSetup();
  const [tabSlug, setTab] = useDetailTab();
  const tab =
    resolveTab(tabSlug, [
      'historyTab',
      'tasks',
      ...(mailSetup.can ? ['mail'] : []),
      'attachments',
    ]) ?? 'historyTab';
  // The tasks and the history arrive one page each with the lead;
  // these grow them from the list and history endpoints.
  const moreTasks = useMore(
    `tasks?leadId=${toText(id)}&sort=dueAt`,
    detail?.related.tasks
      ? {
          data: rows(detail.related.tasks) as CrmRecord[],
          total:
            detail.relatedTotals?.tasks ?? rows(detail.related.tasks).length,
        }
      : undefined,
  );
  const [uploading, setUploading] = useState(false);
  // The form to open, with the names of the records it starts linked to.
  const [form, setForm] = useState<{
    entity: Entity;
    initial: Data;
    titles?: Record<string, string>;
  }>();
  // The timeline entry the page was asked to show (a waiting evaluation).
  // `at` tells a repeated click from the last one, so it scrolls again.
  const [focus, setFocus] = useState<{ id: string; at: number }>();
  // The conversation a timeline mail entry opens on the Mail tab.
  const [mailFocus, setMailFocus] = useState<string>();
  const [convert, setConvert] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  // The lead's title, for the assistant: a question asked from the dock on
  // this page starts its conversation from the lead (current-record.ts); not
  // from the drawer, whose backdrop covers the dock.
  const contextName = detail
    ? `${toText(detail.record.name)}${detail.record.company ? ` / ${toText(detail.record.company)}` : ''}`
    : undefined;
  useAnnounceRecord(
    detail && !drawer?.inDrawer
      ? { entity: 'leads', recordId: id, name: contextName }
      : undefined,
  );
  useRecordBreadcrumb('leads', !drawer?.inDrawer);
  // Asking the AI to follow the lead up, while it is open and the reader
  // may edit it: a button before the first suggestion, then in "More".
  const followUp = useFollowUpRequest(
    'leads',
    id,
    setError,
    Boolean(detail?.permissions.edit && detail.record.status !== 'converted'),
  );
  if (isLoading || !meta) return <Loading />;
  if (!detail)
    return (
      <CrmFrame title={text('entities.leads')}>
        <ErrorNotice error={loadError} />
      </CrmFrame>
    );
  const record = detail.record;
  const definition = meta.definitions.leads;
  const editable = detail.permissions.edit;
  // Names for everything this page links to, resolved by the server with
  // the record itself.
  const names = {
    ...detail.titles,
    ...moreTasks.titles,
  };
  const field = (key: string): Field =>
    definition.fields.find((f) => f.key === key) ?? { key, type: 'text' };
  // The attachments tab's count, de-duplicated as the tab lists them.
  const attachmentCount = new Set([
    ...arrayValues(record.attachments).map(toText),
    ...rows(detail.related.tasks).flatMap((task) =>
      arrayValues(task.attachments).map(toText),
    ),
  ]).size;
  // Soonest first, in the server's order so pages join.
  const tasks = moreTasks.records;
  const converted = record.status === 'converted';
  const patch = async (values: Data): Promise<void> => {
    await api(`leads/${toText(id)}`, 'PATCH', values);
    await refresh();
  };
  // Deleting the lead takes its lead-only tasks with it; ones that also
  // hang off a company or opportunity survive, so the confirmation can state
  // both outcomes without asking the server first.
  const cascadedTasks = tasks.filter(
    (task) => !task.companyId && !task.opportunityId,
  );
  const keptTasks = tasks.filter(
    (task) => task.companyId ?? task.opportunityId,
  );
  const inline = (key: string): ReactElement => (
    <InlineField
      entity='leads'
      record={record}
      field={field(key)}
      editable={editable}
      lookup={names}
      // As its row names it (the introduction under the Company heading),
      // which the pop-up a long text opens into is titled with too.
      label={text(groupLabels[key as LeadField] ?? fieldLabelKey('leads', key))}
      hint
      // A long text previews here and opens beside the column.
      longText='popover'
    />
  );
  const fieldRow = (key: LeadField): ReactElement => (
    <InfoRow
      key={key}
      field={key}
      label={text(groupLabels[key] ?? fieldLabelKey('leads', key))}
    >
      {key === 'location' ? (
        <LocationField
          entity='leads'
          record={record}
          editable={editable}
          label={text('location')}
          countries={field('country').options ?? []}
        />
      ) : key === 'website' ? (
        <WebsiteField
          record={record}
          editable={editable}
          label={text('fields.website')}
        />
      ) : (
        inline(key)
      )}
    </InfoRow>
  );
  // The timeline first, where the lead opens, without a count; the tasks,
  // mail and attachments with theirs. The tasks' icon is their menu
  // entry's.
  const tabBar = (
    <DetailTabBar
      active={tab}
      onSelect={setTab}
      tabs={[
        { name: 'historyTab', label: 'historyTab', icon: History },
        {
          name: 'tasks',
          label: 'entities.tasks',
          icon: SquareCheckBig,
          count: moreTasks.total,
        },
        // The reader's own mail with the lead, for whoever has mail.
        ...(mailSetup.can
          ? [
              {
                name: 'mail',
                label: 'mail.tab',
                icon: Mail,
                count: <MailCount target={{ addresses: emailsOf([record]) }} />,
              },
            ]
          : []),
        // Attachments last, as on every record.
        {
          name: 'attachments',
          label: 'fields.attachments',
          icon: Paperclip,
          count: attachmentCount,
        },
      ]}
    />
  );
  // "name / company", both edited in place: the page's heading, atop the
  // particulars (a <div> with the heading role, since the editors bring block
  // elements an <h1> may not hold).
  const heading = (
    <div role='heading' aria-level={1} className='-ml-2 py-1.5'>
      <InlineField
        entity='leads'
        record={record}
        field={field('name')}
        editable={editable}
        label={text(fieldLabelKey('leads', 'name'))}
        size='heading'
      />
      <AfterSlash>
        <InlineField
          entity='leads'
          record={record}
          field={field('company')}
          editable={editable}
          label={text(fieldLabelKey('leads', 'company'))}
          size='heading'
        />
      </AfterSlash>
    </div>
  );
  // Everything the reader can do with the lead, right of its heading:
  // asking the AI to follow it up, converting it (the main action, last
  // before "More"), and the rarer deleting in "More" (opening to the right
  // edge's left).
  const leadActions = (
    <>
      <EvaluateButton request={followUp} />
      {editable && (
        <Button size='sm' onClick={() => setConvert(true)}>
          <ArrowRightLeft />
          {text('convertShort')}
        </Button>
      )}
      {detail.permissions.delete && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={text('moreActions')}
            className={buttonVariants({
              size: 'icon-sm',
              variant: 'outline',
            })}
          >
            <Ellipsis />
          </DropdownMenuTrigger>
          {/* As wide as its longest item: the trigger is a small icon. */}
          <DropdownMenuContent align='end' className='w-max'>
            <DropdownMenuItem
              variant='destructive'
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 />
              {text('deleteRecord', { entity: text('entity.leads') })}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
  // Atop the particulars, where the AI's latest follow-up stands, which
  // opens it in the timeline.
  const leadStatus = (
    <EvaluationStatus
      recordId={id}
      request={followUp}
      onOpen={(entryId) => {
        setFocus({ id: entryId, at: Date.now() });
        setTab('historyTab');
      }}
    />
  );
  return (
    <DetailColumns
      entity='leads'
      heading={heading}
      actions={leadActions}
      status={leadStatus}
      tabBar={tabBar}
      notice={<ErrorNotice error={error ?? loadError} />}
      // What the lead wrote first, under the heading with neither heading
      // nor label of its own, as a task's description leads its page.
      // Its inline editor keeps 8px of its own on each side for the hover
      // fill; pulled out by them, the text lines up with the heading.
      // Empty, it offers itself to whoever may write it, and is left out
      // for anyone else.
      intro={
        editable || toText(record.message).trim() ? (
          <div className='-mx-2 min-w-0 text-sm'>
            <InlineField
              entity='leads'
              record={record}
              field={field('message')}
              editable={editable}
              lookup={names}
              label={text(fieldLabelKey('leads', 'message'))}
              placeholder={toText(text('messagePlaceholder'))}
            />
          </div>
        ) : undefined
      }
      left={
        <>
          {/* Open leads that repeat this one, each to merge. */}
          <LeadDuplicates
            lead={record}
            onMerged={(keptId) => {
              // This lead merged away: on to the one kept, before the
              // refresh refetches a lead that no longer exists.
              if (keptId !== toText(id)) {
                if (drawer?.inDrawer) drawer.close();
                else void navigate(`/crm/leads/${keptId}`);
              }
              void refresh();
            }}
          />
          <div>
            {/* Who has the lead and where it stands head the next group. */}
            <InfoGroup title={text('leadGroups.general')}>
              <InfoRow field='ownerId' label={text('fields.ownerId')}>
                {inline('ownerId')}
              </InfoRow>
              <InfoRow field='status' label={text('fields.status')}>
                <LeadStatusField
                  record={record}
                  editable={editable}
                  statuses={(field('status').options ?? []).map((value) => ({
                    value,
                    label: text(`options.${toText(value)}`, {
                      defaultValue: value,
                    }),
                  }))}
                  reasons={(
                    meta.settings.options.invalidReason ??
                    field('invalidReason').options ??
                    []
                  ).map((value) => ({
                    value,
                    label: text(`options.${toText(value)}`, {
                      defaultValue: value,
                    }),
                  }))}
                  onSave={patch}
                />
                {/* A converted lead is read-only: its work goes on in
                        what it became, listed under its status. */}
                {converted && (
                  <p className='px-2 pb-1 text-xs text-muted-foreground'>
                    {text('convertedHint')}
                  </p>
                )}
              </InfoRow>
              {converted && (
                <>
                  {(
                    [
                      ['companies', 'convertedCompanyId'],
                      ['contacts', 'convertedContactId'],
                      ['opportunities', 'convertedOpportunityId'],
                    ] as const
                  ).map(([e, key]) => (
                    <InfoRow
                      key={key}
                      field={key}
                      label={text(`fields.${key}`)}
                    >
                      {/* An empty one is shown rather than dropped: "no
                              opportunity" is itself worth seeing. */}
                      <div className='px-2 py-1.5'>
                        {record[key] ? (
                          <RecordLink
                            lines='all'
                            entity={e}
                            record={{
                              id: toText(record[key]),
                              name:
                                names[toText(record[key])] ??
                                text(`entities.${e}`),
                            }}
                          />
                        ) : (
                          <span className='text-muted-foreground'>—</span>
                        )}
                      </div>
                    </InfoRow>
                  ))}
                </>
              )}
              {leadGroups[0][1].map(fieldRow)}
            </InfoGroup>
            {leadGroups.slice(1).map(([group, keys]) => (
              <InfoGroup key={group} title={text(`leadGroups.${group}`)}>
                {keys.map(fieldRow)}
              </InfoGroup>
            ))}
          </div>
        </>
      }
      right={
        <div>
          {tab === 'tasks' ? (
            <div className='space-y-3'>
              {/* A converted lead rejects a new task server-side, so it
                  offers none. */}
              <TabHeading
                scope={text('tabScope.tasks', {
                  entity: text('entity.leads'),
                })}
              >
                {!converted && Boolean(meta.permissions.tasks.create) && (
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() =>
                      setForm({
                        entity: 'tasks',
                        initial: { leadId: id },
                        // The lead's name, so its chip names it.
                        titles: { ...names, [id]: contextName ?? '' },
                      })
                    }
                  >
                    <Plus />
                    {text('newTask')}
                  </Button>
                )}
              </TabHeading>
              {/* Drawn as the task list draws them. */}
              <TaskCards
                rows={tasks}
                titles={{ ...names, ...moreTasks.titles }}
                hasMore={moreTasks.hasMore}
                loading={moreTasks.loading}
                onLoad={() => void moreTasks.loadMore()}
                emptyText={text('noTasks')}
                recordId={id}
              />
            </div>
          ) : tab === 'mail' ? (
            <RecordMailPanel
              target={{ addresses: emailsOf([record]) }}
              focus={mailFocus}
            />
          ) : tab === 'attachments' ? (
            <RecordAttachments
              entity='leads'
              record={record}
              tasks={tasks}
              editable={editable}
              onError={setError}
              uploader={
                editable ? (
                  <UploadZone
                    entity='leads'
                    record={record}
                    busy={uploading}
                    setBusy={setUploading}
                    onError={setError}
                  />
                ) : undefined
              }
            />
          ) : (
            <HistoryFeed
              entity='leads'
              id={id}
              record={record}
              initial={{
                data: detail.history,
                total: detail.historyTotal ?? detail.history.length,
              }}
              names={names}
              statusKey='status'
              editable={editable && record.status !== 'converted'}
              recordName={contextName}
              focusId={focus?.id}
              focusAt={focus?.at}
              onOpenMail={
                mailSetup.can
                  ? (sourceKey) => {
                      setMailFocus(sourceKey);
                      setTab('mail');
                    }
                  : undefined
              }
            />
          )}
        </div>
      }
    >
      {form && <RecordForm {...form} onClose={() => setForm(undefined)} />}
      {convert && (
        <ConvertDialog lead={record} onClose={() => setConvert(false)} />
      )}
      {confirmDelete && (
        <Dialog
          open
          onOpenChange={(v) => {
            if (!v && !busy) setConfirmDelete(false);
          }}
        >
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>
                {text('deleteRecordTitle', {
                  entity: text('entity.leads'),
                  name: `${toText(record.name)}${record.company ? ` / ${toText(record.company)}` : ''}`,
                })}
              </DialogTitle>
              {/* Not the shared hint: it tells the reader to unlink related
                  records first, which is no longer how leads behave. */}
              <DialogDescription>{text('deleteLeadHint')}</DialogDescription>
              {cascadedTasks.length > 0 && (
                <p className='text-sm text-destructive'>
                  {text('deleteLeadTasks', {
                    count: cascadedTasks.length,
                  })}
                </p>
              )}
              {keptTasks.length > 0 && (
                <p className='text-sm text-muted-foreground'>
                  {text('deleteLeadKeptTasks', {
                    count: keptTasks.length,
                  })}
                </p>
              )}
            </DialogHeader>
            <ErrorNotice error={error} />
            <DialogFooter>
              <Button
                variant='outline'
                disabled={busy}
                onClick={() => setConfirmDelete(false)}
              >
                {text('cancel')}
              </Button>
              <Button
                variant='destructive'
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    setBusy(true);
                    setError(undefined);
                    try {
                      await api(`leads/${toText(id)}`, 'DELETE');
                      // Leave first: refreshing while still on the page
                      // refetches the record that no longer exists.
                      if (drawer?.inDrawer) drawer.close();
                      else void navigate('/crm/leads');
                      void refresh();
                    } catch (e) {
                      setError(e);
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              >
                {busy ? text('saving') : text('confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DetailColumns>
  );
}

// A record page laid out as the lead's: no header, the record's heading in a
// band over its particulars on the left and the tabs in the same band over
// the rest. The lead and the task pages share it.
export function DetailColumns({
  entity,
  heading,
  actions,
  status,
  tabBar,
  notice,
  intro,
  left,
  right,
  children,
}: {
  // The kind of record, named over the heading on a phone.
  entity: Entity;
  heading: ReactNode;
  // Everything the reader can do with the record, right of the heading.
  actions: ReactNode;
  // Where the AI's latest work on the record stands, at the head of the
  // actions at the top right.
  status?: ReactNode;
  tabBar: ReactNode;
  notice: ReactNode;
  // What the record says of itself, under the heading atop the tab column
  // (a lead's original message).
  intro?: ReactNode;
  left: ReactNode;
  right: ReactNode;
  // The page's dialogs.
  children?: ReactNode;
}): ReactElement {
  // In the drawer the page is already on the popover's white, with its own
  // padding: nothing to reach past.
  const inDrawer = useRecordDrawer()?.inDrawer ?? false;
  return (
    <CrmFrame
      // The page is the window's height; side by side its two columns scroll
      // each on their own below the header, the rule between them running to
      // the bottom. CrmFrame draws no header: the record's own is below.
      fill
    >
      {notice}
      {/* Container query, not a viewport one: opening the AI panel narrows this
          area without changing the viewport, and a viewport breakpoint would
          keep both columns in a box too small for them. */}
      <div className='@container min-h-0 flex-1'>
        {/* Out to the screen's edges, stacked or side by side, on the page's
            own background: the block reaches past the frame's padding and
            the parts inside give it back. */}
        <div
          className={`flex h-full flex-col @3xl:-mx-4 md:@3xl:-mx-8 ${
            inDrawer ? '' : '-mx-4 md:-mx-8'
          }`}
        >
          {/* Stacked, the header, the particulars and the tabs scroll as one;
              side by side, the header stays and each column scrolls. */}
          <div
            className={`flex min-h-0 flex-1 flex-col overflow-y-auto pb-24 @3xl:overflow-hidden @3xl:pb-0 scroll-quiet ${
              inDrawer ? '' : 'px-4 md:px-8 @3xl:px-0'
            }`}
            onScroll={revealScrollbar}
          >
            {/* The record's header, across both columns: the heading with
                the actions at its right, also in a drawer or on a phone
                while they fit (below it, still at the right, when they do
                not), the AI's latest suggestion under it. */}
            {/* In a drawer the frame's own padding already sets it off from
                the drawer's bar, so the header adds none above. */}
            <header
              className={`@3xl:pr-2 @3xl:pb-3 @3xl:pl-10 md:@3xl:pr-3 md:@3xl:pl-16 ${
                inDrawer ? 'pt-0' : 'pt-5 @3xl:pt-4'
              }`}
            >
              <DetailBack entity={entity} />
              <div className='flex flex-wrap items-start justify-between gap-x-6 gap-y-2'>
                <div className='min-w-0 flex-1 basis-60 @3xl:basis-80'>
                  {heading}
                </div>
                {/* The AI's latest suggestion leads the actions, as what
                    to do next; it draws nothing before the first. */}
                {actions || status ? (
                  <div className='ml-auto flex flex-wrap items-center justify-end gap-2 empty:hidden @3xl:pt-1'>
                    {status}
                    {actions}
                  </div>
                ) : null}
              </div>
            </header>
            <div className='grid gap-6 pt-5 @3xl:min-h-0 @3xl:flex-1 @3xl:grid-cols-[minmax(0,1fr)_22rem] @3xl:grid-rows-[minmax(0,1fr)] @3xl:gap-0 @3xl:pt-0 md:@3xl:grid-cols-[minmax(0,1fr)_23rem]'>
              {/* The timeline and the other tabs on the left, taking the
                  room, the particulars in a narrow column on the right.
                  Stacked, the particulars come first (a phone number before
                  the history): the source order, which side by side the
                  column's order-2 turns round. */}
              {/* The particulars as a stack of cards, one per group
                  (InfoGroup), with whatever leads them (a lead's duplicates)
                  above; side by side the stack scrolls on its own, ending in
                  6rem of room so its last row scrolls above the assistant's
                  dock. The rows keep 8px of their own on each side for an
                  inline editor's hover fill. */}
              <section
                className='flex min-w-0 flex-col gap-3 @3xl:order-2 @3xl:mr-2 @3xl:overflow-y-auto @3xl:pb-24 md:@3xl:mr-3 scroll-quiet'
                onScroll={revealScrollbar}
              >
                {left}
              </section>
              {/* The tabs head the left column: stacked, they stay in view as
                  the page scrolls; side by side, their content scrolls below
                  them. */}
              {/* Side by side the column scrolls as one: the intro goes up
                  and away, and the tabs stop under the header and stay, the
                  content passing beneath them. Stacked, the page scrolls and
                  the tabs stick to its top just the same. Its scrollbar's room
                  is kept whether or not a tab scrolls, so switching tabs never
                  narrows the column and re-wraps the intro. */}
              <section
                className='flex min-w-0 flex-col @3xl:min-h-0 @3xl:overflow-y-auto @3xl:pb-24 @3xl:[scrollbar-gutter:stable] scroll-quiet'
                onScroll={revealScrollbar}
              >
                {intro ? (
                  <div className='pb-7 @3xl:pr-12 @3xl:pl-10 md:@3xl:pr-16 md:@3xl:pl-16'>
                    {intro}
                  </div>
                ) : null}
                {/* The gap under the tabs is the bar's own, on the page's
                    background, so content scrolling up passes under it
                    rather than meeting the tabs' edge. */}
                <div className='sticky top-0 z-10 flex flex-wrap items-center bg-background pt-1 pb-4 @3xl:pt-0 @3xl:pr-12 @3xl:pl-10 md:@3xl:pr-16 md:@3xl:pl-16'>
                  {tabBar}
                </div>
                {/* At least the column's height, so a short tab leaves the
                    column where it was scrolled to rather than snapping the
                    intro back into view. */}
                <div className='min-w-0 @3xl:min-h-full @3xl:pr-12 @3xl:pl-10 md:@3xl:pr-16 md:@3xl:pl-16'>
                  {right}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
      {children}
    </CrmFrame>
  );
}

// The part of a record's heading after a slash ("name / company", "company /
// deal"). The heading flows as text and wraps wherever its line is full.
export function AfterSlash({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <>
      <span aria-hidden className='text-xl text-muted-foreground/60'>
        /
      </span>
      {children}
    </>
  );
}

// Over a stacked record page (a phone, a narrow window): the way back to the
// page before, and what kind of record this is. Back is the browser's, so it
// returns wherever the reader came from; opened from a link, with nothing
// before it in this tab, it goes to the object's list instead. The drawer has
// its own bar with the kind and a close button, so it shows none.
function DetailBack({ entity }: { entity: Entity }): ReactElement | null {
  const { t } = useTranslation();
  const { text } = useCrmText();
  const navigate = useNavigate();
  const location = useLocation();
  if (useRecordDrawer()?.inDrawer) return null;
  return (
    <div className='mb-2 flex items-center gap-2 text-sm text-muted-foreground @3xl:hidden'>
      <button
        type='button'
        onClick={() =>
          location.key === 'default'
            ? void navigate(`/crm/${toText(entity)}`)
            : void navigate(-1)
        }
        className='inline-flex items-center gap-1 transition-colors hover:text-foreground'
      >
        <ArrowLeft className='size-4' />
        {t('navigation.back')}
      </button>
      <span aria-hidden className='text-muted-foreground/60'>
        ·
      </span>
      <span>{sentence(text(`entity.${toText(entity)}`))}</span>
    </div>
  );
}

// The line heading a record's tab, as the Mail tab's does: what the tab
// lists on the left, the way to add one (when there is one) on the right.
export function TabHeading({
  scope,
  children,
}: {
  scope: string;
  children?: ReactNode;
}): ReactElement {
  return (
    <div className='flex items-center gap-2'>
      <p className='min-w-0 flex-1 truncate text-xs text-muted-foreground'>
        {scope}
      </p>
      {children}
    </div>
  );
}

// The tabs of a DetailColumns page, marked by a line on the rule under them:
// side by side in the band across both columns, stacked above their content.
// A tab without a count shows none.
export function DetailTabBar({
  tabs,
  active,
  onSelect,
}: {
  tabs: readonly {
    name: string;
    label: string;
    icon: LucideIcon;
    // How many it holds (tasks, attachments), or what counts them (the
    // mail's MailCount); none on the others.
    count?: ReactNode;
  }[];
  active: string;
  onSelect: (name: string) => void;
}): ReactElement {
  const { text } = useCrmText();
  return (
    // Underlined tabs on a thin rule that sets them off from the content
    // below: the open tab in the foreground over a 2px line of it, the
    // others muted until hovered; a count in muted figures where a tab has
    // one. The first tab's text lines up with the heading and the content.
    <div
      role='tablist'
      className='flex w-full flex-wrap gap-x-5 border-b border-border/60'
    >
      {tabs.map(({ name, label, icon: Icon, count }) => {
        const selected = name === active;
        return (
          <button
            key={name}
            type='button'
            role='tab'
            aria-selected={selected}
            onClick={() => onSelect(name)}
            className={`-mb-px flex h-10 items-center gap-1.5 border-b-2 text-sm font-medium transition-colors outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50 ${
              selected
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className='size-4' />
            {text(label)}
            {typeof count === 'number' ? <TabCount value={count} /> : count}
          </button>
        );
      })}
    </div>
  );
}

// A tab's count: plain muted figures after its label.
function TabCount({ value }: { value: number }): ReactElement {
  return (
    <span className='text-xs text-muted-foreground tabular-nums'>{value}</span>
  );
}

// The Mail tab's count: the conversations with the record in the reader's
// own mailboxes, from the same query the tab lists them with, once the
// record has loaded and the reader has a mailbox connected.
export function MailCount({
  target,
}: {
  target: MailTarget;
}): ReactElement | null {
  const setup = useMailSetup();
  const { data } = useRecordMessages(target, setup.accounts.length > 0);
  return data ? <TabCount value={data.length} /> : null;
}

// Status and its invalid reason are one decision: the server refuses an invalid
// lead without a reason, so picking "invalid" cascades straight into the reason
// list and only that choice commits both fields.
function LeadStatusField({
  record,
  editable,
  statuses,
  reasons,
  onSave,
}: {
  record: CrmRecord;
  editable: boolean;
  statuses: { value: string; label: string }[];
  reasons: { value: string; label: string }[];
  onSave: (values: Data) => Promise<void>;
}): ReactElement {
  const { text } = useCrmText();
  const [error, setError] = useState('');
  const commit = async (values: Data): Promise<void> => {
    try {
      await onSave(values);
      setError('');
    } catch (cause) {
      setError(text(`errors.${errorCode(cause).code}`, { defaultValue: '' }));
    }
  };
  const trigger = (
    <span className='flex items-center gap-2'>
      <Status value={record.status} />
      {record.status === 'invalid' && record.invalidReason ? (
        <span className='text-sm text-muted-foreground'>
          {text(`options.${toText(record.invalidReason)}`, {
            defaultValue: toText(record.invalidReason),
          })}
        </span>
      ) : null}
      {error ? <span className='text-xs text-destructive'>{error}</span> : null}
    </span>
  );
  if (!editable) return <div className='px-2 py-1.5'>{trigger}</div>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={text('fields.status')}
        className='flex w-full items-center rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted'
      >
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start'>
        {statuses
          .filter((option) => option.value !== 'invalid')
          .map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() =>
                void commit({ status: option.value, invalidReason: null })
              }
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        {/* A submenu rather than a replacement list: the statuses stay on screen,
            and no reason can be skipped because only its items commit. */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {statuses.find((option) => option.value === 'invalid')?.label ??
              text('options.invalid')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {reasons.map((reason) => (
              <DropdownMenuItem
                key={reason.value}
                onClick={() =>
                  void commit({
                    status: 'invalid',
                    invalidReason: reason.value,
                  })
                }
              >
                {reason.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// The one field where clicking the value opens a link instead of editing it.
// Double-clicking the row (beside the link text) or Enter / F2 with focus
// opens the editor, the same gesture as every other field.
export function WebsiteField({
  entity = 'leads',
  record,
  editable,
  label,
}: {
  entity?: Entity;
  record: CrmRecord;
  editable: boolean;
  label: string;
}): ReactElement {
  const { text } = useCrmText();
  const [editing, setEditing] = useState(false);
  const url = toText(record.website);
  const href = linkOf(url);
  if (editing || !href)
    return (
      <InlineField
        entity={entity}
        record={record}
        field={{ key: 'website', type: 'url' }}
        editable={editable}
        label={label}
        hint
        startOpen={editing}
        onClose={() => setEditing(false)}
      />
    );
  return (
    <div
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : undefined}
      aria-label={editable ? label : undefined}
      className={`group/site relative flex items-center rounded-md px-2 py-1.5 ${toText(
        editable
          ? 'cursor-text transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
          : '',
      )}`}
      onDoubleClick={editable ? () => setEditing(true) : undefined}
      onKeyDown={(event) => {
        if (editable && (event.key === 'Enter' || event.key === 'F2')) {
          event.preventDefault();
          setEditing(true);
        }
      }}
    >
      {/* The link is inline, so the rest of the row stays a plain surface a
          double-click can land on without opening the site. */}
      {/* One line, cut with an ellipsis, whole on hover: an address has
          nowhere to break and would otherwise run out of the column. */}
      <a
        className='min-w-0 truncate text-sm text-primary hover:underline'
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        title={url}
        aria-label={`${toText(label)}: ${toText(text('openWebsite'))}`}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
      {/* A long address leaves no row to double-click beside it: the pencil,
          shown on hover over the end of the row (taking no room from the
          address, which fields need), opens the editor in one click. */}
      {editable && (
        <Button
          size='icon-xs'
          variant='ghost'
          className='absolute top-1/2 right-1 -translate-y-1/2 bg-muted opacity-0 group-focus-within/site:opacity-100 group-hover/site:opacity-100 hover:bg-background focus-visible:opacity-100'
          aria-label={`${toText(text('edit'))} ${toText(label)}`}
          onClick={() => setEditing(true)}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <PencilLine />
        </Button>
      )}
    </div>
  );
}

export function Attachments({
  entity,
  record,
  editable,
  onError,
}: {
  entity: Entity;
  record: Data;
  editable: boolean;
  onError: (error: unknown) => void;
}): ReactElement {
  const api = useCrmApi();
  const refresh = useRefresh();
  const { text } = useCrmText();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState('');
  const files = Array.isArray(record.attachments) ? record.attachments : [];
  // Removing only unlinks the file from this record; the stored file is left
  // alone because another record may reference the same upload.
  const remove = (id: string): void => {
    void (async () => {
      setBusy(true);
      try {
        await api(`${toText(entity)}/${toText(record.id)}`, 'PATCH', {
          attachments: files.map(toText).filter((file) => file !== id),
        });
        await refresh();
        setPending('');
      } catch (cause) {
        onError(cause);
      } finally {
        setBusy(false);
      }
    })();
  };
  return (
    <div className='space-y-2 px-2'>
      <p className='text-sm text-muted-foreground'>
        {text('fields.attachments')}
      </p>
      {/* The drop zone sits between the heading and the list, so adding a
          file happens right where the files are. */}
      {editable && (
        <UploadZone
          entity={entity}
          record={record}
          busy={busy}
          setBusy={setBusy}
          onError={onError}
        />
      )}
      <FileLinks files={files} onRemove={editable ? setPending : undefined} />
      {pending && (
        <ConfirmDialog
          title={text('removeFileTitle')}
          description={text('removeFileHint')}
          busy={busy}
          onCancel={() => setPending('')}
          onConfirm={() => remove(pending)}
        />
      )}
    </div>
  );
}

// Multiple files at once, dropped on the area or picked through its button;
// they attach to whichever record hosts the zone.

// The record a linked file came from, opened like any other record link.
function SourceLink({
  entity,
  id,
  name,
}: {
  entity: Entity;
  id: string;
  name: string;
}): ReactElement {
  const link = useRecordLink(entity, id);
  return (
    <Link
      className='inline-block max-w-full truncate align-bottom text-muted-foreground hover:text-primary hover:underline'
      title={name}
      {...link}
    >
      {name}
    </Link>
  );
}

// The lead's own uploads plus everything attached to its tasks, so the tab
// answers "what documents exist for this lead" rather than "what is on this row".
// Each file remembers which record holds it, because removing one has to unlink
// it from that record, not from the lead.
export function RecordAttachments({
  entity,
  record,
  tasks,
  opportunities = [],
  approvals = [],
  editable,
  onError,
  uploader,
}: {
  entity: Entity;
  record: CrmRecord;
  tasks: Data[];
  // A company's or contact's opportunities: their proposals and contracts
  // are the files most often wanted from the customer's side.
  opportunities?: Data[];
  // An opportunity's approval requests, whose files back the decision.
  approvals?: Data[];
  editable: boolean;
  onError: (error: unknown) => void;
  // The upload zone, rendered under the record's own group so adding a
  // file happens where those files are listed.
  uploader?: ReactNode;
}): ReactElement {
  const api = useCrmApi();
  const refresh = useRefresh();
  const { text } = useCrmText();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState('');
  const sources = new Map<string, { entity: Entity; record: Data }>();
  for (const id of arrayValues(record.attachments))
    sources.set(toText(id), { entity, record });
  for (const task of tasks)
    for (const id of arrayValues(task.attachments))
      sources.set(toText(id), { entity: 'tasks', record: task });
  for (const opportunity of opportunities)
    for (const id of arrayValues(opportunity.attachments))
      sources.set(toText(id), { entity: 'opportunities', record: opportunity });
  for (const approval of approvals)
    for (const id of arrayValues(approval.attachments))
      sources.set(toText(id), { entity: 'approvals', record: approval });
  const remove = (id: string): void => {
    const source = sources.get(id);
    if (!source) return;
    void (async () => {
      setBusy(true);
      try {
        await api(
          `${toText(source.entity)}/${toText(source.record.id)}`,
          'PATCH',
          {
            attachments: arrayValues(source.record.attachments)
              .map(toText)
              .filter((file) => file !== id),
          },
        );
        await refresh();
        setPending('');
      } catch (cause) {
        onError(cause);
      } finally {
        setBusy(false);
      }
    })();
  };
  const pendingSource = pending ? sources.get(pending) : undefined;
  const own = [...sources.entries()]
    .filter(([, source]) => source.entity === entity)
    .map(([id]) => id);
  // An object without an attachments field (a contact) shows only the
  // linked groups: there is nothing of its own to list or upload to.
  const hasOwnFiles = 'attachments' in record;
  // The linked groups, each shown when the record has any such links.
  const linked: {
    entity: Entity;
    label: string;
    records: Data[];
  }[] = [
    {
      entity: 'tasks',
      label: 'attachmentsFromTasks',
      records: tasks,
    },
    {
      entity: 'opportunities',
      label: 'attachmentsFromOpportunities',
      records: opportunities,
    },
    {
      entity: 'approvals',
      label: 'attachmentsFromApprovals',
      records: approvals,
    },
  ];
  const filesFrom = (source: Entity): string[] =>
    [...sources.entries()]
      .filter(([, s]) => s.entity === source)
      .map(([id]) => id);
  return (
    <div className='space-y-6'>
      {/* Two groups rather than one mixed list, both always shown: which
          record a file belongs to decides what removing it changes, and an
          empty group still tells the reader where an upload would land. */}
      {hasOwnFiles && (
        <div className='space-y-2'>
          <p className='text-xs font-medium text-muted-foreground'>
            {text('attachmentsOwn', {
              entity: text(`entity.${toText(entity)}`),
            })}
          </p>
          {uploader}
          <FileLinks files={own} onRemove={editable ? setPending : undefined} />
        </div>
      )}
      {!hasOwnFiles && !linked.some((g) => g.records.length > 0) && (
        <p className='text-sm text-muted-foreground'>{text('noAttachments')}</p>
      )}
      {linked
        .filter((group) => group.entity !== entity && group.records.length > 0)
        .map((group) => (
          <div key={group.entity} className='space-y-2'>
            <p className='text-xs font-medium text-muted-foreground'>
              {text(group.label)}
            </p>
            <FileLinks
              files={filesFrom(group.entity)}
              onRemove={editable ? setPending : undefined}
              sourceLabel={(id) => {
                const source = sources.get(id);
                if (!source) return null;
                return (
                  <SourceLink
                    entity={group.entity}
                    id={toText(source.record.id)}
                    name={toText(source.record.name)}
                  />
                );
              }}
            />
          </div>
        ))}
      {pending && (
        <ConfirmDialog
          title={text('removeFileTitle')}
          description={
            // Say which record when the file is not this one's own, because
            // the record being changed is not the one the user is looking at.
            pendingSource && pendingSource.entity !== entity
              ? `${toText(
                  text('removeFileFromRecord', {
                    entity: text(`entity.${toText(pendingSource.entity)}`),
                    name: toText(pendingSource.record.name),
                  }),
                )} ${toText(text('removeFileHint'))}`
              : text('removeFileHint')
          }
          busy={busy}
          onCancel={() => setPending('')}
          onConfirm={() => remove(pending)}
        />
      )}
    </div>
  );
}

// Moved to client/components/crm/confirm-dialog.tsx, where the layout's
// sidebar takes it too without loading this page; re-exported for the
// pages that import it from here.
export { ConfirmDialog };

// "Updated" on its own says nothing, so each changed field is listed with the
// value it was given, after the value it replaced where the entry kept one
// (entries recorded before earlier values were stored show the new one only).
// A long text shown on one line, as history chips show every value: the
// value renderer otherwise draws it as a collapsible block.
const asLine = (field: Field): Field =>
  field.type === 'textarea' ? { ...field, type: 'text' } : field;

export function HistoryChanges({
  entity = 'leads',
  record,
  changes,
  previous,
  movedField,
  names,
  fileNames,
  part = 'line',
  open = false,
  onToggle,
}: {
  entity?: Entity;
  record: CrmRecord;
  changes: unknown;
  // What the changed fields held before an update, shown as "old → new";
  // absent for a creation and for entries older than this record keeping.
  previous?: unknown;
  movedField?: string;
  names: Record<string, string>;
  fileNames: Record<string, string>;
  // A save of several fields is drawn in two places: on the entry's line
  // its count and the toggle (`line`), and, unfolded, its fields in a box
  // under the whole entry, the time's column included (`rows`). The
  // timeline keeps which entries are open, as it does for the AI's.
  part?: 'line' | 'rows';
  open?: boolean;
  onToggle?: () => void;
}): ReactElement | null {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const changed =
    changes && typeof changes === 'object' ? (changes as Data) : {};
  const before =
    previous && typeof previous === 'object' ? (previous as Data) : undefined;
  const fields = meta?.definitions[entity]?.fields ?? [];
  const shown = Object.keys(changed).filter((key) => {
    if (key === movedField || key === 'id') return false;
    // Leaving "invalid" clears the reason in the same save; reporting that as
    // "Invalid reason —" is noise, since the reason only means anything while
    // the lead is actually invalid.
    if (key === 'invalidReason' && !toText(changed[key])) return false;
    return true;
  });
  if (!shown.length) return null;
  // A save of several fields reads "updated 5 fields" on the line, and
  // unfolds into one row per field below it; a single field stays inline.
  const folds = shown.length > 1;
  const show = (values: Data, key: string): ReactNode =>
    key === 'attachments' ? (
      // A count says nothing about which documents changed.
      arrayValues(values.attachments).length ? (
        arrayValues(values.attachments)
          .map((id) => fileNames[toText(id)] ?? toText(id).slice(0, 8))
          .join('、')
      ) : (
        <span className='text-muted-foreground'>{text('noAttachments')}</span>
      )
    ) : fields.find((f) => f.key === key)?.type === 'contacts' ? (
      // A deal's contacts by name and role: a count says nothing when a
      // role changed.
      arrayValues(values[key]).length ? (
        arrayValues(values[key])
          .map((item) => {
            const row = (item ?? {}) as Data;
            // A contact's title reads "name / company"; the deal has one
            // company, so the name alone.
            const name = (
              names[toText(row.contactId)] ?? toText(row.contactId).slice(0, 8)
            ).split(' / ')[0];
            return row.role
              ? text('feed.contactRole', {
                  name,
                  role: text(`options.${toText(row.role)}`),
                })
              : name;
          })
          .join('、')
      ) : (
        <span className='text-muted-foreground'>—</span>
      )
    ) : (
      (() => {
        const field = fields.find((f) => f.key === key) ?? {
          key,
          type: 'text',
        };
        // A value is cut by its box, where the room ends, not at a fixed
        // length: one field has the rest of the entry's line, several each
        // their own row.
        return (
          <Value
            // Merged so fields the formatter leans on — a currency for an
            // amount — resolve even when this save did not include them.
            // A long text, Markdown, as one line of its plain text.
            record={{
              ...record,
              ...values,
              ...(field.type === 'textarea' && typeof values[key] === 'string'
                ? { [key]: markdownLine(values[key]) }
                : {}),
            }}
            field={asLine(field)}
            lookup={names}
          />
        );
      })()
    );
  // Read like a status move on the timeline: each field's name (muted, as
  // the verb before it), then → new in the line's own type. Several
  // fields in one save follow one another on the line.
  const separator = (index: number): ReactNode =>
    !folds && index < shown.length - 1 ? (
      <span aria-hidden className='-ml-1.5 text-muted-foreground'>
        {language.startsWith('zh') ? '，' : ','}
      </span>
    ) : null;
  // Files by name: which were added, which removed, rather than the whole
  // list before and after.
  const fileList = (ids: string[]): string =>
    ids.map((id) => fileNames[id] ?? id.slice(0, 8)).join('、');
  // On hover: what it was, when it held anything, and what it became.
  const titleOf = (key: string): string =>
    before && key in before && toText(before[key] ?? '').trim()
      ? `${toText(before[key])} → ${toText(changed[key] ?? '')}`
      : toText(changed[key]);
  // An arrow to the new value only, clamped so one long value cannot turn
  // an entry into a paragraph; the old value and the full text stay on
  // hover (titleOf). The descendant rule beats the value renderer's own
  // pre-wrap.
  const valuesOf = (key: string): ReactNode =>
    // Emptied, it says so rather than pointing at a dash.
    isBlankValue(changed[key]) ? (
      <span className='shrink-0 text-muted-foreground'>
        {text('feed.cleared')}
      </span>
    ) : (
      <>
        <ArrowRight
          aria-hidden
          className='size-3 shrink-0 self-center text-muted-foreground'
        />
        <span className='min-w-0 shrink truncate [&_*]:whitespace-nowrap'>
          {show(changed, key)}
        </span>
      </>
    );
  const rows = shown.map((key, index) => {
    if (key === 'attachments' && before && key in before) {
      const was = arrayValues(before.attachments).map(toText);
      const now = arrayValues(changed.attachments).map(toText);
      const added = now.filter((file) => !was.includes(file));
      const removed = was.filter((file) => !now.includes(file));
      return (
        <span
          key={key}
          className='inline-flex max-w-full min-w-0 flex-wrap items-baseline gap-x-1.5'
        >
          {added.length ? (
            <>
              <span className='text-muted-foreground'>
                {text('feed.addedFiles')}
              </span>
              <span className='min-w-0 truncate'>{fileList(added)}</span>
            </>
          ) : null}
          {removed.length ? (
            <>
              <span className='text-muted-foreground'>
                {text('feed.removedFiles')}
              </span>
              <span className='min-w-0 truncate'>{fileList(removed)}</span>
            </>
          ) : null}
          {separator(index)}
        </span>
      );
    }
    const label = (
      <span className='shrink-0 text-muted-foreground'>
        {/* A lead's introduction by the short name its particulars show
            (the company is implied); every other field by its own. */}
        {text(
          entity === 'leads' && key === 'companyDescription'
            ? 'fields.companyIntro'
            : fieldLabelKey(entity, key),
          { defaultValue: key },
        )}
      </span>
    );
    return (
      <span
        key={key}
        // A lone field takes the rest of the entry's line (basis 0, so it
        // never wraps below the verb), its values cut where it ends. In
        // Chinese the first field's name follows the verb with no space
        // ("更新状态"), so the line's gap is taken back before it.
        className={`flex min-w-0 items-baseline gap-1.5 ${folds ? '' : 'flex-1 basis-0'} ${
          part === 'line' &&
          index === 0 &&
          !movedField &&
          language.startsWith('zh')
            ? '-ml-1.5'
            : ''
        }`}
        title={titleOf(key)}
      >
        {label}
        {valuesOf(key)}
        {/* A comma between fields, kept on the field's line. */}
        {separator(index)}
      </span>
    );
  });
  if (part === 'rows')
    return folds && open ? (
      <div className='mt-1 grid gap-1 rounded-lg border bg-muted/40 px-3 py-2 text-sm'>
        {rows}
      </div>
    ) : null;
  if (!folds) return <>{rows}</>;
  return (
    <>
      <span className='text-muted-foreground'>
        {text('feed.fieldCount', { count: shown.length })}
      </span>
      {/* The same round toggle an AI entry opens with. */}
      <Button
        size='icon-xs'
        variant='outline'
        className='rounded-full'
        aria-expanded={open}
        aria-label={text(open ? 'collapse' : 'expand')}
        onClick={onToggle}
      >
        <ChevronDown
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </Button>
    </>
  );
}

// What a task's entry says became of it: planned, moved (only its
// time changed), edited, its status changed, or deleted.
const taskState = (event: Data): string => {
  if (event.action === 'created') return 'planned';
  if (event.action === 'taskDeleted') return 'deleted';
  if (event.action === 'updated') {
    const keys = Object.keys(event.changes ?? {});
    return keys.includes('dueAt') &&
      keys.every((key) => key === 'dueAt' || key === 'endAt')
      ? 'moved'
      : 'edited';
  }
  // Done or called off; a no-show, recorded before that status went,
  // reads as cancelled.
  return toText(event.toValue) === 'noShow'
    ? 'cancelled'
    : toText(event.toValue);
};

// One of the record's tasks on its timeline, after who did it: what
// became of it ("planned", "completed", "cancelled", "moved", "edited",
// "deleted"), its type and name (opening it, unless it is gone), and when
// it is, what changed, or, done, what came of it.
// One of a deal's approvals on the deal's timeline: submitted, approved,
// rejected or withdrawn, the approval by name, and the decision comment
// after a decision.
function ApprovalEvent({ event }: { event: Data }): ReactElement {
  const { text } = useCrmText();
  const approval = (event.approval ?? {}) as Data;
  const to = toText(event.toValue);
  const comment =
    ['approved', 'rejected'].includes(to) && approval.status === to
      ? toText(approval.decisionComment ?? '')
      : '';
  return (
    <>
      <span className='shrink-0 text-muted-foreground'>
        {text(`feed.approval.${to}`, { defaultValue: to })}
      </span>
      <span className='shrink-0 text-muted-foreground'>
        {text('feed.approval.noun')}
      </span>
      <span className='min-w-0 shrink'>
        <RecordLink
          entity='approvals'
          record={{ id: toText(approval.id), name: toText(approval.name) }}
        />
      </span>
      {comment ? (
        <span
          className='min-w-0 truncate text-muted-foreground'
          title={comment}
        >
          {comment}
        </span>
      ) : null}
    </>
  );
}

// A mail conversation with the record's people (mail-timeline.ts), after
// the mailbox owner's name: its subject, how many messages, and, when the
// customer wrote last, who. The messages stay in the owner's mailbox: the
// owner opens the conversation on the Mail tab, everyone else reads this line.
function MailEvent({
  event,
  onOpen,
}: {
  event: Data;
  onOpen?: (sourceKey: string) => void;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const mail = (event.changes ?? {}) as Data;
  const subject = toText(mail.subject) || toText(text('feed.mail.noSubject'));
  const own = onOpen && meta?.userId === toText(mail.ownerId);
  const writer = toText(mail.lastFromName) || toText(mail.lastFrom);
  // "1 message", not "1 messages".
  const messages = Number(mail.count) || 1;
  const count = toText(
    messages === 1
      ? text('feed.mail.countOne')
      : text('feed.mail.count', { count: messages }),
  );
  const last =
    mail.fromCustomer && writer
      ? toText(text('feed.mail.lastFrom', { name: writer }))
      : '';
  // On a narrow column the subject keeps the line: the count and who wrote
  // last give way first, and the whole line is in the hover title.
  return (
    <>
      <span className='shrink-0 text-muted-foreground'>
        {text('feed.mail.exchanged')}
      </span>
      <span
        className='min-w-[5rem] truncate'
        title={[subject, count, last].filter(Boolean).join(' · ')}
      >
        {own ? (
          <button
            type='button'
            className='underline-offset-2 hover:underline'
            onClick={() => onOpen(toText(event.sourceKey))}
          >
            {subject}
          </button>
        ) : (
          subject
        )}
      </span>
      <span className='min-w-0 shrink-[4] truncate text-muted-foreground'>
        {count}
      </span>
      {last ? (
        <span className='min-w-0 shrink-[8] truncate text-muted-foreground'>
          {last}
        </span>
      ) : null}
    </>
  );
}

// The mail from before the record existed (historyOf's `mailBefore`): one
// entry at the end of the timeline, closed, saying how many conversations
// it holds; opened, each conversation on a line of its own as a mail entry
// reads, under whose mailbox it is.
function EarlierMail({
  event,
  last,
  open,
  onToggle,
  onOpenMail,
  now,
  timeZone,
}: {
  event: Data;
  last: boolean;
  open: boolean;
  onToggle: () => void;
  onOpenMail?: (sourceKey: string) => void;
  now: number;
  timeZone: string;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const changes = (event.changes ?? {}) as Data;
  const count = Number(changes.count) || 0;
  const conversations = (
    Array.isArray(changes.conversations) ? changes.conversations : []
  ) as Data[];
  const ago = (at: unknown): ReactElement => (
    <time
      dateTime={toText(at)}
      title={localDate(at, language, timeZone)}
      className='shrink-0 self-start text-xs leading-[26px] text-muted-foreground/80 tabular-nums'
    >
      {relativeTime(at, language, now, text('justNow'))}
    </time>
  );
  return (
    <li
      id={`feed-${toText(event.id)}`}
      className='group/entry relative flex scroll-mt-24 gap-3'
    >
      <div className='flex w-5 shrink-0 flex-col items-center'>
        <span className='flex h-[26px] items-center justify-center'>
          <Mail className='size-3.5 text-muted-foreground' />
        </span>
        {!last && <span className='min-h-3 w-px flex-1 bg-border/50' />}
      </div>
      <div className='min-w-0 flex-1 pb-3'>
        <div className='flex min-h-[26px] items-center gap-3 text-sm'>
          <span className='flex min-w-0 flex-1 items-center gap-x-1.5 overflow-hidden whitespace-nowrap'>
            <span className='min-w-0 truncate text-muted-foreground'>
              {text('feed.mail.before')}
            </span>
            <span className='shrink-0'>
              {count === 1
                ? text('feed.mail.conversationsOne')
                : text('feed.mail.conversations', { count })}
            </span>
            {/* The same round toggle an AI entry opens with. */}
            <Button
              size='icon-xs'
              variant='outline'
              className='rounded-full'
              aria-expanded={open}
              aria-label={text(open ? 'collapse' : 'expand')}
              onClick={onToggle}
            >
              <ChevronDown
                className={`transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </Button>
          </span>
          {ago(event.createdAt)}
        </div>
        {open ? (
          <ul className='mt-1 grid gap-0.5'>
            {conversations.map((conversation) => (
              <li
                key={toText(conversation.id)}
                className='flex min-h-[26px] items-center gap-3 text-sm'
              >
                <span className='flex min-w-0 flex-1 items-center gap-x-1.5 overflow-hidden whitespace-nowrap'>
                  <span className='shrink-0 font-semibold text-foreground'>
                    {
                      meta?.users.find((u) => u.id === conversation.actorId)
                        ?.name
                    }
                  </span>
                  <MailEvent event={conversation} onOpen={onOpenMail} />
                </span>
                {ago(conversation.createdAt)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

function TaskEvent({
  event,
  open,
  onToggle,
  names,
  fileNames,
  resultLong = false,
  onResultLong,
}: {
  event: Data;
  open: boolean;
  onToggle: () => void;
  names: Record<string, string>;
  fileNames: Record<string, string>;
  // Whether a completed task's result is too long for the line, which the
  // timeline then shows whole below it, as a note's text.
  resultLong?: boolean;
  onResultLong?: (long: boolean) => void;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const changes = (event.changes ?? {}) as Data;
  // A deleted one is known by what its record kept of it.
  const task = (
    event.action === 'taskDeleted'
      ? { ...changes, id: changes.taskId }
      : (event.task ?? {})
  ) as Data;
  const zone = meta?.settings.timeZone ?? 'Asia/Shanghai';
  const verb = taskState(event);
  // Short (no year), beside the entry's own time on the right.
  const when = (at: unknown): string => {
    const date = new Date(toText(at));
    return Number.isFinite(+date)
      ? new Intl.DateTimeFormat(language, {
          timeZone: zone,
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(date)
      : '';
  };
  return (
    <>
      {/* What was done to the task, in one phrase ("planned the task"),
          whatever its type: the name says what it is. */}
      <span className='shrink-0 text-muted-foreground'>
        {text(`feed.task.${verb}`, { defaultValue: verb })}
      </span>
      {/* A long name is cut short, whole on hover; one deleted is no
          longer a link. On an edit the change comes first, the name taking
          at most two fifths of the line. */}
      <span
        className={`min-w-0 shrink ${verb === 'edited' ? 'max-w-[40%]' : ''}`}
      >
        {verb === 'deleted' ? (
          <span
            className='block truncate font-medium'
            title={toText(task.name)}
          >
            {toText(task.name)}
          </span>
        ) : (
          <RecordLink
            entity='tasks'
            record={{ id: toText(task.id), name: toText(task.name) }}
          />
        )}
      </span>
      {/* What an edit changed, as a record's own edits read. */}
      {verb === 'edited' ? (
        <HistoryChanges
          entity='tasks'
          record={task as CrmRecord}
          changes={event.changes}
          previous={event.previous}
          names={names}
          fileNames={fileNames}
          open={open}
          onToggle={onToggle}
        />
      ) : null}
      {/* When it is, as planned or moved; for one done, its outcome. */}
      {verb === 'moved' ? (
        // The new time, which is what a move says; planning one says only
        // that it was planned. Always whole; the name gives way.
        changes.dueAt ? (
          <span className='shrink-0 text-muted-foreground tabular-nums'>
            {text('feed.task.to', { time: when(changes.dueAt) })}
          </span>
        ) : null
      ) : toText(event.toValue) === 'completed' && task.result ? (
        // Only the room the name leaves, so a long result never cuts the
        // name: one that fits reads on the line, as a note's text does; one
        // of several lines, or longer than the line, reads whole below it.
        <>
          {resultLong ? null : (
            <span aria-hidden className='shrink-0 text-muted-foreground'>
              ·
            </span>
          )}
          <NoteExcerpt
            value={toText(task.result)}
            long={resultLong}
            onLong={(long) => onResultLong?.(long)}
          />
        </>
      ) : null}
    </>
  );
}

// A note's text, as its entry keeps it.
const noteText = (event: { changes?: unknown }): string =>
  toText((event.changes as Data | undefined)?.text ?? '');

// A merge on the kept lead's timeline: the lead merged in, as it was, and
// what came over with it (server/providers/crm/lead-merge.ts).
function MergedLead({ changes }: { changes?: unknown }): ReactElement {
  const { text } = useCrmText();
  const values = (changes ?? {}) as Data;
  const lead = (values.lead ?? {}) as Data;
  const tasks = Number(values.tasks ?? 0);
  const notes = Number(values.notes ?? 0);
  return (
    <>
      <span className='min-w-0 truncate'>
        {[lead.name, lead.company].filter(Boolean).map(toText).join(' / ')}
      </span>
      {tasks || notes ? (
        <span className='shrink-0 text-xs text-muted-foreground'>
          {text('feed.mergedMoved', { tasks, notes })}
        </span>
      ) : null}
    </>
  );
}

// Each kind of entry's icon on the timeline's rail.
const eventIcons: Record<string, LucideIcon> = {
  created: CirclePlus,
  updated: PencilLine,
  converted: ArrowRightLeft,
  deleted: Trash2,
  ai: Sparkles,
  // A note's entries by what they concern, as files' are: added, edited or
  // removed, all under the note.
  note: MessageSquareText,
  noteEdited: MessageSquareText,
  noteDeleted: MessageSquareText,
  // A person asking the AI to redo its card, in their words.
  aiRevise: MessageCircle,
  merged: Merge,
  mail: Mail,
};

// An update that changed a deal's contacts alone (who, or their roles):
// under the Contacts tab's icon, as files are under the clip.
const contactsOnly = (event: Data): boolean => {
  const keys = Object.keys((event.changes as Data | undefined) ?? {}).filter(
    (key) => key !== 'id',
  );
  return (
    event.action === 'updated' && keys.length === 1 && keys[0] === 'contacts'
  );
};

// An update that changed the files alone, which the timeline reads as
// files added or removed rather than as an update.
const filesOnly = (event: Data): boolean => {
  const keys = Object.keys((event.changes as Data | undefined) ?? {}).filter(
    (key) => key !== 'id',
  );
  return (
    event.action === 'updated' &&
    keys.length === 1 &&
    keys[0] === 'attachments' &&
    Boolean((event.previous as Data | undefined)?.attachments !== undefined)
  );
};

// Status and stage moves, which the timeline draws as field updates.
const moves = new Set(['status', 'stage']);

// A record's activity feed, the tab once called its change history: what
// people changed, what the AI proposed and someone confirmed (marked so), and
// the AI's own work such as a lead's evaluation, newest first, all of it or
// only the people's or the AI's. The first page of everything comes with the
// record; a filter asks the history endpoint for its own.
export function HistoryFeed({
  entity,
  id,
  record,
  initial,
  names,
  statusKey,
  editable = false,
  recordName,
  focusId,
  focusAt,
  onOpenMail,
}: {
  entity: Entity;
  id: string;
  record: CrmRecord;
  initial: { data: Data[]; total: number } | undefined;
  names: Record<string, string>;
  statusKey?: string;
  // Whether the reader may act on a waiting AI verdict here (a lead's).
  editable?: boolean;
  recordName?: string;
  // The entry to scroll to and mark: one the page opened the timeline at,
  // or one the address names (?focus=, from "Waiting on me"). A new
  // `focusAt` asks for it again (the same entry, clicked once more).
  focusId?: string;
  focusAt?: number;
  // Opens a mail conversation on the Mail tab, for the mailbox's owner.
  onOpenMail?: (sourceKey: string) => void;
}): ReactElement {
  const { text, language } = useCrmText();
  const refresh = useRefresh();
  const [searchParams] = useSearchParams();
  const focus = focusId ?? searchParams.get('focus') ?? undefined;
  const { data: meta } = useMetadata();
  // The evaluations opened into their records.
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());
  // The entry the page was sent to opens on arrival and closes like any
  // other after that: closing it marks this arrival (the entry and when it
  // was asked for) closed, and a new arrival opens it again.
  const arrival = focus ? `${focus}:${toText(focusAt ?? '')}` : '';
  const [closedArrival, setClosedArrival] = useState('');
  const isOpen = (key: string): boolean =>
    opened.has(key) || (key === focus && closedArrival !== arrival);
  // Opens or closes an entry: an AI entry's card, a save's fields.
  const toggle = (key: string): void => {
    const wasOpen = isOpen(key);
    if (wasOpen && key === focus) setClosedArrival(arrival);
    setOpened((previous) => {
      const next = new Set(previous);
      if (wasOpen) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const timeZone = meta?.settings.timeZone ?? 'Asia/Shanghai';
  // The moment the entries' "how long ago" is counted from, moved on each
  // minute.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const optionText = (value: unknown): string =>
    text(`options.${toText(value)}`, { defaultValue: toText(value) });
  const base = `${toText(entity)}/${toText(id)}/history`;
  const more = useMore<Data>(base, initial);
  // The records the AI follows up, whose waiting cards are handled here.
  const followed =
    entity === 'leads' || entity === 'opportunities' ? entity : undefined;
  // The newest AI evaluation shown (the feed comes newest first).
  const latestEvaluation = toText(
    more.records.find((event) => event.action === 'ai')?.id ?? '',
  );
  // Entries name attachments by id; one lookup turns them into filenames.
  const fileIds = [
    ...new Set(
      more.records
        .flatMap((event) =>
          arrayValues((event.changes as Data | undefined)?.attachments).map(
            toText,
          ),
        )
        .filter(Boolean),
    ),
  ];
  const { data: files } = useCrmQuery<{ id: string; filename: string }[]>(
    `files?ids=${encodeURIComponent(fileIds.join(','))}`,
    fileIds.length > 0,
  );
  const fileNames = Object.fromEntries(
    (files ?? []).map((file) => [file.id, file.filename]),
  );
  // Bring the entry asked for into view once it has loaded: the pages
  // before it loaded first, and again on each ask.
  const loaded = more.records.some((event) => toText(event.id) === focus);
  useEffect(() => {
    if (focus && loaded)
      document
        .getElementById(`feed-${focus}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focus, loaded, focusAt]);
  useEffect(() => {
    if (focus && !loaded && more.hasMore && !more.loading) void more.loadMore();
  }, [focus, loaded, more]);
  const allNames = { ...names, ...more.titles };
  // The notes read whole below their line (several lines, or too long for
  // it), and the one its author is editing.
  const [longNotes, setLongNotes] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const markLong = (key: string, long: boolean): void =>
    setLongNotes((previous) => {
      if (previous.has(key) === long) return previous;
      const next = new Set(previous);
      if (long) next.add(key);
      else next.delete(key);
      return next;
    });
  const [editingNote, setEditingNote] = useState<string>();
  // What a record's closing says, told under that entry: an approval's
  // decision comment, a task's result.
  const closed =
    entity === 'approvals'
      ? { field: 'decisionComment', statuses: ['approved', 'rejected'] }
      : entity === 'tasks'
        ? { field: 'result', statuses: ['completed', 'cancelled'] }
        : undefined;
  // The entry the record's own comment or result is read for when entries
  // did not keep theirs: its latest closing, else (a task created done) its
  // creation, once every entry has loaded.
  const closedOn = closed
    ? toText(
        (
          more.records.find(
            (event) =>
              event.action === 'status' &&
              closed.statuses.includes(toText(event.toValue)),
          ) ??
          (closed.statuses.includes(toText(record.status)) && !more.hasMore
            ? more.records.find((event) => event.action === 'created')
            : undefined)
        )?.id ?? '',
      )
    : '';
  // A note's edits show on the note itself, marked edited, not as entries.
  const shown = more.records.filter((event) => event.action !== 'noteEdited');
  return (
    <>
      {/* A note or a comment is written here, atop the timeline, and reads
          whole in it: there is no Notes tab. */}
      <NoteComposer entity={entity} id={id} />
      {!shown.length ? (
        <p className='text-sm text-muted-foreground'>{text('feed.empty')}</p>
      ) : (
        // One list, newest first, each entry on a rail of icons, read as a
        // sentence — who, what they did (muted), what changed — with its
        // full date and time on the right; no month headings.
        <div className='grid grid-cols-[minmax(0,1fr)] gap-6'>
          {[shown].map((events) => (
            <section
              key='timeline'
              className='grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4'
            >
              {/* The icons on no rail of their own, joined by a hairline
                  from one entry to the next. */}
              <ol className='relative'>
                {events.map((event, index) => {
                  const key = toText(event.id);
                  const ai = event.action === 'ai';
                  // A note: its text whole under its line, as it now reads,
                  // marked edited. Its edits are not entries of their own
                  // here; its removal says that it happened, without the
                  // text.
                  const note = event.action === 'note';
                  // What closed it, read under its line as a note's text
                  // is and not among the changed fields: an approval's
                  // decision comment, a task's result. An entry from before
                  // the comment was kept on it takes the record's own for
                  // the latest closing; a task created already done shows
                  // its result on its creation.
                  const closing =
                    (closed &&
                      event.action === 'status' &&
                      closed.statuses.includes(toText(event.toValue))) ||
                    key === closedOn;
                  const comment =
                    closed && closing
                      ? toText(
                          (event.changes as Data | undefined)?.[closed.field] ??
                            (key === closedOn
                              ? (record[closed.field] ?? '')
                              : ''),
                        ).trim()
                      : '';
                  const shownChanges =
                    closed && closing
                      ? Object.fromEntries(
                          Object.entries(
                            (event.changes as Data | undefined) ?? {},
                          ).filter(([field]) => field !== closed.field),
                        )
                      : event.changes;
                  const pending =
                    ai && followed && event.aiStatus === 'pending';
                  // An approval's AI review for its approver
                  // (approval-review.tsx).
                  const review = ai && entity === 'approvals';
                  // Every AI card starts closed, a waiting one too, its
                  // line saying it waits; the entry the page was sent to
                  // opens on arrival.
                  const open = isOpen(key);
                  // Files added or removed show the attachments' clip.
                  // An entry of one of the record's tasks: planned,
                  // done or called off, or moved.
                  // (On a task's own timeline, its entries are its own.)
                  const taskEvent =
                    (event.entity === 'tasks' && entity !== 'tasks') ||
                    event.action === 'taskDeleted';
                  // One of a deal's approvals submitted, decided or
                  // withdrawn.
                  const approvalEvent =
                    event.entity === 'approvals' && entity !== 'approvals';
                  // Every task entry carries the Tasks tab's icon,
                  // every approval entry the Approvals tab's.
                  const Icon = taskEvent
                    ? SquareCheckBig
                    : approvalEvent
                      ? ListChecks
                      : contactsOnly(event)
                        ? UserRound
                        : filesOnly(event)
                          ? Paperclip
                          : (eventIcons[toText(event.action)] ?? PencilLine);
                  if (event.action === 'mailBefore')
                    return (
                      <EarlierMail
                        key={key}
                        event={event}
                        last={index === events.length - 1}
                        open={isOpen(key)}
                        onToggle={() => toggle(key)}
                        onOpenMail={onOpenMail}
                        now={now}
                        timeZone={timeZone}
                      />
                    );
                  return (
                    <li
                      id={`feed-${key}`}
                      key={key}
                      className='group/entry relative flex scroll-mt-24 gap-3'
                    >
                      <div className='flex w-5 shrink-0 flex-col items-center'>
                        <span className='flex h-[26px] items-center justify-center'>
                          <Icon
                            className={`size-3.5 ${ai ? 'text-ai' : 'text-muted-foreground'}`}
                          />
                        </span>
                        {index < events.length - 1 && (
                          <span className='min-h-3 w-px flex-1 bg-border/50' />
                        )}
                      </div>
                      <div
                        className={`min-w-0 flex-1 pb-3 ${
                          focus === key
                            ? 'crm-arrive -mx-2 rounded-lg bg-ai/5 px-2'
                            : ''
                        }`}
                      >
                        <div className='flex min-h-[26px] items-center gap-3 text-sm'>
                          {/* An entry is one line, never wrapped: what is
                              long (a change's values, a note's excerpt, a
                              verdict) gives way instead, cut where the line
                              ends. */}
                          {/* Clipped at its end: on a narrow column (a
                              drawer's) nothing runs into the time. */}
                          <span className='flex min-w-0 flex-1 items-center gap-x-1.5 overflow-hidden whitespace-nowrap'>
                            {/* Who: a person, or "AI" for its own work,
                                in bold. */}
                            <span className='shrink-0 font-semibold text-foreground'>
                              {ai
                                ? text('feed.ai')
                                : meta?.users.find(
                                    (u) => u.id === event.actorId,
                                  )?.name}
                            </span>
                            {taskEvent ? (
                              <TaskEvent
                                event={event}
                                open={open}
                                onToggle={() => toggle(key)}
                                names={allNames}
                                fileNames={fileNames}
                                resultLong={longNotes.has(key)}
                                onResultLong={(long) => markLong(key, long)}
                              />
                            ) : approvalEvent ? (
                              <ApprovalEvent event={event} />
                            ) : event.action === 'mail' ? (
                              <MailEvent event={event} onOpen={onOpenMail} />
                            ) : (
                              // Empty for files alone, whose "added" or
                              // "removed" follows: hidden, so no gap doubles.
                              // The verb gives way last, only once the values
                              // have, so the tags after it stay in view on a
                              // narrow column; clipped, not ellipsed, since a
                              // squeeze of a fraction of a pixel would
                              // otherwise end it in an ellipsis.
                              <span className='min-w-0 shrink-[0.001] overflow-hidden text-clip text-muted-foreground empty:hidden'>
                                {ai
                                  ? // While it runs, and if it never finished,
                                    // the line says so rather than that a
                                    // suggestion was given.
                                    text(
                                      event.aiStatus === 'running'
                                        ? review
                                          ? 'feed.reviewing'
                                          : 'feed.evaluating'
                                        : event.aiStatus === 'failed'
                                          ? review
                                            ? 'feed.reviewFailed'
                                            : 'feed.evaluationFailed'
                                          : review
                                            ? 'feed.reviewed'
                                            : 'feed.evaluated',
                                    )
                                  : // A note is its text, right after who
                                    // wrote it, with no word before it.
                                    filesOnly(event) || note
                                    ? ''
                                    : // A status or stage move reads as any
                                      // other field's update.
                                      text(
                                        `feed.did.${
                                          moves.has(toText(event.action))
                                            ? 'updated'
                                            : toText(event.action)
                                        }`,
                                        {
                                          defaultValue: text(
                                            `events.${toText(event.action)}`,
                                          ),
                                        },
                                      )}
                              </span>
                            )}
                            {/* A status or stage move, drawn as the
                                field changes below it are. */}
                            {event.fromValue &&
                            statusKey &&
                            !taskEvent &&
                            !approvalEvent ? (
                              // In Chinese the field's name follows the verb
                              // with no space ("更新状态").
                              <span
                                className={`inline-flex items-baseline gap-1.5 ${
                                  language.startsWith('zh') ? '-ml-1.5' : ''
                                }`}
                              >
                                <span className='text-muted-foreground'>
                                  {text(fieldLabelKey(entity, statusKey))}
                                </span>
                                {optionText(event.fromValue)}
                                <span aria-hidden>→</span>
                                {optionText(event.toValue)}
                              </span>
                            ) : null}
                            {ai && event.aiStatus === 'running' ? (
                              <Spinner className='size-3.5 shrink-0 text-ai' />
                            ) : review && event.aiStatus !== 'failed' ? (
                              <ReviewFeedEntry entry={event} />
                            ) : ai && event.aiStatus !== 'failed' ? (
                              <EvaluationFeedEntry entry={event} />
                            ) : null}
                            {/* A creation says only that it happened: the
                                values it started with are the record's own
                                first state. */}
                            {!ai &&
                              !note &&
                              event.action !== 'created' &&
                              !toText(event.action).startsWith('note') &&
                              event.action !== 'aiRevise' &&
                              event.action !== 'merged' &&
                              event.action !== 'mail' &&
                              !taskEvent &&
                              !approvalEvent && (
                                <HistoryChanges
                                  entity={entity}
                                  record={record}
                                  changes={shownChanges}
                                  previous={event.previous}
                                  movedField={
                                    event.fromValue ? statusKey : undefined
                                  }
                                  names={allNames}
                                  fileNames={fileNames}
                                  open={open}
                                  onToggle={() => toggle(key)}
                                />
                              )}
                            {/* What the person asked the AI to change, in
                                their words, cut where the line ends. */}
                            {event.action === 'merged' ? (
                              <MergedLead changes={event.changes} />
                            ) : null}
                            {/* A note that fits reads on its line right
                                after who wrote it; one of several lines, or
                                longer than the line, reads whole below it,
                                as Clarify shows a comment. */}
                            {note ? (
                              <NoteExcerpt
                                value={noteText(event)}
                                mentions={
                                  (event.changes as Data | undefined)?.mentions
                                }
                                long={longNotes.has(key)}
                                onLong={(long) => markLong(key, long)}
                              />
                            ) : null}
                            {event.action === 'aiRevise' ? (
                              <span className='min-w-0 truncate'>
                                「{noteText(event).replace(/\s+/g, ' ')}」
                              </span>
                            ) : null}
                            {/* The AI's part in a person's change, last on the
                                line: proposed
                                in the chat or an evaluation, or, for a lead,
                                organised from pasted text. */}
                            {event.source === 'assistant' && (
                              <Badge variant='ai'>
                                {text('feed.aiProposed')}
                              </Badge>
                            )}
                            {event.source === 'capture' && (
                              <Badge variant='ai'>
                                {text('feed.aiCaptured')}
                              </Badge>
                            )}
                            {/* An AI card opens from its line (not while
                                it runs: there is nothing to open). */}
                            {ai && event.aiStatus !== 'running' && (
                              <Button
                                size='icon-xs'
                                variant='outline'
                                className='rounded-full'
                                aria-expanded={open}
                                aria-label={text(open ? 'collapse' : 'expand')}
                                onClick={() => toggle(key)}
                              >
                                <ChevronDown
                                  className={`transition-transform ${open ? 'rotate-180' : ''}`}
                                />
                              </Button>
                            )}
                          </span>
                          {/* Its author's edit and delete, on hover. */}
                          {note && event.actorId === meta?.userId ? (
                            <NoteActions
                              id={key}
                              onEdit={() => setEditingNote(key)}
                            />
                          ) : null}
                          <time
                            dateTime={toText(event.createdAt)}
                            // How long ago, the full time on hover.
                            title={localDate(
                              event.createdAt,
                              language,
                              timeZone,
                            )}
                            // On the entry's first line, however far the
                            // line unfolds below it.
                            className='shrink-0 self-start text-xs leading-[26px] text-muted-foreground/80 tabular-nums'
                          >
                            {/* An edited note says so right before its
                                time, the edit's time on hover. */}
                            {note && event.editedAt ? (
                              <span
                                title={localDate(
                                  event.editedAt,
                                  language,
                                  timeZone,
                                )}
                              >
                                {text('notes.edited')} ·{' '}
                              </span>
                            ) : null}
                            {relativeTime(
                              event.createdAt,
                              language,
                              now,
                              text('justNow'),
                            )}
                          </time>
                        </div>
                        {comment ? (
                          <div className='mt-0.5 text-sm'>
                            <LongText value={comment} />
                          </div>
                        ) : null}
                        {/* A task's result too long for its line, whole
                            below it as a note's text is. */}
                        {taskEvent &&
                        longNotes.has(key) &&
                        toText((event.task as Data | undefined)?.result) ? (
                          <div className='mt-0.5 text-sm'>
                            <LongText
                              value={toText((event.task as Data).result)}
                            />
                          </div>
                        ) : null}
                        {note && editingNote === key ? (
                          <NoteEditor
                            note={event}
                            onDone={() => setEditingNote(undefined)}
                          />
                        ) : note && longNotes.has(key) ? (
                          <div className='mt-0.5 text-sm'>
                            <LongText
                              value={markdownMentions(
                                noteText(event),
                                (event.changes as Data | undefined)?.mentions,
                                meta?.users ?? [],
                              )}
                            />
                          </div>
                        ) : null}
                        {/* A waiting verdict is handled here once opened; any
                            other evaluation is its record. */}
                        {review && open && event.aiStatus !== 'running' ? (
                          <div className='mt-1'>
                            <ReviewPanel
                              entry={
                                {
                                  id: key,
                                  recordId: id,
                                  status: toText(event.aiStatus),
                                  createdAt: toText(event.createdAt),
                                  ai: event.ai,
                                } as ReviewEntry
                              }
                              approvalId={id}
                              approvalName={recordName ?? ''}
                              onChanged={refresh}
                            />
                          </div>
                        ) : pending && open ? (
                          <div className='mt-1'>
                            <VerdictPanel
                              entry={
                                {
                                  id: key,
                                  status: 'pending',
                                  createdAt: toText(event.createdAt),
                                  ai: event.ai,
                                } as EvaluationEntry
                              }
                              entity={followed}
                              recordId={id}
                              recordName={recordName}
                              editable={editable}
                              onChanged={refresh}
                            />
                          </div>
                        ) : ai && open ? (
                          <div className='mt-1'>
                            {/* A decided evaluation opened: its own card,
                                read-only, on a neutral ground. */}
                            <VerdictPanel
                              entry={
                                {
                                  id: key,
                                  status: toText(event.aiStatus),
                                  createdAt: toText(event.createdAt),
                                  ai: event.ai,
                                } as EvaluationEntry
                              }
                              entity={followed}
                              recordId={id}
                              recordName={recordName}
                              // The lead's latest evaluation may be run again;
                              // an earlier one is only its record.
                              editable={editable && key === latestEvaluation}
                              onChanged={refresh}
                              full
                            />
                          </div>
                        ) : null}
                        {/* A task's edit, unfolded likewise. */}
                        {taskEvent && taskState(event) === 'edited' && (
                          <HistoryChanges
                            part='rows'
                            open={open}
                            entity='tasks'
                            record={(event.task ?? {}) as CrmRecord}
                            changes={event.changes}
                            previous={event.previous}
                            names={allNames}
                            fileNames={fileNames}
                          />
                        )}
                        {/* A save's fields, unfolded under the whole entry. */}
                        {!ai &&
                          !note &&
                          event.action !== 'created' &&
                          !toText(event.action).startsWith('note') &&
                          event.action !== 'aiRevise' &&
                          !taskEvent &&
                          !approvalEvent && (
                            <HistoryChanges
                              part='rows'
                              open={open}
                              entity={entity}
                              record={record}
                              changes={shownChanges}
                              previous={event.previous}
                              movedField={
                                event.fromValue ? statusKey : undefined
                              }
                              names={allNames}
                              fileNames={fileNames}
                            />
                          )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
      <AutoLoadMore
        hasMore={more.hasMore}
        loading={more.loading}
        onLoad={() => void more.loadMore()}
      />
    </>
  );
}

// A name's initials, as the account menu draws them: the first letter of
// each of its first two words.
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length
    ? words
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('')
    : '?';
}

// The note box atop a record's timeline. Anyone who may read the record may
// add a note, which everyone who may read it sees; Ctrl/⌘+Enter adds it.
function NoteComposer({
  entity,
  id,
}: {
  entity: Entity;
  id: string;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [draft, setDraft] = useState('');
  // The colleagues picked with @ while writing.
  const [mentions, setMentions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const add = async (): Promise<void> => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await api(`${toText(entity)}/${toText(id)}/notes`, 'POST', {
        text: draft,
        mentions: mentionsIn(draft, mentions, meta?.users ?? []),
      });
      setDraft('');
      setMentions([]);
      await refresh();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  };
  const me = meta?.users.find((user) => user.id === meta.userId)?.name ?? '';
  return (
    // Stays under the tabs as the timeline scrolls (the tab bar is 3.5rem
    // side by side, 3.75rem stacked), on the page's background, its gap
    // below its own so entries pass under it.
    <div className='sticky top-[3.75rem] z-[9] grid gap-2 bg-background pb-5 @3xl:top-14'>
      {/* The writer's avatar before the box, drawn as the account menu's:
          the first letter of each of the name's first two words. */}
      <div className='flex items-start gap-3'>
        <span
          aria-hidden
          className='grid size-10 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium text-muted-foreground'
        >
          {initials(me)}
        </span>
        {/* @ and a name mentions a colleague, who is told. */}
        <MentionTextarea
          aria-label={text('notes.label')}
          value={draft}
          mentions={mentions}
          onMentionsChange={setMentions}
          placeholder={text('notes.placeholder')}
          maxLength={LONG_TEXT_LIMIT}
          // One line until more is written, as tall as the avatar beside
          // it, then as tall as the text (the primitive sizes to its
          // content), up to half the screen; the line centred in that
          // height. White with the card's faint border and shadow, and a
          // soft ring when focused rather than the primitive's grey one.
          rows={1}
          className='max-h-[50vh] min-h-10 resize-none text-sm py-[calc((--spacing(10)-1lh-2px)/2)] bg-card shadow-xs border-border/60 focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/10 dark:bg-card'
          onChange={setDraft}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void add();
            }
          }}
        />
      </div>
      {draft.trim() ? (
        <div className='flex items-center justify-end gap-3'>
          <span className='text-xs text-muted-foreground'>
            {text('notes.shortcut')}
          </span>
          <Button size='sm' disabled={busy} onClick={() => void add()}>
            {text('notes.post')}
          </Button>
        </div>
      ) : null}
      <ErrorNotice error={error} />
    </div>
  );
}

// A note's text on its entry's line. It tells the timeline whether it is
// long (several lines, or wider than the line), which then shows it whole
// below and keeps this in place, unseen, to measure the line again as it
// widens or narrows.
function NoteExcerpt({
  value,
  long,
  onLong,
  mentions,
}: {
  value: string;
  // The colleagues the note mentions, picked out in bold.
  mentions?: unknown;
  long: boolean;
  onLong: (long: boolean) => void;
}): ReactElement {
  const { data: meta } = useMetadata();
  const ref = useRef<HTMLSpanElement>(null);
  const reportRef = useRef(onLong);
  useEffect(() => {
    reportRef.current = onLong;
  });
  const lines = value.trim().includes('\n');
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = (): void =>
      reportRef.current(lines || node.scrollWidth > node.clientWidth + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [value, lines]);
  return (
    <span
      ref={ref}
      aria-hidden={long || undefined}
      className={`min-w-0 flex-1 truncate ${long ? 'invisible' : ''}`}
    >
      {withMentions(markdownLine(value), mentions, meta?.users ?? [])}
    </span>
  );
}

// A note's author's edit and delete, on the entry's line while it is
// hovered or focused, centred on its first line (26px, as the time is);
// delete asks once more.
function NoteActions({
  id,
  onEdit,
}: {
  id: string;
  onEdit: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  return (
    <span
      className={`flex h-[26px] shrink-0 items-center gap-0.5 self-start transition-opacity group-hover/entry:opacity-100 focus-within:opacity-100 ${
        confirming ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <Button
        size='icon-xs'
        variant='ghost'
        aria-label={text('edit')}
        title={text('edit')}
        disabled={busy}
        onClick={onEdit}
      >
        <PencilLine />
      </Button>
      <Button
        size={confirming ? 'xs' : 'icon-xs'}
        variant={confirming ? 'destructive' : 'ghost'}
        aria-label={text(confirming ? 'notes.confirmDelete' : 'delete')}
        title={text('delete')}
        disabled={busy}
        onClick={() => {
          if (!confirming) {
            setConfirming(true);
            return;
          }
          setBusy(true);
          setError(undefined);
          api(`notes/${toText(id)}`, 'DELETE')
            .then(() => refresh())
            .catch(setError)
            .finally(() => {
              setBusy(false);
              setConfirming(false);
            });
        }}
        onBlur={() => setConfirming(false)}
      >
        <Trash2 />
        {confirming ? text('notes.confirmDelete') : null}
      </Button>
      {error ? <ErrorNotice error={error} /> : null}
    </span>
  );
}

// A note changed in place by its author, under its line.
function NoteEditor({
  note,
  onDone,
}: {
  note: Data;
  onDone: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const { data: meta } = useMetadata();
  const [draft, setDraft] = useState(() => noteText(note));
  const [mentions, setMentions] = useState<string[]>(() => {
    const kept = (note.changes as Data | undefined)?.mentions;
    return Array.isArray(kept) ? kept.map(toText) : [];
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  return (
    <div className='mt-1 grid gap-2'>
      <MentionTextarea
        autoFocus
        aria-label={text('notes.label')}
        value={draft}
        maxLength={LONG_TEXT_LIMIT}
        className='max-h-[50vh] min-h-10 resize-none text-sm py-[calc((--spacing(10)-1lh-2px)/2)] bg-card shadow-xs border-border/60 focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/10 dark:bg-card'
        onChange={setDraft}
        mentions={mentions}
        onMentionsChange={setMentions}
      />
      <div className='flex justify-end gap-2'>
        <Button size='sm' variant='ghost' onClick={onDone}>
          {text('cancel')}
        </Button>
        <Button
          size='sm'
          disabled={busy || !draft.trim()}
          onClick={() => {
            setBusy(true);
            setError(undefined);
            api(`notes/${toText(note.id)}`, 'PATCH', {
              text: draft,
              mentions: mentionsIn(draft, mentions, meta?.users ?? []),
            })
              .then(() => refresh())
              .then(onDone)
              .catch(setError)
              .finally(() => setBusy(false));
          }}
        >
          {text('save')}
        </Button>
      </div>
      <ErrorNotice error={error} />
    </div>
  );
}

// A group of a record's particulars (the lead's, the task's): a heading
// that folds the group away and opens it again, as Clarify's do (each
// group's fold remembered in the browser, by its heading), then its rows.
export function InfoGroup({
  title,
  children,
}: {
  // None for what leads the page by itself (a task's description), which
  // does not fold.
  title?: string;
  children: ReactNode;
}): ReactElement {
  const storageKey = title ? `nococrm:info-group:${title}` : '';
  const [folded, setFolded] = useState(() => {
    if (!storageKey) return false;
    try {
      return localStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  });
  const toggle = (): void => {
    const next = !folded;
    setFolded(next);
    try {
      if (next) localStorage.setItem(storageKey, '1');
      else localStorage.removeItem(storageKey);
    } catch {
      // A browser that keeps nothing folds for this visit only.
    }
  };
  // A card of its own, white on the page's tint with a faint border and
  // the lightest shadow, set 0.75rem from the group above it.
  return (
    <section
      className={`mt-3 rounded-xl border border-border/60 bg-card px-2 shadow-xs first:mt-0 ${
        folded ? 'py-1.5' : 'py-3'
      }`}
    >
      {title && (
        <h3 className={folded ? '' : 'pb-1.5'}>
          <button
            type='button'
            aria-expanded={!folded}
            onClick={toggle}
            className='group/fold flex w-full items-center gap-1.5 rounded-md px-2 py-0.5 text-left text-sm font-medium hover:bg-muted/60'
          >
            <span className='min-w-0 flex-1 truncate'>{title}</span>
            <ChevronDown
              aria-hidden
              className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                folded ? '-rotate-90' : ''
              }`}
            />
          </button>
        </h3>
      )}
      {folded ? null : <dl>{children}</dl>}
    </section>
  );
}

// A row of a record's particulars: the field's icon and label, then the
// value (an inline editor, a status, a time).
export function InfoRow({
  label,
  field,
  children,
}: {
  label: string;
  // The field it shows, for its icon (components/crm/field-icons.tsx).
  field: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div className='grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-2'>
      <dt className='flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted-foreground'>
        <FieldIcon field={field} />
        <span className='min-w-0 leading-snug'>{label}</span>
      </dt>
      <dd className='min-w-0 text-sm'>{children}</dd>
    </div>
  );
}

// No value left: nothing, an empty text or an empty list.
function isBlankValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  );
}
