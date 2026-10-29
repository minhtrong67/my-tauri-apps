import { useCallback, useEffect, useState } from 'react';
import { loadJSON, saveJSON } from './utils';

export interface HistoryEntry {
  id: string;
  ts: number;
  itemId: string;
  input: string;
  output: string;
}

const KEY = 'cc.history.v1';
const MAX = 30;
const CAP = 20000;

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => loadJSON<{ list: HistoryEntry[] }>(KEY, { list: [] }).list ?? []);
  useEffect(() => saveJSON(KEY, { list: entries }), [entries]);

  const add = useCallback((itemId: string, input: string, output: string) => {
    if (!output.trim()) return;
    setEntries((prev) => {
      if (prev[0] && prev[0].itemId === itemId && prev[0].output === output) return prev;
      const e: HistoryEntry = { id: crypto.randomUUID(), ts: Date.now(), itemId, input: input.slice(0, CAP), output: output.slice(0, CAP) };
      return [e, ...prev].slice(0, MAX);
    });
  }, []);
  const remove = useCallback((id: string) => setEntries((p) => p.filter((e) => e.id !== id)), []);
  const clear = useCallback(() => setEntries([]), []);
  return { entries, add, remove, clear };
}
