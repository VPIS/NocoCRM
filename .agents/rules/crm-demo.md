# Demo integration

Read the application-local Demo Mode Skill before changing this integration. This application supports dedicated demo databases and storage only; mode `off` retains normal behavior.

The plugin owns permissions, import/clear/reset, account ownership, the environment model and configuration revisions. CRM owns its dataset (`server/providers/crm/demo.ts`), model answers and business cleanup (`demo-data.ts`). Dates come from `context.clock`. Never test exact fixture wording or counts as a compatibility contract.

CRM currently uses the Agents online API. Register its public `agents.online.services` through `demoData.registerModelServices()` during boot. Bind CRM agents to the persistent Demo model in `ready()`, after plugin initialization, and after import. Do not upgrade the Agents package merely to access its renamed model facade: newer releases remove online agents. Background AI always follows the environment model, including before import and after clear. Online chat uses the independently configured `chat.model` only when explicitly enabled; missing configuration never falls back to a real model.

Clear/reset removes all CRM business records, visitor-created rows, CRM files, fictional mailboxes and CRM conversation data. Keep administrator identities, permission configuration, real channel connection settings and the environment model. Demo accounts are owned and reused by the plugin; username matches alone never authorize adoption. A legacy deployment requires a separately reviewed, one-time ownership migration rather than a permissive runtime compatibility path.

Read-only write exceptions remain explicit. `crm.aiWork` allows AI history insert/update only for tracked demo records after normal CRM authorization. The application page exposes that rule. The legacy online API is adapted in `crm-agents/demo-chat.ts` at `ready()`, after fixture services capture their public creation operation. Only an owned online conversation operation enters the plugin’s `runLegacyOnlineConversation` persistence boundary; direct Agent configuration, runner work, uploads and other requests stay guarded. Preserve public service authorization and validation. The chat switch controls this boundary, not a table-wide write rule.

The online gateway uses the explicit Demo chat model for session-bearing executor calls and the simulated model for background generation. AI SDK middleware rechecks the switch and model before every step. CRM run credentials pass normal authorization first, then `runChatTool('crm.read')`; only local GET queries for record viewing, search and colleagues may run. Plans, mutations, remote transports and consultations remain unavailable. Never treat hiding a tool from model metadata as authorization: consultations are also refused at their public service boundary.

Explicit `ai.llmServices` deployment entries are provisioned in demo mode too; provisioning never selects them for chat. Keep live credentials in deployment configuration, not in Demo policy JSON.

The Demo data page exposes chat enablement, simulated/live model selection and local-query permission with optimistic revision checks. Live models consume tokens. Reset/import remains independent of chat enablement; fixture conversations use the original public creation service captured before the visitor adapter is installed.

Demo mail uses the in-process `crm-demo` provider. Fictional WhatsApp numbers have `mode: demo`, and attachments are generated locally. Keep real mail, WhatsApp and web transports outside the fixture import path.

The application depends on the published Demo Mode package. Until publication, deployment preparation may supply a temporary compiled fixture outside the tracked source; never commit plugin artifacts or copy hooks to the application PR.
