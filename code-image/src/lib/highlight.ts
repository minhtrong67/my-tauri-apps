import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import scss from "highlight.js/lib/languages/scss";
import sql from "highlight.js/lib/languages/sql";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import powershell from "highlight.js/lib/languages/powershell";
import java from "highlight.js/lib/languages/java";
import kotlin from "highlight.js/lib/languages/kotlin";
import swift from "highlight.js/lib/languages/swift";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import php from "highlight.js/lib/languages/php";
import ruby from "highlight.js/lib/languages/ruby";
import dart from "highlight.js/lib/languages/dart";
import yaml from "highlight.js/lib/languages/yaml";
import ini from "highlight.js/lib/languages/ini";
import markdown from "highlight.js/lib/languages/markdown";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import graphql from "highlight.js/lib/languages/graphql";
import plaintext from "highlight.js/lib/languages/plaintext";
import diff from "highlight.js/lib/languages/diff";
import lua from "highlight.js/lib/languages/lua";
import r from "highlight.js/lib/languages/r";
import scala from "highlight.js/lib/languages/scala";
import elixir from "highlight.js/lib/languages/elixir";
import haskell from "highlight.js/lib/languages/haskell";
import perl from "highlight.js/lib/languages/perl";
import nginx from "highlight.js/lib/languages/nginx";
import latex from "highlight.js/lib/languages/latex";
import { LANGUAGES } from "./constants";

const registry: Record<string, Parameters<typeof hljs.registerLanguage>[1]> = {
  javascript, typescript, python, xml, css, scss, sql, json, bash, powershell, java, kotlin, swift,
  c, cpp, csharp, go, rust, php, ruby, dart, yaml, ini, markdown, dockerfile, graphql, plaintext,
  diff, lua, r, scala, elixir, haskell, perl, nginx, latex,
};
for (const [k, v] of Object.entries(registry)) hljs.registerLanguage(k, v);

const AUTO_SUBSET = LANGUAGES.map((l) => l.id).filter((id) => !["plaintext", "ini", "markdown", "diff", "latex", "nginx", "r"].includes(id));

export interface Highlighted {
  lines: string[]; // html per line
  raw: string[]; // plain text per line
  language: string; // resolved language id
}

/** Split highlighted HTML on newlines while keeping <span> nesting valid on every line. */
function splitLines(html: string): string[] {
  const out: string[] = [];
  const stack: string[] = [];
  let cur = "";
  for (const part of html.split(/(<span[^>]*>|<\/span>|\n)/)) {
    if (part === "") continue;
    if (part.startsWith("<span")) { stack.push(part); cur += part; }
    else if (part === "</span>") { stack.pop(); cur += part; }
    else if (part === "\n") { out.push(cur + "</span>".repeat(stack.length)); cur = stack.join(""); }
    else cur += part;
  }
  out.push(cur + "</span>".repeat(stack.length));
  return out;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

let last: { k: string; v: Highlighted } | null = null;

/** Highlight code. A one-entry cache means the editor and the canvas share a single (expensive) auto-detect pass. */
export function highlightCode(code: string, language: string): Highlighted {
  const k = language + "\u0000" + code;
  if (last && last.k === k) return last.v;
  const src = code.replace(/\r\n?/g, "\n").replace(/\t/g, "  ");
  const raw = src.split("\n");
  let v: Highlighted;
  try {
    if (language !== "auto" && hljs.getLanguage(language)) {
      v = { lines: splitLines(hljs.highlight(src, { language, ignoreIllegals: true }).value), raw, language };
    } else {
      const res = hljs.highlightAuto(src, AUTO_SUBSET);
      v = { lines: splitLines(res.value), raw, language: res.language ?? "plaintext" };
    }
  } catch {
    v = { lines: raw.map(escapeHtml), raw, language: "plaintext" };
  }
  last = { k, v };
  return v;
}

/** "2,4-6" -> Set{2,4,5,6} */
export function parseLines(spec: string): Set<number> {
  const set = new Set<number>();
  for (const part of spec.split(",")) {
    const m = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) continue;
    const a = +m[1], b = m[2] ? +m[2] : a;
    for (let i = Math.min(a, b); i <= Math.min(Math.max(a, b), 5000); i++) set.add(i);
  }
  return set;
}

export function languageFromFile(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower === "dockerfile") return "dockerfile";
  const ext = lower.split(".").pop() ?? "";
  return LANGUAGES.find((l) => l.exts.includes(ext))?.id ?? null;
}
