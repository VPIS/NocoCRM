import { MoneyField } from '../components/crm/money-field.js';
import {
  PrepFeedEntry,
  PrepPanel,
  type PrepEntry,
} from '../components/crm/task-preparation.js';
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
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type UIEvent,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../components/ui/tooltip.js';
import { flash } from '../components/crm/flash.js';
import {
  RecordDrawerContext,
  useRecordDrawer,
  resolveTab,
  useDetailTab,
  useRecordDrawerState,
  type RecordDrawerApi,
} from '../components/crm/record-drawer.js';
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Check,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  Copy,
  Ellipsis,
  History,
  ListChecks,
  Mail,
  Maximize2,
  Merge,
  MessageCircle,
  MessageSquareText,
  Paperclip,
  PencilLine,
  Plus,
  Reply,
  Sparkles,
  SquareCheckBig,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button, buttonVariants } from '../components/ui/button.js';
import { useFollowUpRequest } from '../components/crm/follow-up-request.js';
import { FieldIcon } from '../components/crm/field-icons.js';
import {
  FoldingText,
  LongTextPeek,
} from '../components/crm/long-text-field.js';
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
  Loading,
  ErrorNotice,
  RecordLink,
  Status,
  Value,
} from '../components/crm/common.js';
import { RecordForm } from '../components/crm/form.js';
import {
  EvaluateButton,
  EvaluationStatus,
  EvaluationFeedEntry,
  VerdictPanel,
  type EvaluationEntry,
} from '../components/crm/lead-evaluation.js';
import { UploadZone } from '../components/crm/attachments.js';
import {
  AttachButton,
  CommentFiles,
  FileCards,
} from '../components/crm/comment-files.js';
import {
  useCommentFileList,
  useCommentUploads,
} from '../components/crm/comment-uploads.js';
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
import { WaitingPlans } from '../components/crm/plan-card.js';
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
import { DEFAULT_TIME_ZONE } from '../../server/providers/crm/zone-time.js';

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

// A record's left column alone (its heading, actions and tabs, without the
// particulars), drawn as the drawer draws a record and opened on its
// timeline at `focus`: the inbox's AI suggestions pane, where the AI card
// is handled in its record's story. Links in it open the drawer of the page
// around it.
export function RecordPane({
  entity,
  id,
  focus,
}: {
  entity: Entity;
  id: string;
  focus: string;
}): ReactElement {
  const page = useRecordDrawer();
  const noop = (): void => undefined;
  return (
    <RecordDrawerContext.Provider
      value={{
        open: page?.open ?? noop,
        close: page?.close ?? noop,
        inDrawer: true,
        bare: true,
        focus,
      }}
    >
      {entity === 'leads' ? (
        <LeadDetail id={id} />
      ) : (
        <EntityDetail entity={entity} id={id} />
      )}
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
  ['contact', ['name', 'gender', 'jobTitle', 'phone', 'email']],
  [
    'company',
    [
      'company',
      'website',
      'industry',
      'employees',
      'annualRevenue',
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
  const commentFiles = useCommentFileList('leads', id);
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
    `tasks?leadId=${toText(id)}&orderBy=dueAt`,
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
    ...commentFiles.map((file) => file.fileId),
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
      ) : key === 'annualRevenue' ? (
        <MoneyField
          entity='leads'
          record={record}
          amountKey='annualRevenue'
          editable={editable}
          label={text('fields.annualRevenue')}
          placeholder={toText(text('amountPlaceholder'))}
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
    </>
  );
  // Deleting, in a "More" menu at the end of the heading's line.
  const leadMore = detail.permissions.delete && (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={text('moreActions')}
        className={buttonVariants({
          size: 'icon-sm',
          variant: 'ghost',
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
      recordId={toText(id)}
      heading={heading}
      actions={leadActions}
      more={leadMore}
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
            <Copyable>
              <InlineField
                entity='leads'
                record={record}
                field={field('message')}
                editable={editable}
                lookup={names}
                label={text(fieldLabelKey('leads', 'message'))}
                placeholder={toText(text('messagePlaceholder'))}
                // Five lines unfolding in place on a click.
                longText='fold'
              />
            </Copyable>
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
          <div className='grid gap-3'>
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
                          <span
                            data-placeholder
                            className='text-muted-foreground'
                          >
                            —
                          </span>
                        )}
                      </div>
                    </InfoRow>
                  ))}
                </>
              )}
              {leadGroups[0][1].map(fieldRow)}
              <RecordTimes record={record} />
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
  recordId,
  heading,
  actions,
  more,
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
  // The record, whose plans waiting on the reader lead its particulars.
  recordId?: string;
  heading: ReactNode;
  // Everything the reader can do with the record, on a row under the
  // heading.
  actions: ReactNode;
  // The rarer things (deleting), in a menu at the end of the heading's
  // line, so a record with nothing else leaves no row for it.
  more?: ReactNode;
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
  const drawer = useRecordDrawer();
  const inDrawer = drawer?.inDrawer ?? false;
  // The inbox's pane draws the left column alone.
  const bare = drawer?.bare ?? false;
  // The left column's sides: the page's room, and a drawer's narrower
  // room, whose own padding already sets it off.
  const sidePad = inDrawer
    ? '@3xl:pr-5 @3xl:pl-4'
    : '@3xl:pr-12 @3xl:pl-10 md:@3xl:pr-16 md:@3xl:pl-16';
  // Side by side, the intro folds away once the tab's content is scrolled
  // down and comes back at its top, as if it had scrolled away with it.
  // Apart, so the content's own height change cannot undo it: it folds past
  // 40px down, and only where the content is long enough to stay scrolled
  // once the intro's room is added; it returns at the very top.
  const [introAway, setIntroAway] = useState(false);
  const introRef = useRef<HTMLDivElement>(null);
  // The tab bar's height, as `--crm-tabs-h` on the tab column, where the
  // timeline's comment box sticks right under it when stacked: the bar
  // wraps and its type differs by screen, so no fixed offset meets it, and
  // a gap between them lets the scrolling entries show through.
  const tabColumnRef = useRef<HTMLElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bar = tabBarRef.current;
    const column = tabColumnRef.current;
    if (!bar || !column || typeof ResizeObserver === 'undefined') return;
    const measure = (): void =>
      column.style.setProperty(
        '--crm-tabs-h',
        `${String(bar.getBoundingClientRect().height)}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);
  const scrollTab = (event: UIEvent<HTMLElement>): void => {
    const box = event.currentTarget;
    if (box.scrollTop <= 0) setIntroAway(false);
    else if (
      box.scrollTop > 40 &&
      box.scrollHeight - box.clientHeight >
        (introRef.current?.offsetHeight ?? 0) + 40
    )
      setIntroAway(true);
  };
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
          className={`flex h-full flex-col @3xl:-mx-4 ${
            inDrawer ? '' : 'md:@3xl:-mx-8 -mx-4 md:-mx-8'
          }`}
        >
          {/* Stacked, the header, the particulars and the tabs scroll as one;
              side by side, the header stays and each column scrolls. */}
          <div
            className={`flex min-h-0 flex-1 flex-col overflow-y-auto pb-36 @3xl:overflow-hidden @3xl:pb-0 ${
              inDrawer ? '' : 'px-4 md:px-8 @3xl:px-0'
            }`}
          >
            <div
              className={`grid gap-6 @3xl:min-h-0 @3xl:flex-1 @3xl:grid-rows-[auto_minmax(0,1fr)] @3xl:gap-0 ${
                bare
                  ? '@3xl:grid-cols-[minmax(0,1fr)]'
                  : '@3xl:grid-cols-[minmax(0,1fr)_22rem] md:@3xl:grid-cols-[minmax(0,1fr)_23rem]'
              }`}
            >
              {/* The record's header over the left column, the particulars
                    beside it reaching to the top: the heading, and under it,
                    from the left, the AI's latest suggestion and the actions,
                    in a drawer and on a phone alike. Stacked, it comes first. */}
              {/* In a drawer the frame's own padding already sets it off from
                  the drawer's bar, so the header adds none above. */}
              <header
                className={`@3xl:col-start-1 @3xl:row-start-1 @3xl:pb-3 ${sidePad} ${
                  inDrawer ? 'pt-0' : 'pt-5 @3xl:pt-4'
                }`}
              >
                <DetailBack entity={entity} />
                <div className='grid gap-2'>
                  <div className='flex items-start gap-2'>
                    <div className='min-w-0 flex-1'>{heading}</div>
                    {more ? <div className='shrink-0'>{more}</div> : null}
                  </div>
                  {/* The AI's latest suggestion leads the actions, as what
                      to do next; it draws nothing before the first. */}
                  {actions || status ? (
                    <div className='flex flex-wrap items-center gap-2 empty:hidden'>
                      {status}
                      {actions}
                    </div>
                  ) : null}
                </div>
              </header>
              {/* Stacked, what the record says of itself comes under its
                  header, before the particulars. */}
              {intro ? (
                <div className='min-w-0 @3xl:hidden'>{intro}</div>
              ) : null}

              {/* The timeline and the other tabs on the left, taking the
                  room, the particulars in a narrow column on the right.
                  Stacked, the particulars come first after the header (a
                  phone number before the history): the source order, which
                  side by side the grid's placement turns round. */}
              {/* The particulars as a stack of cards, one per group
                  (InfoGroup), with whatever leads them (a lead's duplicates)
                  above; side by side the stack scrolls on its own, ending in
                  6rem of room so its last row scrolls above the assistant's
                  dock. The rows keep 8px of their own on each side for an
                  inline editor's hover fill. */}
              {bare ? null : (
                <section
                  className={`flex min-w-0 flex-col gap-3 @3xl:col-start-2 @3xl:row-span-2 @3xl:row-start-1 @3xl:overflow-y-auto @3xl:pb-24 ${
                    inDrawer ? '@3xl:mr-4' : '@3xl:mr-2 @3xl:pt-4 md:@3xl:mr-3'
                  }`}
                >
                  {recordId ? (
                    <WaitingPlans entity={entity} recordId={recordId} />
                  ) : null}
                  {left}
                </section>
              )}
              {/* The tabs head the left column: stacked, they stay in view as
                  the page scrolls; side by side, their content scrolls below
                  them. */}
              {/* Side by side only the tab's content scrolls, its scrollbar
                  beside it alone; the tabs stay, and the intro folds away as
                  the content scrolls down (a long intro, unfolded, scrolls
                  within a part of the column of its own). Stacked, the page
                  scrolls and the tabs stick to its top. */}
              <section
                ref={tabColumnRef}
                className='flex min-w-0 flex-col @3xl:col-start-1 @3xl:row-start-2 @3xl:min-h-0 @3xl:overflow-hidden'
              >
                {intro ? (
                  <div
                    // Side by side only; stacked it is drawn under the
                    // header instead, above the particulars.
                    className={`hidden shrink-0 transition-[grid-template-rows,opacity] duration-200 ease-out @3xl:grid ${
                      introAway
                        ? '@3xl:grid-rows-[0fr] @3xl:opacity-0'
                        : 'grid-rows-[1fr]'
                    }`}
                  >
                    <div className='min-h-0 overflow-hidden'>
                      <div
                        ref={introRef}
                        className={`pb-7 @3xl:max-h-[40vh] @3xl:overflow-y-auto @3xl:[scrollbar-gutter:stable] ${sidePad}`}
                      >
                        {intro}
                      </div>
                    </div>
                  </div>
                ) : null}
                {/* The gap under the tabs is the bar's own, on the page's
                    background, so content scrolling up passes under it
                    rather than meeting the tabs' edge. */}
                {/* Side by side it keeps the room of the content's scrollbar
                    too (none where scrollbars lie over the page), so the
                    tabs' rule ends where the content does. */}
                <div
                  ref={tabBarRef}
                  className={`sticky top-0 z-10 flex shrink-0 flex-wrap items-center bg-background pt-1 pb-4 @3xl:overflow-hidden @3xl:[scrollbar-gutter:stable] @3xl:pt-0 ${sidePad}`}
                >
                  {tabBar}
                </div>
                {/* The tab's content, which alone scrolls side by side; its
                    foot keeps room for the assistant's box over the page,
                    open as well as closed, so the last entry scrolls clear of
                    it, and its scrollbar's room is kept whether or not a tab
                    scrolls, so switching tabs never re-wraps it. */}
                <div
                  className={`min-w-0 @3xl:min-h-0 @3xl:flex-1 @3xl:overflow-y-auto @3xl:[scrollbar-gutter:stable] @3xl:pb-36 ${sidePad}`}
                  onScroll={scrollTab}
                >
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
      className='flex w-full flex-wrap gap-x-5 border-b border-border'
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
            className={`-mb-px flex h-10 items-center gap-1.5 border-b-2 text-sm font-medium transition-colors outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset ${
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
  const { data, fetchStatus } = useRecordMessages(
    target,
    setup.accounts.length > 0,
  );
  // Nothing to look for (no address, no mailbox) is none: 0, as the other
  // tabs say; while it is being looked up, no number yet.
  if (data) return <TabCount value={data.length} />;
  return fetchStatus === 'idle' ? <TabCount value={0} /> : null;
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
  // The site by its domain alone, as a person names it; the whole address
  // on hover.
  const host = (() => {
    try {
      return new URL(href ?? '').host.replace(/^www\./, '');
    } catch {
      return url;
    }
  })();
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
          ? 'cursor-text transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
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
      {/* A chip on a grey fill, unlike any other value: the domain in the
          value's own weight, cut with an ellipsis when it must be, and the
          arrow of a link that opens elsewhere. */}
      <a
        // Its padding taken back from the line, so the row is as tall as
        // any other.
        className='-my-0.5 inline-flex min-w-0 items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-sm text-foreground transition-colors hover:bg-muted/70'
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        title={url}
        data-copy={url}
        aria-label={`${toText(label)}: ${toText(text('openWebsite'))}`}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <span className='min-w-0 truncate'>{host}</span>
      </a>
      {/* A long address leaves no row to double-click beside it: the pencil,
          shown on hover over the end of the row (taking no room from the
          address, which fields need), opens the editor in one click; it
          sits left of the copy button the row shows at its right
          (InfoRow), drawn as it is. */}
      {editable && (
        <button
          type='button'
          className={`absolute right-8 hidden group-focus-within/site:grid group-hover/site:grid ${ROW_ACTION}`}
          aria-label={`${toText(text('edit'))} ${toText(label)}`}
          onClick={() => setEditing(true)}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <PencilLine aria-hidden className='size-3.5' />
        </button>
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
      <FileCards
        rows
        ids={files.map(toText)}
        onRemove={editable ? setPending : undefined}
        empty={text('noAttachments')}
        className=''
      />
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
  const { data: meta } = useMetadata();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState('');
  // The comments' files, removed only by editing their comment; one shown
  // among the record's own or a linked record's is listed there.
  const commentFiles = useCommentFileList(entity, toText(record.id));
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
          <FileCards
            rows
            ids={own}
            onRemove={editable ? setPending : undefined}
            empty={text('noAttachments')}
            className=''
          />
        </div>
      )}
      {!hasOwnFiles &&
        !commentFiles.length &&
        !linked.some((g) => filesFrom(g.entity).length > 0) && (
          <p className='text-sm text-muted-foreground'>
            {text('noAttachments')}
          </p>
        )}
      {linked
        // A group with no files says nothing: left out.
        .filter(
          (group) =>
            group.entity !== entity && filesFrom(group.entity).length > 0,
        )
        .map((group) => (
          <div key={group.entity} className='space-y-2'>
            <p className='text-xs font-medium text-muted-foreground'>
              {text(group.label)}
            </p>
            <FileCards
              rows
              ids={filesFrom(group.entity)}
              onRemove={editable ? setPending : undefined}
              className=''
              // The record it came from, by name, on hover.
              detail={(id: string) =>
                toText(sources.get(id)?.record.name ?? '')
              }
            />
          </div>
        ))}
      {commentFiles.some((file) => !sources.has(file.fileId)) ? (
        <div className='space-y-2'>
          <p className='text-xs font-medium text-muted-foreground'>
            {text('attachmentsFromComments')}
          </p>
          <FileCards
            rows
            ids={[
              ...new Set(
                commentFiles
                  .filter((file) => !sources.has(file.fileId))
                  .map((file) => file.fileId),
              ),
            ]}
            className=''
            // Who attached it, as the timeline names the comment's writer.
            detail={(fileId) => {
              const writer = commentFiles.find(
                (file) => file.fileId === fileId,
              )?.actorId;
              return meta?.users.find((user) => user.id === writer)?.name;
            }}
          />
        </div>
      ) : null}
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
  // A text that may run to several lines: a long text, and a street
  // address, which the particulars show over lines of their own too.
  const longText = (key: string): boolean =>
    key === 'address' || fields.find((f) => f.key === key)?.type === 'textarea';
  // A lead's introduction by the short name its particulars show (the
  // company is implied); every other field by its own.
  const labelOf = (key: string): string =>
    text(
      entity === 'leads' && key === 'companyDescription'
        ? 'fields.companyIntro'
        : fieldLabelKey(entity, key),
      { defaultValue: key },
    );
  // On hover: what it was, when it held anything, and what it became; a
  // long text says it in its pop-up instead.
  const titleOf = (key: string): string | undefined =>
    longText(key)
      ? undefined
      : before && key in before && toText(before[key] ?? '').trim()
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
        {longText(key) ? (
          // A long text opens whole in a pop-up.
          <LongTextPeek label={labelOf(key)} value={toText(changed[key])}>
            {show(changed, key)}
          </LongTextPeek>
        ) : (
          <span className='min-w-0 shrink truncate [&_*]:whitespace-nowrap'>
            {show(changed, key)}
          </span>
        )}
      </>
    );
  const rows = shown.map((key, index) => {
    if (key === 'attachments' && before && key in before) {
      const was = arrayValues(before.attachments).map(toText);
      const now = arrayValues(changed.attachments).map(toText);
      const added = now.filter((file) => !was.includes(file));
      const removed = was.filter((file) => !now.includes(file));
      return (
        // On one line, as every change reads: the files cut where it ends
        // (named whole on hover).
        <span
          key={key}
          className='inline-flex max-w-full min-w-0 items-baseline gap-x-1.5'
        >
          {added.length ? (
            <>
              <span className='shrink-0 text-muted-foreground'>
                {text('feed.addedFiles')}
              </span>
              <span className='min-w-0 truncate' title={fileList(added)}>
                {fileList(added)}
              </span>
            </>
          ) : null}
          {removed.length ? (
            <>
              <span className='shrink-0 text-muted-foreground'>
                {text('feed.removedFiles')}
              </span>
              <span className='min-w-0 truncate' title={fileList(removed)}>
                {fileList(removed)}
              </span>
            </>
          ) : null}
          {separator(index)}
        </span>
      );
    }
    const label = (
      <span className='shrink-0 text-muted-foreground'>{labelOf(key)}</span>
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
      <div className='mt-1 grid gap-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm'>
        {rows}
      </div>
    ) : null;
  if (!folds) return <>{rows}</>;
  return (
    <>
      <span className='text-muted-foreground'>
        {text('feed.fieldCount', { count: shown.length })}
      </span>
      {/* The same toggle an AI entry opens with. */}
      <FoldToggle open={open} onToggle={onToggle} />
    </>
  );
}

// The toggle that opens a timeline entry (a save's fields, an AI card): a
// small arrow on the line, pointing right while closed and down once
// open, with no frame of its own until hovered, so it reads as part of the
// line.
function FoldToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle?: () => void;
}): ReactElement {
  const { text } = useCrmText();
  return (
    <Button
      size='icon-xs'
      variant='ghost'
      className='size-5 rounded-md text-muted-foreground hover:text-foreground [&_svg]:size-3.5!'
      aria-expanded={open}
      aria-label={text(open ? 'collapse' : 'expand')}
      onClick={onToggle}
    >
      <ChevronRight
        className={`transition-transform ${open ? 'rotate-90' : ''}`}
      />
    </Button>
  );
}

// One person's edits one after another on the timeline read as one entry:
// edits of the same fields whenever they were made, and their updates
// within half an hour of each other whatever the fields, as one save of
// all the fields they changed, each from the value before the first edit
// to the last (status moves only when they move the same field). The timeline
// tells what the record became, not each attempt at getting it right. Only
// the record's own entries, from the same source (an AI proposal confirmed
// stays apart from a person's own edit).
const MERGE_WINDOW = 30 * 60 * 1000;
const editedKeys = (event: Data): string =>
  Object.keys((event.changes as Data | undefined) ?? {})
    .sort()
    .join(',');
const sameEdit = (newer: Data, older: Data): boolean =>
  (newer.action === 'updated' || newer.action === 'status') &&
  newer.action === older.action &&
  newer.entity === older.entity &&
  newer.recordId === older.recordId &&
  newer.actorId === older.actorId &&
  toText(newer.source) === toText(older.source) &&
  (editedKeys(newer) === editedKeys(older) ||
    (newer.action === 'updated' &&
      new Date(toText(newer.mergedFrom ?? newer.createdAt)).getTime() -
        new Date(toText(older.createdAt)).getTime() <=
        MERGE_WINDOW));
function collapseEdits(events: Data[]): Data[] {
  const kept: Data[] = [];
  // The feed comes newest first: an older entry folds into the one kept
  // above it, adding the fields only it changed and handing it what each
  // field held before. The time between edits is measured from the older
  // of the two, so a long run of edits a few minutes apart stays one.
  for (const event of events) {
    const newer = kept[kept.length - 1];
    if (newer && sameEdit(newer, event)) {
      const olderPrevious = event.previous as Data | undefined;
      const newerPrevious = newer.previous as Data | undefined;
      kept[kept.length - 1] = {
        ...newer,
        changes: {
          ...(event.changes ?? {}),
          ...(newer.changes ?? {}),
        },
        previous:
          olderPrevious || newerPrevious
            ? { ...(newerPrevious ?? {}), ...(olderPrevious ?? {}) }
            : undefined,
        fromValue: event.fromValue ?? newer.fromValue,
        // The run's edges: its time stays the latest edit's, the window
        // reaches back from its oldest.
        mergedFrom: event.createdAt,
      };
    } else kept.push(event);
  }
  return kept;
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
// line at the end of the timeline saying how many conversations there were,
// the count opening the Mail tab, which lists them whole, rather than a list
// of its own that a narrow column cuts.
function EarlierMail({
  event,
  last,
  onOpenMail,
  now,
  timeZone,
}: {
  event: Data;
  last: boolean;
  onOpenMail?: (sourceKey: string) => void;
  now: number;
  timeZone: string;
}): ReactElement {
  const { text, language } = useCrmText();
  const count = Number((event.changes as Data | undefined)?.count) || 0;
  const label =
    count === 1
      ? text('feed.mail.conversationsOne')
      : text('feed.mail.conversations', { count });
  return (
    <li
      id={`feed-${toText(event.id)}`}
      className='relative flex scroll-mt-24 gap-3'
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
            {onOpenMail ? (
              <button
                type='button'
                className='shrink-0 font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline'
                onClick={() => onOpenMail('')}
              >
                {label}
              </button>
            ) : (
              <span className='shrink-0 font-medium text-muted-foreground'>
                {label}
              </span>
            )}
          </span>
          <time
            dateTime={toText(event.createdAt)}
            title={localDate(event.createdAt, language, timeZone)}
            className='shrink-0 self-start text-xs leading-[26px] text-muted-foreground/80 tabular-nums'
          >
            {relativeTime(event.createdAt, language, now, text('justNow'))}
          </time>
        </div>
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
  // timeline then shows whole below it, as a comment's text.
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
  const zone = meta?.settings.timeZone ?? DEFAULT_TIME_ZONE;
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
        // name: one that fits reads on the line, as a comment's text does; one
        // of several lines, or longer than the line, reads whole below it.
        <>
          {resultLong ? null : (
            <span aria-hidden className='shrink-0 text-muted-foreground'>
              ·
            </span>
          )}
          <CommentExcerpt
            value={toText(task.result)}
            long={resultLong}
            onLong={(long) => onResultLong?.(long)}
          />
        </>
      ) : null}
    </>
  );
}

// A comment's text, as its entry keeps it.
const commentText = (event: { changes?: unknown }): string =>
  toText((event.changes as Data | undefined)?.text ?? '');
// A comment deleted while it had replies: its place kept for them.
const commentGone = (event: { changes?: unknown }): boolean =>
  Boolean((event.changes as Data | undefined)?.deleted);
// The files attached to a comment, by id.
const commentFilesOf = (event: { changes?: unknown }): string[] =>
  arrayValues((event.changes as Data | undefined)?.attachments).map(toText);

// A comment's replies, under it at one level, oldest first, so the
// exchange reads in the order it took place, on a line as fine as the
// timeline's own between its icons: each on a line of its own as a comment
// reads (who, whom it answers, when, the text, folding when long), its
// author's edit and delete on its hover; the reply box at the thread's end,
// whichever it answers, opening anew for each (key). A long thread shows its
// first reply and its last, the ones between folded behind a line that
// unfolds them.
function CommentThread({
  entity,
  recordId,
  comment,
  replyingTo,
  onReply,
  onDone,
  now,
  timeZone,
}: {
  entity: Entity;
  recordId: string;
  comment: Data;
  // What is being answered: the comment, or one of its replies.
  replyingTo?: string;
  onReply: (id: string) => void;
  onDone: () => void;
  now: number;
  timeZone: string;
}): ReactElement | null {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const [editing, setEditing] = useState<string>();
  const [unfolded, setUnfolded] = useState(false);
  const replies = (
    Array.isArray(comment.replies) ? comment.replies : []
  ) as Data[];
  // How many between the first and the last are folded away.
  const folded = unfolded || replies.length <= 3 ? 0 : replies.length - 2;
  const shown = folded ? [replies[0], replies[replies.length - 1]] : replies;
  const commentId = toText(comment.id);
  // Answering the comment or one of its replies.
  const answering =
    replyingTo !== undefined &&
    (replyingTo === commentId ||
      replies.some((reply) => toText(reply.id) === replyingTo));
  if (!replies.length && !answering) return null;
  const name = (id: unknown): string =>
    meta?.users.find((user) => user.id === id)?.name ?? '';
  // Brings the message a reply answers into view and lights it up for a
  // few seconds, unfolding the replies when it is among the folded ones.
  const point = (id: string): void => {
    const at = replies.findIndex((reply) => toText(reply.id) === id);
    if (folded && at > 0 && at < replies.length - 1) setUnfolded(true);
    requestAnimationFrame(() => {
      const nodes = document.querySelectorAll<HTMLElement>(
        `[data-comment="${CSS.escape(id)}"]`,
      );
      nodes[0]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      flash(nodes);
    });
  };
  const box = (replyTo: string): ReactElement | null =>
    answering ? (
      <ReplyBox
        key={replyTo}
        entity={entity}
        recordId={recordId}
        replyTo={replyTo}
        onDone={onDone}
      />
    ) : null;
  return (
    // No gaps: each reply's top padding carries the line from the avatar
    // above to its own.
    <div className='grid'>
      {shown.map((reply, index) => {
        const replyId = toText(reply.id);
        return (
          <Fragment key={replyId}>
            {folded && index === 1 ? (
              <div className='relative pt-2 pl-8'>
                <ThreadLine />
                <button
                  type='button'
                  className='rounded-md py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline'
                  onClick={() => setUnfolded(true)}
                >
                  {text('comments.moreReplies', { count: folded })}
                </button>
              </div>
            ) : null}
            <div className='relative min-w-0 pt-2'>
              <ThreadLine part='above' />
              {index < shown.length - 1 || answering ? (
                <ThreadLine part='after' />
              ) : null}
              <div
                data-comment={replyId}
                className='group/reply -mx-1 rounded-md px-1'
              >
                <div className='flex min-h-[26px] items-center gap-2 text-sm'>
                  <CommentAvatar name={name(reply.actorId)} />
                  {/* Who wrote it, and whom it answers: the comment's
                      author, or the reply's above it. */}
                  <span className='min-w-0 flex-1 truncate'>
                    <span className='font-semibold'>{name(reply.actorId)}</span>{' '}
                    {/* Points out the message it answers. */}
                    <button
                      type='button'
                      className='text-muted-foreground hover:text-foreground hover:underline'
                      onClick={() =>
                        point(toText(reply.replyToId) || commentId)
                      }
                    >
                      {text('comments.replyTo', {
                        name: name(
                          (
                            replies.find(
                              (other) =>
                                toText(other.id) === toText(reply.replyToId),
                            ) ?? comment
                          ).actorId,
                        ),
                      })}
                    </button>
                  </span>
                  <CommentActions
                    id={replyId}
                    reply
                    onReply={() => onReply(replyId)}
                    onEdit={
                      reply.actorId === meta?.userId && !commentGone(reply)
                        ? () => setEditing(replyId)
                        : undefined
                    }
                  />
                  <time
                    dateTime={toText(reply.createdAt)}
                    title={localDate(reply.createdAt, language, timeZone)}
                    className='shrink-0 text-xs text-muted-foreground/80 tabular-nums'
                  >
                    {reply.editedAt && !commentGone(reply)
                      ? `${toText(text('comments.edited'))} · `
                      : ''}
                    {relativeTime(
                      reply.createdAt,
                      language,
                      now,
                      text('justNow'),
                    )}
                  </time>
                </div>
                {editing === replyId ? (
                  <CommentEditor
                    comment={reply}
                    onDone={() => setEditing(undefined)}
                  />
                ) : commentGone(reply) ? (
                  <div className='pl-8 text-sm text-muted-foreground'>
                    {text('comments.deleted')}
                  </div>
                ) : (
                  <div className='pl-8 text-sm'>
                    {commentText(reply) ? (
                      <FoldingText
                        value={markdownMentions(
                          commentText(reply),
                          (reply.changes as Data | undefined)?.mentions,
                          meta?.users ?? [],
                        )}
                      />
                    ) : null}
                    <CommentFiles ids={commentFilesOf(reply)} />
                  </div>
                )}
              </div>
            </div>
          </Fragment>
        );
      })}
      {answering ? (
        <div className='relative pt-2'>
          <ThreadLine part='box' />
          {box(replyingTo ?? commentId)}
        </div>
      ) : null}
    </div>
  );
}

// A comment's or a reply's author by their initials, above the thread's
// line.
function CommentAvatar({
  name,
  className = '',
}: {
  name: string;
  className?: string;
}): ReactElement {
  return (
    <span
      aria-hidden
      className={`relative grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[0.6875rem] font-medium text-muted-foreground ${className}`}
    >
      {initials(name)}
    </span>
  );
}

// The line through a thread's avatars, at their centre, the timeline's
// colour, drawn a piece per block so it follows whatever each one holds.
function ThreadLine({
  part = 'through',
}: {
  // `below` an avatar on the block's first line (the comment's), `above`
  // and `after` a reply's avatar under its top padding, `through` a block
  // with none (the comment's text, the folded replies' button).
  // `box` above the reply box's avatar, in the middle of its taller line.
  part?: 'below' | 'above' | 'after' | 'through' | 'box';
}): ReactElement {
  // Clear of the avatar by 6px, as the timeline's line is of its icons:
  // the avatar's middle is 13px down its line, its half spacing * 3.
  const place = {
    below: 'top-[calc(13px+var(--spacing)*3+6px)] bottom-0',
    above: 'top-0 h-[calc(13px-var(--spacing)*1-6px)]',
    after: 'top-[calc(var(--spacing)*5+19px)] bottom-0',
    through: 'inset-y-0',
    box: 'top-0 h-[calc(var(--spacing)*3.5-6px)]',
  }[part];
  return (
    <span
      aria-hidden
      className={`absolute left-3 w-px -translate-x-1/2 bg-border/50 ${place}`}
    />
  );
}

// The box answering a comment, under its thread: @ mentions a colleague,
// ⌘/Ctrl+Enter or Reply posts, Escape or Cancel leaves it.
function ReplyBox({
  entity,
  recordId,
  replyTo,
  onDone,
}: {
  entity: Entity;
  recordId: string;
  replyTo: string;
  onDone: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  // Empty: whom it answers is told as one who wrote in the thread, and the
  // reply says whom it answers; @ is for bringing someone else in.
  const [draft, setDraft] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const uploads = useCommentUploads(entity, recordId);
  const ready =
    (draft.trim() || uploads.files.length > 0) && !uploads.uploading;
  const post = async (): Promise<void> => {
    if (!ready || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await api(`${toText(entity)}/${toText(recordId)}/comments`, 'POST', {
        text: draft,
        mentions: mentionsIn(draft, mentions, meta?.users ?? []),
        replyTo,
        ...(uploads.files.length ? { attachments: uploads.files } : {}),
      });
      await refresh();
      onDone();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  };
  const me = meta?.users.find((user) => user.id === meta.userId)?.name ?? '';
  // As the comment box, a size down: the writer's initials before it, in
  // the thread's avatar column, the paperclip at its end, and below it the
  // shortcut, Cancel and Reply.
  return (
    <div className='grid gap-2'>
      <div className='flex items-start gap-2'>
        <span className='flex h-9 shrink-0 items-center'>
          <CommentAvatar name={me} />
        </span>
        <div className='relative min-w-0 flex-1'>
          <MentionTextarea
            autoFocus
            aria-label={text('comments.reply')}
            placeholder={text('comments.replyPlaceholder')}
            value={draft}
            maxLength={LONG_TEXT_LIMIT}
            rows={1}
            className='max-h-[50vh] min-h-9 resize-none pr-10 text-sm py-[calc((--spacing(9)-1lh-2px)/2)] bg-card shadow-xs border-border focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/10 data-dropping:border-ring data-dropping:ring-2 data-dropping:ring-ring/20 dark:bg-card'
            onChange={setDraft}
            mentions={mentions}
            onMentionsChange={setMentions}
            {...uploads.dropProps}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void post();
              } else if (event.key === 'Escape') onDone();
            }}
          />
          <span className='absolute top-1 right-1.5'>
            <AttachButton onPick={uploads.add} busy={uploads.uploading} />
          </span>
        </div>
      </div>
      <div className='grid gap-2 pl-8'>
        <CommentUploads uploads={uploads} />
        <div className='flex items-center justify-end gap-2'>
          <span className='mr-1 text-xs text-muted-foreground'>
            {text('comments.shortcut')}
          </span>
          <Button size='sm' variant='ghost' disabled={busy} onClick={onDone}>
            {text('cancel')}
          </Button>
          <Button
            size='sm'
            disabled={busy || !ready}
            onClick={() => void post()}
          >
            {text('comments.reply')}
          </Button>
        </div>
        <ErrorNotice error={error ?? uploads.error} />
      </div>
    </div>
  );
}

// A merge on the kept lead's timeline: the lead merged in, as it was, and
// what came over with it (server/providers/crm/lead-merge.ts).
function MergedLead({ changes }: { changes?: unknown }): ReactElement {
  const { text } = useCrmText();
  const values = (changes ?? {}) as Data;
  const lead = (values.lead ?? {}) as Data;
  const tasks = Number(values.tasks ?? 0);
  const comments = Number(values.comments ?? 0);
  return (
    <>
      <span className='min-w-0 truncate'>
        {[lead.name, lead.company].filter(Boolean).map(toText).join(' / ')}
      </span>
      {tasks || comments ? (
        <span className='shrink-0 text-xs text-muted-foreground'>
          {text('feed.mergedMoved', { tasks, comments })}
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
  // A comment's entries by what they concern, as files' are: added, edited or
  // removed, all under the comment.
  comment: MessageSquareText,
  commentEdited: MessageSquareText,
  commentDeleted: MessageSquareText,
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
  const paneFocus = useRecordDrawer()?.focus;
  const focus = focusId ?? paneFocus ?? searchParams.get('focus') ?? undefined;
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
  const timeZone = meta?.settings.timeZone ?? DEFAULT_TIME_ZONE;
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
    `attachments?ids=${encodeURIComponent(fileIds.join(','))}`,
    fileIds.length > 0,
  );
  const fileNames = Object.fromEntries(
    (files ?? []).map((file) => [file.id, file.filename]),
  );
  // Bring the entry asked for into view, and light it up, once it has
  // loaded: the pages
  // before it loaded first, and again on each ask. The entries above it
  // settle after it first lands (a comment measured whole or to its line,
  // files named, a card opened), which moves it; it is brought back twice
  // more as they do.
  const loaded = more.records.some((event) => toText(event.id) === focus);
  useEffect(() => {
    if (!focus || !loaded) return;
    // Moved only when it is not already in sight: its first line showing,
    // not under the comment box, in the upper part of the screen. A page
    // already showing it stays still rather than shift by a little.
    const bring = (): void => {
      const node = document.getElementById(`feed-${focus}`);
      if (!node) return;
      const { left, top } = node.getBoundingClientRect();
      const seen =
        top >= 0 &&
        top < window.innerHeight * 0.6 &&
        node.contains(document.elementFromPoint(left + 12, top + 12));
      if (!seen) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    bring();
    // Lit up once as it arrives, whether it moved or was already in sight:
    // a comment's own message, as a reply's pointer lights it, since its
    // card's white would cover the entry's; any other entry whole.
    const node = document.getElementById(`feed-${focus}`);
    const message = node?.querySelector(
      `[data-comment="${CSS.escape(focus)}"]`,
    );
    if (node) flash([message ?? node]);
    const settled = window.setTimeout(bring, 400);
    const later = window.setTimeout(bring, 1200);
    return () => {
      window.clearTimeout(settled);
      window.clearTimeout(later);
    };
  }, [focus, loaded, focusAt]);
  useEffect(() => {
    if (focus && !loaded && more.hasMore && !more.loading) void more.loadMore();
  }, [focus, loaded, more]);
  const allNames = { ...names, ...more.titles };
  // The comments read whole below their line (several lines, or too long for
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
  // The comment or reply being answered.
  const [replyingTo, setReplyingTo] = useState<string>();
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
  // A comment's edits show on the comment itself, marked edited, not as entries.
  const shown = collapseEdits(
    more.records.filter((event) => event.action !== 'commentEdited'),
  );
  return (
    <>
      {/* A comment is written here, atop the timeline, and reads
          whole in it: there is no Comments tab. */}
      <CommentComposer entity={entity} id={id} />
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
                  // A comment: its text whole under its line, as it now reads,
                  // marked edited. Its edits are not entries of their own
                  // here; its removal says that it happened, without the
                  // text.
                  const comment = event.action === 'comment';
                  // What closed it, read under its line as a comment's text
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
                  const closingText =
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
                  // A task's AI preparation for its owner
                  // (task-preparation.tsx).
                  const prep = ai && entity === 'tasks';
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
                  // Comments are cards, people talking set apart from the
                  // activity around them.
                  // A comment with replies joins its author's avatar to
                  // theirs by one line.
                  const replyIds = Array.isArray(event.replies)
                    ? (event.replies as Data[]).map((reply) => toText(reply.id))
                    : [];
                  const threaded =
                    comment &&
                    (replyIds.length > 0 ||
                      replyingTo === key ||
                      (replyingTo !== undefined &&
                        replyIds.includes(replyingTo)));
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
                        className={`min-w-0 flex-1 ${
                          comment
                            ? // A comment, with its replies, on a card of its
                              // own: people talking, set apart from activity.
                              'mb-3 rounded-xl border border-border bg-card px-3 py-2 shadow-xs'
                            : // An entry the page was sent to is scrolled
                              // to, not marked.
                              'pb-3'
                        }`}
                      >
                        <div
                          data-comment={comment ? key : undefined}
                          className='group/comment relative flex min-h-[26px] items-center gap-3 text-sm'
                        >
                          {threaded ? <ThreadLine part='below' /> : null}
                          {/* An entry is one line, never wrapped: what is
                              long (a change's values, a comment's excerpt, a
                              verdict) gives way instead, cut where the line
                              ends. */}
                          {/* Clipped at its end: on a narrow column (a
                              drawer's) nothing runs into the time. */}
                          <span className='flex min-w-0 flex-1 items-center gap-x-1.5 overflow-hidden whitespace-nowrap'>
                            {/* A comment's author by their initials, as
                                each reply's under it. */}
                            {comment ? (
                              <CommentAvatar
                                name={
                                  meta?.users.find(
                                    (u) => u.id === event.actorId,
                                  )?.name ?? ''
                                }
                                className='mr-0.5'
                              />
                            ) : null}
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
                                          : prep
                                            ? 'feed.preparing'
                                            : 'feed.evaluating'
                                        : event.aiStatus === 'failed'
                                          ? review
                                            ? 'feed.reviewFailed'
                                            : prep
                                              ? 'feed.prepareFailed'
                                              : 'feed.evaluationFailed'
                                          : review
                                            ? 'feed.reviewed'
                                            : prep
                                              ? 'feed.prepared'
                                              : 'feed.evaluated',
                                    )
                                  : // A comment is its text, right after who
                                    // wrote it, with no word before it.
                                    filesOnly(event) || comment
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
                            ) : prep && event.aiStatus !== 'failed' ? (
                              <PrepFeedEntry entry={event} />
                            ) : ai && event.aiStatus !== 'failed' ? (
                              <EvaluationFeedEntry entry={event} />
                            ) : null}
                            {/* A creation says only that it happened: the
                                values it started with are the record's own
                                first state. */}
                            {!ai &&
                              !comment &&
                              event.action !== 'created' &&
                              !toText(event.action).startsWith('comment') &&
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
                            {/* A comment that fits reads on its line right
                                after who wrote it; one of several lines, or
                                longer than the line, reads whole below it,
                                as Clarify shows a comment. */}
                            {comment && commentGone(event) ? (
                              <span className='text-muted-foreground'>
                                {text('comments.deleted')}
                              </span>
                            ) : comment ? (
                              <CommentExcerpt
                                value={commentText(event)}
                                mentions={
                                  (event.changes as Data | undefined)?.mentions
                                }
                                long={longNotes.has(key)}
                                onLong={(long) => markLong(key, long)}
                              />
                            ) : null}
                            {event.action === 'aiRevise' ? (
                              <span className='min-w-0 truncate'>
                                「{commentText(event).replace(/\s+/g, ' ')}」
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
                              <FoldToggle
                                open={open}
                                onToggle={() => toggle(key)}
                              />
                            )}
                          </span>
                          {/* Reply for anyone; its author's edit and delete,
                              on hover. */}
                          {comment ? (
                            <CommentActions
                              id={key}
                              onReply={() => setReplyingTo(key)}
                              onEdit={
                                event.actorId === meta?.userId &&
                                !commentGone(event)
                                  ? () => setEditingNote(key)
                                  : undefined
                              }
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
                            {/* An edited comment says so right before its
                                time, the edit's time on hover. */}
                            {comment && event.editedAt ? (
                              <span
                                title={localDate(
                                  event.editedAt,
                                  language,
                                  timeZone,
                                )}
                              >
                                {text('comments.edited')} ·{' '}
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
                        {closingText ? (
                          <div className='mt-0.5 text-sm'>
                            <FoldingText value={closingText} />
                          </div>
                        ) : null}
                        {/* A task's result too long for its line, whole
                            below it as a comment's text is. */}
                        {taskEvent &&
                        longNotes.has(key) &&
                        toText((event.task as Data | undefined)?.result) ? (
                          <div className='mt-0.5 text-sm'>
                            <FoldingText
                              value={toText((event.task as Data).result)}
                            />
                          </div>
                        ) : null}
                        {comment && editingNote === key ? (
                          <CommentEditor
                            comment={event}
                            onDone={() => setEditingNote(undefined)}
                          />
                        ) : comment &&
                          longNotes.has(key) &&
                          !commentGone(event) ? (
                          // Too long for its line, whole under who wrote it,
                          // in line with the replies' text.
                          <div
                            data-comment={key}
                            className='relative pt-0.5 pl-8 text-sm'
                          >
                            {threaded ? <ThreadLine /> : null}
                            {/* As the original message: five lines fading
                                out, a click unfolding them. */}
                            <FoldingText
                              value={markdownMentions(
                                commentText(event),
                                (event.changes as Data | undefined)?.mentions,
                                meta?.users ?? [],
                              )}
                            />
                          </div>
                        ) : null}
                        {/* Its files, under its text, in line with it. */}
                        {comment &&
                        editingNote !== key &&
                        !commentGone(event) &&
                        commentFilesOf(event).length ? (
                          <div data-comment={key} className='relative pl-8'>
                            {threaded ? <ThreadLine /> : null}
                            <CommentFiles ids={commentFilesOf(event)} />
                          </div>
                        ) : null}
                        {comment ? (
                          <CommentThread
                            entity={entity}
                            recordId={id}
                            comment={event}
                            replyingTo={replyingTo}
                            onReply={setReplyingTo}
                            onDone={() => setReplyingTo(undefined)}
                            now={now}
                            timeZone={timeZone}
                          />
                        ) : null}
                        {/* A waiting verdict is handled here once opened; any
                            other evaluation is its record. */}
                        {prep && open && event.aiStatus !== 'running' ? (
                          <div className='mt-1'>
                            <PrepPanel
                              entry={
                                {
                                  id: key,
                                  recordId: id,
                                  status: toText(event.aiStatus),
                                  createdAt: toText(event.createdAt),
                                  ai: event.ai,
                                } as PrepEntry
                              }
                              task={record}
                              onChanged={refresh}
                              inFeed
                            />
                          </div>
                        ) : review && open && event.aiStatus !== 'running' ? (
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
                              inFeed
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
                              inFeed
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
                              inFeed
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
                          !comment &&
                          event.action !== 'created' &&
                          !toText(event.action).startsWith('comment') &&
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
      {/* Sent to an entry, room under the timeline for it to come to the
          top however few entries follow it; there is none otherwise. */}
      {focus && loaded ? <div aria-hidden className='h-[70vh]' /> : null}
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

// The comment box atop a record's timeline. Anyone who may read the record may
// add a comment, which everyone who may read it sees; Ctrl/⌘+Enter adds it.
function CommentComposer({
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
  const uploads = useCommentUploads(entity, id);
  const ready =
    (draft.trim() || uploads.files.length > 0) && !uploads.uploading;
  const add = async (): Promise<void> => {
    if (!ready || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await api(`${toText(entity)}/${toText(id)}/comments`, 'POST', {
        text: draft,
        mentions: mentionsIn(draft, mentions, meta?.users ?? []),
        ...(uploads.files.length ? { attachments: uploads.files } : {}),
      });
      setDraft('');
      setMentions([]);
      uploads.clear();
      await refresh();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  };
  const me = meta?.users.find((user) => user.id === meta.userId)?.name ?? '';
  return (
    // Stays under the tabs as the timeline scrolls: stacked, right under
    // the sticky tab bar, whose height DetailColumns measures; side by side,
    // atop the tab's own scrolling content. On the page's background, its
    // gap below its own so entries pass under it.
    <div className='sticky top-[var(--crm-tabs-h,3.75rem)] z-[9] grid gap-2 bg-background pb-5 @3xl:top-0'>
      {/* The writer's avatar before the box, drawn as the account menu's:
          the first letter of each of the name's first two words. */}
      <div className='flex items-start gap-3'>
        <span
          aria-hidden
          className='grid size-10 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium text-muted-foreground'
        >
          {initials(me)}
        </span>
        {/* @ and a name mentions a colleague, who is told; files dropped
            or pasted into it are attached, as its paperclip picks them. */}
        <div className='relative min-w-0 flex-1'>
          <MentionTextarea
            {...uploads.dropProps}
            aria-label={text('comments.label')}
            value={draft}
            mentions={mentions}
            onMentionsChange={setMentions}
            placeholder={text('comments.placeholder')}
            maxLength={LONG_TEXT_LIMIT}
            // One line until more is written, as tall as the avatar beside
            // it, then as tall as the text (the primitive sizes to its
            // content), up to half the screen; the line centred in that
            // height. White with the card's faint border and shadow, and a
            // soft ring when focused rather than the primitive's grey one.
            rows={1}
            className='max-h-[50vh] min-h-10 resize-none pr-10 text-sm py-[calc((--spacing(10)-1lh-2px)/2)] bg-card shadow-xs border-border focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/10 data-dropping:border-ring data-dropping:ring-2 data-dropping:ring-ring/20 dark:bg-card'
            onChange={setDraft}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void add();
              }
            }}
          />
          {/* The paperclip at the box's end, on its first line. */}
          <span className='absolute top-[calc((--spacing(10)-var(--spacing)*7)/2)] right-1.5'>
            <AttachButton onPick={uploads.add} busy={uploads.uploading} />
          </span>
        </div>
      </div>
      <div className='pl-13'>
        <CommentUploads uploads={uploads} />
      </div>
      {draft.trim() || uploads.files.length ? (
        <div className='flex items-center justify-end gap-3'>
          <span className='text-xs text-muted-foreground'>
            {text('comments.shortcut')}
          </span>
          <Button
            size='sm'
            disabled={busy || !ready}
            onClick={() => void add()}
          >
            {text('comments.post')}
          </Button>
        </div>
      ) : null}
      <ErrorNotice error={error ?? uploads.error} />
    </div>
  );
}

// A comment's text on its entry's line. It tells the timeline whether it is
// long (several lines, or wider than the line), which then shows it whole
// below and keeps this in place, unseen, to measure the line again as it
// widens or narrows.
function CommentExcerpt({
  value,
  long,
  onLong,
  mentions,
}: {
  value: string;
  // The colleagues the comment mentions, picked out in bold.
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

// A comment's author's edit and delete, on the entry's line while it is
// hovered or focused, centred on its first line (26px, as the time is);
// delete asks once more.
function CommentActions({
  id,
  onEdit,
  onReply,
  reply = false,
}: {
  id: string;
  // Its author's edit and delete; absent for anyone else, and for a deleted
  // comment's place.
  onEdit?: () => void;
  // Answering it, which anyone who reads the record may.
  onReply?: () => void;
  // In a thread, shown on the reply's own hover rather than the comment's.
  reply?: boolean;
}): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  return (
    <span
      className={`flex h-[26px] shrink-0 items-center gap-0.5 self-start transition-opacity focus-within:opacity-100 ${
        reply
          ? 'group-hover/reply:opacity-100'
          : 'group-hover/comment:opacity-100'
      } ${confirming ? 'opacity-100' : 'opacity-0'}`}
    >
      {onReply ? (
        <Button
          size='icon-xs'
          variant='ghost'
          aria-label={text('comments.reply')}
          title={text('comments.reply')}
          disabled={busy}
          onClick={onReply}
        >
          <Reply />
        </Button>
      ) : null}
      {onEdit ? (
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
      ) : null}
      {onEdit ? (
        <Button
          size={confirming ? 'xs' : 'icon-xs'}
          variant={confirming ? 'destructive' : 'ghost'}
          aria-label={text(confirming ? 'comments.confirmDelete' : 'delete')}
          title={text('delete')}
          disabled={busy}
          onClick={() => {
            if (!confirming) {
              setConfirming(true);
              return;
            }
            setBusy(true);
            setError(undefined);
            api(`comments/${toText(id)}`, 'DELETE')
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
          {confirming ? text('comments.confirmDelete') : null}
        </Button>
      ) : null}
      {error ? <ErrorNotice error={error} /> : null}
    </span>
  );
}

// A comment changed in place by its author, under its line.
function CommentEditor({
  comment,
  onDone,
}: {
  comment: Data;
  onDone: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const { data: meta } = useMetadata();
  const [draft, setDraft] = useState(() => commentText(comment));
  const [mentions, setMentions] = useState<string[]>(() => {
    const kept = (comment.changes as Data | undefined)?.mentions;
    return Array.isArray(kept) ? kept.map(toText) : [];
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  // Its files as they stand, to take some away or add more.
  const uploads = useCommentUploads(
    toText(comment.entity) as Entity,
    toText(comment.recordId),
    commentFilesOf(comment),
  );
  const ready =
    (draft.trim() || uploads.files.length > 0) && !uploads.uploading;
  return (
    <div className='mt-1 grid gap-2'>
      <MentionTextarea
        {...uploads.dropProps}
        autoFocus
        aria-label={text('comments.label')}
        value={draft}
        maxLength={LONG_TEXT_LIMIT}
        className='max-h-[50vh] min-h-10 resize-none text-sm py-[calc((--spacing(10)-1lh-2px)/2)] bg-card shadow-xs border-border focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/10 data-dropping:border-ring data-dropping:ring-2 data-dropping:ring-ring/20 dark:bg-card'
        onChange={setDraft}
        mentions={mentions}
        onMentionsChange={setMentions}
      />
      <CommentUploads uploads={uploads} />
      <div className='flex items-center gap-2'>
        <AttachButton onPick={uploads.add} busy={uploads.uploading} />
        <Button size='sm' variant='ghost' className='ml-auto' onClick={onDone}>
          {text('cancel')}
        </Button>
        <Button
          size='sm'
          disabled={busy || !ready}
          onClick={() => {
            setBusy(true);
            setError(undefined);
            api(`comments/${toText(comment.id)}`, 'PATCH', {
              text: draft,
              mentions: mentionsIn(draft, mentions, meta?.users ?? []),
              attachments: uploads.files,
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
      <ErrorNotice error={error ?? uploads.error} />
    </div>
  );
}

// The files a box holds while it is written, each to take away again, and
// a word while more are on their way up.
function CommentUploads({
  uploads,
}: {
  uploads: ReturnType<typeof useCommentUploads>;
}): ReactElement | null {
  const { text } = useCrmText();
  if (!uploads.files.length && !uploads.uploading) return null;
  return (
    <div>
      <CommentFiles ids={uploads.files} onRemove={uploads.remove} />
      {uploads.uploading ? (
        <p className='mt-1 text-xs text-muted-foreground'>
          {text('comments.uploading')}
        </p>
      ) : null}
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
      className={`rounded-xl border border-border bg-card px-2 shadow-xs ${
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

// A small action a particular's row shows on hover (copy; a website's
// edit): a white square with the cards' faint border, its icon muted,
// centred on the row's first line (the value's 1.5 of padding and half a
// line, less half its own 6).
const ROW_ACTION =
  'top-[calc(var(--spacing)*1.5+0.5lh-var(--spacing)*3)] size-6 place-items-center rounded-md bg-card text-muted-foreground shadow-xs ring-1 ring-border transition-colors hover:text-foreground';

// A value a button on hover copies as it reads (a particular, a lead's
// original message): not while it is empty (a placeholder or a dash,
// marked data-placeholder) or being edited.
export function Copyable({ children }: { children: ReactNode }): ReactElement {
  const { text } = useCrmText();
  const valueRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = (): void => {
    const element = valueRef.current;
    // What the value says to copy (a website's whole address, where it
    // reads as its domain), else it as it reads (innerText keeps its line
    // breaks), else its text.
    const value = (
      element?.querySelector('[data-copy]')?.getAttribute('data-copy') ??
      element?.innerText ??
      element?.textContent ??
      ''
    ).trim();
    if (!value) return;
    void navigator.clipboard
      ?.writeText(value)
      .then(() => setCopied(true))
      .catch(() => undefined);
  };
  return (
    <div className='group/row relative min-w-0'>
      <div ref={valueRef}>{children}</div>
      <button
        type='button'
        aria-label={toText(text(copied ? 'copiedValue' : 'copyValue'))}
        title={toText(text(copied ? 'copiedValue' : 'copyValue'))}
        onClick={copy}
        className={`absolute right-1 hidden group-focus-within/row:grid group-hover/row:grid group-has-[[data-placeholder]]/row:hidden! group-has-[input]/row:hidden! group-has-[textarea]/row:hidden! ${ROW_ACTION}`}
      >
        {copied ? (
          <Check aria-hidden className='size-3.5' />
        ) : (
          <Copy aria-hidden className='size-3.5' />
        )}
      </button>
    </div>
  );
}

// A row of a record's particulars: the field's icon and label, then the
// value (an inline editor, a status, a time), copied from a button on
// hover (Copyable).
// A particular's label on one line: cut where its column ends, and then
// shown whole in a tooltip; a label that fits has none.
function RowLabel({ label }: { label: string }): ReactElement {
  const ref = useRef<HTMLSpanElement>(null);
  const [cut, setCut] = useState(false);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof ResizeObserver === 'undefined') return;
    // Observing calls back at once, then whenever the column resizes.
    const observer = new ResizeObserver(() =>
      setCut(node.scrollWidth > node.clientWidth + 1),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [label]);
  return (
    <Tooltip disabled={!cut}>
      <TooltipTrigger
        render={<span ref={ref} className='min-w-0 truncate leading-snug' />}
      >
        {label}
      </TooltipTrigger>
      <TooltipContent side='top' align='start'>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

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
    // The label on one line, cut with an ellipsis where its column ends
    // (whole in a tooltip then), so every row keeps one height.
    <div className='grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-2'>
      <dt className='flex min-w-0 items-center gap-1.5 px-2 py-1.5 text-sm text-muted-foreground'>
        <FieldIcon field={field} />
        <RowLabel label={label} />
      </dt>
      <dd className='min-w-0 text-sm'>
        <Copyable>{children}</Copyable>
      </dd>
    </div>
  );
}

// When the record was created and last changed, read only, closing its
// first group of particulars; the timeline tells what happened in between.
export function RecordTimes({ record }: { record: CrmRecord }): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const timeZone = meta?.settings.timeZone ?? DEFAULT_TIME_ZONE;
  return (
    <>
      {(['createdAt', 'updatedAt'] as const).map((key) => (
        <InfoRow key={key} field={key} label={text(`fields.${key}`)}>
          <div className='px-2 py-1.5 text-sm tabular-nums'>
            {localDate(record[key], language, timeZone)}
          </div>
        </InfoRow>
      ))}
    </>
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
