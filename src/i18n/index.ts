import en from './en.json';
import tr from './tr.json';

export type Language = 'en' | 'tr';
export type TParams = Record<string, string | number>;
export type TFunction = (key: string, params?: TParams) => string;

type Tree = { [k: string]: string | Tree };
const CATALOGS: Record<Language, Tree> = { en, tr };

export function flattenKeys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([k, v]) =>
    typeof v === 'string' ? [prefix + k] : flattenKeys(v, `${prefix}${k}.`),
  );
}

function lookup(tree: Tree, key: string): string | undefined {
  let node: string | Tree | undefined = tree;
  for (const part of key.split('.')) {
    if (node === undefined || typeof node === 'string') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Looks up `key` (dot path) and fills `{name}` placeholders. Uses `key_one` when params.n === 1. Unknown keys return the key. */
export function translate(lang: Language, key: string, params?: TParams): string {
  const catalog = CATALOGS[lang];
  const template = (params?.n === 1 ? lookup(catalog, `${key}_one`) : undefined) ?? lookup(catalog, key);
  if (template === undefined) return key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

export function languageFromLocale(languageCode: string | null | undefined): Language {
  return languageCode === 'tr' ? 'tr' : 'en';
}
