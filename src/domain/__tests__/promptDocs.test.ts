import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseImport } from '../parseImport';
import { buildPromptDocs } from '../promptDocs';
import { PROMPT_IDS } from '../prompts';

const root = join(__dirname, '..', '..', '..');

describe('published prompt docs', () => {
  const docs = buildPromptDocs();

  it('has a page per prompt and language, an index, a format guide and examples', () => {
    for (const lang of ['en', 'tr']) {
      for (const id of PROMPT_IDS) expect(docs[`docs/prompts/${lang}/${id}.md`]).toBeDefined();
    }
    expect(docs['docs/prompts/README.md']).toBeDefined();
    expect(docs['docs/format.md']).toBeDefined();
    expect(docs['docs/format.tr.md']).toBeDefined();
    expect(Object.keys(docs).filter((p) => p.startsWith('examples/') && p.endsWith('.json')).length).toBeGreaterThanOrEqual(4);
  });

  it('wraps prompt text in a fence that the prompt itself cannot close', () => {
    const page = docs['docs/prompts/en/notes.md'];
    expect(page).toContain('````text');
    expect(page.split('\n').filter((l) => l.startsWith('````')).length).toBe(2);
  });

  it('ships example files that import cleanly', () => {
    for (const [path, content] of Object.entries(docs)) {
      if (!path.endsWith('.json')) continue;
      const outcome = parseImport(content);
      expect(outcome.result.ok).toBe(true);
    }
  });

  it('is committed exactly as generated (run npm run build:docs after changing prompts)', () => {
    for (const [path, content] of Object.entries(docs)) {
      const file = join(root, path);
      expect(existsSync(file) ? readFileSync(file, 'utf8') : `<missing ${path}>`).toBe(content);
    }
  });
});

describe('README examples', () => {
  it.each(['README.md', 'README.tr.md'])('%s shows a quiz that imports cleanly', (file) => {
    const text = readFileSync(join(root, file), 'utf8');
    const block = /```json\n([\s\S]*?)\n```/.exec(text);
    expect(block).not.toBeNull();
    const outcome = parseImport(block![1]);
    if (outcome.kind !== 'quiz' || !outcome.result.ok) throw new Error(`${file} example does not import`);
    expect(outcome.result.warnings).toEqual([]);
  });
});
