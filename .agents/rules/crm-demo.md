# Demo integration

Read the application-local Demo Mode Skill before changing this integration. This application supports dedicated demo databases and storage only; mode `off` retains normal behavior.

The plugin owns permissions, import/clear/reset, account ownership, the environment model and configuration revisions. CRM owns its dataset (`server/providers/crm/demo.ts`), model answers and business cleanup (`demo-data.ts`). Dates come from `context.clock`. Never test exact fixture wording or counts as a compatibility contract.

CRM currently uses the Agents online API. Register its public `agents.online.services` through `demoData.registerModelServices()` during boot. Bind CRM agents to the persistent Demo model in `ready()`, after plugin initialization, and after import. Do not upgrade the Agents package merely to access its renamed model facade: newer releases remove online agents. Demo routing follows the server environment, including before import and after clear, and must never fall back to real models or web searches when configuration is missing.

Clear/reset removes all CRM business records, visitor-created rows, CRM files, fictional mailboxes and CRM conversation data. Keep administrator identities, permission configuration, real channel connection settings and the environment model. Demo accounts are owned and reused by the plugin; username matches alone never authorize adoption. A legacy deployment requires a separately reviewed, one-time ownership migration rather than a permissive runtime compatibility path.

Read-only write exceptions remain explicit. `crm.aiWork` allows AI history insert/update only for tracked demo records after normal CRM authorization. The application page exposes that rule. Standard Agents conversation writes are still guarded in read-only mode; do not globally allow protected Agent configuration or execution tables to make chat work. Model simulation does not itself permit database writes or simulate all tool effects.

Demo mail uses the in-process `crm-demo` provider. Fictional WhatsApp numbers have `mode: demo`, and attachments are generated locally. Keep real mail, WhatsApp and web transports outside the fixture import path.

The unpublished plugin build is currently used only to prepare the standalone deployment. Before an application PR, replace the temporary linked build and copy hooks with the published package dependency; do not include plugin build artifacts in the review.
