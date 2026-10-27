# NocoCRM

English | [简体中文](docs/README.zh-CN.md) | [繁體中文](docs/README.zh-TW.md) | [日本語](docs/README.ja-JP.md) | [한국어](docs/README.ko-KR.md) | [Deutsch](docs/README.de-DE.md) | [Français](docs/README.fr-FR.md) | [Español](docs/README.es-ES.md) | [Português](docs/README.pt-BR.md) | [Русский](docs/README.ru-RU.md) | [Bahasa Indonesia](docs/README.id-ID.md) | [Tiếng Việt](docs/README.vi-VN.md)

NocoCRM is an open-source B2B sales CRM built on [NocoBase 3](https://www.nocobase.com). It comes with 6 sales agents and integrates your email and WhatsApp: following up on leads and opportunities, replying to messages right away, and reviewing approvals with you. Agents suggest; you decide.

https://github.com/user-attachments/assets/b251f2d2-ed55-43e8-8526-507c1130eb5c

[Try it online](https://solutions.nocobase.com/crm/) · [Website](https://www.nocobase.com/solution-crm/)

## What it does

- **Nothing falls through the cracks.** A new lead or deal, a customer's reply, a completed task, the morning check: an agent reads the whole context and puts the next step in your inbox, with the call, its confidence and its reasons. Records change only when you accept.
- **Every channel on one timeline.** Each person connects their own mailbox, and the company its WhatsApp Business number. Messages are matched to leads and contacts, and replies are drafted to go out from your own account.
- **A sales agent team.** Sales Expert to talk to, plus lead follow-up, opportunity follow-up, approval review, task preparation and company research, each with its triggers, skills and a record of runs.
- **Approvals stop stalling.** The approval agent checks a discount or a term against your rules and past decisions, and drafts a recommendation and a comment for the approver.
- **Your rules, your code.** Write your prices, discount limits and follow-up cadence as business guidance in plain text, and every agent follows it. Ask a coding agent to change the CRM's own source. Open source, self-hosted, and yours.
- **The full sales cycle.** Leads, companies, contacts, opportunities, tasks, approvals and reports, with roles enforced per record by the server.

## Quick start

### 1. Install

**With a coding agent.** The easiest way. Open Claude Code, Codex or Cursor where NocoCRM should go, and give it this:

```text
Install NocoCRM from https://github.com/nocobase/NocoCRM and start it, following its AGENTS.md and README.
```

**By hand.** You need Node.js 24 or later and pnpm 11 (`corepack enable`). The data goes into a SQLite file by default; PostgreSQL and MySQL work too.

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. Sign in

Open the `Local:` address `pnpm dev` prints, normally `http://127.0.0.1:13000/main/`, and sign in as `nocobase` with the password `admin123`.

### 3. Import the demo data

The banner at the top offers it, or open **Settings → Demo data**. It brings a sales team with customers, deals, tasks, approvals, mail and conversations; remove it there when you start for real.

### 4. Set up an AI model

Add a model service with its key on **Agent team → Models**, such as DeepSeek, OpenAI, Claude, Gemini or Qwen. The assistant and the agents need it; everything else works without it.

The [guide](docs/guide.md) covers the first steps, the demo accounts, roles, configuration (AI, mail, WhatsApp, databases), deployment and development.

## License

[Apache License 2.0](LICENSE)
