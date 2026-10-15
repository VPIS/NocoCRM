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

// What a delivery tells of one customer's message.
export interface InboundMessage {
  readonly kind: 'message';
  // The number it was sent to (Meta's phone number id).
  readonly phoneNumberId: string;
  readonly waMessageId: string;
  // Meta's business-scoped user id; every delivery carries one since April
  // 2026, older ones only the number.
  readonly userId?: string;
  // The sender's number as Meta gives it (digits without "+"), absent for a
  // customer who uses a username and has not shared it.
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

export interface WhatsAppChannel {
  // Whether the body is Meta's, by its X-Hub-Signature-256 header.
  verify(body: Uint8Array, signature: string | undefined): boolean;
  media(media: NonNullable<InboundMessage['media']>): Promise<DownloadedMedia>;
  standing(phoneNumberId: string): Promise<NumberStanding>;
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
  return {
    verify: (body, signature) =>
      verifySignature(options.appSecret, body, signature),
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
export function webhookEvents(
  payload: unknown,
  receivedAt: string,
): WebhookEvent[] {
  const events: WebhookEvent[] = [];
  const body = record(payload);
  if (body.object !== 'whatsapp_business_account') return events;
  for (const entry of list(body.entry))
    for (const change of list(entry.changes)) {
      if (change.field !== 'messages') continue;
      const value = record(change.value);
      const phoneNumberId = text(record(value.metadata).phone_number_id);
      if (!phoneNumberId) continue;
      const people = list(value.contacts);
      for (const message of list(value.messages)) {
        const waMessageId = text(message.id);
        if (!waMessageId) continue;
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
        const type = text(message.type) ?? 'unsupported';
        const content = record(message[type]);
        const system = record(message.system);
        const interactive = record(message.interactive);
        const reply =
          record(interactive.button_reply).title ??
          record(interactive.list_reply).title;
        events.push({
          kind: 'message',
          phoneNumberId,
          waMessageId,
          userId: fromUser ?? text(person.user_id),
          waId: from ?? text(person.wa_id),
          username: text(profile.username) ?? text(person.username),
          profileName: text(profile.name),
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
          occurredAt: instant(message.timestamp, receivedAt),
        });
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
