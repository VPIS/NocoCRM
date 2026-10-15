import {
  ApiClientError,
  useNavigationGuard,
  useToaster,
} from '@nocobase/app-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CopyIcon, RefreshCwIcon } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { PageContainer } from '#components/page-container';
import { PageHeader } from '#components/page-header';
import { Alert, AlertDescription } from '#components/ui/alert';
import { Button } from '#components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#components/ui/card';
import { Field, FieldDescription, FieldLabel } from '#components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#components/ui/select';
import { Skeleton } from '#components/ui/skeleton';
import { Spinner } from '#components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#components/ui/tooltip';
import {
  errorCode,
  toText,
  useCrmApi,
  useCrmScopeKey,
  useCrmText,
  useMetadata,
} from '../../components/crm/api.js';
import { LoadFailure, TextField } from './shared.js';

// Settings → WhatsApp: the company number's connection to Meta's Cloud API
// (its ids and credentials, sealed on the server and never shown again), what
// to enter in the Meta app's webhook settings, and how the number and the
// deliveries stand. The status changes on its own, so the page has a Refresh
// (R4); the connection is saved by its card's Save (T4).

const FORM_ID = 'crm-whatsapp-connection';
const SELECT_CONTENT =
  'w-auto max-w-[min(var(--container-sm),var(--available-width))] min-w-(--anchor-width) [&_[data-slot=select-item]>:first-child]:whitespace-normal';

interface Connection {
  configured: boolean;
  phoneNumberId: string | null;
  wabaId: string | null;
  displayPhone: string | null;
  displayName: string | null;
  qualityRating: string | null;
  status: string | null;
  messagingLimit: string | null;
  defaultHandlerId: string | null;
  hasAccessToken: boolean;
  hasAppSecret: boolean;
  verifyToken: string | null;
  webhookPath: string;
  secretsReady: boolean;
}
interface Health {
  lastWebhookAt: string | null;
  received: number;
  processed: number;
  pending: number;
  failed: number;
  failures: { error: string; count: number }[];
  mediaPending: number;
  mediaUnavailable: number;
}
interface Values {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  appSecret: string;
  defaultHandlerId: string;
}
type Errors = Partial<Record<keyof Values, string>>;

const NONE = '__none__';
const valuesOf = (connection: Connection): Values => ({
  phoneNumberId: connection.phoneNumberId ?? '',
  wabaId: connection.wabaId ?? '',
  accessToken: '',
  appSecret: '',
  defaultHandlerId: connection.defaultHandlerId ?? '',
});

export default function WhatsAppSettingsPage(): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const queryClient = useQueryClient();
  const connectionKey = [...scopeKey, 'whatsapp/connection'];
  const healthKey = [...scopeKey, 'whatsapp/health'];
  const connection = useQuery({
    queryKey: connectionKey,
    queryFn: () =>
      api<{ data: Connection }>('whatsapp/connection').then((r) => r.data),
  });
  const health = useQuery({
    queryKey: healthKey,
    queryFn: () => api<{ data: Health }>('whatsapp/health').then((r) => r.data),
  });
  const refreshing = connection.isFetching || health.isFetching;
  const refresh = () => {
    void connection.refetch();
    void health.refetch();
  };
  return (
    <PageContainer>
      <PageHeader
        title={toText(text('navigation.whatsapp'))}
        description={toText(text('whatsappSettings.description'))}
        actions={
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant='outline'
                  size='icon'
                  aria-label={toText(text('refresh'))}
                  disabled={refreshing}
                  onClick={refresh}
                />
              }
            >
              <RefreshCwIcon className={refreshing ? 'animate-spin' : ''} />
            </TooltipTrigger>
            <TooltipContent>{text('refresh')}</TooltipContent>
          </Tooltip>
        }
      />
      <div className='flex max-w-4xl flex-col gap-6'>
        {connection.data && !connection.data.secretsReady ? (
          <Alert variant='destructive'>
            <AlertDescription>{text('errors.secretsMissing')}</AlertDescription>
          </Alert>
        ) : null}
        <SettingsCard
          title={toText(text('whatsappSettings.connection'))}
          description={toText(text('whatsappSettings.connectionBody'))}
        >
          {connection.error && !connection.data ? (
            <CardContent>
              <LoadFailure
                error={connection.error}
                what={toText(text('whatsappSettings.whatConnection'))}
                onRetry={() => void connection.refetch()}
              />
            </CardContent>
          ) : connection.data ? (
            <ConnectionForm
              connection={connection.data}
              onSaved={(next) => {
                queryClient.setQueryData(connectionKey, next);
                void queryClient.invalidateQueries({
                  queryKey: [...scopeKey, 'workspace'],
                });
              }}
            />
          ) : (
            <FieldsSkeleton rows={5} />
          )}
        </SettingsCard>
        <SettingsCard
          title={toText(text('whatsappSettings.webhook'))}
          description={toText(text('whatsappSettings.webhookBody'))}
        >
          {connection.data ? (
            <Webhook connection={connection.data} />
          ) : connection.error ? (
            <CardContent>
              <LoadFailure
                error={connection.error}
                what={toText(text('whatsappSettings.whatConnection'))}
                onRetry={() => void connection.refetch()}
              />
            </CardContent>
          ) : (
            <FieldsSkeleton rows={2} />
          )}
        </SettingsCard>
        <SettingsCard
          title={toText(text('whatsappSettings.status'))}
          description={toText(text('whatsappSettings.statusBody'))}
        >
          {health.error && !health.data ? (
            <CardContent>
              <LoadFailure
                error={health.error}
                what={toText(text('whatsappSettings.whatStatus'))}
                onRetry={() => void health.refetch()}
              />
            </CardContent>
          ) : health.data && (connection.data || connection.error) ? (
            // Without the connection (its own card says why), the
            // deliveries still show; the number's rows read "—".
            <Status
              connection={connection.data}
              health={health.data}
              refresh={refresh}
            />
          ) : (
            <FieldsSkeleton rows={4} />
          )}
        </SettingsCard>
      </div>
    </PageContainer>
  );
}

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}): ReactElement {
  return (
    <Card className='border border-border shadow-xs ring-0'>
      <CardHeader>
        <CardTitle className='text-base font-medium'>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {children}
    </Card>
  );
}

function FieldsSkeleton({ rows }: { rows: number }): ReactElement {
  const { text } = useCrmText();
  return (
    <CardContent>
      <div
        role='status'
        aria-label={toText(text('loading'))}
        className='flex flex-col gap-4'
      >
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className='flex flex-col gap-2'>
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-9 w-full' />
          </div>
        ))}
      </div>
    </CardContent>
  );
}

function ConnectionForm({
  connection,
  onSaved,
}: {
  connection: Connection;
  onSaved: (next: Connection) => void;
}): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const toaster = useToaster();
  const { data: meta } = useMetadata();
  const [values, setValues] = useState<Values>(() => valuesOf(connection));
  const [saved, setSaved] = useState<Values>(() => valuesOf(connection));
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [rootError, setRootError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const dirty = (Object.keys(values) as (keyof Values)[]).some(
    (key) => values[key] !== saved[key],
  );
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  useNavigationGuard(
    () =>
      !dirtyRef.current ||
      window.confirm(toText(text('whatsappSettings.leaveConfirm'))),
  );
  // Closing or reloading the tab asks too.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent): void => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const validate = (next: Values): Errors => {
    const found: Errors = {};
    if (!/^\d{5,32}$/.test(next.phoneNumberId.trim()))
      found.phoneNumberId = toText(text('whatsappSettings.phoneInvalid'));
    if (!connection.hasAccessToken && !next.accessToken.trim())
      found.accessToken = toText(text('whatsappSettings.enterToken'));
    if (!connection.hasAppSecret && !next.appSecret.trim())
      found.appSecret = toText(text('whatsappSettings.enterSecret'));
    return found;
  };
  const set = (key: keyof Values, value: string) => {
    const next = { ...values, [key]: value };
    setValues(next);
    // After a failed save a field is checked again as it changes (T3.3).
    if (submitted) setErrors(validate(next));
  };
  const focusFirst = (found: Errors) => {
    const first = (['phoneNumberId', 'accessToken', 'appSecret'] as const).find(
      (key) => found[key],
    );
    if (first)
      formRef.current
        ?.querySelector<HTMLElement>(`#${FORM_ID}-${first}`)
        ?.focus();
  };
  const save = async () => {
    setSubmitted(true);
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) {
      focusFirst(found);
      return;
    }
    setSaving(true);
    setRootError(undefined);
    try {
      const { data } = await api<{ data: Connection }>(
        'whatsapp/connection',
        'PUT',
        {
          phoneNumberId: values.phoneNumberId.trim(),
          wabaId: values.wabaId.trim() || null,
          defaultHandlerId: values.defaultHandlerId || null,
          ...(values.accessToken.trim()
            ? { accessToken: values.accessToken.trim() }
            : {}),
          ...(values.appSecret.trim()
            ? { appSecret: values.appSecret.trim() }
            : {}),
        },
      );
      const next = valuesOf(data);
      setValues(next);
      setSaved(next);
      setSubmitted(false);
      onSaved(data);
      toaster.show({
        type: 'success',
        title: toText(text('whatsappSettings.saved')),
      });
    } catch (error) {
      const { code, field } = errorCode(error);
      if (field === 'phoneNumberId') {
        const fieldError = {
          phoneNumberId: toText(text('whatsappSettings.phoneInvalid')),
        };
        setErrors(fieldError);
        focusFirst(fieldError);
      } else
        setRootError(
          toText(
            text(`errors.${code}`, {
              defaultValue: text('errors.serverError'),
            }),
          ),
        );
    } finally {
      setSaving(false);
    }
  };
  const users = (meta?.users ?? []).filter(
    (u) => !u.disabled && u.roles.length,
  );
  const userItems = [
    { value: NONE, label: toText(text('whatsappSettings.none')) },
    ...users.map((u) => ({ value: u.id, label: u.name })),
  ];
  return (
    <form
      ref={formRef}
      id={FORM_ID}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <CardContent>
        <fieldset disabled={saving} className='flex min-w-0 flex-col gap-5'>
          {rootError ? (
            <Alert variant='destructive'>
              <AlertDescription>{rootError}</AlertDescription>
            </Alert>
          ) : null}
          <TextField
            formId={FORM_ID}
            name='phoneNumberId'
            label={toText(text('whatsappSettings.phoneNumberId'))}
            required
            maxLength={32}
            value={values.phoneNumberId}
            onChange={(value) => set('phoneNumberId', value)}
            error={errors.phoneNumberId}
          />
          <TextField
            formId={FORM_ID}
            name='wabaId'
            label={toText(text('whatsappSettings.wabaId'))}
            maxLength={32}
            value={values.wabaId}
            onChange={(value) => set('wabaId', value)}
          />
          <TextField
            formId={FORM_ID}
            name='accessToken'
            type='password'
            autoComplete='new-password'
            label={toText(text('whatsappSettings.accessToken'))}
            required={!connection.hasAccessToken}
            hint={
              connection.hasAccessToken
                ? toText(text('whatsappSettings.secretSet'))
                : undefined
            }
            maxLength={1024}
            value={values.accessToken}
            onChange={(value) => set('accessToken', value)}
            error={errors.accessToken}
          />
          <TextField
            formId={FORM_ID}
            name='appSecret'
            type='password'
            autoComplete='new-password'
            label={toText(text('whatsappSettings.appSecret'))}
            required={!connection.hasAppSecret}
            hint={
              connection.hasAppSecret
                ? toText(text('whatsappSettings.secretSet'))
                : undefined
            }
            maxLength={256}
            value={values.appSecret}
            onChange={(value) => set('appSecret', value)}
            error={errors.appSecret}
          />
          <Field>
            <FieldLabel htmlFor={`${FORM_ID}-receptionist`}>
              {text('whatsappSettings.receptionist')}
            </FieldLabel>
            <Select
              items={userItems}
              value={values.defaultHandlerId || NONE}
              onValueChange={(value) =>
                set('defaultHandlerId', value === NONE ? '' : String(value))
              }
            >
              <SelectTrigger
                id={`${FORM_ID}-receptionist`}
                className='w-full sm:w-72'
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={SELECT_CONTENT}>
                <SelectGroup>
                  {userItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              {text('whatsappSettings.receptionistHint')}
            </FieldDescription>
          </Field>
        </fieldset>
      </CardContent>
      <CardFooter className='justify-end'>
        <Button type='submit' disabled={saving}>
          {saving ? <Spinner data-icon='inline-start' /> : null}
          {text('whatsappSettings.save')}
        </Button>
      </CardFooter>
    </form>
  );
}

function CopyButton({
  value,
  label,
}: {
  value: string;
  label: string;
}): ReactElement {
  const { text } = useCrmText();
  const toaster = useToaster();
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type='button'
            variant='outline'
            size='icon-sm'
            aria-label={label}
            onClick={() =>
              void (
                navigator.clipboard?.writeText(value) ??
                Promise.reject(new Error('no clipboard'))
              )
                .then(() =>
                  toaster.show({
                    type: 'success',
                    title: toText(text('copiedValue')),
                  }),
                )
                .catch(() =>
                  toaster.show({
                    type: 'error',
                    title: toText(text('whatsappSettings.copyFailed')),
                  }),
                )
            }
          />
        }
      >
        <CopyIcon />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div className='grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-4'>
      <dt className='text-sm text-muted-foreground'>{label}</dt>
      <dd className='min-w-0 text-sm'>{children}</dd>
    </div>
  );
}

function Webhook({ connection }: { connection: Connection }): ReactElement {
  const { text } = useCrmText();
  const [shown, setShown] = useState(false);
  const url = `${window.location.origin}${connection.webhookPath}`;
  const token = connection.verifyToken;
  return (
    <CardContent>
      <dl className='flex flex-col gap-4'>
        <Row label={toText(text('whatsappSettings.callbackUrl'))}>
          <span className='flex items-start gap-2'>
            <code className='min-w-0 font-mono text-xs break-all'>{url}</code>
            <CopyButton
              value={url}
              label={toText(text('whatsappSettings.copyUrl'))}
            />
          </span>
        </Row>
        <Row label={toText(text('whatsappSettings.verifyToken'))}>
          {token ? (
            <span className='flex flex-wrap items-center gap-2'>
              <code className='min-w-0 font-mono text-xs break-all'>
                {shown ? token : '••••••••••••'}
              </code>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setShown(!shown)}
              >
                {text(
                  shown ? 'whatsappSettings.hide' : 'whatsappSettings.show',
                )}
              </Button>
              <CopyButton
                value={token}
                label={toText(text('whatsappSettings.copyToken'))}
              />
            </span>
          ) : (
            <span className='text-muted-foreground'>
              {text('whatsappSettings.tokenLater')}
            </span>
          )}
        </Row>
      </dl>
    </CardContent>
  );
}

const QUALITIES = ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'];
const LIMITS = [
  'TIER_250',
  'TIER_1K',
  'TIER_10K',
  'TIER_100K',
  'TIER_UNLIMITED',
];
const FAILURES = ['unknownNumber', 'invalidJson', 'processingFailed'];

function Status({
  connection,
  health,
  refresh,
}: {
  connection?: Connection;
  health: Health;
  refresh: () => void;
}): ReactElement {
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const toaster = useToaster();
  const [busy, setBusy] = useState<'check' | 'retry'>();
  const number = (value: number) => value.toLocaleString(language);
  const known = (value: string | null, list: string[], group: string) =>
    value
      ? toText(
          text(
            `whatsappSettings.${group}.${list.includes(value) ? value : 'other'}`,
          ),
        )
      : '—';
  const check = () => {
    setBusy('check');
    api<{
      data: {
        ok: boolean;
        reason?: string;
        standing?: { displayName?: string };
      };
    }>('whatsapp/connection/check', 'POST')
      .then(({ data }) => {
        if (data.ok)
          toaster.show({
            type: 'success',
            title: toText(
              text('whatsappSettings.checked', {
                name:
                  data.standing?.displayName ?? connection?.phoneNumberId ?? '',
              }),
            ),
          });
        else {
          const reason = data.reason ?? 'other';
          toaster.show({
            type: 'error',
            title: toText(
              text(`whatsappSettings.checkReason.${reason}`, {
                defaultValue: text('whatsappSettings.checkReason.other'),
              }),
            ),
          });
        }
        refresh();
      })
      .catch((error: unknown) =>
        toaster.show({
          type: 'error',
          title: toText(
            text(
              error instanceof ApiClientError && error.status === 403
                ? 'errors.forbidden'
                : 'whatsappSettings.checkReason.other',
            ),
          ),
        }),
      )
      .finally(() => setBusy(undefined));
  };
  const retry = () => {
    setBusy('retry');
    api('whatsapp/health/retry', 'POST')
      .then(() => {
        toaster.show({
          type: 'success',
          title: toText(
            text('whatsappSettings.retrying', { count: health.failed }),
          ),
        });
        refresh();
      })
      .catch(() =>
        toaster.show({
          type: 'error',
          title: toText(text('errors.serverError')),
        }),
      )
      .finally(() => setBusy(undefined));
  };
  const time = (at: string | null) =>
    at
      ? new Intl.DateTimeFormat(language, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(at))
      : toText(text('whatsappSettings.never'));
  return (
    <>
      <CardContent>
        <dl className='flex flex-col gap-3'>
          <Row label={toText(text('whatsappSettings.number'))}>
            {connection?.phoneNumberId ? (
              [
                connection.displayPhone ?? connection.phoneNumberId,
                connection.displayName,
              ]
                .filter(Boolean)
                .join(' · ')
            ) : (
              <span className='text-muted-foreground'>
                {text('whatsappSettings.notConnected')}
              </span>
            )}
          </Row>
          <Row label={toText(text('whatsappSettings.quality'))}>
            {known(connection?.qualityRating ?? null, QUALITIES, 'qualities')}
          </Row>
          <Row label={toText(text('whatsappSettings.limit'))}>
            {known(connection?.messagingLimit ?? null, LIMITS, 'limits')}
          </Row>
          <Row label={toText(text('whatsappSettings.lastDelivery'))}>
            {time(health.lastWebhookAt)}
          </Row>
          <Row label={toText(text('whatsappSettings.deliveries'))}>
            {[
              `${toText(text('whatsappSettings.received'))} ${number(health.received)}`,
              `${toText(text('whatsappSettings.processed'))} ${number(health.processed)}`,
              `${toText(text('whatsappSettings.waiting'))} ${number(health.pending)}`,
              `${toText(text('whatsappSettings.failed'))} ${number(health.failed)}`,
            ].join(' · ')}
          </Row>
          {health.failures.length ? (
            <Row label={toText(text('whatsappSettings.failures'))}>
              <ul className='flex flex-col gap-1'>
                {health.failures.map((failure) => (
                  <li key={failure.error}>
                    {toText(
                      text(
                        `whatsappSettings.failureReasons.${
                          FAILURES.includes(failure.error)
                            ? failure.error
                            : 'other'
                        }`,
                      ),
                    )}{' '}
                    ×{number(failure.count)}
                  </li>
                ))}
              </ul>
            </Row>
          ) : null}
          <Row label={toText(text('whatsappSettings.files'))}>
            {`${toText(text('whatsappSettings.filesWaiting'))} ${number(health.mediaPending)} · ${toText(text('whatsappSettings.filesUnavailable'))} ${number(health.mediaUnavailable)}`}
          </Row>
        </dl>
      </CardContent>
      <CardFooter className='flex-wrap justify-end gap-2'>
        {health.failed > 0 ? (
          <Button variant='outline' disabled={busy === 'retry'} onClick={retry}>
            {busy === 'retry' ? <Spinner data-icon='inline-start' /> : null}
            {text('whatsappSettings.retry')}
          </Button>
        ) : null}
        <Button
          variant='outline'
          disabled={!connection?.configured || busy === 'check'}
          onClick={check}
        >
          {busy === 'check' ? <Spinner data-icon='inline-start' /> : null}
          {text('whatsappSettings.check')}
        </Button>
      </CardFooter>
    </>
  );
}
