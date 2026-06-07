import { useState, useCallback } from 'react';

const KEY = 'stockiq_news_read';

function loadRead(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveRead(set: Set<string>) {
  localStorage.setItem(KEY, JSON.stringify([...set]));
}

export function useNewsRead() {
  const [readSet, setReadSet] = useState<Set<string>>(loadRead);

  const markRead = useCallback((uuid: string) => {
    setReadSet(prev => {
      const next = new Set(prev);
      next.add(uuid);
      saveRead(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback((uuids: string[]) => {
    setReadSet(prev => {
      const next = new Set(prev);
      uuids.forEach(id => next.add(id));
      saveRead(next);
      return next;
    });
  }, []);

  const isRead = useCallback((uuid: string) => readSet.has(uuid), [readSet]);

  return { isRead, markRead, markAllRead };
}
