import { extractJson } from '../normalizeInput';
import { parseImport } from '../parseImport';
import { getPrompt, getPrompts, PROMPT_IDS } from '../prompts';

const LANGS = ['tr', 'en'] as const;

describe('prompt library', () => {
  it('offers the same prompts in Turkish and English', () => {
    expect(getPrompts('tr').map((p) => p.id)).toEqual(PROMPT_IDS);
    expect(getPrompts('en').map((p) => p.id)).toEqual(PROMPT_IDS);
    expect(new Set(PROMPT_IDS).size).toBe(PROMPT_IDS.length);
    expect(PROMPT_IDS).toEqual(['notes', 'past-exam', 'course', 'math', 'terms', 'topic', 'fix-json']);
  });

  it('looks prompts up by id', () => {
    expect(getPrompt('math', 'en')).toBe(getPrompts('en').find((p) => p.id === 'math'));
  });

  describe.each(LANGS)('%s', (lang) => {
    it.each(PROMPT_IDS)('%s has a title, a description and the shared rules', (id) => {
      const p = getPrompt(id, lang);
      expect(p.title.length).toBeGreaterThan(3);
      expect(p.description.length).toBeGreaterThan(10);
      expect(p.body).toContain('"schemaVersion": 1');
      expect(p.body).toContain('“ ”');
      expect(p.body).toContain(String.raw`\\frac`);
    });

    it.each(PROMPT_IDS)('%s contains an example that imports with no warnings', (id) => {
      const example = extractJson(getPrompt(id, lang).body);
      expect(example).not.toBeNull();
      const outcome = parseImport(example!);
      if (id === 'course') {
        expect(outcome.kind).toBe('collection');
        if (outcome.kind !== 'collection' || !outcome.result.ok) throw new Error('collection example failed');
        expect(outcome.result.collection.warnings).toEqual([]);
        for (const e of outcome.result.collection.entries) {
          expect(e.result.ok).toBe(true);
          if (e.result.ok) expect(e.result.warnings).toEqual([]);
        }
        expect(outcome.result.collection.folderPaths.some((path) => path.length === 2)).toBe(true);
      } else {
        expect(outcome.kind).toBe('quiz');
        if (outcome.kind !== 'quiz' || !outcome.result.ok) throw new Error('quiz example failed');
        expect(outcome.result.warnings).toEqual([]);
      }
    });
  });

  it('the math example really contains formulas', () => {
    const example = extractJson(getPrompt('math', 'tr').body)!;
    expect(example).toContain(String.raw`\\int`);
  });

  it('the fix-json prompt has places for the error message and the JSON', () => {
    expect(getPrompt('fix-json', 'tr').body).toContain('[HATA MESAJINI BURAYA YAPIŞTIR]');
    expect(getPrompt('fix-json', 'en').body).toContain('[PASTE THE ERROR MESSAGE HERE]');
  });

  it('the topic prompt has places for the topic and the question count', () => {
    expect(getPrompt('topic', 'tr').body).toContain('[KONU]');
    expect(getPrompt('topic', 'en').body).toContain('[TOPIC]');
  });
});
