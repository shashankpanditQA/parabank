/**
 * Writes every challenge solution to tests/challenges/*.spec.ts so the official
 * solutions are executable (and verified) like any other Playwright test.
 *
 *   npm run challenges:generate
 *   npx playwright test tests/challenges
 */
import fs from 'node:fs';
import path from 'node:path';
import { ALL_CHALLENGES } from '../challenges/index';

const outDir = path.join(process.cwd(), 'tests', 'challenges');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const c of ALL_CHALLENGES) {
  const slug = c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const file = path.join(outDir, `${String(c.id).padStart(3, '0')}-${c.level}-${slug}.spec.ts`);
  const header = `// Challenge #${c.id} (${c.level}) — ${c.title}\n// Objective: ${c.objective}\n// Generated from challenges/${c.level}/index.ts — edit the source, then run \`npm run challenges:generate\`.\n\n`;
  fs.writeFileSync(file, header + c.solution + '\n');
}
console.log(`Generated ${ALL_CHALLENGES.length} challenge specs in tests/challenges/`);
