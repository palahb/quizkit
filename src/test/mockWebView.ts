// react-native-webview has no Jest renderer; replace it with a plain View we can find.
jest.mock('react-native-webview', () => {
  const { View } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return { WebView: (props: object) => createElement(View, { ...props, testID: 'math-webview' }) };
});

export {};
