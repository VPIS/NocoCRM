// Copies the vendored @nocobase/app-plugin-demo-mode (app-plugins/demo-mode, linked from package.json until the
// package is published) into dist, so a deployment package carries its compiled exports, migrations and Skill. Run by
// the build after the server is compiled (cli/plugins.ts).
import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve('app-plugins/demo-mode');
const target = resolve('dist/app-plugins/demo-mode');
await mkdir(target, { recursive: true });
for (const name of ['package.json', 'README.md', 'dist', 'skills'])
  await cp(resolve(source, name), resolve(target, name), { recursive: true });
console.log(`Copied the demo mode plugin into ${target}.`);
