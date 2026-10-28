// Writes docs/prompts, docs/format*.md and examples/ from src/domain/prompts.ts.
// Run: npm run build:docs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { buildPromptDocs } from '../src/domain/promptDocs';

const root = join(__dirname, '..');
const files = buildPromptDocs();
for (const [path, content] of Object.entries(files)) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}
console.log(`wrote ${Object.keys(files).length} files`);
