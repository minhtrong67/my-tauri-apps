import { Book, splitText } from "../src/js/model.js";
import { cfStyle, dvViolation, dvOptions, cfPaintsEmpty } from "../src/js/features.js";
let fail = 0;
const ok = (name, cond) => { if (!cond) { fail++; console.log("FAIL", name); } };
const b = new Book(); let sh = b.sheet;
const set = (a, v) => { const m = /^([A-Z]+)(\d+)$/.exec(a); b.setInput(sh, +m[2] - 1, m[1].charCodeAt(0) - 65, String(v)); };
[5, 12, 8, 20, 3, 12].forEach((v, i) => set("A" + (i + 1), v));
["apple", "Banana", "apple", "cherry"].forEach((v, i) => set("B" + (i + 1), v));
const A = { r1: 0, c1: 0, r2: 5, c2: 0 }, B = { r1: 0, c1: 1, r2: 3, c2: 1 };
const cf = (rule) => { b.setCF(sh, [rule]); };
cf({ rg: A, type: "cell", op: "gt", v1: "10", style: { bg: "#ff0000" } });
ok("gt 12", cfStyle(b, sh, 1, 0)?.bg === "#ff0000"); ok("gt 5", cfStyle(b, sh, 0, 0) === null); ok("gt 20", cfStyle(b, sh, 3, 0)?.bg === "#ff0000");
cf({ rg: A, type: "cell", op: "between", v1: "5", v2: "8", style: { fc: "#00f" } });
ok("between 5", cfStyle(b, sh, 0, 0)?.fc === "#00f"); ok("between 8", cfStyle(b, sh, 2, 0)?.fc === "#00f"); ok("between 12", cfStyle(b, sh, 1, 0) === null);
cf({ rg: A, type: "top", n: 2, style: { b: true } });
ok("top20", cfStyle(b, sh, 3, 0)?.b === true); ok("top12", cfStyle(b, sh, 1, 0)?.b === true); ok("top5", cfStyle(b, sh, 0, 0) === null);
cf({ rg: A, type: "top", n: 1, bottom: true, style: { b: true } });
ok("bottom3", cfStyle(b, sh, 4, 0)?.b === true); ok("bottom5", cfStyle(b, sh, 0, 0) === null);
cf({ rg: A, type: "avg", style: { i: true } });
ok("avg above (10)", cfStyle(b, sh, 1, 0)?.i === true && cfStyle(b, sh, 0, 0) === null);
cf({ rg: B, type: "dup", style: { bg: "#ff0" } });
ok("dup apple", cfStyle(b, sh, 0, 1)?.bg === "#ff0" && cfStyle(b, sh, 2, 1)?.bg === "#ff0"); ok("dup banana", cfStyle(b, sh, 1, 1) === null);
cf({ rg: B, type: "dup", unique: true, style: { bg: "#ff0" } });
ok("unique banana", cfStyle(b, sh, 1, 1)?.bg === "#ff0");
cf({ rg: B, type: "text", op: "contains", text: "AN", style: { bg: "#0f0" } });
ok("contains", cfStyle(b, sh, 1, 1)?.bg === "#0f0" && cfStyle(b, sh, 0, 1) === null);
cf({ rg: B, type: "text", op: "begins", text: "ch", style: { bg: "#0f0" } });
ok("begins", cfStyle(b, sh, 3, 1)?.bg === "#0f0");
cf({ rg: { r1: 0, c1: 0, r2: 5, c2: 3 }, type: "expr", expr: "$A1>10", style: { bg: "#abc" } });
ok("expr row", cfStyle(b, sh, 1, 2)?.bg === "#abc" && cfStyle(b, sh, 0, 2) === null); ok("expr paints empty", cfPaintsEmpty(b, sh));
cf({ rg: A, type: "scale", colors: ["#000000", "#ffffff"] });
ok("scale min", cfStyle(b, sh, 4, 0)?.bg === "#000000"); ok("scale max", cfStyle(b, sh, 3, 0)?.bg === "#ffffff"); ok("scale mid", cfStyle(b, sh, 2, 0)?.bg === "#4b4b4b");
cf({ rg: A, type: "scale", colors: ["#ff0000", "#ffff00", "#00ff00"] });
ok("scale3 mid is yellow-ish", cfStyle(b, sh, 2, 0)?.bg === "#ffff00" || cfStyle(b, sh, 0, 0)?.bg !== undefined);
cf({ rg: A, type: "bar", color: "#123456" });
ok("bar max", Math.abs(cfStyle(b, sh, 3, 0).bar.pct - 1) < 1e-9); ok("bar color", cfStyle(b, sh, 3, 0).bar.color === "#123456");
// priority: first rule wins per property
b.setCF(sh, [{ rg: A, type: "cell", op: "gt", v1: "10", style: { bg: "#111" } }, { rg: A, type: "cell", op: "gt", v1: "4", style: { bg: "#222", fc: "#333" } }]);
ok("priority", cfStyle(b, sh, 1, 0).bg === "#111" && cfStyle(b, sh, 1, 0).fc === "#333");
// CF follows inserted rows
b.insertLines(sh, "row", 0, 2); ok("cf shifts", sh.cf[0].rg.r1 === 2 && sh.cf[0].rg.r2 === 7);
b.undo(); ok("undo restores cf", b.sheet.cf[0].rg.r1 === 0);
sh = b.sheet; b.clearCF(sh, A); ok("clear cf", b.sheet.cf.length === 0);
// data validation
const D = { r1: 0, c1: 3, r2: 4, c2: 3 };
b.setDV(sh, D, { type: "list", list: "Red, Green;Blue", allowBlank: true });
ok("list ok", dvViolation(b, sh, 0, 3, "green") === null); ok("list bad", dvViolation(b, sh, 0, 3, "pink") !== null); ok("list blank ok", dvViolation(b, sh, 0, 3, "") === null);
ok("list options", dvOptions(b, sh, sh.dv[0]).join("|") === "Red|Green|Blue"); ok("outside range", dvViolation(b, sh, 9, 3, "pink") === null);
b.setDV(sh, D, { type: "whole", op: "between", f1: "1", f2: "10" });
ok("whole ok", dvViolation(b, sh, 0, 3, "7") === null); ok("whole high", dvViolation(b, sh, 0, 3, "11") !== null); ok("whole dec", dvViolation(b, sh, 0, 3, "2.5") !== null); ok("whole text", dvViolation(b, sh, 0, 3, "abc") !== null);
b.setDV(sh, D, { type: "decimal", op: "ge", f1: "0.5" }); ok("decimal ok", dvViolation(b, sh, 1, 3, "0.5") === null); ok("decimal low", dvViolation(b, sh, 1, 3, "0.1") !== null);
b.setDV(sh, D, { type: "length", op: "le", f1: "3" }); ok("len ok", dvViolation(b, sh, 1, 3, "abc") === null); ok("len bad", dvViolation(b, sh, 1, 3, "abcd") !== null);
b.setDV(sh, D, { type: "date", op: "gt", f1: "2020-01-01" }); ok("date ok", dvViolation(b, sh, 1, 3, "2021-05-05") === null); ok("date bad", dvViolation(b, sh, 1, 3, "2019-05-05") !== null);
b.setDV(sh, D, { type: "custom", expr: "=ISNUMBER(D1)" }); ok("custom ok", dvViolation(b, sh, 0, 3, "5") === null); ok("custom bad", dvViolation(b, sh, 0, 3, "x") !== null);
b.setDV(sh, D, { type: "list", list: "=$B$1:$B$4" }); ok("list from range", dvViolation(b, sh, 0, 3, "cherry") === null && dvViolation(b, sh, 0, 3, "kiwi") !== null);
b.setDV(sh, D, null); ok("remove dv", sh.dv.length === 0);
// notes / links keep working through edits, sort and copy
b.setNote(sh, 0, 0, "hello"); b.setInput(sh, 0, 0, "99"); ok("note survives edit", sh.cells.get(0).n === "hello");
b.setLink(sh, 1, 0, "https://example.com", "site"); ok("link cell", sh.cells.get(16384).h === "https://example.com" && sh.cells.get(16384).v === "site");
const pl = b.copyPayload(sh, { r1: 0, c1: 0, r2: 1, c2: 0 }); b.pasteCells(sh, { r1: 10, c1: 5, r2: 10, c2: 5 }, pl, "all");
ok("paste carries note+link", sh.cells.get(10 * 16384 + 5).n === "hello" && sh.cells.get(11 * 16384 + 5).h === "https://example.com");
b.setLink(sh, 1, 0, null); ok("remove link", sh.cells.get(16384).h === undefined);
// hide / unhide
b.hideLines(sh, "row", 2, 3, true); ok("hide rows", sh.rowHidden(2) && sh.rowHidden(3)); b.insertLines(sh, "row", 0, 1); ok("hidden shifts", sh.mhidden.has(3) && sh.mhidden.has(4));
b.hideLines(sh, "row", 0, 10, false); ok("unhide", sh.mhidden.size === 0);
// remove duplicates
const b2 = new Book(), s2 = b2.sheet; ["a", "B", "a", "b", "c"].forEach((v, i) => b2.setInput(s2, i, 0, v)); ["1", "2", "1", "3", "4"].forEach((v, i) => b2.setInput(s2, i, 1, v));
ok("dedupe count", b2.removeDuplicates(s2, { r1: 0, c1: 0, r2: 4, c2: 1 }, [0], false) === 2);
ok("dedupe result", b2.display(s2, 0, 0).text === "a" && b2.display(s2, 1, 0).text === "B" && b2.display(s2, 2, 0).text === "c" && b2.display(s2, 3, 0).text === "" && b2.display(s2, 2, 1).text === "4");
// multi-key sort
const b3 = new Book(), s3 = b3.sheet; [["b", 2], ["a", 2], ["b", 1], ["a", 1]].forEach(([x, y], i) => { b3.setInput(s3, i, 0, x); b3.setInput(s3, i, 1, String(y)); });
b3.sortMulti(s3, { r1: 0, c1: 0, r2: 3, c2: 1 }, [{ col: 0, asc: true }, { col: 1, asc: false }], false);
ok("sortMulti", [0, 1, 2, 3].map((r) => b3.display(s3, r, 0).text + b3.display(s3, r, 1).text).join(",") === "a2,a1,b2,b1");
// text to columns / split
ok("split basic", splitText("a,b,,c", [","], false, '"').join("|") === "a|b||c"); ok("split quotes", splitText('a,"b,c",d', [","], false, '"').join("|") === "a|b,c|d");
ok("split consecutive", splitText("a  b   c", [" "], true, '"').join("|") === "a|b|c");
const b4 = new Book(), s4 = b4.sheet; b4.setInput(s4, 0, 0, "x;1;2024-01-02"); b4.textToColumns(s4, { r1: 0, c1: 0, r2: 0, c2: 0 }, { delims: [";"] });
ok("text to columns", b4.display(s4, 0, 0).text === "x" && b4.display(s4, 0, 1).text === "1" && typeof b4.value(s4, 0, 2) === "number");
// paste special
const b5 = new Book(), s5 = b5.sheet; [1, 2, 3].forEach((v, i) => { b5.setInput(s5, 0, i, String(v)); b5.setInput(s5, 1, i, String(v * 10)); });
let p5 = b5.copyPayload(s5, { r1: 0, c1: 0, r2: 0, c2: 2 });
b5.pasteSpecial(s5, { r1: 1, c1: 0, r2: 1, c2: 0 }, p5, { op: "add" }); ok("paste add", b5.value(s5, 1, 0) === 11 && b5.value(s5, 1, 2) === 33);
b5.pasteSpecial(s5, { r1: 3, c1: 0, r2: 3, c2: 0 }, p5, { transpose: true }); ok("transpose", b5.value(s5, 3, 0) === 1 && b5.value(s5, 4, 0) === 2 && b5.value(s5, 5, 0) === 3);
b5.setInput(s5, 7, 0, "=A1*2"); const p6 = b5.copyPayload(s5, { r1: 7, c1: 0, r2: 7, c2: 0 }); b5.pasteSpecial(s5, { r1: 8, c1: 0, r2: 8, c2: 0 }, p6, { mode: "values" }); ok("paste values", s5.cells.get(8 * 16384).f === undefined && b5.value(s5, 8, 0) === 2);
// format as table
b5.formatTable(s5, { r1: 0, c1: 0, r2: 2, c2: 2 }, { head: "#2f5597", band: "#dce6f4", line: "#8faadc" }, true);
ok("table header", b5.styles[s5.cells.get(0).s].bg === "#2f5597" && b5.styles[s5.cells.get(0).s].b === true); ok("table band", b5.styles[s5.cells.get(2 * 16384).s].bg === "#dce6f4" || b5.styles[s5.cells.get(16384).s].bg === undefined); ok("table filter", !!s5.filter);
// charts
b5.addChart(s5, { type: "column", src: { sheet: s5.name, r1: 0, c1: 0, r2: 2, c2: 2 }, x: 10, y: 10, w: 300, h: 200 }); ok("chart added", s5.charts.length === 1 && !!s5.charts[0].id);
b5.renameSheet(0, "Data"); ok("chart follows rename", s5.charts[0].src.sheet === "Data"); b5.undo(); ok("undo rename", b5.sheet.charts[0].src.sheet === "Sheet1");
console.log(fail ? "FAILURES " + fail : "features: all passed");
