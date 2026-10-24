import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { load, save } from "../lib/storage";
import { DEFAULT_CONFIG, generate, type GeneratedTheme, type ThemeConfig } from "../lib/theme";
import { uid } from "../lib/utils";

export interface SavedTheme {
  id: string;
  name: string;
  config: ThemeConfig;
  updatedAt: number;
}

interface Ctx {
  config: ThemeConfig;
  theme: GeneratedTheme;
  update: (patch: Partial<ThemeConfig>) => void;
  replace: (config: ThemeConfig, name?: string | null, id?: string | null) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saved: SavedTheme[];
  currentId: string | null;
  currentName: string | null;
  saveCurrent: (name: string) => SavedTheme;
  remove: (id: string) => SavedTheme | undefined;
  restore: (item: SavedTheme) => void;
}

const BuilderContext = createContext<Ctx | null>(null);
const CURRENT_KEY = "mtb.current";
const LIBRARY_KEY = "mtb.library";
const HISTORY_LIMIT = 60;
const COALESCE_MS = 700;

export function BuilderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ThemeConfig>(() => ({ ...DEFAULT_CONFIG, ...load<Partial<ThemeConfig>>(CURRENT_KEY, {}) }));
  const [past, setPast] = useState<ThemeConfig[]>([]);
  const [future, setFuture] = useState<ThemeConfig[]>([]);
  const [saved, setSaved] = useState<SavedTheme[]>(() => load<SavedTheme[]>(LIBRARY_KEY, []));
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const lastPush = useRef(0);

  const theme = useMemo(() => generate(config), [config]);

  const commit = useCallback((next: ThemeConfig) => {
    setConfig(next);
    save(CURRENT_KEY, next);
  }, []);

  const update = useCallback(
    (patch: Partial<ThemeConfig>) => {
      const now = Date.now();
      const shouldPush = now - lastPush.current > COALESCE_MS;
      lastPush.current = now;
      if (shouldPush) setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), config]);
      setFuture([]);
      commit({ ...config, ...patch });
    },
    [config, commit],
  );

  const replace = useCallback<Ctx["replace"]>(
    (next, name = null, id = null) => {
      setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), config]);
      setFuture([]);
      lastPush.current = 0;
      setCurrentName(name);
      setCurrentId(id);
      commit(next);
    },
    [config, commit],
  );

  const undo = useCallback(() => {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setPast(past.slice(0, -1));
    setFuture([config, ...future]);
    commit(prev);
    lastPush.current = 0;
  }, [past, future, config, commit]);

  const redo = useCallback(() => {
    if (!future.length) return;
    const [next, ...rest] = future;
    setFuture(rest);
    setPast([...past, config]);
    commit(next);
    lastPush.current = 0;
  }, [past, future, config, commit]);

  const persistLibrary = (list: SavedTheme[]) => {
    setSaved(list);
    save(LIBRARY_KEY, list);
  };

  const saveCurrent = useCallback(
    (name: string): SavedTheme => {
      const existing = currentId ? saved.find((s) => s.id === currentId && s.name === name) : undefined;
      const item: SavedTheme = {
        id: existing?.id ?? uid(),
        name,
        config,
        updatedAt: Date.now(),
      };
      persistLibrary([item, ...saved.filter((s) => s.id !== item.id)]);
      setCurrentId(item.id);
      setCurrentName(item.name);
      return item;
    },
    [config, currentId, saved],
  );

  const remove = useCallback(
    (id: string) => {
      const item = saved.find((s) => s.id === id);
      persistLibrary(saved.filter((s) => s.id !== id));
      if (currentId === id) setCurrentId(null);
      return item;
    },
    [saved, currentId],
  );

  const restore = useCallback(
    (item: SavedTheme) => {
      persistLibrary([item, ...saved.filter((s) => s.id !== item.id)].sort((a, b) => b.updatedAt - a.updatedAt));
    },
    [saved],
  );

  const value = useMemo<Ctx>(
    () => ({
      config,
      theme,
      update,
      replace,
      undo,
      redo,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      saved,
      currentId,
      currentName,
      saveCurrent,
      remove,
      restore,
    }),
    [config, theme, update, replace, undo, redo, past.length, future.length, saved, currentId, currentName, saveCurrent, remove, restore],
  );

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
}

export function useBuilder(): Ctx {
  const ctx = useContext(BuilderContext);
  if (!ctx) throw new Error("useBuilder must be used inside BuilderProvider");
  return ctx;
}
