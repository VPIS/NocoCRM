// Copies the CRM's method skills (ai/skills/<name>/SKILL.md) into dist/ai/skills,
// where the compiled server reads them (server/providers/crm/ai-model.ts,
// SKILLS_DIR, three levels above dist/server/providers/crm). Run by the build
// after the server is compiled (cli/plugins.ts); the AI Employee plugin's build
// hook did this until the plugin was removed, and without it a deployment
// found no skills to put in the Agents plugin's library.
import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('ai/skills');
const target = resolve('dist/ai/skills');
if (!existsSync(source)) {
  console.error(`No skills to copy: ${source} does not exist.`);
  process.exit(1);
}
cpSync(source, target, { recursive: true });
console.log(`Copied the CRM's skills into ${target}.`);
