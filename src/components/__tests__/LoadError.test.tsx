import '@/test/mockUi';

import { render, screen } from '@testing-library/react-native';

import { DatabaseLockedError, StorageUnavailableError } from '@/db/errors';

import { LoadError } from '../LoadError';

jest.mock('@/stores', () => ({ deviceLanguage: () => 'en', resetDatabaseFile: jest.fn() }));

describe('LoadError', () => {
  it('offers reset for a generic open failure', async () => {
    await render(<LoadError error={new Error('boom')} onRetry={() => {}} />);
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(screen.getByText('Reset app data')).toBeTruthy();
  });

  it('hides reset while another window holds the database', async () => {
    await render(<LoadError error={new DatabaseLockedError('quizkit')} onRetry={() => {}} />);
    expect(screen.getByText(/already open in another window/)).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(screen.queryByText('Reset app data')).toBeNull();
  });

  it('offers only retry when storage could not be loaded', async () => {
    await render(<LoadError error={new StorageUnavailableError(new Error('wasm'))} onRetry={() => {}} />);
    expect(screen.getByText(/could not reach its storage/)).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(screen.queryByText('Reset app data')).toBeNull();
  });
});
