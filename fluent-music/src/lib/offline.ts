import { onlinePin } from './tauri';
import { parseOnlinePath, resolveStream } from './online';
import { useStore } from './store';

/**
 * Keeps liked and saved online songs offline: their ids are sent to the backend (which never deletes their cached audio), and a
 * song that has just been liked is downloaded in the background. Returns the cleanup function.
 */
export function keepOnlineOffline() {
  let known: Set<string> | null = null;
  let timer = 0;
  const run = () => {
    const st = useStore.getState();
    const keys = new Set<string>();
    for (const id of Object.keys(st.liked)) if (st.byId[id]?.source) keys.add(id);
    for (const t of Object.values(st.byId)) if (t.source && t.saved) keys.add(t.id);
    const ids = [...keys].map((k) => parseOnlinePath(k)?.id).filter((x): x is string => !!x);
    void onlinePin(ids).catch(() => undefined);
    // newly liked songs (not the ones already liked when the app started) are fetched now, one after the other
    if (known) {
      const fresh = [...keys].filter((k) => !known!.has(k));
      void fresh.reduce((p, k) => p.then(() => resolveStream(k).then(() => undefined, () => undefined)), Promise.resolve());
    }
    known = keys;
  };
  const unsub = useStore.subscribe((s, prev) => {
    if (s.liked === prev.liked && s.byId === prev.byId) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(run, 600);
  });
  timer = window.setTimeout(run, 2500); // after the library has loaded
  return () => { unsub(); window.clearTimeout(timer); };
}
