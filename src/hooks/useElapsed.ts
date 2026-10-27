import { useEffect, useState } from 'react';

import type { Session } from '@/domain/types';
import { elapsedMs } from '@/engine/sessionEngine';

/** Foreground time of the session, refreshed every second while the clock runs. */
export function useElapsed(session: Session | null): number {
  const [now, setNow] = useState(() => Date.now());
  const running = session?.resumedAt != null;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  return session ? elapsedMs(session, now) : 0;
}
