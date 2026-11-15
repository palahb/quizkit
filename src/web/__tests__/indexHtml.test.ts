import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..', '..');
const html = readFileSync(join(root, 'public', 'index.html'), 'utf8');
const baseUrl: string = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo.experiments.baseUrl;

describe('public/index.html base path', () => {
  it.each(['manifest', 'apple-touch-icon'])('%s link starts with experiments.baseUrl', (rel) => {
    const m = html.match(new RegExp(`<link rel="${rel}" href="([^"]+)"`));
    expect(m).not.toBeNull();
    expect(m![1].startsWith(`${baseUrl}/`)).toBe(true);
  });
});
