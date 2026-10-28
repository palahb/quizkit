import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..');

/** Width, height and PNG color type read straight from the file header. */
function pngInfo(relativePath: string) {
  const buf = readFileSync(join(root, relativePath));
  expect(buf.subarray(1, 4).toString()).toBe('PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), colorType: buf[25] };
}

const COLOR_RGB = 2; // no alpha channel
const COLOR_RGBA = 6;

describe('app icons', () => {
  it('has a 1024x1024 iOS icon without transparency', () => {
    expect(pngInfo('assets/images/icon.png')).toMatchObject({ width: 1024, height: 1024, colorType: COLOR_RGB });
  });

  it('has square Android adaptive layers with transparent foreground', () => {
    expect(pngInfo('assets/images/android-icon-foreground.png')).toMatchObject({ width: 1024, height: 1024, colorType: COLOR_RGBA });
    expect(pngInfo('assets/images/android-icon-monochrome.png')).toMatchObject({ width: 1024, height: 1024, colorType: COLOR_RGBA });
  });

  it('has a splash image with transparency', () => {
    expect(pngInfo('assets/images/splash-icon.png')).toMatchObject({ width: 1024, height: 1024, colorType: COLOR_RGBA });
  });
});

describe('app.json', () => {
  const config = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;

  it('has a stable bundle identifier and package name', () => {
    expect(config.ios.bundleIdentifier).toBe('com.palahb.quizkit');
    expect(config.android.package).toBe('com.palahb.quizkit');
  });

  it('uses the png icon on iOS (the Xcode 26 .icon bundle needs a newer Xcode)', () => {
    expect(config.ios.icon).toBeUndefined();
    expect(config.icon).toBe('./assets/images/icon.png');
  });

  it('declares no tablet support and no leftover template splash color', () => {
    expect(config.ios.supportsTablet).toBe(false);
    const splash = config.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-splash-screen');
    expect(splash[1].backgroundColor).toBe('#2463EB');
  });
});
