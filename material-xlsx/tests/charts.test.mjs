import { writeFileSync, mkdirSync } from "node:fs";
import { Book } from "../src/js/model.js";
import { chartData, renderChart, guessHeaders, CHART_TYPES } from "../src/js/charts.js";
let fail = 0; const ok = (n, c) => { if (!c) { fail++; console.log("FAIL", n); } };
const b = new Book(), sh = b.sheet;
const rows = [["", "Q1", "Q2", "Q3"], ["North", 10, 20, 15], ["South", 30, -5, 25], ["East", 12, 14, 0]];
rows.forEach((row, r) => row.forEach((v, c) => { if (v !== "") b.setInput(sh, r, c, String(v)); }));
const rg = { r1: 0, c1: 0, r2: 3, c2: 3 };
const g = guessHeaders(b, sh, rg); ok("headers", g.hdrRow && g.hdrCol);
const base = { src: { sheet: sh.name, ...rg }, hdrRow: true, hdrCol: true, title: "Sales <2024> & more" };
let d = chartData(b, base);
ok("cats", d.cats.join() === "North,South,East"); ok("series", d.series.length === 3 && d.series[1].name === "Q2" && d.series[1].values[1] === -5);
d = chartData(b, { ...base, byRows: true }); ok("byRows", d.cats.join() === "Q1,Q2,Q3" && d.series.length === 3 && d.series[0].name === "North" && d.series[2].values[0] === 12);
mkdirSync("/tmp/charts", { recursive: true });
for (const type of CHART_TYPES) for (const extra of [{}, { stacked: true, labels: true, legend: "right" }, { byRows: true, palette: "warm" }]) {
  const ch = { ...base, type, ...extra }; const svg = renderChart(ch, chartData(b, ch), 480, 300);
  ok(type + " svg", svg.startsWith("<svg") && svg.endsWith("</svg>")); ok(type + " escaped title", !svg.includes("<2024>") && svg.includes("&lt;2024&gt;"));
  if (type === "column") ok("bar count", (svg.match(/class="ch-bar"/g) || []).length === (extra.byRows ? 9 : 9));
  if (type === "pie" && !extra.byRows) ok("slices", (svg.match(/class="ch-slice"/g) || []).length === 3);
  writeFileSync(`/tmp/charts/${type}-${Object.keys(extra).join("_") || "plain"}.svg`, svg.replace(/var\(--[a-z-]+\)/g, "#444").replace(/color-mix\([^)]*\)/g, "#888"));
}
ok("empty", renderChart({ ...base, type: "column", src: { sheet: "Nope", ...rg } }, chartData(b, { ...base, src: { sheet: "Nope", ...rg } }), 300, 200).includes("<svg"));
console.log(fail ? "FAILURES " + fail : "charts: all passed");
