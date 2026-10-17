import { readFileSync, readdirSync } from "node:fs";
import { DICT_KEYS } from "../src/js/i18n.js";
let fail = 0;
const en = new Set(DICT_KEYS.en), vi = new Set(DICT_KEYS.vi);
for (const k of en) if (!vi.has(k)) { fail++; console.log("missing in vi:", k); }
for (const k of vi) if (!en.has(k)) { fail++; console.log("missing in en:", k); }
const dir = new URL("../src/js/", import.meta.url);
const html = readFileSync(new URL("../src/index.html", import.meta.url), "utf8");
const used = new Set();
for (const f of readdirSync(dir)) { if (!f.endsWith(".js") || f.startsWith("i18n")) continue; const s = readFileSync(new URL(f, dir), "utf8"); for (const m of s.matchAll(/["'`]((?:x|cmd|tb|set|btn|dlg|toast|find|flt|stat|tab|menu)\.[a-zA-Z0-9_.]+)["'`]/g)) used.add(m[1]); }
for (const m of html.matchAll(/data-i18n(?:-title)?="([^"]+)"/g)) used.add(m[1]);
for (const k of used) if (!k.endsWith(".") && !en.has(k)) { fail++; console.log("unknown key:", k); }
console.log(fail ? "FAILURES " + fail : `i18n: all passed (${en.size} keys)`);
