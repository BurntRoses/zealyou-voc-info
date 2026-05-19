import { useEffect, useState } from 'react';

export function readStoredState(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredState(key, state) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore storage quota / privacy mode failures.
  }
}

export function useStoredState(key, fallback) {
  const [state, setState] = useState(() => readStoredState(key, fallback));

  useEffect(() => {
    writeStoredState(key, state);
  }, [key, state]);

  return [state, setState];
}
