import { useEffect, useState } from 'react';
import { formatClock } from '../domain/formatters.js';

export function useLiveClock(timeZone, locale = 'zh-CN', options = {}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return formatClock(now, timeZone, locale, options);
}
