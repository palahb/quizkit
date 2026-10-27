// Component tests render without the real stores: translation and theme hooks are
// replaced with English text and the light palette.
jest.mock('@/hooks/useT', () => {
  const { translate } = jest.requireActual('@/i18n');
  return { useT: () => (key: string, params?: Record<string, string | number>) => translate('en', key, params) };
});
jest.mock('@/theme/useTheme', () => ({ useTheme: () => jest.requireActual('@/theme/tokens').light }));

export {};
