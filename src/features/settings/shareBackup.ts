/**
 * Hand a backup file to the user: the share sheet when available, else a download.
 * A cancelled share (AbortError) is silent; any other share failure (e.g. NotAllowedError when the
 * user gesture has expired after the async export) falls back to the download.
 */
export async function shareOrDownload(opts: {
  canShare: boolean;
  share: () => Promise<void>;
  download: () => void;
}): Promise<void> {
  if (opts.canShare) {
    try {
      await opts.share();
      return;
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') return;
    }
  }
  opts.download();
}
