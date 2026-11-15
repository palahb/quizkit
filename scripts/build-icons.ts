// Generates every app icon PNG from the SVG sources in assets/branding.
// Run: npm run build:icons
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const root = join(__dirname, '..');
const brand = (f: string) => readFileSync(join(root, 'assets', 'branding', f));
const out = (f: string) => join(root, 'assets', 'images', f);
const pub = (f: string) => join(root, 'public', f);

const BLUE = '#2463EB';

/** The mark scaled down and centered, for Android's adaptive icon (its mask crops the outer third). */
async function inset(scale: number, tint?: string) {
  const size = 1024;
  const inner = Math.round(size * scale);
  let mark = sharp(brand('mark.svg'), { density: 300 }).resize(inner, inner);
  if (tint) mark = mark.tint(tint);
  const buf = await mark.png().toBuffer();
  const pad = Math.round((size - inner) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: buf, left: pad, top: pad }])
    .png();
}

async function main() {
  // iOS / store icon: full-bleed square, no transparency (iOS rounds the corners itself).
  await sharp(brand('icon.svg'), { density: 300 }).resize(1024, 1024).flatten({ background: BLUE }).removeAlpha().png().toFile(out('icon.png'));
  await sharp(brand('icon.svg'), { density: 300 }).resize(48, 48).flatten({ background: BLUE }).png().toFile(out('favicon.png'));

  // Android adaptive icon.
  await (await inset(0.78)).toFile(out('android-icon-foreground.png'));
  await (await inset(0.78, '#000000')).toFile(out('android-icon-monochrome.png'));
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BLUE } }).png().toFile(out('android-icon-background.png'));

  // Splash: the white mark on transparent; the blue comes from the splash backgroundColor.
  await (await inset(1)).toFile(out('splash-icon.png'));
  // PWA icons (served from public/): full-bleed squares, no transparency.
  const full = () => sharp(brand('icon.svg'), { density: 300 });
  await full().resize(180, 180).flatten({ background: BLUE }).removeAlpha().png().toFile(pub('apple-touch-icon.png'));
  await full().resize(192, 192).flatten({ background: BLUE }).removeAlpha().png().toFile(pub('icon-192.png'));
  await full().resize(512, 512).flatten({ background: BLUE }).removeAlpha().png().toFile(pub('icon-512.png'));
  // Maskable: the mark inset to ~0.78 on solid blue so the OS mask never crops it.
  const mark = await sharp(brand('mark.svg'), { density: 300 }).resize(Math.round(512 * 0.78), Math.round(512 * 0.78)).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 3, background: BLUE } })
    .composite([{ input: mark, gravity: 'centre' }])
    .removeAlpha()
    .png()
    .toFile(pub('icon-512-maskable.png'));
  console.log('icons written to assets/images and public');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
