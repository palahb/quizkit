import type { ReactNode } from 'react';
import type { ColorValue } from 'react-native';

type Name = string | { ios?: string; android?: string; web?: string };

// 24x24 stroke paths, keyed by the SF Symbol names used in the app.
const PATHS: Record<string, ReactNode> = {
  checkmark: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  'folder.fill': <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="currentColor" />,
  'square.grid.3x3': (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" />
    </>
  ),
  'books.vertical': <path d="M5 4v16M10 4v16M15 5l4 14.5M3 20h18" />,
  'text.bubble': (
    <>
      <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
      <path d="M7.5 9.5h9M7.5 13h6" />
    </>
  ),
  'clock.arrow.circlepath': (
    <>
      <path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4h4" />
      <path d="M12 8v4.5l3 1.5" />
    </>
  ),
  gearshape: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  'doc.text': (
    <>
      <path d="M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5M8.5 13h7M8.5 17h7" />
    </>
  ),
  ellipsis: (
    <>
      <circle cx="5.5" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="18.5" cy="12" r="1.3" fill="currentColor" />
    </>
  ),
};

/** Inline SVG icon keyed by SF Symbol name; unknown names render nothing. */
export function Icon({ name, color, size = 22 }: { name: Name; color: ColorValue; size?: number }) {
  const key = typeof name === 'string' ? name : (name.web ?? name.ios ?? '');
  const shape = PATHS[key];
  if (!shape) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: String(color), flexShrink: 0 }}
      aria-hidden="true">
      {shape}
    </svg>
  );
}
