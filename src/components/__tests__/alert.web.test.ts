import { showAlert } from '../alert.web';

type G = { window: { confirm: jest.Mock; alert: jest.Mock } };
const g = globalThis as unknown as G;

beforeEach(() => {
  g.window = { confirm: jest.fn(), alert: jest.fn() };
});

describe('showAlert (web)', () => {
  it('runs the action button when confirmed', () => {
    g.window.confirm.mockReturnValue(true);
    const cancel = jest.fn();
    const action = jest.fn();
    showAlert('Delete', 'Sure?', [
      { text: 'Cancel', style: 'cancel', onPress: cancel },
      { text: 'Delete', style: 'destructive', onPress: action },
    ]);
    expect(g.window.confirm).toHaveBeenCalledWith('Delete\n\nSure?');
    expect(action).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
  });

  it('runs cancel when declined', () => {
    g.window.confirm.mockReturnValue(false);
    const cancel = jest.fn();
    const action = jest.fn();
    showAlert('Delete', 'Sure?', [
      { text: 'Cancel', style: 'cancel', onPress: cancel },
      { text: 'Delete', onPress: action },
    ]);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(action).not.toHaveBeenCalled();
  });

  it('calls onDismiss when declined with no cancel button', () => {
    g.window.confirm.mockReturnValue(false);
    const onDismiss = jest.fn();
    const action = jest.fn();
    showAlert('T', 'm', [{ text: 'OK', onPress: action }, { text: 'Other' }], { onDismiss });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(action).not.toHaveBeenCalled();
  });

  it('uses window.alert with no buttons', () => {
    showAlert('Title', 'Body');
    expect(g.window.alert).toHaveBeenCalledWith('Title\n\nBody');
    expect(g.window.confirm).not.toHaveBeenCalled();
  });

  it('omits empty title', () => {
    showAlert('', 'Body');
    expect(g.window.alert).toHaveBeenCalledWith('Body');
  });

  it('uses window.alert and runs the single button onPress', () => {
    const onPress = jest.fn();
    showAlert('T', undefined, [{ text: 'OK', onPress }]);
    expect(g.window.alert).toHaveBeenCalledWith('T');
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
