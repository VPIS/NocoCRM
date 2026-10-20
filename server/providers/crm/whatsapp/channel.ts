import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

// The WhatsApp channel as Meta's Cloud API defines it: verifying a webhook
// delivery, reading what it carries, and fetching a message's media and a
// number's standing. Everything the CRM does with a message (who the
// customer is, which records it reaches, the timeline, the follow-ups)
// depends on this file's types alone, so another way to the same API (a
// provider proxying the Cloud API) replaces only the base address, the
// authorization and the signature check (`WhatsAppChannel`). The Graph API
// version is pinned; Meta supports each version for about two years.

export const GRAPH_BASE = 'https://graph.facebook.com/v25.0';

// What a delivery tells of one message of a conversation with a customer:
// one the customer sent (`messages`), and with coexistence, a number also
// used on the WhatsApp Business app, one the team sent from the app
// (`smb_message_echoes`) and those of the chat history imported once after
// onboarding (`history`), either way.
export interface InboundMessage {
  readonly kind: 'message';
  // The number of the business (Meta's phone number id).
  readonly phoneNumberId: string;
  readonly waMessageId: string;
  // `in` from the customer, `out` from the team.
  readonly direction: 'in' | 'out';
  // customer: a customer's message as it arrives; businessApp: the team's,
  // sent from the app; imported: the history's, either way.
  readonly origin: 'customer' | 'businessApp' | 'imported';
  // The customer's ids, whoever wrote it. Meta's business-scoped user id;
  // every delivery carries one since April 2026, older ones only the number.
  readonly userId?: string;
  // The customer's number as Meta gives it (digits without "+"), absent
  // for a customer who uses a username and has not shared it.
  readonly waId?: string;
  readonly username?: string;
  readonly profileName?: string;
  readonly type: string;
  readonly text?: string;
  readonly caption?: string;
  readonly media?: {
    readonly id: string;
    readonly mimeType?: string;
    readonly sha256?: string;
    readonly filename?: string;
    // The download address some deliveries carry (from November 2025),
    // valid for five minutes.
    readonly url?: string;
  };
  readonly replyTo?: string;
  // A system message telling that the customer changed their number: the
  // ids they now have.
  readonly changedTo?: { readonly userId?: string; readonly waId?: string };
  // The team edited a message it sent from the app: the message, and its
  // new words (`text`, `caption`).
  readonly edits?: string;
  // The team deleted a message it sent from the app.
  readonly revokes?: string;
  readonly occurredAt: string;
}

// What a delivery tells of a message the team sent.
export interface StatusUpdate {
  readonly kind: 'status';
  readonly phoneNumberId: string;
  readonly waMessageId: string;
  readonly status: string;
  readonly errorCode?: string;
  readonly pricingCategory?: string;
  readonly billable?: boolean;
  readonly occurredAt: string;
}

export type WebhookEvent = InboundMessage | StatusUpdate;

export interface DownloadedMedia {
  readonly data: Uint8Array;
  readonly mimeType: string;
}

export interface NumberStanding {
  readonly displayPhone?: string;
  readonly displayName?: string;
  readonly qualityRating?: string;
  readonly status?: string;
  readonly messagingLimit?: string;
}

// A message the team sends from the CRM: words, or a picture or a file
// with its caption, to the customer's WhatsApp number (`to`, digits).
export interface OutboundMessage {
  readonly to: string;
  readonly text?: string;
  readonly media?: {
    readonly kind: 'image' | 'document';
    readonly data: Uint8Array;
    readonly mimeType: string;
    readonly filename: string;
    readonly caption?: string;
  };
}

export interface WhatsAppChannel {
  // Whether the body is Meta's, by its X-Hub-Signature-256 header.
  verify(body: Uint8Array, signature: string | undefined): boolean;
  media(media: NonNullable<InboundMessage['media']>): Promise<DownloadedMedia>;
  standing(phoneNumberId: string): Promise<NumberStanding>;
  // Sends from the number; Meta's id for the message, whose statuses
  // arrive by webhook.
  send(
    phoneNumberId: string,
    message: OutboundMessage,
  ): Promise<{ waMessageId: string }>;
}

export class ChannelError extends Error {
  constructor(
    // A short reason a person can act on: http_401, http_404, network,
    // checksum, size…
    readonly reason: string,
    // Whether trying again may succeed.
    readonly transient: boolean,
  ) {
    super(reason);
  }
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

// A file larger than this is not stored (Meta's limit for a document).
export const MEDIA_LIMIT = 100 * 1024 * 1024;

export function cloudApiChannel(options: {
  readonly appSecret: string;
  readonly accessToken: string;
  readonly base?: string;
  readonly fetch?: Fetch;
}): WhatsAppChannel {
  const base = options.base ?? GRAPH_BASE;
  const fetcher: Fetch = options.fetch ?? fetch;
  const authorized = async (url: string): Promise<Response> => {
    let response: Response;
    try {
      response = await fetcher(url, {
        headers: { authorization: `Bearer ${options.accessToken}` },
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      throw new ChannelError('network', true);
    }
    if (!response.ok)
      throw new ChannelError(
        `http_${response.status}`,
        response.status === 429 || response.status >= 500,
      );
    return response;
  };
  // A request Meta answers with JSON; refused, the reason is Meta's error
  // code (`meta_131047`, the 24-hour window closed) when it gives one.
  const posted = async (
    url: string,
    body: string | FormData,
  ): Promise<unknown> => {
    let response: Response;
    try {
      response = await fetcher(url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${options.accessToken}`,
          ...(typeof body === 'string'
            ? { 'content-type': 'application/json' }
            : {}),
        },
        body,
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      throw new ChannelError('network', true);
    }
    const read = (await response.json().catch(() => ({}))) as {
      error?: { code?: number };
    };
    if (!response.ok)
      throw new ChannelError(
        read.error?.code
          ? `meta_${String(read.error.code)}`
          : `http_${response.status}`,
        response.status === 429 || response.status >= 500,
      );
    return read;
  };
  return {
    verify: (body, signature) =>
      verifySignature(options.appSecret, body, signature),
    async send(phoneNumberId, message) {
      const number = `${base}/${encodeURIComponent(phoneNumberId)}`;
      let content: Record<string, unknown>;
      if (message.media) {
        // The file goes to Meta first; the message names it by id.
        const form = new FormData();
        form.append('messaging_product', 'whatsapp');
        form.append('type', message.media.mimeType);
        form.append(
          'file',
          new Blob([new Uint8Array(message.media.data)], {
            type: message.media.mimeType,
          }),
          message.media.filename,
        );
        const uploaded = (await posted(`${number}/media`, form)) as {
          id?: string;
        };
        if (!uploaded.id) throw new ChannelError('no_media_id', false);
        content = {
          type: message.media.kind,
          [message.media.kind]: {
            id: uploaded.id,
            ...(message.media.caption
              ? { caption: message.media.caption }
              : {}),
            ...(message.media.kind === 'document'
              ? { filename: message.media.filename }
              : {}),
          },
        };
      } else
        content = {
          type: 'text',
          text: { body: message.text ?? '', preview_url: false },
        };
      const sent = (await posted(
        `${number}/messages`,
        JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: message.to,
          ...content,
        }),
      )) as { messages?: { id?: string }[] };
      const waMessageId = sent.messages?.[0]?.id;
      if (!waMessageId) throw new ChannelError('no_message_id', false);
      return { waMessageId };
    },
    async media(media) {
      let url = media.url;
      let mimeType = media.mimeType;
      if (!url) {
        const described = (await (
          await authorized(`${base}/${encodeURIComponent(media.id)}`)
        ).json()) as { url?: string; mime_type?: string };
        if (!described.url) throw new ChannelError('no_url', false);
        url = described.url;
        mimeType ??= described.mime_type;
      }
      const response = await authorized(url);
      const size = Number(response.headers.get('content-length') ?? 0);
      if (size > MEDIA_LIMIT) throw new ChannelError('size', false);
      const data = new Uint8Array(await response.arrayBuffer());
      if (data.byteLength > MEDIA_LIMIT) throw new ChannelError('size', false);
      if (media.sha256 && !sameDigest(data, media.sha256))
        throw new ChannelError('checksum', true);
      return {
        data,
        mimeType:
          mimeType ??
          response.headers.get('content-type') ??
          'application/octet-stream',
      };
    },
    async standing(phoneNumberId) {
      const fields = [
        'display_phone_number',
        'verified_name',
        'quality_rating',
        'status',
        'messaging_limit_tier',
      ].join(',');
      const read = (await (
        await authorized(
          `${base}/${encodeURIComponent(phoneNumberId)}?fields=${fields}`,
        )
      ).json()) as Record<string, unknown>;
      const text = (key: string): string | undefined =>
        typeof read[key] === 'string' ? read[key] : undefined;
      return {
        displayPhone: text('display_phone_number'),
        displayName: text('verified_name'),
        qualityRating: text('quality_rating'),
        status: text('status'),
        messagingLimit: text('messaging_limit_tier'),
      };
    },
  };
}

// Meta signs each delivery with the app secret: "sha256=" and the HMAC of
// the raw body, which is compared as sent, before anything parses it.
export function verifySignature(
  appSecret: string,
  body: Uint8Array,
  signature: string | undefined,
): boolean {
  if (!appSecret || !signature?.startsWith('sha256=')) return false;
  const given = Buffer.from(signature.slice(7), 'hex');
  const expected = createHmac('sha256', appSecret).update(body).digest();
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Meta gives a media file's SHA-256 in hex (some versions in base64).
function sameDigest(data: Uint8Array, digest: string): boolean {
  const actual = createHash('sha256').update(data).digest();
  const wanted = digest.trim();
  return /^[0-9a-f]{64}$/i.test(wanted)
    ? actual.toString('hex') === wanted.toLowerCase()
    : actual.toString('base64') === wanted;
}

const MEDIA_TYPES = new Set(['image', 'document', 'audio', 'video', 'sticker']);

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}
// A number or a string as text; anything else is not one.
function scalar(value: unknown): string | undefined {
  return typeof value === 'number' || (typeof value === 'string' && value)
    ? String(value)
    : undefined;
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record) : [];
}
// A Unix timestamp in seconds, as Meta sends it, as an instant.
function instant(value: unknown, fallback: string): string {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : fallback;
}

// The messages and status updates a webhook delivery carries, in its own
// order (which need not be the order they happened in). Anything else it
// holds (template and account updates) is left for later stages.
// One message object as Meta gives it, in any of the three fields; `who`
// is the customer's side of it.
function readMessage(
  message: Record<string, unknown>,
  context: {
    phoneNumberId: string;
    receivedAt: string;
    direction: 'in' | 'out';
    origin: InboundMessage['origin'];
    who: {
      userId?: string;
      waId?: string;
      username?: string;
      profileName?: string;
    };
  },
): InboundMessage | undefined {
  const waMessageId = text(message.id);
  if (!waMessageId) return undefined;
  let type = text(message.type) ?? 'unsupported';
  let content = record(message[type]);
  const system = record(message.system);
  const interactive = record(message.interactive);
  const reply =
    record(interactive.button_reply).title ??
    record(interactive.list_reply).title;
  // An edit carries the message as it now reads, keyed by its own type.
  const edit = type === 'edit' ? record(content.message) : undefined;
  const edits = type === 'edit' ? text(content.original_message_id) : undefined;
  const revokes =
    type === 'revoke' ? text(content.original_message_id) : undefined;
  if (edit) {
    type = text(edit.type) ?? (edit.text ? 'text' : 'unsupported');
    content = record(edit[type]);
  }
  return {
    kind: 'message',
    phoneNumberId: context.phoneNumberId,
    waMessageId,
    direction: context.direction,
    origin: context.origin,
    ...context.who,
    type,
    text:
      type === 'text'
        ? text(content.body)
        : type === 'button'
          ? text(content.text)
          : type === 'interactive'
            ? text(reply)
            : type === 'reaction'
              ? text(content.emoji)
              : type === 'location'
                ? [content.name, content.address]
                    .map(text)
                    .filter(Boolean)
                    .join(', ') ||
                  `${scalar(content.latitude) ?? ''}, ${scalar(content.longitude) ?? ''}`
                : type === 'system'
                  ? text(system.body)
                  : undefined,
    caption: MEDIA_TYPES.has(type) ? text(content.caption) : undefined,
    media:
      MEDIA_TYPES.has(type) && text(content.id)
        ? {
            id: text(content.id) ?? '',
            mimeType: text(content.mime_type),
            sha256: text(content.sha256),
            filename: text(content.filename),
            url: text(content.url),
          }
        : undefined,
    replyTo:
      type === 'reaction'
        ? text(content.message_id)
        : text(record(message.context).id),
    changedTo:
      type === 'system' && system.type === 'user_changed_number'
        ? {
            userId: text(system.new_user_id),
            waId: text(system.new_wa_id) ?? text(system.wa_id),
          }
        : undefined,
    ...(edits ? { edits } : {}),
    ...(revokes ? { revokes } : {}),
    occurredAt: instant(message.timestamp, context.receivedAt),
  };
}

export function webhookEvents(
  payload: unknown,
  receivedAt: string,
): WebhookEvent[] {
  const events: WebhookEvent[] = [];
  const body = record(payload);
  if (body.object !== 'whatsapp_business_account') return events;
  const push = (event: InboundMessage | undefined): void => {
    if (event) events.push(event);
  };
  for (const entry of list(body.entry))
    for (const change of list(entry.changes)) {
      const value = record(change.value);
      const phoneNumberId = text(record(value.metadata).phone_number_id);
      if (!phoneNumberId) continue;
      // Coexistence: what the team sent from the WhatsApp Business app, to
      // the customer the echo names.
      if (change.field === 'smb_message_echoes') {
        for (const message of list(value.message_echoes))
          push(
            readMessage(message, {
              phoneNumberId,
              receivedAt,
              direction: 'out',
              origin: 'businessApp',
              who: {
                userId: text(message.to_user_id),
                waId: text(message.to),
              },
            }),
          );
        continue;
      }
      // Coexistence: the chat history, sent once after onboarding in
      // chunks, a thread a customer (its id their number); a message from
      // that number is the customer's, any other the team's. A business
      // that declined to share it sends only errors.
      if (change.field === 'history') {
        for (const item of list(value.history))
          for (const thread of list(item.threads)) {
            const waId = text(thread.id);
            for (const message of list(thread.messages)) {
              const fromCustomer = !waId || text(message.from) === waId;
              push(
                readMessage(message, {
                  phoneNumberId,
                  receivedAt,
                  direction: fromCustomer ? 'in' : 'out',
                  origin: 'imported',
                  who: {
                    userId: text(
                      fromCustomer ? message.from_user_id : message.to_user_id,
                    ),
                    waId,
                  },
                }),
              );
            }
          }
        continue;
      }
      if (change.field !== 'messages') continue;
      const people = list(value.contacts);
      for (const message of list(value.messages)) {
        const from = text(message.from);
        const fromUser = text(message.from_user_id);
        // The sender's profile: the contact with the same id or number,
        // else the only one given.
        const person =
          people.find(
            (p) =>
              (fromUser && text(p.user_id) === fromUser) ||
              (from && text(p.wa_id) === from),
          ) ?? (people.length === 1 ? people[0] : {});
        const profile = record(person.profile);
        push(
          readMessage(message, {
            phoneNumberId,
            receivedAt,
            direction: 'in',
            origin: 'customer',
            who: {
              userId: fromUser ?? text(person.user_id),
              waId: from ?? text(person.wa_id),
              username: text(profile.username) ?? text(person.username),
              profileName: text(profile.name),
            },
          }),
        );
      }
      for (const status of list(value.statuses)) {
        const waMessageId = text(status.id);
        const state = text(status.status);
        if (!waMessageId || !state) continue;
        const pricing = record(status.pricing);
        const error = list(status.errors)[0];
        events.push({
          kind: 'status',
          phoneNumberId,
          waMessageId,
          status: state,
          errorCode: scalar(error?.code),
          pricingCategory: text(pricing.category),
          billable:
            typeof pricing.billable === 'boolean'
              ? pricing.billable
              : undefined,
          occurredAt: instant(status.timestamp, receivedAt),
        });
      }
    }
  return events;
}
