import { useCallback, useEffect, useState } from 'react';

export interface FolderEntry { path: string; appliedAt: number }
const KEY = 'mico.folders';

export function useFolders() {
  const [list, setList] = useState<FolderEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ } }, [list]);
  const add = useCallback((path: string) => setList((l) => [{ path, appliedAt: Date.now() }, ...l.filter((x) => x.path !== path)]), []);
  const remove = useCallback((path: string) => setList((l) => l.filter((x) => x.path !== path)), []);
  return { list, add, remove };
}
