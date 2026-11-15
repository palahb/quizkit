import { shareOrDownload } from '../shareBackup';

const err = (name: string) => Object.assign(new Error(name), { name });

describe('shareOrDownload', () => {
  it('shares and does not download on success', async () => {
    const download = jest.fn();
    await shareOrDownload({ canShare: true, share: async () => undefined, download });
    expect(download).not.toHaveBeenCalled();
  });

  it('falls back to download when share is not allowed', async () => {
    const download = jest.fn();
    await shareOrDownload({
      canShare: true,
      share: () => Promise.reject(err('NotAllowedError')),
      download,
    });
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('is silent when the user cancels the share sheet', async () => {
    const download = jest.fn();
    await shareOrDownload({ canShare: true, share: () => Promise.reject(err('AbortError')), download });
    expect(download).not.toHaveBeenCalled();
  });

  it('downloads when sharing is unavailable', async () => {
    const download = jest.fn();
    const share = jest.fn();
    await shareOrDownload({ canShare: false, share, download });
    expect(share).not.toHaveBeenCalled();
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('propagates a download failure', async () => {
    await expect(
      shareOrDownload({
        canShare: false,
        share: async () => undefined,
        download: () => {
          throw new Error('x');
        },
      }),
    ).rejects.toThrow('x');
  });
});
