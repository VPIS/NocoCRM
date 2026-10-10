# NocoCRM

A CRM for B2B sales built on [NocoBase 3](https://www.nocobase.com), the open-source enterprise application development platform built for AI: leads, companies, contacts, opportunities, tasks, approvals, a team workspace, in-app notifications, and an AI assistant that works from the records a user may see and proposes every change for the user to confirm.

## What NocoCRM does

- **Records.** Leads, companies, contacts, opportunities (with each contact's role and the sales stages from first contact to won, lost or paused), tasks (anything to do, with or without a time, a record or participants) and approvals (discounts, payment terms, contract terms and commitments), with lists, boards, record pages, timelines, notes (calls and meetings that took place) and attachments.
- **Workspace.** Today's and overdue work, the pipeline and the month's trends, for the reader's own records or the team's.
- **Lead conversion and duplicates.** A lead converts into a company, a contact and an opportunity, checked against existing ones; duplicate leads are found and merged.
- **Roles and access.** Administrator, sales manager and salesperson, enforced per record and per field by the server.
- **The AI assistant, Noco.** A chat panel on every page that answers from the records the user may read, builds reports, searches the web where the model supports it, reads attached files, and proposes changes as cards the user confirms; it writes as that user, never beyond their permissions.
- **AI follow-ups.** New leads, new opportunities, completed tasks and customers' replies get an AI follow-up card with the next step, the gaps, the fields to fill and the terms that need approval, decided under **Waiting on me**. Approvers get a review of each request, and a daily check picks up work that has gone quiet. Pasted text can be organised into new leads or an opportunity.
- **Mail.** Each user connects their own mailbox (IMAP/SMTP, Gmail or Microsoft 365) and reads, writes and sends mail in the CRM. Lead, contact, company and opportunity pages show the user's mail with that customer, and every conversation with a record's people appears on its timeline by itself, as a summary the team sees while the messages stay in their owner's mailbox. An email the AI proposes as the next step opens in the composer, drafted, for the user to send.
- **Sales skills.** The method the AI follows is readable by everyone on **AI → Sales skills**, where a sales manager adds the company's own practice.
- **Languages.** The interface is in English or Chinese. The chat answers in the language of the question; what the AI writes on its own follows the **AI working language** setting.

## Built on NocoBase 3

NocoBase 3 provides the NocoBase App Foundation, the application infrastructure coding agents need not rebuild, and NocoBase Solutions, complete applications to start from. NocoCRM is one of those Solutions: a NocoBase 3 application generated from NocoBase's application template, with its own data model, services, API and pages on top of the App Foundation, which supplies:

| From the App Foundation                      | Used by NocoCRM for                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Application server, database layer and CLI   | The server, migrations, configuration, builds and deployment                                 |
| Application template and UI Library          | Layouts, routing, theme, sign-in pages and the components every page is built from           |
| Authentication, users and authorization      | Sign-in, user management, and the roles as permission sets with record and field permissions |
| AI Employee plugin                           | The chat, LLM services, tool calling, confirmation cards, skills and reports                 |
| Workflow, notification and scheduler plugins | The notification workflows, the in-app inbox and the daily checks                            |
| Mail plugin                                  | Users' mailboxes: sync, reading, writing and sending                                         |
| File and i18n plugins                        | Attachments and their previews, the interface languages                                      |

## Quick start

Use Node 24 or later and the pnpm version pinned in `package.json`.

```bash
pnpm install
pnpm nocobase config init
pnpm dev
```

`config init` writes `config.yml` from `config.example.yml` with a freshly generated key under `secrets.keys` (keep it: what the application stores encrypted cannot be read without it); `pnpm dev` prints the URL to open, `http://127.0.0.1:13000/main/` by default. Sign in with the initial administrator set under `users.initialAdmin` in `config.yml` (`nocobase` / `admin123` unless changed; change it before the first start of a real deployment).

A banner then offers the **demo data**, a sample dataset in English or Chinese imported from **Settings → System settings → Demo data** and removable there. It comes with its own sales accounts, whose password is the username followed by `123`:

| Language | Sales managers                                   | Salespeople                                        |
| -------- | ------------------------------------------------ | -------------------------------------------------- |
| English  | `daniel` (Daniel Brooks), `emily` (Emily Carter) | `sophie` (Sophie Bennett), `oliver` (Oliver Hayes) |
| Chinese  | `liming` (李明), `zhaomin` (赵敏)                | `wangxiaofang` (王小芳), `chenxiaohao` (陈小浩)    |

Each of them, and the administrator who imports, also gets a demo mailbox (`<username>@demo.example`) holding the customer conversations of the dataset, so the mailbox, the records' Mail tabs and the timeline work without connecting a real mailbox. A demo mailbox delivers nothing: mail to the dataset's own `.example` addresses is filed as sent, and mail to anyone else is refused. Removing the demo data removes the mailboxes.

Other accounts are created on **Settings → User management**, where each gets one or more roles; there is no self-registration.

| Role          | What it can do                                                                                |
| ------------- | --------------------------------------------------------------------------------------------- |
| Administrator | Configures the CRM and sees everything, but owns no records and approves nothing              |
| Sales manager | Manages all sales data, assigns owners, approves requests, exports and edits the sales skills |
| Salesperson   | Reads shared sales data, edits its own records and raises approvals                           |

The roles can be adjusted on **Settings → Authorization → Permission Sets**.

## Configuration

`config.yml` is gitignored because it holds the secrets; `config.example.yml` documents every option. Change a value with `pnpm nocobase config set key=value`.

**AI.** Declare at least one LLM service and give it a key from the environment (`DASHSCOPE_API_KEY`, `OPENAI_API_KEY` with `OPENAI_BASE_URL`, `DEEPSEEK_API_KEY` are mapped onto the services named `qwen`, `openai` and `deepseek`):

```yaml
ai:
  llmServices:
    qwen:
      title: Qwen
      provider: dashscope
      enabledModels:
        - label: Qwen3.8 Max
          value: qwen3.8-max
      enabled: true
      sort: 5
```

The assistant is switched on and off with the **Enabled** switch of Noco on **Settings → AI → AI Employees**. Web search works with OpenAI and Qwen, not with DeepSeek. The business guidance in `server/ai/employees/crm-guidance.ts` and the skills in `ai/skills/` hold the sales practice the AI follows; edit them to make it yours.

**Notifications.** In-app notifications need the channel `inbox` (`notification.channels.inbox: { provider: in-app }`, already in `config.example.yml`), and are sent by three workflows that must be enabled once per deployment on **Settings → Automation → Workflows**.

**Mail.** Declare the mail servers users may connect under `mail.providers` (examples in `config.example.yml`); each user then connects their mailbox on **Mail → Mail accounts**. Gmail and Microsoft 365 also need an OAuth client, with `<origin><base path>/mail/oauth/callback` registered as its redirect URL.

**Where it is served.** `APP_BASE_PATH` is the mount path (`/main` by default) and `APP_PUBLIC_ORIGIN` the public origin, without the path. Set both in the environment of a deployment.

**Database.** SQLite at `storage/crm.sqlite` by default; migrations run on startup. For PostgreSQL, add `@nocobase/db-postgres` and run `pnpm nocobase config init --dialect postgres --force`.

## Deployment

Build an archive for the server, which holds the code and its production dependencies but no configuration, database or uploads:

```bash
pnpm build --target linux-x64 --tar   # writes storage/exports/dist.tar.gz
```

- **On your own server, with the NocoBase app-installer (recommended).** The server needs Node.js 24 and a global pm2. The installer unpacks the archive into its own directory, writes `config.yml`, applies the migrations and runs the application under pm2; an upgrade backs up the SQLite databases first and rolls back when the new release fails to start.

  ```bash
  npx --registry=https://npm.nocobase.ai @nocobase/app-installer install /srv/nocobase/crm --archive dist.tar.gz --origin https://crm.example.com --base-path /crm
  npx --registry=https://npm.nocobase.ai @nocobase/app-installer upgrade --dir /srv/nocobase/crm --archive dist.tar.gz
  ```

- **By hand.** Unpack the archive, run `pnpm nocobase config init` and `pnpm nocobase config check` inside `dist/`, and run `node ./dist/server/standalone.js` under a service manager, with `config.yml` and `storage/` kept beside `dist/` across updates.
- **Docker.** Build with `docker build -t nococrm .`, or use `ghcr.io/nocobase/nococrm`, which CI publishes from `main` and `v*` tags. Mount `config.yml` read-only at `/app/config.yml` and a volume at `/app/storage`, and choose the path with `-e APP_BASE_PATH=/crm`; `playground/` runs it with Docker Compose.
- **NocoBase Hub.** Upload the archive to the application on a Hub, or deploy from the source checkout: add the Hub's App as a remote with `pnpm nocobase hub remote add origin <Hub URL>/apps/<App ID>`, save a Hub publishing key with `pnpm nocobase hub auth login`, then run `pnpm nocobase hub deploy`, which builds for the Hub's platform itself.

To serve the client's static files from a CDN, build with its prefix, `CDN_BASE_URL=https://cdn.example.com/crm/v1/ pnpm build` (or `docker build --build-arg CDN_BASE_URL=…`), upload `dist/client/` there with its paths kept and CORS allowed for the application's origin, and keep the complete `dist/client/` on the server too, which still serves the HTML. Unset, the files load from the application as before.

Behind a reverse proxy, keep the public host and protocol and pass WebSocket upgrades. After deploying, set the AI keys, enable the three notification workflows, and check `/<base path>/api/healthz`. Back up the database and `storage/` before upgrading.

## Development

`AGENTS.md` is the guide for working on the code, with Claude Code or any other agent. The main commands:

| Command                  | What it does                                |
| ------------------------ | ------------------------------------------- |
| `pnpm dev`               | Run the server and client with hot reload   |
| `pnpm build`             | Build into `dist/`                          |
| `pnpm start`             | Run the build                               |
| `pnpm test`              | Run the tests in `tests/`                   |
| `pnpm typecheck`         | Type-check the client and server            |
| `pnpm lint`              | Lint                                        |
| `pnpm check`             | Everything above plus a build               |
| `pnpm nocobase db apply` | Apply pending migrations without restarting |
| `pnpm nocobase --help`   | List every other command                    |

## License

MIT
