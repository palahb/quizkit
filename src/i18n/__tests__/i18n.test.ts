import en from '../en.json';
import { flattenKeys, languageFromLocale, translate } from '../index';
import tr from '../tr.json';

const ISSUE_CODES = [
  'empty', 'too_large', 'not_utf8', 'wrong_shape', 'syntax', 'schema_version_unsupported', 'title_invalid',
  'questions_count', 'question_text_missing', 'options_count', 'option_not_string', 'option_empty',
  'answer_invalid', 'answer_out_of_range', 'duplicate_id', 'syntax_in_question', 'folder_name_invalid', 'folders_too_deep', 'collection_empty', 'collection_too_many',
];
const WARNING_CODES = ['odd_dollar', 'math_unparseable', 'duplicate_option', 'duplicate_question', 'images_unsupported', 'backslashes_repaired', 'quotes_repaired'];
const SYNTAX_HINTS = ['trailing_comma', 'missing_quote', 'truncated', 'unknown', 'inner_quote', 'missing_comma'];

describe('translation files', () => {
  it('have the same keys in English and Turkish', () => {
    const enKeys = flattenKeys(en);
    const trKeys = flattenKeys(tr);
    expect(enKeys.filter((k) => !trKeys.includes(k))).toEqual([]);
    expect(trKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
  });

  it('cover every import issue, warning and syntax hint', () => {
    const keys = flattenKeys(en);
    const expected = [
      ...ISSUE_CODES.map((c) => `import.issue.${c}`),
      ...WARNING_CODES.map((c) => `import.warning.${c}`),
      ...SYNTAX_HINTS.map((h) => `import.hint.${h}`),
    ];
    expect(expected.filter((k) => !keys.includes(k))).toEqual([]);
  });
});

describe('translate', () => {
  it('interpolates params', () => {
    expect(translate('en', 'library.quizCount', { n: 3 })).toBe('3 questions');
  });
  it('uses the _one form for n = 1 in English', () => {
    expect(translate('en', 'library.quizCount', { n: 1 })).toBe('1 question');
  });
  it('translates to Turkish', () => {
    expect(translate('tr', 'library.quizCount', { n: 3 })).toBe('3 soru');
  });
  it('returns the key for an unknown key', () => {
    expect(translate('en', 'no.such.key')).toBe('no.such.key');
  });
});

describe('languageFromLocale', () => {
  it('picks Turkish for tr-TR', () => {
    expect(languageFromLocale('tr')).toBe('tr');
  });
  it('falls back to English for German', () => {
    expect(languageFromLocale('de')).toBe('en');
  });
  it('falls back to English when unknown', () => {
    expect(languageFromLocale(undefined)).toBe('en');
  });
});
