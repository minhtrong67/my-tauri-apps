import { create } from "zustand";
import { api } from "../lib/api";
import type { Download } from "../lib/types";

export type Filter = "all" | "active" | "queued" | "done" | "failed";

interface DownloadsState {
  items: Download[];
  loaded: boolean;
  filter: Filter;
  query: string;
  load: () => Promise<void>;
  upsert: (d: Download) => void;
  drop: (id: string) => void;
  setFilter: (f: Filter) => void;
  setQuery: (q: string) => void;
}

export const useDownloads = create<DownloadsState>((set) => ({
  items: [],
  loaded: false,
  filter: "all",
  query: "",
  load: async () => {
    const items = await api.list();
    set({ items: items.sort((a, b) => b.createdAt - a.createdAt), loaded: true });
  },
  upsert: (d) =>
    set((s) => {
      const i = s.items.findIndex((x) => x.id === d.id);
      if (i === -1) return { items: [d, ...s.items].sort((a, b) => b.createdAt - a.createdAt) };
      const next = s.items.slice();
      next[i] = d;
      return { items: next };
    }),
  drop: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
  setFilter: (filter) => set({ filter }),
  setQuery: (query) => set({ query }),
}));

export function matchesFilter(d: Download, f: Filter): boolean {
  switch (f) {
    case "active":
      return d.status === "downloading" || d.status === "merging";
    case "queued":
      return d.status === "queued" || d.status === "paused";
    case "done":
      return d.status === "completed";
    case "failed":
      return d.status === "failed";
    default:
      return true;
  }
}
