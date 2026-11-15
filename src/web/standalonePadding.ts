/**
 * On iPhone, an app added to the Home Screen draws under the status bar and home indicator, but
 * the navigation header and tab bar do not get those insets from react-native-safe-area-context
 * (measured on an iPhone 17 Pro: env() = 62/34 yet the header sat under the clock), and
 * window.innerHeight is short by the top inset. So in the installed app we pad the root ourselves
 * and tell the library its insets are 0 (see AppStack in src/app/_layout.tsx).
 */
export interface PaddingInput {
  standalone: boolean;
  envTop: number;
  envBottom: number;
  screenHeight: number;
  innerHeight: number;
}

const FALLBACK_TOP = 59; // status bar / Dynamic Island height on current iPhones
const BOTTOM = 16; // keeps the tab bar clear of the home indicator

export function computeStandalonePadding(i: PaddingInput): { top: number; bottom: number } {
  if (!i.standalone) return { top: 0, bottom: 0 };
  if (i.envTop > 0 || i.envBottom > 0) return { top: i.envTop, bottom: i.envBottom };
  // The OS reported nothing: estimate from the window being shorter than the screen.
  const missing = i.screenHeight - i.innerHeight;
  const top = missing >= 20 && missing <= 80 ? missing : FALLBACK_TOP;
  return { top, bottom: BOTTOM };
}

/** What the last measurement saw and decided; shown in Settings to diagnose layout problems. */
export let lastPaddingDebug = 'not measured';

/** True once we padded the root ourselves; the app then hides the library's (unreliable) insets. */
export let paddingApplied = false;

/** Measures the browser and publishes the result as CSS variables read by public/index.html. */
export function applyStandalonePadding(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
  document.body.appendChild(probe);
  const cs = window.getComputedStyle(probe);
  const envTop = parseInt(cs.paddingTop, 10) || 0;
  const envBottom = parseInt(cs.paddingBottom, 10) || 0;
  probe.remove();
  const standalone =
    (navigator as unknown as { standalone?: boolean }).standalone === true ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);
  const { top, bottom } = computeStandalonePadding({
    standalone,
    envTop,
    envBottom,
    screenHeight: window.screen.height,
    innerHeight: window.innerHeight,
  });
  lastPaddingDebug = `standalone=${standalone} envTop=${envTop} envBottom=${envBottom} screenH=${window.screen.height} innerH=${window.innerHeight} -> top=${top} bottom=${bottom}`;
  paddingApplied = top > 0 || bottom > 0;
  document.documentElement.style.setProperty('--qk-top', `${top}px`);
  document.documentElement.style.setProperty('--qk-bottom', `${bottom}px`);
}
