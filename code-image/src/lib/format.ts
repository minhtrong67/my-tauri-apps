import { highlightCode } from "./highlight";

/** Tabs -> 2 spaces, CRLF -> LF. Keeps the overlay editor and the canvas perfectly aligned. */
export const tabsToSpaces = (s: string) => s.replace(/\r\n?/g, "\n").replace(/\t/g, "  ");

/** Language-agnostic clean-up: trim trailing spaces, remove blank edges, dedent the common indent. */
export function normalize(code: string): string {
  const lines = tabsToSpaces(code).split("\n").map((l) => l.replace(/\s+$/, ""));
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  const indents = lines.filter(Boolean).map((l) => l.match(/^ */)![0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min)).join("\n");
}

type Mod = { default?: unknown } & Record<string, unknown>;
const plugin: Record<string, () => Promise<Mod>> = {
  babel: () => import("prettier/plugins/babel") as Promise<Mod>,
  estree: () => import("prettier/plugins/estree") as Promise<Mod>,
  typescript: () => import("prettier/plugins/typescript") as Promise<Mod>,
  postcss: () => import("prettier/plugins/postcss") as Promise<Mod>,
  html: () => import("prettier/plugins/html") as Promise<Mod>,
  markdown: () => import("prettier/plugins/markdown") as Promise<Mod>,
  yaml: () => import("prettier/plugins/yaml") as Promise<Mod>,
};

// highlight.js language id -> [prettier parser, plugins]
const PLAN: Record<string, { parsers: [string, string[]][] }> = {
  javascript: { parsers: [["babel", ["babel", "estree"]], ["typescript", ["typescript", "estree"]]] },
  typescript: { parsers: [["typescript", ["typescript", "estree"]], ["babel", ["babel", "estree"]]] },
  json: { parsers: [["json", ["babel", "estree"]]] },
  css: { parsers: [["css", ["postcss"]]] },
  scss: { parsers: [["scss", ["postcss"]]] },
  xml: { parsers: [["html", ["html", "babel", "estree", "postcss"]]] },
  markdown: { parsers: [["markdown", ["markdown"]]] },
  yaml: { parsers: [["yaml", ["yaml"]]] },
};

export const canFormat = (lang: string) => lang in PLAN;

/** Format code with Prettier when the language is supported, otherwise just clean it up. Never throws. */
export async function formatCode(code: string, language: string): Promise<string> {
  const src = normalize(code);
  if (!src.trim() || src.length > 200_000) return src;
  const id = language === "auto" ? highlightCode(src, "auto").language : language;
  const plan = PLAN[id];
  if (!plan) return src;
  try {
    const prettier = await import("prettier/standalone");
    for (const [parser, names] of plan.parsers) {
      try {
        const plugins = await Promise.all(names.map((n) => plugin[n]()));
        const out = await prettier.format(src, { parser, plugins: plugins as never[], tabWidth: 2, printWidth: 80, useTabs: false });
        return tabsToSpaces(out).replace(/\n+$/, "");
      } catch { /* try the next parser */ }
    }
  } catch { /* prettier failed to load */ }
  return src;
}
