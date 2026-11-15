/**
 * On iPhone, an app added to the Home Screen can draw under the status bar while
 * `env(safe-area-inset-*)` reads 0, so the header ends up behind the clock. When that happens
 * we add the space ourselves; when the browser reports real insets we add nothing, because
 * react-native-safe-area-context already applies them.
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
  if (!i.standalone || i.envTop > 0 || i.envBottom > 0) return { top: 0, bottom: 0 };
  const missing = i.screenHeight - i.innerHeight;
  const top = missing >= 20 && missing <= 80 ? missing : FALLBACK_TOP;
  return { top, bottom: BOTTOM };
}

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
  document.documentElement.style.setProperty('--qk-top', `${top}px`);
  document.documentElement.style.setProperty('--qk-bottom', `${bottom}px`);
}
