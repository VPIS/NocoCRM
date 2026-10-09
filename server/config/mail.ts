import {
  defineAppConfig,
  envInteger,
  envString,
  type AppConfigFactory,
} from '@nocobase/app-server/config';
import {
  DEFAULT_MAIL_CONFIG,
  type MailConfig,
} from '@nocobase/app-plugin-mail/server';

/**
 * The Mail plugin's section: user mailboxes connected in the CRM, separate from
 * the notification channels under `notification`. Mailbox servers are declared
 * in config.yml under `mail.providers`, keyed by a stable name that connected
 * accounts keep; `config.example.yml` shows the shapes.
 *
 * The plugin's `mailEnvironmentMappings` are written for an application-level
 * environment file this template does not have, so the same variables are
 * declared here, relative to the section, as every other section does.
 */
const mail: AppConfigFactory<MailConfig> = defineAppConfig({
  defaults: {
    ...DEFAULT_MAIL_CONFIG,
    // After Google or Microsoft authorization the browser returns to the CRM's
    // own accounts page, not the plugin's development page.
    oauthReturnUrl: '/crm/mail/accounts',
    // Every minute rather than the plugin's five, the least it allows: a
    // customer's reply reaches the record's timeline, and starts the AI's
    // follow-up, within a minute or two (mail-timeline.ts).
    automaticSyncIntervalMs: 60_000,
  },
  env: {
    MAIL_OAUTH_CALLBACK_URL: envString('oauthCallbackUrl', {
      description:
        'The OAuth callback mail providers redirect to, relative to the base path or absolute.',
    }),
    MAIL_OAUTH_RETURN_URL: envString('oauthReturnUrl', {
      description:
        'The page the browser returns to after mailbox authorization.',
    }),
    MAIL_AUTOMATIC_SYNC_INTERVAL_MS: envInteger('automaticSyncIntervalMs', {
      description:
        'How often connected mailboxes are synchronized, in milliseconds.',
    }),
    MAIL_SYNC_BATCH_SIZE: envInteger('syncBatchSize', {
      description: 'Messages read per synchronization batch.',
    }),
    MAIL_PUSH_WEBHOOK_URL: envString('pushWebhookUrl', {
      description: 'The public base URL of the mail push webhook.',
    }),
    MAIL_PUSH_WEBHOOK_SECRET: envString('pushWebhookSecret', {
      description: 'The secret in the mail push webhook URL.',
      secret: true,
    }),
    MAIL_JOBS: envString('jobs', {
      description: 'The jobs configuration mail synchronization runs on.',
    }),
  },
});

export default mail;
