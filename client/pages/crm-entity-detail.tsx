import { recordTitle } from '../components/crm/lookups.js';
import { TaskCards } from '../components/crm/task-list.js';
import { AutoLoadMore } from '../components/crm/auto-load.js';
import { toText, useMore } from '../components/crm/api.js';
import {
  useState,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Link, useNavigate } from 'react-router';
import {
  resolveTab,
  useDetailTab,
  useRecordDrawer,
  useRecordLink,
} from '../components/crm/record-drawer.js';
import {
  ArrowUpRight,
  Clock,
  UserRound,
  History,
  Mail,
  Paperclip,
  Plus,
  Star,
  Trash2,
  Handshake,
  ListChecks,
  Radar,
  Ellipsis,
  X,
  type LucideIcon,
  SquareCheckBig,
  Check,
  ShieldCheck,
  User,
} from 'lucide-react';
import { KindTag } from '../components/crm/kind-tag.js';
import { Badge } from '../components/ui/badge.js';
import { Button, buttonVariants } from '../components/ui/button.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table.js';
import {
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useMetadata,
  useRefresh,
  fieldLabelKey,
  localDate,
  rows,
  type CrmRecord,
  type Data,
  type Detail,
  type Entity,
  type Field,
} from '../components/crm/api.js';
import {
  CrmFrame,
  ErrorNotice,
  Loading,
  RecordLink,
  Status,
  Value,
} from '../components/crm/common.js';
import { InlineField } from '../components/crm/inline.js';
import { useAnnounceRecord } from '../components/crm/current-record.js';
import { useRecordBreadcrumb } from '../components/crm/record-breadcrumb.js';
import {
  EvaluateButton,
  EvaluationStatus,
} from '../components/crm/lead-evaluation.js';
import { useFollowUpRequest } from '../components/crm/follow-up-request.js';
import { LocationField } from '../components/crm/location-field.js';
import { ReviewStatus } from '../components/crm/approval-review.js';
import { Choice, RecordForm } from '../components/crm/form.js';
import { StageField } from '../components/crm/reasons.js';
import { ApprovalActions } from '../components/crm/approval-actions.js';
import {
  AfterSlash,
  ConfirmDialog,
  DetailColumns,
  DetailTabBar,
  MailCount,
  HistoryFeed,
  TabHeading,
  InfoGroup,
  InfoRow,
  RecordAttachments,
  WebsiteField,
} from './crm-detail.js';
import { UploadZone } from '../components/crm/attachments.js';
import { RecordOutcomeDialog } from '../components/crm/outcome.js';
import { RecordMailPanel } from '../components/crm/record-mail.js';
import { emailsOf, useMailSetup } from '../components/crm/mail.js';
import {
  domainOf,
  type MailTarget,
} from '../../server/providers/crm/mail-target.js';

// The company a contact or a deal belongs to, in the title line.
function CompanyCrumb({
  id,
  name,
}: {
  id: string;
  name: string;
}): ReactElement {
  const link = useRecordLink('companies', id);
  return (
    <Link className='px-2 hover:text-primary hover:underline' {...link}>
      {name}
    </Link>
  );
}

export default function EntityDetail({
  entity,
  id,
}: {
  entity: Entity;
  id: string;
}): ReactElement {
  const {
    data: detail,
    error: loadError,
    isLoading,
  } = useCrmQuery<Detail>(`${toText(entity)}/${toText(id)}`);
  const { data: meta } = useMetadata();
  const mailSetup = useMailSetup();
  // The objects whose people mail is exchanged with.
  const mailEntity = ['companies', 'contacts', 'opportunities'].includes(
    entity,
  );
  const api = useCrmApi();
  const refresh = useRefresh();
  const navigate = useNavigate();
  const drawer = useRecordDrawer();
  const { text } = useCrmText();
  // The tab the address names (…/contacts), resolved once the page knows
  // which tabs it shows; an address naming another opens the first.
  const [tabSlug, setTab] = useDetailTab();
  // The conversation a timeline mail entry opens on the Mail tab.
  const [mailFocus, setMailFocus] = useState<string>();
  // The AI entry the timeline was opened at (a deal's latest follow-up).
  const [focus, setFocus] = useState<{ id: string; at: number }>();
  // The related lists and the history arrive one page each with the
  // record; these grow them from the list and history endpoints.
  const linkParam =
    entity === 'leads'
      ? `leadId=${toText(id)}`
      : entity === 'companies'
        ? `companyId=${toText(id)}`
        : entity === 'contacts'
          ? `contactId=${toText(id)}`
          : entity === 'opportunities'
            ? `opportunityId=${toText(id)}`
            : '';
  const firstPage = (name: Entity) =>
    detail?.related[name]
      ? {
          data: rows(detail.related[name]) as CrmRecord[],
          total:
            detail.relatedTotals?.[name] ?? rows(detail.related[name]).length,
        }
      : undefined;
  const moreTasks = useMore(
    `tasks?${linkParam}&sort=dueAt`,
    firstPage('tasks'),
  );
  const moreApprovals = useMore(
    `approvals?opportunityId=${toText(id)}`,
    firstPage('approvals'),
  );
  const [uploading, setUploading] = useState(false);
  // The form to open, with the names of the records it starts linked to.
  const [form, setForm] = useState<{
    entity: Entity;
    initial: Data;
    titles?: Record<string, string>;
  }>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  // A planned task's outcome being recorded.
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<unknown>();
  // A deal's company change waiting for the user to confirm it takes the
  // deal's contacts off (see changeCompany below).
  const [companyMove, setCompanyMove] = useState<{
    companyId: unknown;
    resolve: () => void;
    reject: (cause: unknown) => void;
  }>();
  const [moving, setMoving] = useState(false);
  const [busy, setBusy] = useState(false);
  // The record's title, for the assistant: a question asked from the dock on
  // this page starts its conversation from the record (current-record.ts);
  // not from the drawer, whose backdrop covers the dock.
  const contextName = detail
    ? recordTitle(entity, detail.record, detail.titles)
    : undefined;
  useAnnounceRecord(
    detail && !drawer?.inDrawer
      ? { entity, recordId: id, name: contextName }
      : undefined,
  );
  useRecordBreadcrumb(entity, !drawer?.inDrawer);
  // Asking the AI to follow an open deal up, for whoever may edit it: a
  // button before the first suggestion, then in "More".
  const followUp = useFollowUpRequest(
    'opportunities',
    id,
    setError,
    entity === 'opportunities' &&
      Boolean(detail?.permissions.edit) &&
      !['won', 'lost'].includes(toText(detail?.record.stage)),
  );
  if (isLoading || !meta) return <Loading />;
  if (!detail)
    return (
      <CrmFrame title={text(`entities.${toText(entity)}`)}>
        <ErrorNotice error={loadError} />
      </CrmFrame>
    );
  const record = detail.record;
  const definition = meta.definitions[entity];
  const editable = detail.permissions.edit;
  // Names for everything this page links to, resolved by the server with
  // the record: composed titles for links, bare names for people listed
  // under their own company.
  const names = {
    ...detail.titles,
    ...moreTasks.titles,
    ...moreApprovals.titles,
  };
  const bareNames = detail.names;
  const title = recordTitle(entity, record, names);
  const field = (key: string): Field =>
    definition.fields.find((f) => f.key === key) ?? { key, type: 'text' };
  const patch = async (values: Data): Promise<void> => {
    await api(`${toText(entity)}/${toText(id)}`, 'PATCH', values);
    await refresh();
  };
  // Moving a deal to another company takes its contacts off it: they are
  // the old company's people. The move is confirmed first, naming them, and
  // saved with the empty list in one request. A deal with tasks goes
  // straight to the server, which refuses the move and says why.
  const dealContacts =
    entity === 'opportunities' && Array.isArray(record.contacts)
      ? (record.contacts as { contactId?: unknown }[])
      : [];
  const changeCompany = (companyId: unknown): Promise<void> =>
    dealContacts.length && !moreTasks.total
      ? new Promise((resolve, reject) => {
          setCompanyMove({ companyId, resolve, reject });
        })
      : patch({ companyId });
  const confirmCompanyMove = async (): Promise<void> => {
    if (!companyMove) return;
    setMoving(true);
    try {
      await patch({ companyId: companyMove.companyId, contacts: [] });
      companyMove.resolve();
    } catch (cause) {
      companyMove.reject(cause);
    } finally {
      setMoving(false);
      setCompanyMove(undefined);
    }
  };
  const inline = (key: string): ReactElement => (
    <InlineField
      entity={entity}
      record={record}
      field={field(key)}
      editable={editable}
      lookup={names}
      relationFilter={
        record.companyId ? { companyId: toText(record.companyId) } : undefined
      }
      label={text(fieldLabelKey(entity, key))}
      hint
      // A long text previews here and opens beside the column.
      longText='popover'
      onSave={
        entity === 'opportunities' && key === 'companyId'
          ? changeCompany
          : undefined
      }
    />
  );
  const convertedFrom = rows(detail.related.leads) as CrmRecord[];
  // Newest first, in the server's order, so pages join up.
  const approvals = moreApprovals.records;
  const tasks = moreTasks.records;
  const linkedOpportunities = rows(detail.related.opportunities);
  // A contact has no attachments field of its own: its tab only gathers the
  // files on the tasks and opportunities it takes part in.
  const hasOwnFiles = definition.fields.some((f) => f.key === 'attachments');
  const attachmentCount = new Set([
    ...rows(record.attachments as unknown[]).map(toText),
    ...tasks.flatMap((a) => rows(a.attachments as unknown[]).map(toText)),
    ...linkedOpportunities.flatMap((o) =>
      rows(o.attachments as unknown[]).map(toText),
    ),
    ...approvals.flatMap((a) => rows(a.attachments as unknown[]).map(toText)),
  ]).size;
  const statusKey = definition.statusField;
  const currentStatus = statusKey ? toText(record[statusKey]) : '';
  // A won or lost deal: nothing left for the AI to follow up.
  const closedDeal =
    entity === 'opportunities' &&
    (currentStatus === 'won' || currentStatus === 'lost');
  // Which related lists this object has, beyond tasks.
  const relatedTabs = (
    entity === 'companies'
      ? (['contacts', 'opportunities'] as const)
      : entity === 'contacts'
        ? (['opportunities'] as const)
        : entity === 'opportunities'
          ? (['approvals'] as const)
          : ([] as const)
  ).filter((name) => detail.related[name] !== undefined);
  // The timeline first, where the record opens: what happened to it,
  // people's changes and the AI's work alike.
  const tabs: [string, string, number][] = [
    ['historyTab', 'historyTab', detail.historyTotal ?? detail.history.length],
    // A contact has no tasks of its own: a task concerns a lead, an
    // company or a deal.
    ...(entity !== 'tasks' && entity !== 'approvals' && entity !== 'contacts'
      ? [
          ['tasks', 'entities.tasks', moreTasks.total] as [
            string,
            string,
            number,
          ],
        ]
      : []),
    // The reader's own mail with the record, for whoever has mail, right after
    // the tasks (first after the timeline on a contact, which has none).
    ...(mailSetup.can && mailEntity
      ? [['mail', 'mail.tab', 0] as [string, string, number]]
      : []),
    // The opportunity's own contact list with roles, a tab like its others.
    ...(entity === 'opportunities'
      ? [
          [
            'opportunityContacts',
            'entities.contacts',
            rows(record.contacts).length,
          ] as [string, string, number],
        ]
      : []),
    ...relatedTabs.map(
      (name) =>
        [
          name,
          `entities.${name}`,
          detail.relatedTotals?.[name] ?? rows(detail.related[name]).length,
        ] as [string, string, number],
    ),
    // Attachments last, on every record that has them. A contact keeps no
    // files of its own; the ones it appears in are read from the task or
    // opportunity that holds them.
    ...(hasOwnFiles
      ? [
          ['attachments', 'fields.attachments', attachmentCount] as [
            string,
            string,
            number,
          ],
        ]
      : []),
  ];
  const activeTab =
    resolveTab(
      tabSlug,
      tabs.map(([name]) => name),
    ) ?? tabs[0][0];
  const blockerEntries = Object.entries(detail.blockers ?? {}).filter(
    ([, n]) => Number(n) > 0,
  ) as [Entity, number][];
  // A company's tasks go the way a lead's do: those anchored only here
  // are deleted with it, those also on a lead or opportunity are kept and
  // unlinked. The dialog states both counts so nothing is a surprise.
  const cascades = entity === 'companies' || entity === 'opportunities';
  const otherAnchors = (a: Data): boolean =>
    entity === 'companies'
      ? Boolean(a.leadId || a.opportunityId)
      : Boolean(a.leadId || a.companyId);
  const cascadedTasks = cascades ? tasks.filter((a) => !otherAnchors(a)) : [];
  const keptTasks = cascades ? tasks.filter(otherAnchors) : [];
  const relatedInput: Data =
    entity === 'companies'
      ? { companyId: id }
      : entity === 'contacts'
        ? {
            companyId: record.companyId,
            contacts: [{ contactId: id, role: 'other' }],
          }
        : entity === 'opportunities'
          ? { companyId: record.companyId, opportunityId: id }
          : {};
  // Where the Mail tab looks: a contact's address; a company's domain and
  // its contacts' addresses; a deal's contacts' addresses (or, while it
  // names none, its company's people). What is sent from the tab is logged
  // as a task linked as one created here is.
  const relatedContacts = rows(detail.related.contacts);
  const dealContactIds = new Set(
    rows(record.contacts).map((row) => toText(row.contactId)),
  );
  const mailTarget: MailTarget =
    entity === 'companies'
      ? {
          addresses: emailsOf(relatedContacts),
          domain: domainOf(record.website),
        }
      : entity === 'opportunities'
        ? {
            addresses: emailsOf(
              dealContactIds.size
                ? relatedContacts.filter((c) =>
                    dealContactIds.has(toText(c.id)),
                  )
                : relatedContacts,
            ),
          }
        : { addresses: emailsOf([record]) };
  // What the active tab shows, in the right column.
  // Atop the particulars, where the AI stands on the record, opening it in
  // the timeline:
  // a deal's latest follow-up, or an approval's review for its approver
  // (approval-review.tsx), which advises only; the decision stays with the
  // approver.
  const aiStatus =
    entity === 'opportunities' ? (
      <EvaluationStatus
        entity='opportunities'
        recordId={id}
        request={followUp}
        onOpen={(entryId) => {
          setFocus({ id: entryId, at: Date.now() });
          setTab('historyTab');
        }}
      />
    ) : entity === 'approvals' ? (
      <ReviewStatus
        approvalId={id}
        onOpen={(entryId) => {
          setFocus({ id: entryId, at: Date.now() });
          setTab('historyTab');
        }}
      />
    ) : undefined;
  const tabContent = (
    <>
      {activeTab === 'mail' ? (
        <RecordMailPanel
          target={mailTarget}
          focus={mailFocus}
          scope={
            entity === 'companies'
              ? { kind: 'company', name: toText(record.name) }
              : entity === 'opportunities'
                ? {
                    kind: 'opportunity',
                    fromCompany: dealContactIds.size === 0,
                  }
                : undefined
          }
        />
      ) : activeTab === 'opportunityContacts' ? (
        <OpportunityContacts
          record={record}
          editable={editable}
          contacts={rows(detail.related.contacts) as CrmRecord[]}
          contactsTotal={detail.relatedTotals?.contacts}
          names={bareNames}
          onSave={patch}
          // A new person is created at the company, not on the deal:
          // they then appear under "other contacts" to be added.
          onCreate={
            meta.permissions.contacts.create
              ? () =>
                  setForm({
                    entity: 'contacts',
                    initial: { companyId: record.companyId },
                  })
              : undefined
          }
        />
      ) : activeTab === 'approvals' ? (
        <div className='space-y-3'>
          <TabHeading
            scope={text('tabScope.approvals', {
              entity: text('entity.opportunities'),
            })}
          >
            {editable && Boolean(meta.permissions.approvals.create) && (
              <Button
                size='sm'
                variant='outline'
                onClick={() =>
                  setForm({
                    entity: 'approvals',
                    initial: { opportunityId: id },
                  })
                }
              >
                <Plus />
                {text('newApproval')}
              </Button>
            )}
          </TabHeading>
          {!approvals.length ? (
            <p className='text-sm text-muted-foreground'>{text('noRecords')}</p>
          ) : (
            <>
              <ol className='relative ml-1.5 border-l border-border'>
                {approvals.map((approval) => (
                  <ApprovalItem key={toText(approval.id)} approval={approval} />
                ))}
              </ol>
              <AutoLoadMore
                hasMore={moreApprovals.hasMore}
                loading={moreApprovals.loading}
                onLoad={() => void moreApprovals.loadMore()}
              />
            </>
          )}
        </div>
      ) : activeTab === 'tasks' ? (
        <div className='space-y-3'>
          <TabHeading
            scope={text('tabScope.tasks', {
              entity: text(`entity.${toText(entity)}`),
            })}
          >
            {entity !== 'tasks' && Boolean(meta.permissions.tasks.create) && (
              <Button
                size='sm'
                variant='outline'
                onClick={() =>
                  setForm({
                    entity: 'tasks',
                    initial: relatedInput,
                    // The record's name and its company's, so the record
                    // chip names what the task starts linked to.
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
      ) : activeTab === 'attachments' ? (
        <RecordAttachments
          entity={entity}
          record={record}
          tasks={tasks}
          opportunities={linkedOpportunities}
          approvals={approvals}
          editable={editable}
          onError={setError}
          uploader={
            editable && hasOwnFiles ? (
              <UploadZone
                entity={entity}
                record={record}
                busy={uploading}
                setBusy={setUploading}
                onError={setError}
              />
            ) : undefined
          }
        />
      ) : activeTab === 'historyTab' ? (
        <HistoryFeed
          entity={entity}
          id={id}
          record={record}
          initial={{
            data: detail.history,
            total: detail.historyTotal ?? detail.history.length,
          }}
          names={names}
          statusKey={statusKey}
          // A deal's AI follow-up is decided in its timeline, as a
          // lead's: by whoever may edit it, while it is open.
          editable={entity === 'opportunities' && editable && !closedDeal}
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
      ) : (
        // A related list: name, status, owner, updated — with a create
        // button where this object can start one of them.
        <RelatedList
          entity={activeTab as Entity}
          from={entity}
          records={rows(detail.related[activeTab as Entity]) as CrmRecord[]}
          total={detail.relatedTotals?.[activeTab as Entity]}
          base={`${activeTab}?${linkParam}`}
          titles={names}
          onCreate={
            activeTab !== 'leads' &&
            meta.permissions[activeTab as Entity]?.create
              ? () =>
                  setForm({
                    entity: activeTab as Entity,
                    initial: relatedInput,
                  })
              : undefined
          }
        />
      )}
    </>
  );
  // The page's dialogs.
  const overlays = (
    <>
      {form && (
        <RecordForm
          {...form}
          onClose={() => setForm(undefined)}
          // An approval raised here shows up in this page's approvals tab;
          // a task in its tasks tab. Other new records are opened.
          onSaved={(r) => {
            if (
              !['tasks', 'approvals'].includes(form.entity) &&
              form.entity !== entity
            ) {
              if (drawer) drawer.open(form.entity, toText(r.id));
              else void navigate(`/crm/${toText(form.entity)}/${toText(r.id)}`);
            }
          }}
          andThen={
            form.entity === 'approvals'
              ? {
                  label: text('saveAndSubmit'),
                  run: async (r) => {
                    await api(`approvals/${toText(r.id)}/submit`, 'POST', {
                      comment: '',
                    });
                  },
                }
              : undefined
          }
        />
      )}
      {companyMove && (
        <ConfirmDialog
          title={text('changeCompanyTitle')}
          description={text('changeCompanyContacts', {
            names: dealContacts
              .map((c) => {
                const contactId = toText(c.contactId ?? '');
                return bareNames[contactId] ?? names[contactId] ?? contactId;
              })
              .join('、'),
          })}
          busy={moving}
          onCancel={() => {
            companyMove.resolve();
            setCompanyMove(undefined);
          }}
          onConfirm={() => void confirmCompanyMove()}
        />
      )}
      {recording && (
        <RecordOutcomeDialog
          task={record}
          onClose={() => setRecording(false)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={text('deleteRecordTitle', {
            entity: text(`entity.${toText(entity)}`),
            name: title,
          })}
          description={
            blockerEntries.length ? (
              // Blocked: say what is in the way, each linking to its tab,
              // instead of a generic hint and a failed request.
              <span className='block space-y-2'>
                <span className='block'>
                  {text(
                    entity === 'opportunities'
                      ? 'deleteOpportunityBlocked'
                      : 'deleteBlocked',
                  )}
                </span>
                {blockerEntries.map(([child, n]) => {
                  // Name the records where the page already has them; fall
                  // back to the count alone when it does not.
                  const items = rows(detail.related[child]) as CrmRecord[];
                  const shownItems = items.slice(0, 5);
                  return (
                    <span key={child} className='block text-sm'>
                      <span className='text-foreground'>
                        {text(`entities.${child}`)}（{n}）：
                      </span>
                      {shownItems.length
                        ? shownItems.map((r, i) => (
                            <span key={r.id}>
                              {i > 0 && '、'}
                              <RecordLink
                                entity={child}
                                record={{
                                  id: r.id,
                                  name: recordTitle(child, r, names),
                                }}
                              />
                            </span>
                          ))
                        : null}
                      {/* The leads have no tab of their own (they are listed in
                          the converted-from row), so their rest is a count. */}
                      {n > shownItems.length && child === 'leads' && (
                        <span className='ml-1 text-muted-foreground'>
                          {text('andMore', { count: n - shownItems.length })}
                        </span>
                      )}
                      {n > shownItems.length && child !== 'leads' && (
                        <button
                          type='button'
                          className='ml-1 text-primary hover:underline'
                          onClick={() => {
                            setConfirmDelete(false);
                            setTab(child);
                          }}
                        >
                          {text('andMore', { count: n - shownItems.length })}
                        </button>
                      )}
                    </span>
                  );
                })}
              </span>
            ) : (
              <span className='block space-y-1'>
                <span className='block'>
                  {text(
                    entity === 'contacts'
                      ? 'deleteContactHint'
                      : entity === 'approvals'
                        ? ['draft', 'withdrawn'].includes(toText(record.status))
                          ? 'deleteApprovalHint'
                          : 'deleteDecidedApprovalHint'
                        : entity === 'tasks'
                          ? 'deleteTaskHint'
                          : 'deleteHint',
                  )}
                </span>
                {cascadedTasks.length > 0 && (
                  <span className='block text-destructive'>
                    {text('deleteCompanyTasks', {
                      count: cascadedTasks.length,
                      entity: text(`entity.${toText(entity)}`),
                    })}
                  </span>
                )}
                {Object.entries(detail.unlinks ?? {})
                  .filter(([, n]) => Number(n) > 0)
                  .map(([child, n]) => (
                    <span key={child} className='block'>
                      {text('deleteContactUnlinks', {
                        count: n,
                        entity: text(`entities.${child}`),
                      })}
                    </span>
                  ))}
                {keptTasks.length > 0 && (
                  <span className='block'>
                    {text('deleteCompanyKeptTasks', {
                      count: keptTasks.length,
                      entity: text(`entity.${toText(entity)}`),
                    })}
                  </span>
                )}
              </span>
            )
          }
          busy={busy}
          confirmDisabled={blockerEntries.length > 0}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            void (async () => {
              setBusy(true);
              setError(undefined);
              try {
                await api(`${toText(entity)}/${toText(id)}`, 'DELETE');
                // Leave first: refreshing while still on the page refetches
                // the record that no longer exists.
                if (drawer?.inDrawer) drawer.close();
                else void navigate(`/crm/${toText(entity)}`);
                void refresh();
              } catch (e) {
                setError(e);
                setConfirmDelete(false);
              } finally {
                setBusy(false);
              }
            })();
          }}
        />
      )}
    </>
  );
  // Every object's page is laid out as the lead's (DetailColumns): the
  // record's heading across the page with its actions at the right, its
  // particulars in groups on the left, the tabs atop the right column.
  const row = (key: string): ReactElement => (
    <InfoRow key={key} field={key} label={text(fieldLabelKey(entity, key))}>
      {inline(key)}
    </InfoRow>
  );
  // Country, state, city and street address on one row, the location.
  const locationRow = (
    <InfoRow key='location' field='location' label={text('location')}>
      <LocationField
        entity={entity}
        record={record}
        editable={editable}
        label={text('location')}
        countries={field('country').options ?? []}
      />
    </InfoRow>
  );
  // The leads the record came from, each opening in the drawer: the one
  // place they show on a company, whose deletion they block.
  const convertedRow =
    convertedFrom.length > 0 ? (
      <InfoRow
        key='convertedFrom'
        field='convertedFrom'
        label={text('convertedFrom')}
      >
        <div className='flex min-w-0 flex-col gap-1 px-2 py-1.5'>
          {convertedFrom.map((lead) => (
            <RecordLink
              key={lead.id}
              lines='all'
              entity='leads'
              record={{ id: lead.id, name: recordTitle('leads', lead, names) }}
            />
          ))}
        </div>
      </InfoRow>
    ) : null;
  const companyCrumb = record.companyId ? (
    <CompanyCrumb
      id={toText(record.companyId)}
      name={names[toText(record.companyId)] ?? text('entities.companies')}
    />
  ) : null;
  // The name, edited in place, with what goes before or after it (a deal's
  // company, a contact's). A <div> with the heading role, since the editor
  // brings block elements an <h1> may not hold. Its negative margin is on
  // the left only, lining the text up with the fields: one on the right
  // would overflow the stacked column and make it scroll sideways.
  const name = (
    <InlineField
      entity={entity}
      record={record}
      field={field('name')}
      editable={editable}
      label={text(fieldLabelKey(entity, 'name'))}
      size='heading'
    />
  );
  const headingOf = (before?: ReactNode, after?: ReactNode): ReactElement => (
    <div
      role='heading'
      aria-level={1}
      className='-ml-2 py-1.5 font-heading text-xl font-semibold tracking-tight'
    >
      {before ? (
        <>
          {before}
          <AfterSlash>{name}</AfterSlash>
        </>
      ) : (
        name
      )}
      {after ? <AfterSlash>{after}</AfterSlash> : null}
    </div>
  );
  // The rarer deleting, last, in a "More" menu.
  const moreMenu = detail.permissions.delete ? (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={text('moreActions')}
        className={buttonVariants({ size: 'icon-sm', variant: 'outline' })}
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
          {text('deleteRecord', {
            entity: text(`entity.${toText(entity)}`),
          })}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;
  // The buttons, right of the heading; where the AI's latest work on the
  // record stands, under it, when it has any.
  type Actions = { buttons: ReactNode; status?: ReactNode };
  const actionsOf = (buttons: ReactNode, status?: ReactNode): Actions => ({
    buttons,
    status,
  });
  // Each object's tab carries its icon in the menu (client/routes.ts).
  const tabIcons: Record<string, LucideIcon> = {
    historyTab: History,
    tasks: SquareCheckBig,
    opportunityContacts: UserRound,
    contacts: UserRound,
    leads: Radar,
    opportunities: Handshake,
    approvals: ListChecks,
    attachments: Paperclip,
    mail: Mail,
  };
  // The timeline without a count, as on the lead page: its entries only grow.
  const tabBar = (
    <DetailTabBar
      active={activeTab}
      onSelect={setTab}
      // Every tab counts what it holds but the timeline, which only grows.
      tabs={tabs.map(([name, label, count]) => ({
        name,
        label,
        icon: tabIcons[name] ?? History,
        count:
          name === 'mail' ? (
            <MailCount target={mailTarget} />
          ) : name === 'historyTab' ? undefined : (
            count
          ),
      }))}
    />
  );
  const page = (
    heading: ReactNode,
    actions: Actions,
    left: ReactNode,
  ): ReactElement => (
    <DetailColumns
      entity={entity}
      heading={heading}
      actions={actions.buttons}
      status={aiStatus}
      tabBar={tabBar}
      notice={<ErrorNotice error={error ?? loadError} />}
      left={left}
      right={tabContent}
    >
      {overlays}
    </DetailColumns>
  );

  if (entity === 'tasks')
    return page(
      headingOf(),
      actionsOf(
        <>
          {/* An open task: done, with what came of it if anything (and
              its record followed up anew), in one step. */}
          {currentStatus === 'open' && editable && (
            <Button size='sm' onClick={() => setRecording(true)}>
              <Check />
              {text('completeTask')}
            </Button>
          )}
          {moreMenu}
        </>,
      ),
      <>
        {/* What it is first, across the column with neither heading nor
            label. What came of it is told in the timeline, under the entry
            that completed it. */}
        <InfoGroup>
          <div className='min-w-0 py-0.5 text-sm'>{inline('description')}</div>
        </InfoGroup>
        {/* Who has it and who takes part, where it stands, and when. */}
        <InfoGroup title={text('detailsGroup')}>
          {row('ownerId')}
          {row('internalParticipants')}
          {statusKey && (
            <InfoRow field={statusKey} label={text(`fields.${statusKey}`)}>
              <StageField
                entity={entity}
                record={record}
                field={statusKey}
                editable={editable}
                title={title}
                onSave={patch}
                // Done with an open task goes through the same dialog as
                // the button: what came of it is written then, and the AI
                // follows up with it.
                instead={
                  currentStatus === 'open'
                    ? { completed: () => setRecording(true) }
                    : undefined
                }
              />
            </InfoRow>
          )}
          {/* When it is, if it is. */}
          {row('dueAt')}
          {['leadId', 'companyId', 'opportunityId'].map(row)}
        </InfoGroup>
      </>,
    );

  if (entity === 'opportunities') {
    const stage = toText(record.stage);
    return page(
      headingOf(companyCrumb),
      actionsOf(
        <>
          <EvaluateButton request={followUp} />
          {moreMenu}
        </>,
      ),
      <>
        {/* What the deal is, across the column with neither heading nor
            label, as a task's description leads its page. */}
        <InfoGroup>
          <div className='min-w-0 py-0.5 text-sm'>{inline('description')}</div>
        </InfoGroup>
        {/* One list: who has it and where it stands, what it is worth
            and when it should close, then the company and how it came. */}
        <InfoGroup title={text('detailsGroup')}>
          {row('ownerId')}
          <InfoRow field='stage' label={text('fields.stage')}>
            <StageField
              entity={entity}
              record={record}
              field='stage'
              editable={editable}
              title={title}
              // Every move clears both outcomes' fields first, as the
              // stepper did: a deal moved between lost and paused keeps no
              // stale reason or resume date.
              onSave={(values) =>
                patch({
                  lostReason: null,
                  pauseReason: null,
                  resumeAt: null,
                  ...values,
                })
              }
            />
          </InfoRow>
          {stage === 'paused' && row('resumeAt')}
          {/* What it is worth and when it should close, then the company
            and how it came. */}
          {/* Currency, then the bare number: both edit in place, and the
              sign is not repeated. */}
          <InfoRow field='amount' label={text('fields.amount')}>
            <div className='flex items-center'>
              <div className='shrink-0'>{inline('currency')}</div>
              <div className='min-w-0 flex-1'>
                <InlineField
                  entity={entity}
                  record={record}
                  field={field('amount')}
                  editable={editable}
                  lookup={names}
                  label={text('fields.amount')}
                  bare
                />
              </div>
            </div>
          </InfoRow>
          {row('expectedCloseAt')}
          {['companyId', 'businessType', 'source'].map(row)}
          {convertedRow}
        </InfoGroup>
      </>,
    );
  }

  if (entity === 'companies')
    return page(
      headingOf(),
      actionsOf(<>{moreMenu}</>),
      <>
        {/* Who has it and where it stands (a churned company's reason
            beside its status). */}
        <InfoGroup title={text('companyGroups.general')}>
          {row('ownerId')}
          {statusKey && (
            <InfoRow field={statusKey} label={text(`fields.${statusKey}`)}>
              <StageField
                entity={entity}
                record={record}
                field={statusKey}
                editable={editable}
                title={title}
                onSave={patch}
              />
            </InfoRow>
          )}
          {/* The reason stays editable while the company is churned. */}
          {currentStatus === 'churned' && row('churnReason')}
          {['type', 'source'].map(row)}
        </InfoGroup>
        <InfoGroup title={text('companyGroups.company')}>
          <InfoRow field='website' label={text('fields.website')}>
            <WebsiteField
              entity={entity}
              record={record}
              editable={editable}
              label={text('fields.website')}
            />
          </InfoRow>
          {['industry', 'employees'].map(row)}
          {locationRow}
          {row('description')}
          {convertedRow}
        </InfoGroup>
      </>,
    );

  if (entity === 'contacts')
    return page(
      headingOf(undefined, companyCrumb),
      actionsOf(<>{moreMenu}</>),
      <>
        <InfoGroup title={text('detailsGroup')}>
          {[
            'ownerId',
            'companyId',
            'primary',
            'employed',
            'gender',
            'source',
          ].map(row)}
          {convertedRow}
          {['jobTitle', 'phone', 'email'].map(row)}
        </InfoGroup>
      </>,
    );

  // An approval (leads have LeadDetail). Its status moves only through its
  // actions, so it is shown rather than edited.
  const approver = record.approverId === meta.userId;
  return page(
    headingOf(),
    actionsOf(
      <>
        <ApprovalActions approval={record} names={names} />
        {moreMenu}
      </>,
    ),
    <>
      {/* What is asked, across the column with neither heading nor label,
          as a task's description leads its page. */}
      <InfoGroup>
        <div className='min-w-0 py-0.5 text-sm'>{inline('description')}</div>
      </InfoGroup>
      <InfoGroup title={text('detailsGroup')}>
        {row('ownerId')}
        {statusKey && (
          <InfoRow field={statusKey} label={text(`fields.${statusKey}`)}>
            {/* The marker says which side of it the approver is on. */}
            <span className='flex flex-wrap items-center gap-2 px-2 py-1.5'>
              <Status value={currentStatus} />
              {approver && (
                <Badge
                  variant={
                    currentStatus === 'pending' ? 'default' : 'secondary'
                  }
                >
                  {text(
                    currentStatus === 'pending' ? 'yourDecision' : 'youApprove',
                  )}
                </Badge>
              )}
            </span>
          </InfoRow>
        )}
        {['topic', 'approverId', 'opportunityId'].map(row)}
      </InfoGroup>
    </>,
  );
}

function RelatedList({
  entity,
  from,
  records: firstPage,
  total,
  base,
  titles,
  onCreate,
}: {
  entity: Entity;
  // The kind of the record whose tab it is, which its heading names.
  from: Entity;
  // The first page, with the server's total and the path for the rest.
  records: CrmRecord[];
  total?: number;
  base: string;
  titles: Record<string, string>;
  onCreate?: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const navigate = useNavigate();
  const drawer = useRecordDrawer();
  // A row opens its record like the other tabs' entries: in the page's
  // drawer, or its full page where there is none (a phone). A click on a link
  // in the row keeps its own target, and a click that ends a text selection
  // opens nothing.
  const openRow = (
    event: MouseEvent<HTMLTableRowElement>,
    id: string,
  ): void => {
    if ((event.target as HTMLElement).closest('a,button')) return;
    if (window.getSelection()?.toString()) return;
    if (drawer) drawer.open(entity, id);
    else void navigate(`/crm/${toText(entity)}/${id}`);
  };
  const more = useMore(base, {
    data: firstPage,
    total: total ?? firstPage.length,
  });
  const records = more.records;
  const names = { ...titles, ...more.titles };
  // Each related object shows the columns that say something about it: a
  // contact has no status, an opportunity has a stage and an amount.
  const columns: readonly string[] =
    entity === 'contacts'
      ? ['name', 'jobTitle', 'phone', 'email']
      : entity === 'opportunities'
        ? ['name', 'stage', 'amount', 'expectedCloseAt', 'ownerId']
        : entity === 'approvals'
          ? ['name', 'topic', 'status', 'ownerId', 'updatedAt']
          : ['name', 'status', 'ownerId', 'updatedAt'];
  const fieldDef = (key: string): Field =>
    meta?.definitions[entity].fields.find((f) => f.key === key) ?? {
      key,
      type: 'text',
    };
  // Contacts read in the order one would call them: the primary contact
  // first, people who have left last, marked inline rather than as columns.
  // Booleans arrive as 0/1 from SQLite, so both are read by truthiness.
  const left = (r: CrmRecord): boolean =>
    r.employed === false || r.employed === 0;
  // Contacts split in two: current people (primary first) in the main list,
  // people who have left in a second, dimmer list beneath it.
  const ordered =
    entity === 'contacts'
      ? records
          .filter((r) => !left(r))
          .sort(
            (a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)),
          )
      : records;
  const departed = entity === 'contacts' ? records.filter(left) : [];
  return (
    <div className='space-y-3'>
      <TabHeading
        scope={text(`tabScope.${entity}`, {
          entity: text(`entity.${from}`),
        })}
      >
        {onCreate && (
          <Button size='sm' variant='outline' onClick={onCreate}>
            <Plus />
            {text('newRecord', { entity: text(`entity.${toText(entity)}`) })}
          </Button>
        )}
      </TabHeading>
      {!records.length ? (
        <p className='text-sm text-muted-foreground'>{text('noRecords')}</p>
      ) : (
        <>
          {entity === 'contacts' ? contactList(ordered) : table(ordered)}
          <AutoLoadMore
            hasMore={more.hasMore}
            loading={more.loading}
            onLoad={() => void more.loadMore()}
          />
          {departed.length > 0 && (
            <div className='space-y-2 pt-2'>
              <h4 className='text-xs font-medium text-muted-foreground'>
                {text('leftCompany')}
                <span className='ml-1 tabular-nums'>{departed.length}</span>
              </h4>
              <div className='text-muted-foreground'>
                {contactList(departed)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
  // Contacts open in the drawer the way tasks do, so a phone number or
  // a job title is corrected without leaving the company.
  function contactList(list: CrmRecord[]): ReactElement {
    return (
      <ul className='divide-y divide-border'>
        {list.map((r) => (
          <ContactItem
            key={r.id}
            contact={r}
            leading={!left(r) && <PrimaryStar contact={r} siblings={records} />}
          />
        ))}
      </ul>
    );
  }
  function table(list: CrmRecord[]): ReactElement {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((key) => (
              <TableHead key={key}>
                {text(fieldLabelKey(entity, key))}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((r) => (
            <TableRow
              key={r.id}
              className='cursor-pointer'
              onClick={(event) => openRow(event, r.id)}
            >
              {columns.map((key) => (
                <TableCell key={key}>
                  {key === 'name' ? (
                    <span className='inline-flex flex-wrap items-center gap-2'>
                      <RecordLink
                        entity={entity}
                        record={{
                          id: r.id,
                          name: recordTitle(entity, r, names),
                        }}
                      />
                    </span>
                  ) : (
                    <Value record={r} field={fieldDef(key)} lookup={names} />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }
}

// One contact on a record's contacts tab: a row that opens the contact in
// the page's drawer (its full page on a phone or in a new tab), where its
// fields are edited, the way a task does in the tasks tab. The
// star and the opportunity's role and remove control sit beside the link
// rather than inside it, so using them does not also open the contact.
function ContactItem({
  contact,
  leading,
  trailing,
}: {
  contact: CrmRecord;
  // What sits before the name (the company page's primary star) and at the
  // row's end (the opportunity page's role and remove control).
  leading?: ReactNode;
  trailing?: ReactNode;
}): ReactElement {
  const contactLink = useRecordLink('contacts', toText(contact.id));
  const summary = ['jobTitle', 'phone', 'email']
    .map((key) => toText(contact[key]))
    .filter(Boolean);
  return (
    <li className='py-0.5'>
      {/* The shading covers the star too, so the row reads as one unit. */}
      <div className='flex items-start gap-1 rounded-md transition-colors hover:bg-muted'>
        {leading ? (
          <span className='ml-1 mt-1.5 flex shrink-0 items-center'>
            {leading}
          </span>
        ) : null}
        <Link
          className='min-w-0 flex-1 rounded-md px-2 py-2 text-left'
          {...contactLink}
        >
          <div className='flex flex-wrap items-baseline gap-x-3 gap-y-0.5'>
            <span className='flex max-w-full min-w-0 items-center gap-1'>
              <span
                className='truncate text-sm font-medium'
                title={toText(contact.name)}
              >
                {toText(contact.name)}
              </span>
              <ArrowUpRight className='size-3 shrink-0 text-muted-foreground' />
            </span>
            {summary.map((value) => (
              <span
                key={value}
                className='truncate text-xs text-muted-foreground'
              >
                {value}
              </span>
            ))}
          </div>
        </Link>
        {trailing ? (
          <span className='mt-1.5 flex shrink-0 items-center justify-center'>
            {trailing}
          </span>
        ) : null}
      </div>
    </li>
  );
}

// The people on an opportunity and their roles. Rows edit in place — the
// role is a dropdown, a row can be removed after confirming — and a new row
// is added from the company's contacts not yet listed.
const contactRoles = [
  'decisionMaker',
  'champion',
  'evaluator',
  'influencer',
  'user',
  'blocker',
  'other',
];
function OpportunityContacts({
  record,
  editable,
  contacts: firstPage,
  contactsTotal,
  names,
  onSave,
  onCreate,
}: {
  record: CrmRecord;
  editable: boolean;
  // The company's contacts, the first page read with the deal: who can be
  // on it. The rest come on request.
  contacts: CrmRecord[];
  contactsTotal?: number;
  names: Record<string, string>;
  onSave: (values: Data) => Promise<void>;
  onCreate?: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const more = useMore(
    record.companyId
      ? `contacts?companyId=${toText(record.companyId)}`
      : undefined,
    { data: firstPage, total: contactsTotal ?? firstPage.length },
  );
  const contacts = more.records;
  const [removing, setRemoving] = useState<string>();
  // Joining asks for the role first: a person on a deal without one is a
  // record that says nothing.
  const [joining, setJoining] = useState<CrmRecord>();
  const [joinRole, setJoinRole] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const list = rows(record.contacts as unknown[]).map((c) => ({
    contactId: toText(c.contactId),
    role: toText(c.role || 'other'),
  }));
  const contactsOf = contacts.filter((c) => c.companyId === record.companyId);
  const nameOf = (id: string): string =>
    toText(contactsOf.find((c) => c.id === id)?.name) ||
    names[id] ||
    text('entities.contacts');
  const candidates = contactsOf.filter(
    (c) =>
      !list.some((item) => item.contactId === c.id) &&
      c.employed !== false &&
      c.employed !== 0,
  );
  const roleChoices = contactRoles.map((v) => ({
    value: v,
    label: text(`options.${v}`),
  }));
  const commit = async (next: typeof list): Promise<void> => {
    setBusy(true);
    setError(undefined);
    try {
      await onSave({ contacts: next });
      setRemoving(undefined);
      setJoining(undefined);
      setJoinRole('');
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className='space-y-4'>
      <ErrorNotice error={error} />
      <TabHeading scope={text('tabScope.dealContacts')}>
        {onCreate && (
          <Button size='sm' variant='outline' onClick={onCreate}>
            <Plus />
            {text('newRecord', { entity: text('entity.contacts') })}
          </Button>
        )}
      </TabHeading>
      <div className='space-y-2'>
        <h4 className='text-xs font-medium text-muted-foreground'>
          {text('onThisOpportunity')}
          <span className='ml-1 tabular-nums'>{list.length}</span>
        </h4>
        {!list.length ? (
          <p className='text-sm text-muted-foreground'>{text('noContacts')}</p>
        ) : (
          // The same expandable rows as the company's contacts tab, with the
          // role (and a remove control) where that tab has its star.
          <ul className='divide-y divide-border'>
            {list.map((item) => {
              // A contact the lookup lacks (not readable) still gets a row,
              // with only its name.
              const contact: CrmRecord = contactsOf.find(
                (c) => c.id === item.contactId,
              ) ?? {
                id: item.contactId,
                name: nameOf(item.contactId),
                ownerId: '',
                createdById: '',
                createdAt: '',
                updatedAt: '',
              };
              return (
                <ContactItem
                  key={item.contactId}
                  contact={contact}
                  leading={
                    <PrimaryStar contact={contact} siblings={contactsOf} />
                  }
                  trailing={
                    <span className='flex items-center gap-1'>
                      <span className='flex'>
                        {editable ? (
                          <Choice
                            variant='tag'
                            label={text('fields.role')}
                            value={item.role}
                            disabled={busy}
                            choices={roleChoices}
                            onChange={(v) =>
                              void commit(
                                list.map((c) =>
                                  c.contactId === item.contactId
                                    ? { ...c, role: v }
                                    : c,
                                ),
                              )
                            }
                          />
                        ) : item.role ? (
                          <Badge variant='muted'>
                            {text(`options.${item.role}`)}
                          </Badge>
                        ) : null}
                      </span>
                      {editable && (
                        <Button
                          size='icon-sm'
                          variant='ghost'
                          className='text-muted-foreground hover:text-destructive'
                          aria-label={`${toText(text('remove'))} ${nameOf(item.contactId)}`}
                          disabled={busy}
                          onClick={() => setRemoving(item.contactId)}
                        >
                          <X />
                        </Button>
                      )}
                    </span>
                  }
                />
              );
            })}
          </ul>
        )}
      </div>
      {/* The company's other people: one click brings any of them onto the
          deal, with a role to set afterwards. Those who have left are not
          offered. */}
      <div className='space-y-2 pt-2'>
        <h4 className='text-xs font-medium text-muted-foreground'>
          {text('otherCompanyContacts')}
          <span className='ml-1 tabular-nums'>
            {candidates.length + (more.total - contacts.length)}
          </span>
        </h4>
        {!candidates.length && !more.hasMore ? (
          <p className='text-sm text-muted-foreground'>{text('noContacts')}</p>
        ) : (
          <ul className='divide-y divide-border'>
            {candidates.map((c) => (
              <ContactItem
                key={c.id}
                contact={c}
                leading={<PrimaryStar contact={c} siblings={contactsOf} />}
                trailing={
                  editable ? (
                    <Button
                      size='sm'
                      variant='outline'
                      disabled={busy}
                      onClick={() => setJoining(c)}
                    >
                      <Plus />
                      {text('addToOpportunity')}
                    </Button>
                  ) : null
                }
              />
            ))}
          </ul>
        )}
        <AutoLoadMore
          hasMore={more.hasMore}
          loading={more.loading}
          onLoad={() => void more.loadMore()}
        />
      </div>
      {joining && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setJoining(undefined);
          }}
        >
          <DialogContent showCloseButton={false} className='sm:max-w-sm'>
            <DialogHeader>
              <DialogTitle>
                {text('joinOpportunityTitle', { name: toText(joining.name) })}
              </DialogTitle>
              <DialogDescription>
                {text('joinOpportunityHint')}
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-1.5 text-sm'>
              {text('fields.role')}
              <Choice
                label={text('fields.role')}
                value={joinRole}
                choices={roleChoices}
                onChange={setJoinRole}
              />
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                disabled={busy}
                onClick={() => setJoining(undefined)}
              >
                {text('cancel')}
              </Button>
              <Button
                disabled={busy || !joinRole}
                onClick={() =>
                  void commit([
                    ...list,
                    { contactId: toText(joining.id), role: joinRole },
                  ])
                }
              >
                {busy ? text('saving') : text('confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {removing && (
        <ConfirmDialog
          title={text('removeContactTitle', { name: nameOf(removing) })}
          description={text('removeContactHint')}
          busy={busy}
          onCancel={() => setRemoving(undefined)}
          onConfirm={() =>
            void commit(list.filter((c) => c.contactId !== removing))
          }
        />
      )}
    </div>
  );
}

// The primary-contact star beside a contact's name: filled on the primary,
// outlined on the others, a click (with confirmation) moves it. The server
// clears the previous primary, so only one is ever lit. Read-only, and only
// shown when lit, for users who cannot edit contacts.
function PrimaryStar({
  contact,
  siblings,
}: {
  contact: CrmRecord;
  // The company's contacts, to name the primary being replaced.
  siblings: CrmRecord[];
}): ReactElement | null {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const canStar = Boolean(meta?.permissions.contacts.update);
  const currentPrimary = siblings.find((r) => r.primary && r.id !== contact.id);
  const toggle = async (): Promise<void> => {
    setBusy(true);
    try {
      await api(`contacts/${toText(contact.id)}`, 'PATCH', {
        primary: !contact.primary,
      });
      await refresh();
      setAsking(false);
    } finally {
      setBusy(false);
    }
  };
  if (!canStar)
    return contact.primary ? (
      <Star
        className='m-1 size-3.5 fill-ai text-ai'
        aria-label={text('companyPrimary')}
      >
        <title>{text('companyPrimary')}</title>
      </Star>
    ) : null;
  return (
    <>
      <button
        type='button'
        title={text(contact.primary ? 'companyPrimary' : 'setPrimary')}
        aria-label={text(contact.primary ? 'unsetPrimary' : 'setPrimary')}
        aria-pressed={Boolean(contact.primary)}
        className='rounded-sm p-1 text-muted-foreground/50 transition-colors hover:text-ai'
        onClick={() => setAsking(true)}
      >
        <Star
          className={contact.primary ? 'size-3.5 fill-ai text-ai' : 'size-3.5'}
        />
      </button>
      {asking && (
        <ConfirmDialog
          title={text(
            contact.primary ? 'unsetPrimaryTitle' : 'setPrimaryTitle',
          )}
          description={
            contact.primary
              ? text('unsetPrimaryDetail', { name: toText(contact.name) })
              : currentPrimary
                ? text('replacePrimaryDetail', {
                    name: toText(contact.name),
                    previous: toText(currentPrimary.name),
                  })
                : text('setPrimaryDetail', { name: toText(contact.name) })
          }
          busy={busy}
          onCancel={() => setAsking(false)}
          onConfirm={() => void toggle()}
        />
      )}
    </>
  );
}

// One approval on an opportunity's approvals tab: a timeline entry that
// opens the approval in the page's drawer, the way a task does, where
// it is edited and decided.
function ApprovalItem({ approval }: { approval: Data }): ReactElement {
  const { text, language } = useCrmText();
  const approvalLink = useRecordLink('approvals', toText(approval.id));
  const { data: meta } = useMetadata();
  const status = toText(approval.status);
  const mine = Boolean(meta && approval.approverId === meta.userId);
  const nameOf = (id: unknown): string =>
    meta?.users.find((u) => u.id === toText(id))?.name ?? '';
  return (
    <li className='relative pl-5'>
      <span
        aria-hidden
        className={`absolute top-4 left-0 size-2.5 -translate-x-1/2 rounded-full border-2 border-card ${toText(
          status === 'approved'
            ? 'bg-primary'
            : status === 'rejected' || status === 'withdrawn'
              ? 'bg-muted-foreground/40'
              : 'bg-background ring-2 ring-primary/40',
        )}`}
      />
      <Link
        className='block w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-muted'
        {...approvalLink}
      >
        <div className='flex flex-wrap items-center gap-2'>
          <KindTag value={approval.topic} />
          <span className='flex min-w-0 flex-1 items-center gap-1'>
            <span className='truncate text-sm font-medium'>
              {toText(approval.name)}
            </span>
            <ArrowUpRight className='size-3 shrink-0 text-muted-foreground' />
          </span>
          {/* Which side of the request the reader is on: it is theirs to
              decide, or theirs to wait for. */}
          {mine && (
            <Badge variant={status === 'pending' ? 'default' : 'secondary'}>
              {text(status === 'pending' ? 'yourDecision' : 'youApprove')}
            </Badge>
          )}
          <Status value={approval.status} />
        </div>
        {/* Who asks and who decides, each by an icon (the label on hover,
            as the dashboard's approval cards show them), then when it last
            moved. */}
        <p className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground'>
          {(
            [
              ['fields.applicant', approval.ownerId, User],
              ['fields.approverId', approval.approverId, ShieldCheck],
            ] as const
          ).map(([label, id, Icon]) =>
            id ? (
              <span
                key={label}
                className='inline-flex items-center gap-1'
                title={text(label)}
              >
                <Icon className='size-3 shrink-0' aria-label={text(label)} />
                {nameOf(id)}
              </span>
            ) : null,
          )}
          <span className='inline-flex items-center gap-1'>
            <Clock className='size-3 shrink-0' />
            {localDate(
              approval.updatedAt,
              language,
              meta?.settings.timeZone ?? 'Asia/Shanghai',
            )}
          </span>
        </p>
      </Link>
    </li>
  );
}
