import { readFileSync } from "node:fs";
import { Book } from "../src/js/model.js";
const code = readFileSync(new URL("../src/public/vendor/exceljs.min.js", import.meta.url), "utf8");
const mod = { exports: {} }; new Function("module", "exports", code)(mod, mod.exports); globalThis.ExcelJS = mod.exports;
const { importXlsx, exportXlsx } = await import("../src/js/io.js");
let fail = 0; const ok = (n, c) => { if (!c) { fail++; console.log("FAIL", n); } };
const b = new Book(), sh = b.sheet;
[5, 12, 8, 20].forEach((v, i) => b.setInput(sh, i, 0, String(v)));
["a", "b", "a"].forEach((v, i) => b.setInput(sh, i, 1, v));
b.setCF(sh, [
  { rg: { r1: 0, c1: 0, r2: 3, c2: 0 }, type: "cell", op: "gt", v1: "10", style: { bg: "#ff0000", fc: "#ffffff", b: true } },
  { rg: { r1: 0, c1: 0, r2: 3, c2: 0 }, type: "bar", color: "#336699" },
  { rg: { r1: 0, c1: 1, r2: 2, c2: 1 }, type: "dup", style: { bg: "#ffff00" } },
  { rg: { r1: 0, c1: 0, r2: 3, c2: 0 }, type: "scale", colors: ["#ff0000", "#00ff00"] },
  { rg: { r1: 0, c1: 0, r2: 3, c2: 0 }, type: "top", n: 2, style: { b: true } },
]);
b.setDV(sh, { r1: 0, c1: 3, r2: 4, c2: 3 }, { type: "list", list: "Red, Green", allowBlank: true, alert: "warn", title: "Oops", msg: "Pick one" });
b.setDV(sh, { r1: 0, c1: 4, r2: 4, c2: 4 }, { type: "whole", op: "between", f1: "1", f2: "9" });
b.setNote(sh, 0, 0, "a note"); b.setLink(sh, 5, 0, "https://example.com", "site");
b.setInput(sh, 7, 0, "h1"); b.setInput(sh, 8, 0, "h2"); b.hideLines(sh, "row", 7, 8, true); b.hideLines(sh, "col", 6, 6, true);
b.addChart(sh, { type: "column", title: "T", src: { sheet: sh.name, r1: 0, c1: 0, r2: 3, c2: 1 }, hdrRow: false, hdrCol: false, x: 10, y: 10, w: 300, h: 200 });
const bytes = await exportXlsx(b);
const r = await importXlsx(bytes), s = r.sheets[0];
ok("sheets (meta hidden)", r.sheets.length === 1);
ok("cf restored from meta", s.cf.length === 5 && s.cf.some((x) => x.type === "bar"));
ok("chart restored", s.charts.length === 1 && s.charts[0].title === "T");
ok("dv count", s.dv.length === 2); const l = s.dv.find((d) => d.type === "list"), w = s.dv.find((d) => d.type === "whole");
ok("dv list", l && l.list === "Red,Green" && l.alert === "warn" && l.title === "Oops" && l.rg.r2 === 4 && l.rg.c1 === 3);
ok("dv whole", w && w.op === "between" && w.f1 === "1" && w.f2 === "9");
ok("note", s.cells.get(0).n === "a note"); ok("link", s.cells.get(5 * 16384).h === "https://example.com" && s.cells.get(5 * 16384).v === "site");
ok("hidden rows", s.mhidden.has(7) && s.mhidden.has(8)); ok("hidden col", s.chidden.has(6));
// native CF only (no metadata): strip meta by exporting a book without charts/bars
const b2 = new Book(); const s2 = b2.sheet; [5, 12].forEach((v, i) => b2.setInput(s2, i, 0, String(v)));
b2.setCF(s2, [{ rg: { r1: 0, c1: 0, r2: 1, c2: 0 }, type: "cell", op: "between", v1: "1", v2: "9", style: { bg: "#00ff00" } }, { rg: { r1: 0, c1: 0, r2: 1, c2: 0 }, type: "text", op: "contains", text: "x", style: { fc: "#0000ff" } }]);
const wbn = new ExcelJS.Workbook(); await wbn.xlsx.load(await exportXlsx(b2)); wbn.removeWorksheet(wbn.getWorksheet("__MaterialXlsx").id);
const native = await importXlsx(new Uint8Array(await wbn.xlsx.writeBuffer())); const nc = native.sheets[0].cf;
ok("native cf count", nc.length === 2); ok("native between", nc[0].type === "cell" && nc[0].op === "between" && nc[0].v1 === "1" && nc[0].v2 === "9" && nc[0].style.bg === "#00ff00");
ok("native text->expr", nc[1].type === "expr" && /SEARCH/.test(nc[1].expr));
console.log(fail ? "FAILURES " + fail : "io: all passed");
// ── JSON / TSV (1.2) ──
{
  const { importJSON, toJSON, toCSV } = await import("../src/js/io.js");
  const r = importJSON('[{"name":"Tea","qty":3,"ok":true,"tags":["a","b"]},{"name":"Coffee","qty":5.5,"extra":null}]', "Menu", "en");
  const bk = new Book(); bk.reset(r.sheets, r.styles); const s = bk.sheet;
  ok("json header", bk.value(s, 0, 0) === "name" && bk.value(s, 0, 1) === "qty" && bk.value(s, 0, 3) === "tags" && bk.value(s, 0, 4) === "extra");
  ok("json values", bk.value(s, 1, 1) === 3 && bk.value(s, 2, 1) === 5.5 && bk.value(s, 1, 2) === true && bk.value(s, 1, 3) === '["a","b"]' && bk.value(s, 2, 4) === null);
  ok("json sheet name", s.name === "Menu");
  const back = JSON.parse(toJSON(bk, s)); ok("json roundtrip", back.length === 2 && back[0].name === "Tea" && back[1].qty === 5.5);
  const w = importJSON('{"data":[[1,2],[3,"=x"]]}', "W", "vi"); const b2 = new Book(); b2.reset(w.sheets, w.styles);
  ok("json wrapped arrays", b2.value(b2.sheet, 1, 0) === 3 && b2.value(b2.sheet, 1, 1) === "=x");
  let bad = false; try { importJSON("42", "x", "en"); } catch { bad = true; } ok("json rejects scalars", bad);
  const tsv = toCSV(bk, s, "\t"); ok("tsv export", tsv.split("\r\n")[1].startsWith("Tea\t3\tTRUE"));
  const { canOpen, extOf } = await import("../src/js/formats.js");
  ok("formats", canOpen("a.XLSM") && canOpen("x.json") && canOpen("t.xltx") && !canOpen("old.xls") && !canOpen("a.ods") && extOf("A.B.CSV") === "csv");
}
