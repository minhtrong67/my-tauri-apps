// Extra Excel-style features of the UI: conditional formatting, data validation, charts, hyperlinks, notes,
// paste special, remove duplicates, text to columns, custom sort, tables, cell styles, hide / unhide.
import * as W from "./widgets.js";
import { t } from "./i18n.js";
import { rangeText, parseRef, key, MAX_ROWS, MAX_COLS, colName, colIndex } from "./refs.js";
import { dvOptions } from "./features.js";
import { renderChart, chartData, guessHeaders, CHART_TYPES, PALETTES } from "./charts.js";

const { el, icon } = W;

// ───────────────────────── form helpers ─────────────────────────
const fld = (label, control, hint) => {
  const r = el("div", "frow"), l = el("label"); l.textContent = label; r.append(l, control);
  if (hint) { const h = el("div", "hint"); h.textContent = hint; r.append(h); }
  return r;
};
const inp = (value = "", ph = "", cls = "field") => { const i = el("input", cls); i.value = value; i.placeholder = ph; i.spellcheck = false; i.autocomplete = "off"; return i; };
const sel = (opts, value) => { const s = el("select", "fsel"); for (const [v, l] of opts) { const o = el("option"); o.value = v; o.textContent = l; s.appendChild(o); } s.value = value; return s; };
const chk = (text, on) => { const l = el("label", "chk"), i = el("input"); i.type = "checkbox"; i.checked = !!on; const sp = el("span"); sp.textContent = text; l.append(i, sp); l.input = i; return l; };
const color = (v) => { const i = el("input", "colorin"); i.type = "color"; i.value = v; return i; };
const section = (title) => { const h = el("h3"); h.textContent = title; return h; };
const cancelA = () => ({ label: t("btn.cancel"), icon: "close", cancel: true });
const okA = (label, run, ico = "check") => ({ label, icon: ico, primary: true, run });
const bad = (control) => { control.classList.remove("shake"); void control.offsetWidth; control.classList.add("shake"); control.classList.add("invalid"); setTimeout(() => control.classList.remove("invalid"), 1500); control.focus(); return false; };

const rgText = (g) => (g.r1 === 0 && g.r2 === MAX_ROWS - 1 ? `${colName(g.c1)}:${colName(g.c2)}` : g.c1 === 0 && g.c2 === MAX_COLS - 1 ? `${g.r1 + 1}:${g.r2 + 1}` : rangeText(g.r1, g.c1, g.r2, g.c2));
function parseRg(txt) {
  txt = String(txt || "").trim().replace(/\$/g, "").toUpperCase(); if (!txt) return null;
  const [a, b = a] = txt.split(":");
  const col = /^[A-Z]{1,3}$/, row = /^\d+$/, cell = /^([A-Z]{1,3})(\d+)$/;
  if (col.test(a) && col.test(b)) return { r1: 0, c1: Math.min(colIndex(a), colIndex(b)), r2: MAX_ROWS - 1, c2: Math.max(colIndex(a), colIndex(b)) };
  if (row.test(a) && row.test(b)) return { r1: Math.min(+a, +b) - 1, c1: 0, r2: Math.max(+a, +b) - 1, c2: MAX_COLS - 1 };
  const x = cell.exec(a), y = cell.exec(b); if (!x || !y) return null;
  const r1 = +x[2] - 1, r2 = +y[2] - 1, c1 = colIndex(x[1]), c2 = colIndex(y[1]);
  if (r1 < 0 || r2 < 0 || r1 >= MAX_ROWS || r2 >= MAX_ROWS || c1 >= MAX_COLS || c2 >= MAX_COLS) return null;
  return { r1: Math.min(r1, r2), c1: Math.min(c1, c2), r2: Math.max(r1, r2), c2: Math.max(c1, c2) };
}

export const CF_PRESETS = [
  { id: "lightred", bg: "#ffc7ce", fc: "#9c0006" }, { id: "yellow", bg: "#ffeb9c", fc: "#9c5700" }, { id: "green", bg: "#c6efce", fc: "#006100" },
  { id: "blue", bg: "#bdd7ee", fc: "#1f4e79" }, { id: "redtext", fc: "#c00000" }, { id: "redfill", bg: "#e5484d", fc: "#ffffff" },
];
const SCALES = [["#f8696b", "#ffeb84", "#63be7b"], ["#63be7b", "#ffeb84", "#f8696b"], ["#ffffff", "#63be7b"], ["#ffffff", "#f8696b"], ["#f8696b", "#ffffff", "#5a8ac6"], ["#ffffff", "#5a8ac6"]];
export const TABLE_SCHEMES = [
  { id: "blue", head: "#2f5597", band: "#dce6f4", line: "#8faadc" }, { id: "green", head: "#2e7d32", band: "#dff0df", line: "#8fc38f" },
  { id: "orange", head: "#c55a11", band: "#fbe5d6", line: "#f4b183" }, { id: "gray", head: "#595959", band: "#ededed", line: "#bfbfbf" },
  { id: "purple", head: "#6a3d9a", band: "#e8dff3", line: "#b39ddb" }, { id: "teal", head: "#00796b", band: "#d9efec", line: "#80cbc4" },
];
export const CELL_STYLES = [
  { id: "normal", reset: true }, { id: "good", st: { bg: "#c6efce", fc: "#006100" } }, { id: "bad", st: { bg: "#ffc7ce", fc: "#9c0006" } }, { id: "neutral", st: { bg: "#ffeb9c", fc: "#9c5700" } },
  { id: "title", st: { b: true, fs: 18, fc: "#1f3864" } }, { id: "h1", st: { b: true, fs: 14, fc: "#1f3864", bB: "#4472c4" } }, { id: "h2", st: { b: true, fs: 12, fc: "#1f3864", bB: "#8faadc" } },
  { id: "input", st: { bg: "#ffcc99", fc: "#3f3f76", bT: "#7f7f7f", bB: "#7f7f7f", bL: "#7f7f7f", bR: "#7f7f7f" } }, { id: "calc", st: { bg: "#f2f2f2", fc: "#fa7d00", b: true, bT: "#7f7f7f", bB: "#7f7f7f", bL: "#7f7f7f", bR: "#7f7f7f" } },
  { id: "note", st: { bg: "#ffffcc", fc: "#404040", bT: "#b2b2b2", bB: "#b2b2b2", bL: "#b2b2b2", bR: "#b2b2b2" } }, { id: "total", st: { b: true, bT: "#000000", bB: "#000000" } }, { id: "link", st: { fc: "#0b57d0", u: true } },
];

export function createExtras(ctx) {
  const { book, grid, sheet, toast, FS, hooks } = ctx;
  const CMD = {};
  const sel1 = () => { const g = grid.range(); return g; };
  const refocus = () => grid.scroll.focus({ preventScroll: true });
  const cell = (r, c) => sheet().cells.get(key(r, c));

  // ───────────────────────── conditional formatting ─────────────────────────
  const opLabel = (op) => t("x.op." + op);
  function describe(rule) {
    switch (rule.type) {
      case "cell": return t("x.cf.d.cell", { op: opLabel(rule.op), v: rule.op === "between" || rule.op === "nbetween" ? `${rule.v1} – ${rule.v2}` : rule.v1 });
      case "text": return t("x.cf.d.text", { op: t("x.top." + rule.op), v: rule.text });
      case "dup": return t(rule.unique ? "x.cf.d.unique" : "x.cf.d.dup");
      case "top": return t(rule.bottom ? "x.cf.d.bottom" : "x.cf.d.top", { n: rule.n + (rule.percent ? "%" : "") });
      case "avg": return t(rule.below ? "x.cf.d.below" : "x.cf.d.above");
      case "blank": return t(rule.not ? "x.cf.d.notblank" : "x.cf.d.blank");
      case "expr": return t("x.cf.d.expr", { v: rule.expr });
      case "scale": return t("x.cf.d.scale", { n: rule.colors.length });
      case "bar": return t("x.cf.d.bar");
      default: return rule.type;
    }
  }
  function styleChip(st = {}, text = "Aa") {
    const c = el("span", "cfchip"); c.textContent = text;
    if (st.bg) c.style.background = st.bg; if (st.fc) c.style.color = st.fc; if (st.b) c.style.fontWeight = "700"; if (st.i) c.style.fontStyle = "italic";
    return c;
  }
  function ruleChip(rule) {
    if (rule.type === "scale") { const c = el("span", "cfchip"); c.style.background = `linear-gradient(90deg, ${rule.colors.join(",")})`; c.textContent = ""; return c; }
    if (rule.type === "bar") { const c = el("span", "cfchip"); c.style.backgroundImage = `linear-gradient(90deg, ${rule.color} 65%, transparent 65%)`; return c; }
    return styleChip(rule.style);
  }

  /** opens the rule editor; resolves to the rule or null */
  function cfDialog({ rule, type, preset, rg }) {
    return new Promise((resolve) => {
      const R = rule ? JSON.parse(JSON.stringify(rule)) : { type: type || "cell", op: "gt", v1: "", v2: "", text: "", n: 10, style: { ...(preset || CF_PRESETS[0]) }, colors: SCALES[0], color: "#4f8cff" };
      delete R.style?.id;
      if (!R.style) R.style = { ...CF_PRESETS[0] };
      const box = el("div", "form");
      const typeSel = sel(["cell", "text", "dup", "top", "avg", "blank", "expr", "scale", "bar"].map((k) => [k, t("x.cf.t." + k)]), R.type);
      const range = inp(rgText(rule ? rule.rg : rg), "A1:B10");
      box.append(fld(t("x.cf.type"), typeSel), fld(t("x.cf.applies"), range));
      const panel = el("div", "cfpanel"), styleBox = el("div", "cfstyle");
      box.append(panel, styleBox);
      let read = () => ({});
      const opSel = (ops, v) => sel(ops.map((o) => [o, opLabel(o)]), v);
      const drawPanel = () => {
        panel.replaceChildren(); R.type = typeSel.value; styleBox.hidden = R.type === "scale" || R.type === "bar";
        const row = el("div", "frow inline");
        if (R.type === "cell") {
          const op = opSel(["gt", "lt", "ge", "le", "eq", "ne", "between", "nbetween"], R.op), a = inp(R.v1, t("x.value")), b = inp(R.v2, t("x.value"));
          const upd = () => { b.hidden = !(op.value === "between" || op.value === "nbetween"); }; op.onchange = upd; upd();
          row.append(op, a, b); panel.append(row, hint(t("x.cf.hint.cell")));
          read = () => { if (!a.value.trim()) return bad(a); if (!b.hidden && !b.value.trim()) return bad(b); return { type: "cell", op: op.value, v1: a.value.trim(), v2: b.hidden ? "" : b.value.trim() }; };
        } else if (R.type === "text") {
          const op = sel(["contains", "ncontains", "begins", "ends"].map((o) => [o, t("x.top." + o)]), R.op && isNaN(+R.op) && ["contains", "ncontains", "begins", "ends"].includes(R.op) ? R.op : "contains"), a = inp(R.text || "", t("x.text"));
          row.append(op, a); panel.append(row);
          read = () => (a.value === "" ? bad(a) : { type: "text", op: op.value, text: a.value });
        } else if (R.type === "dup") {
          const o = sel([["dup", t("x.dup.dup")], ["unique", t("x.dup.unique")]], R.unique ? "unique" : "dup"); row.append(o); panel.append(row);
          read = () => ({ type: "dup", unique: o.value === "unique" });
        } else if (R.type === "top") {
          const o = sel([["top", t("x.top.top")], ["bottom", t("x.top.bottom")]], R.bottom ? "bottom" : "top"), n = inp(String(R.n || 10)), p = chk(t("x.top.percent"), R.percent); n.style.width = "80px"; row.append(o, n, p); panel.append(row);
          read = () => { const v = parseInt(n.value, 10); if (!(v >= 1 && v <= 1000)) return bad(n); return { type: "top", bottom: o.value === "bottom", n: v, percent: p.input.checked }; };
        } else if (R.type === "avg") {
          const o = sel([["above", t("x.avg.above")], ["below", t("x.avg.below")]], R.below ? "below" : "above"); row.append(o); panel.append(row);
          read = () => ({ type: "avg", below: o.value === "below" });
        } else if (R.type === "blank") {
          const o = sel([["blank", t("x.blank.blank")], ["not", t("x.blank.not")]], R.not ? "not" : "blank"); row.append(o); panel.append(row);
          read = () => ({ type: "blank", not: o.value === "not" });
        } else if (R.type === "expr") {
          const a = inp(R.expr ? "=" + String(R.expr).replace(/^=/, "") : "", "=$A1>10"); a.style.width = "100%"; row.append(a); panel.append(row, hint(t("x.cf.hint.expr")));
          read = () => { const v = a.value.trim().replace(/^=/, ""); return v ? { type: "expr", expr: v } : bad(a); };
        } else if (R.type === "scale") {
          let cols = (R.colors || SCALES[0]).slice(); const wrap = el("div", "scales");
          const draw = () => { wrap.replaceChildren(); SCALES.forEach((sc) => { const b = el("button", "scale" + (JSON.stringify(sc) === JSON.stringify(cols) ? " on" : "")); b.type = "button"; b.style.background = `linear-gradient(90deg, ${sc.join(",")})`; b.onclick = () => { cols = sc.slice(); draw(); }; wrap.appendChild(b); }); };
          draw(); panel.append(hint(t("x.cf.scale")), wrap); read = () => ({ type: "scale", colors: cols });
        } else if (R.type === "bar") {
          const c = color(R.color || "#4f8cff"); row.append(el("label")); row.firstChild.textContent = t("x.cf.barcolor"); row.append(c); panel.append(row); read = () => ({ type: "bar", color: c.value });
        }
      };
      const hint = (txt) => { const h = el("div", "hint"); h.textContent = txt; return h; };
      // format
      let style = { ...R.style };
      const drawStyle = () => {
        styleBox.replaceChildren(); styleBox.appendChild(section(t("x.cf.format")));
        const row = el("div", "presets");
        CF_PRESETS.forEach((p) => { const b = styleChip(p, t("x.cf.p." + p.id)); b.classList.add("preset"); if (style.bg === p.bg && style.fc === p.fc) b.classList.add("on"); b.tabIndex = 0; b.onclick = () => { style = { ...p }; delete style.id; drawStyle(); }; row.appendChild(b); });
        const cu = el("div", "customrow");
        const f = color(style.bg || "#ffffff"), x = color(style.fc || "#000000"), b = chk(t("cmd.bold"), style.b), i = chk(t("cmd.italic"), style.i);
        const lf = el("label"); lf.textContent = t("x.cf.fill"); const lt = el("label"); lt.textContent = t("x.cf.text");
        f.oninput = () => { style = { ...style, bg: f.value }; delete style.id; prev.replaceWith((prev = styleChip(style, t("x.cf.preview")))); prev.classList.add("big"); };
        x.oninput = () => { style = { ...style, fc: x.value }; prev.replaceWith((prev = styleChip(style, t("x.cf.preview")))); prev.classList.add("big"); };
        b.input.onchange = () => { style = { ...style, b: b.input.checked || undefined }; prev.replaceWith((prev = styleChip(style, t("x.cf.preview")))); prev.classList.add("big"); };
        i.input.onchange = () => { style = { ...style, i: i.input.checked || undefined }; prev.replaceWith((prev = styleChip(style, t("x.cf.preview")))); prev.classList.add("big"); };
        let prev = styleChip(style, t("x.cf.preview")); prev.classList.add("big");
        cu.append(lf, f, lt, x, b, i); styleBox.append(row, cu, prev);
      };
      typeSel.onchange = drawPanel; drawPanel(); drawStyle();
      let done = false;
      const d = W.dialog({
        title: t(rule ? "x.cf.edit" : "x.cf.new"), size: "lg", content: box,
        actions: [cancelA(), okA(t("btn.apply"), () => {
          const g = parseRg(range.value); if (!g) return bad(range);
          const body = read(); if (body === false) return false;
          done = true; const out = { ...(rule ? { id: rule.id } : {}), ...body, rg: g };
          if (!["scale", "bar"].includes(out.type)) out.style = { ...style };
          resolve(out);
        })], onClose: () => { if (!done) resolve(null); },
      });
      void d;
    });
  }
  async function addRule(opts) {
    const rg = sel1(), r = await cfDialog({ rg, ...opts });
    if (r) { book.addCF(sheet(), r); grid.flash(r.rg); }
  }
  function cfManager() {
    const box = el("div", "cfman");
    const draw = () => {
      box.replaceChildren();
      const rules = sheet().cf;
      if (!rules.length) { const e = el("div", "empty"); e.innerHTML = icon("cf"); const s = el("div"); s.textContent = t("x.cf.none"); e.append(s); box.appendChild(e); return; }
      rules.forEach((rule, i) => {
        const row = el("div", "cfrow stagger"); row.style.setProperty("--n", i);
        const mid = el("div", "mid"), a = el("div", "d"), b = el("div", "r muted"); a.textContent = describe(rule); b.textContent = rgText(rule.rg); mid.append(a, b);
        const mk = (ico, title, fn, dis) => { const x = el("button", "icon-btn"); x.type = "button"; x.innerHTML = icon(ico); x.title = title; x.disabled = !!dis; x.onclick = fn; return x; };
        const move = (d2) => { const arr = sheet().cf.map((x) => x); const [it] = arr.splice(i, 1); arr.splice(i + d2, 0, it); book.setCF(sheet(), arr); draw(); };
        row.append(ruleChip(rule), mid, mk("chevu", t("x.up"), () => move(-1), i === 0), mk("chevd", t("x.down"), () => move(1), i === rules.length - 1),
          mk("edit", t("x.edit"), async () => { const r = await cfDialog({ rule }); if (r) { book.setCF(sheet(), sheet().cf.map((x) => (x.id === rule.id ? r : x))); draw(); } }),
          mk("trash", t("x.delete"), () => { book.setCF(sheet(), sheet().cf.filter((x) => x.id !== rule.id)); draw(); }));
        box.appendChild(row);
      });
    };
    draw();
    W.dialog({ title: t("x.cf.manage"), size: "lg", content: box, actions: [{ label: t("x.cf.new"), icon: "plus", tonal: true, start: true, run: async () => { await addRule({}); draw(); return false; } }, { label: t("btn.close"), icon: "check", primary: true }] });
  }
  CMD.cfManage = { ico: "cf", run: cfManager };
  CMD.cfClearSel = { ico: "eraser", run: () => book.clearCF(sheet(), grid.range()) };
  CMD.cfClearAll = { ico: "trash", run: () => book.clearCF(sheet(), null) };
  const quick = (id, o) => { CMD[id] = { ico: "cf", run: () => addRule(o) }; };
  quick("cfGt", { type: "cell", preset: CF_PRESETS[0], op: "gt" }); quick("cfLt", { type: "cell", op: "lt" }); quick("cfBetween", { type: "cell", op: "between" }); quick("cfEq", { type: "cell", op: "eq" });
  quick("cfText", { type: "text" }); quick("cfDup", { type: "dup" }); quick("cfTop", { type: "top" }); quick("cfAvg", { type: "avg" }); quick("cfScale", { type: "scale" }); quick("cfBar", { type: "bar" }); quick("cfNew", {}); quick("cfExpr", { type: "expr" });
  function cfMenu(anchor) {
    const mi = (id, ico) => ({ label: t("cmd." + id), icon: ico || "cf", run: CMD[id].run });
    W.openMenu([{ title: t("x.cf.highlight") }, mi("cfGt"), mi("cfLt"), mi("cfBetween"), mi("cfEq"), mi("cfText"), mi("cfDup"), { sep: true }, { title: t("x.cf.topbottom") }, mi("cfTop"), mi("cfAvg"), { sep: true }, mi("cfBar", "chart"), mi("cfScale", "palette"), { sep: true }, mi("cfNew", "plus"), mi("cfExpr", "fx"), mi("cfManage", "tune"), { sep: true }, mi("cfClearSel", "eraser"), mi("cfClearAll", "trash")], anchor);
  }

  // ───────────────────────── data validation ─────────────────────────
  function dvDialog() {
    const g = sel1(), first = book.dvAt(sheet(), g.r1, g.c1) || {};
    const box = el("div", "form");
    const types = ["any", "list", "whole", "decimal", "date", "length", "custom"];
    const type = sel(types.map((k) => [k, t("x.dv.t." + k)]), first.type || "any");
    const range = inp(rgText(g));
    box.append(fld(t("x.cf.applies"), range), fld(t("x.dv.allow"), type));
    const body = el("div", "dvbody");
    const op = sel(["between", "nbetween", "eq", "ne", "gt", "lt", "ge", "le"].map((o) => [o, opLabel(o)]), first.op || "between");
    const f1 = inp(first.f1 || ""), f2 = inp(first.f2 || ""), list = inp(first.list || "", t("x.dv.listph")), expr = inp(first.expr ? "=" + String(first.expr).replace(/^=/, "") : "", "=ISNUMBER(A1)");
    const blank = chk(t("x.dv.blank"), first.allowBlank !== false), drop = chk(t("x.dv.drop"), first.showDrop !== false);
    const l1 = el("label"), l2 = el("label"); 
    const opRow = el("div", "frow inline"); opRow.append(op, f1, f2);
    const draw = () => {
      body.replaceChildren(); const ty = type.value;
      if (ty === "any") return;
      if (ty === "list") body.append(fld(t("x.dv.source"), list, t("x.dv.listhint")), drop);
      else if (ty === "custom") body.append(fld(t("x.dv.formula"), expr, t("x.dv.formulahint")));
      else { const two = op.value === "between" || op.value === "nbetween"; f2.hidden = !two; f1.placeholder = ty === "date" ? "2024-01-31" : t("x.value"); f2.placeholder = f1.placeholder; body.append(fld(t("x.dv.data"), opRow)); }
      body.append(blank);
    };
    type.onchange = draw; op.onchange = draw; draw();
    box.appendChild(body);
    const inT = inp(first.inTitle || ""), inM = inp(first.inMsg || ""); const show = chk(t("x.dv.showerr"), first.showError !== false);
    const alert = sel([["stop", t("x.dv.stop")], ["warn", t("x.dv.warn")], ["info", t("x.dv.info")]], first.alert || "stop"), eT = inp(first.title || ""), eM = inp(first.msg || "");
    box.append(section(t("x.dv.input")), fld(t("x.dv.title"), inT), fld(t("x.dv.message"), inM), section(t("x.dv.error")), show, fld(t("x.dv.style"), alert), fld(t("x.dv.title"), eT), fld(t("x.dv.message"), eM));
    void l1; void l2;
    W.dialog({
      title: t("cmd.validation"), size: "lg", content: box,
      actions: [cancelA(), { label: t("x.dv.clear"), icon: "trash", start: true, outline: true, run: () => { const rg = parseRg(range.value); if (rg) book.setDV(sheet(), rg, null); } },
        okA(t("btn.apply"), () => {
          const rg = parseRg(range.value); if (!rg) return bad(range);
          const ty = type.value; if (ty === "any") { book.setDV(sheet(), rg, null); return; }
          const rule = { type: ty, allowBlank: blank.input.checked, showError: show.input.checked, alert: alert.value, title: eT.value, msg: eM.value, inTitle: inT.value, inMsg: inM.value };
          if (ty === "list") { if (!list.value.trim()) return bad(list); rule.list = list.value.trim(); rule.showDrop = drop.input.checked; }
          else if (ty === "custom") { if (!expr.value.trim()) return bad(expr); rule.expr = expr.value.trim().replace(/^=/, ""); }
          else { rule.op = op.value; if (!f1.value.trim()) return bad(f1); rule.f1 = f1.value.trim(); if (op.value === "between" || op.value === "nbetween") { if (!f2.value.trim()) return bad(f2); rule.f2 = f2.value.trim(); } }
          book.setDV(sheet(), rg, rule);
        })],
    });
  }
  CMD.validation = { ico: "dvlist", run: dvDialog };
  hooks.dvAlert = (rule, cb) => {
    const kind = rule.alert || "stop";
    if (rule.showError === false) { cb.accept(); return; }
    const acts = kind === "stop" ? [{ label: t("x.dv.retry"), icon: "redo", primary: true, value: "retry" }, { label: t("btn.cancel"), icon: "close", cancel: true, value: "cancel" }]
      : kind === "warn" ? [{ label: t("x.dv.yes"), icon: "check", primary: true, value: "ok" }, { label: t("x.dv.no"), icon: "redo", tonal: true, value: "retry" }, { label: t("btn.cancel"), icon: "close", cancel: true, value: "cancel" }]
        : [{ label: t("x.dv.ok"), icon: "check", primary: true, value: "ok" }, { label: t("btn.cancel"), icon: "close", cancel: true, value: "cancel" }];
    const content = el("div", "dvalert"); const ic = el("div", "ic " + kind); ic.innerHTML = icon("info"); const tx = el("p"); tx.textContent = rule.msg || t("x.dv.default"); content.append(ic, tx);
    W.dialog({ title: rule.title || t("x.dv.alerttitle"), size: "sm", content, actions: acts, onClose: (v) => { if (v === "ok") cb.accept(); else if (v === "cancel") cb.cancel(); else cb.retry(); } });
  };
  hooks.dvList = (dl, rect) => {
    const opts = dvOptions(book, sheet(), dl.rule), items = opts.map((o) => ({ label: o, run: () => { book.setInput(sheet(), dl.r, dl.c, o); refocus(); } }));
    if (!items.length) { toast(t("x.dv.empty")); return; }
    W.openMenu(items, { x: rect.left - 120 > 0 ? rect.right - 180 : rect.left, y: rect.bottom + 4 }, { onClose: refocus, maxHeight: 280 });
  };

  // ───────────────────────── hyperlinks & notes ─────────────────────────
  function linkDialog() {
    const a = grid.active(), c = cell(a.r, a.c) || {};
    const txt = inp(c.v !== undefined && c.f === undefined ? String(c.v) : "", t("x.link.textph")), url = inp(c.h || "", "https://");
    const box = el("div", "form"); box.append(fld(t("x.link.text"), txt), fld(t("x.link.address"), url, t("x.link.hint")));
    W.dialog({
      title: t("cmd.link"), size: "sm", content: box,
      actions: [cancelA(), ...(c.h ? [{ label: t("x.link.remove"), icon: "trash", start: true, outline: true, run: () => book.setLink(sheet(), a.r, a.c, null) }] : []),
        okA(t("btn.ok"), () => {
          let u = url.value.trim(); if (!u) return bad(url);
          if (!/^[a-z][a-z0-9+.-]*:|^#/i.test(u)) u = /^[\w.-]+\.[a-z]{2,}/i.test(u) ? "https://" + u : "https://" + u;
          book.setLink(sheet(), a.r, a.c, u, txt.value.trim() || undefined);
        })],
    });
    setTimeout(() => url.focus(), 80);
  }
  CMD.link = { ico: "link", key: "Ctrl+K", run: linkDialog };
  CMD.unlink = { ico: "trash", run: () => { const g = grid.range(); book.tx(() => { for (let r = g.r1; r <= Math.min(g.r2, g.r1 + 500); r++) for (let c = g.c1; c <= Math.min(g.c2, g.c1 + 50); c++) if (cell(r, c) && cell(r, c).h) book.setLink(sheet(), r, c, null); }); } };
  hooks.openLink = (url) => {
    if (url.startsWith("#")) {
      const m = /^#(?:'?([^'!]+)'?!)?(.+)$/.exec(url), ref = m && parseRef((m[1] ? `'${m[1]}'!` : "") + m[2]);
      if (!ref) return;
      const target = ref.sheet ? book.sheets.findIndex((s) => s.name.toLowerCase() === ref.sheet.toLowerCase()) : book.active;
      if (target < 0) return;
      if (target !== book.active) ctx.selectSheet(target);
      grid.select(Math.min(ref.r1, ref.r2), Math.min(ref.c1, ref.c2), Math.max(ref.r1, ref.r2), Math.max(ref.c1, ref.c2)); return;
    }
    FS.openUrl(url).catch(() => toast(t("x.link.fail")));
  };
  hooks.linkTip = () => t("x.link.tip");
  function noteDialog() {
    const a = grid.active(), c = cell(a.r, a.c) || {};
    const ta = el("textarea", "field notearea"); ta.value = c.n || ""; ta.rows = 5; ta.placeholder = t("x.note.ph");
    const box = el("div", "form"); box.append(ta);
    W.dialog({ title: t(c.n ? "x.note.edit" : "cmd.note"), size: "sm", content: box, actions: [cancelA(), ...(c.n ? [{ label: t("x.note.delete"), icon: "trash", start: true, outline: true, run: () => book.setNote(sheet(), a.r, a.c, "") }] : []), okA(t("btn.save"), () => { book.setNote(sheet(), a.r, a.c, ta.value.trim()); }, "save")] });
    setTimeout(() => { ta.focus(); }, 80);
  }
  CMD.note = { ico: "note", key: "Shift+F2", run: noteDialog };
  CMD.delNote = { ico: "trash", run: () => { const a = grid.active(); book.setNote(sheet(), a.r, a.c, ""); } };

  // ───────────────────────── charts ─────────────────────────
  function chartDialog(existing) {
    const g = sel1(), sh = sheet();
    let region = g;
    if (!existing && g.r1 === g.r2 && g.c1 === g.c2) region = grid.currentRegion(g.r1, g.c1) || g;
    const src = existing ? existing.src : { sheet: sh.name, ...region };
    const guess = existing ? { hdrRow: existing.hdrRow, hdrCol: existing.hdrCol } : guessHeaders(book, sh, src);
    const cfg = existing ? { ...existing } : { type: "column", title: "", legend: "bottom", palette: "colorful", stacked: false, labels: false, grid: true, byRows: false, w: 480, h: 300, hdrRow: guess.hdrRow, hdrCol: guess.hdrCol, src };
    const box = el("div", "chartdlg"), left = el("div", "form"), prev = el("div", "chprev");
    const types = el("div", "ctypes");
    const TICO = { column: "chart", bar: "chart", line: "chart", area: "chart", pie: "chart", doughnut: "chart", scatter: "chart" };
    const draw = () => { types.replaceChildren(); CHART_TYPES.forEach((k) => { const b = el("button", "ctype" + (cfg.type === k ? " on" : "")); b.type = "button"; b.innerHTML = miniIcon(k) + "<span></span>"; b.lastChild.textContent = t("x.ch.t." + k); b.onclick = () => { cfg.type = k; draw(); update(); }; types.appendChild(b); }); void TICO; };
    const title = inp(cfg.title || "", t("x.ch.titleph")), range = inp((src.sheet !== sh.name ? `'${src.sheet}'!` : "") + rgText(src));
    const byRows = sel([["cols", t("x.ch.bycols")], ["rows", t("x.ch.byrows")]], cfg.byRows ? "rows" : "cols");
    const hr = chk(t("x.ch.hdrrow"), cfg.hdrRow), hc = chk(t("x.ch.hdrcol"), cfg.hdrCol);
    const legend = sel([["bottom", t("x.ch.lbottom")], ["right", t("x.ch.lright")], ["none", t("x.ch.lnone")]], cfg.legend || "bottom");
    const pal = sel(Object.keys(PALETTES).map((k) => [k, t("x.ch.p." + k)]), cfg.palette || "colorful");
    const st = chk(t("x.ch.stacked"), cfg.stacked), lb = chk(t("x.ch.labels"), cfg.labels), gr = chk(t("x.ch.grid"), cfg.grid !== false);
    const opts = el("div", "chopts"); opts.append(st, lb, gr);
    left.append(fld(t("x.ch.title"), title), fld(t("x.ch.range"), range), fld(t("x.ch.series"), byRows), hr, hc, fld(t("x.ch.legend"), legend), fld(t("x.ch.palette"), pal), opts);
    box.append(types, el("div", "chcols")); box.lastChild.append(left, prev);
    const read = () => {
      const m = /^(?:'([^']+)'!|([^!]+)!)?(.+)$/.exec(range.value.trim()); const nm = m && (m[1] || m[2]); const rg = m && parseRg(m[3]);
      const target = nm ? book.sheetByName(nm) : sh; if (!rg || !target) return null;
      return { ...cfg, title: title.value.trim(), src: { sheet: target.name, ...rg }, byRows: byRows.value === "rows", hdrRow: hr.input.checked, hdrCol: hc.input.checked, legend: legend.value, palette: pal.value, stacked: st.input.checked, labels: lb.input.checked, grid: gr.input.checked };
    };
    const update = () => {
      const c = read(); st.hidden = !["column", "bar", "area"].includes(cfg.type);
      if (!c) { prev.innerHTML = '<div class="muted empty">—</div>'; return; }
      c.type = cfg.type; prev.innerHTML = renderChart({ ...c, empty: t("x.chart.empty") }, chartData(book, c), 420, 270);
    };
    for (const x of [title, range]) x.oninput = update; for (const x of [byRows, legend, pal, hr.input, hc.input, st.input, lb.input, gr.input]) x.onchange = update;
    draw(); update();
    W.dialog({
      title: t(existing ? "x.ch.edit" : "cmd.chart"), size: "xl", content: box,
      actions: [cancelA(), ...(existing ? [{ label: t("x.delete"), icon: "trash", start: true, outline: true, run: () => book.deleteChart(sheet(), existing.id) }] : []),
        okA(t(existing ? "btn.apply" : "x.ch.insert"), () => {
          const c = read(); if (!c) return bad(range); c.type = cfg.type;
          if (existing) { const { id, x, y, w, h, ...rest } = c; book.updateChart(sheet(), existing.id, rest); grid.requestRender(); return; }
          const a = grid.active(), z = grid.zoom;
          c.x = Math.round(grid.colX[a.c] / z) + 24; c.y = Math.round(grid.rowY[a.r] / z) + 24;
          const id = book.addChart(sheet(), c); setTimeout(() => grid.selectChart(id), 30);
        })],
    });
  }
  function miniIcon(k) {
    const P = { column: '<path d="M5 20V10M10 20V5M15 20v-7M20 20V8"/>', bar: '<path d="M4 5h10M4 10h15M4 15h7M4 20h12"/>', line: '<path d="m3 17 5-6 4 3 8-9"/>', area: '<path d="m3 18 5-7 4 3 8-8v12z"/>', pie: '<path d="M12 3v9h9a9 9 0 1 1-9-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>', doughnut: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>', scatter: '<circle cx="7" cy="16" r="1.4"/><circle cx="11" cy="9" r="1.4"/><circle cx="16" cy="13" r="1.4"/><circle cx="19" cy="6" r="1.4"/>' };
    return `<svg class="i" viewBox="0 0 24 24">${P[k]}</svg>`;
  }
  CMD.chart = { ico: "chart", run: () => chartDialog() };
  hooks.chartAction = (act, ch) => { if (act === "edit") chartDialog(ch); else if (act === "del") { grid.selChart = null; book.deleteChart(sheet(), ch.id); } };
  hooks.chartEmpty = () => t("x.chart.empty");
  hooks.chartEdit = (ch) => chartDialog(ch);

  // ───────────────────────── paste special, data tools ─────────────────────────
  function pasteSpecialDialog() {
    const box = el("div", "form");
    const mode = sel([["all", t("x.ps.all")], ["formulas", t("x.ps.formulas")], ["values", t("x.ps.values")], ["formats", t("x.ps.formats")]], "all");
    const op = sel([["none", t("x.ps.none")], ["add", t("x.ps.add")], ["sub", t("x.ps.sub")], ["mul", t("x.ps.mul")], ["div", t("x.ps.div")]], "none");
    const skip = chk(t("x.ps.skip"), false), tr = chk(t("x.ps.transpose"), false);
    box.append(fld(t("x.ps.paste"), mode), fld(t("x.ps.operation"), op), skip, tr);
    if (!grid.clip) { const n = el("div", "hint warn"); n.textContent = t("x.ps.empty"); box.prepend(n); }
    W.dialog({ title: t("cmd.pasteSpecial"), size: "sm", content: box, actions: [cancelA(), okA(t("x.ps.paste"), () => { if (!grid.pasteSpecial({ mode: mode.value, op: op.value, skipBlanks: skip.input.checked, transpose: tr.input.checked })) { toast(t("x.ps.empty")); } }, "paste")] });
  }
  CMD.pasteSpecial = { ico: "paste", key: "Ctrl+Alt+V", run: pasteSpecialDialog };
  CMD.pasteTranspose = { ico: "paste", run: () => grid.pasteSpecial({ transpose: true }) || toast(t("x.ps.empty")) };

  function dedupeDialog() {
    let g = grid.range(); if (g.r1 === g.r2 && g.c1 === g.c2) g = grid.currentRegion(g.r1, g.c1) || g;
    if (g.r2 <= g.r1) { toast(t("x.dd.need")); return; }
    const box = el("div", "form"), hdr = chk(t("x.dd.header"), true), list = el("div", "collist"), boxes = [];
    box.append(hdr);
    const lab = () => (c) => (hdr.input.checked ? book.display(sheet(), g.r1, c).text || colName(c) : colName(c));
    const drawList = () => { list.replaceChildren(); boxes.length = 0; for (let c = g.c1; c <= g.c2; c++) { const k = chk(lab()(c), true); k.input.dataset.c = c; boxes.push(k); list.appendChild(k); } };
    hdr.input.onchange = () => { const st = boxes.map((b) => b.input.checked); drawList(); boxes.forEach((b, i) => (b.input.checked = st[i])); };
    drawList(); box.append(section(t("x.dd.cols")), list);
    W.dialog({ title: t("cmd.dedupe"), size: "sm", content: box, actions: [cancelA(), okA(t("x.dd.run"), () => {
      const cols = boxes.filter((b) => b.input.checked).map((b) => +b.input.dataset.c); if (!cols.length) return bad(list);
      grid.saveView(); const n = book.removeDuplicates(sheet(), g, cols, hdr.input.checked);
      toast(t(n ? "x.dd.done" : "x.dd.none", { n, left: g.r2 - g.r1 + 1 - (hdr.input.checked ? 1 : 0) - n }));
    }, "dedupe")] });
  }
  CMD.dedupe = { ico: "dedupe", run: dedupeDialog };

  function textToColumnsDialog() {
    let g = grid.range(); if (g.c1 !== g.c2) g = { ...g, c2: g.c1 };
    if (g.r1 === g.r2 && !cell(g.r1, g.c1)) { toast(t("x.tc.need")); return; }
    const box = el("div", "form"), kinds = [["comma", ",", t("x.tc.comma")], ["semi", ";", t("x.tc.semi")], ["tab", "\t", t("x.tc.tab")], ["space", " ", t("x.tc.space")], ["pipe", "|", "|"]];
    const cs = kinds.map(([id, ch, label]) => { const k = chk(label, id === "comma"); k.ch = ch; return k; });
    const other = inp("", t("x.tc.other")); other.style.width = "100px";
    const consec = chk(t("x.tc.consec"), false), q = sel([['"', '"'], ["'", "'"], ["", t("x.tc.noquote")]], '"');
    const prev = el("div", "tcprev");
    const delims = () => { const d = cs.filter((k) => k.input.checked).map((k) => k.ch); if (other.value) d.push(...other.value.split("")); return d; };
    const update = async () => {
      const { splitText } = await import("./model.js");
      const rows = []; for (let r = g.r1; r <= Math.min(g.r2, g.r1 + 4); r++) rows.push(splitText(book.rawInput(sheet(), r, g.c1).replace(/^'/, ""), delims(), consec.input.checked, q.value));
      const w = Math.max(1, ...rows.map((r) => r.length)); prev.replaceChildren();
      const tb = el("table"); rows.forEach((r) => { const tr = el("tr"); for (let i = 0; i < w; i++) { const td = el("td"); td.textContent = r[i] ?? ""; tr.appendChild(td); } tb.appendChild(tr); }); prev.appendChild(tb);
    };
    const wrap = el("div", "chk-row"); cs.forEach((k) => wrap.appendChild(k)); wrap.appendChild(other);
    box.append(section(t("x.tc.delims")), wrap, consec, fld(t("x.tc.qualifier"), q), section(t("x.tc.preview")), prev);
    for (const k of cs) k.input.onchange = update; other.oninput = update; consec.input.onchange = update; q.onchange = update; update();
    W.dialog({ title: t("cmd.textToCols"), size: "lg", content: box, actions: [cancelA(), okA(t("btn.apply"), () => {
      const d = delims(); if (!d.length) return bad(other);
      book.textToColumns(sheet(), g, { delims: d, consecutive: consec.input.checked, quote: q.value });
    }, "split")] });
  }
  CMD.textToCols = { ico: "split", run: textToColumnsDialog };

  function sortDialog() {
    let g = grid.range(); if (g.r1 === g.r2 && g.c1 === g.c2) g = grid.currentRegion(g.r1, g.c1) || g;
    if (g.r2 <= g.r1) { toast(t("toast.nosort")); return; }
    const box = el("div", "form"), hdr = chk(t("x.sort.header"), true), levels = el("div", "levels");
    const state = [{ col: grid.active().c >= g.c1 && grid.active().c <= g.c2 ? grid.active().c : g.c1, asc: true }];
    const colOpts = () => { const o = []; for (let c = g.c1; c <= g.c2; c++) o.push([String(c), hdr.input.checked ? `${colName(c)} — ${book.display(sheet(), g.r1, c).text}`.slice(0, 40) : t("x.sort.col", { c: colName(c) })]); return o; };
    const draw = () => {
      levels.replaceChildren();
      state.forEach((lv, i) => {
        const row = el("div", "lvrow stagger"); row.style.setProperty("--n", i);
        const lab = el("span", "lvl"); lab.textContent = t(i === 0 ? "x.sort.by" : "x.sort.then");
        const cs = sel(colOpts(), String(lv.col)), ord = sel([["asc", t("x.sort.asc")], ["desc", t("x.sort.desc")]], lv.asc ? "asc" : "desc");
        cs.onchange = () => (lv.col = +cs.value); ord.onchange = () => (lv.asc = ord.value === "asc");
        const rm = el("button", "icon-btn"); rm.type = "button"; rm.innerHTML = icon("trash"); rm.title = t("x.delete"); rm.disabled = state.length < 2; rm.onclick = () => { state.splice(i, 1); draw(); };
        row.append(lab, cs, ord, rm); levels.appendChild(row);
      });
    };
    hdr.input.onchange = draw; draw();
    const add = el("button", "btn tonal"); add.type = "button"; add.innerHTML = icon("plus") + "<span></span>"; add.lastChild.textContent = t("x.sort.add");
    add.onclick = () => { if (state.length >= 6) return; const used = new Set(state.map((s) => s.col)); let c = g.c1; while (used.has(c) && c < g.c2) c++; state.push({ col: c, asc: true }); draw(); };
    box.append(hdr, levels, add);
    W.dialog({ title: t("cmd.sortCustom"), size: "lg", content: box, actions: [cancelA(), okA(t("x.sort.run"), () => { grid.saveView(); book.sortMulti(sheet(), g, state.map((s) => ({ ...s })), hdr.input.checked); grid.flash(g); }, "sortasc")] });
  }
  CMD.sortCustom = { ico: "tune", run: sortDialog };

  // ───────────────────────── table & cell styles ─────────────────────────
  function tableMenu(anchor) {
    const wrap = el("div", "gallery");
    for (const sc of TABLE_SCHEMES) {
      const b = el("button", "tbl"); b.type = "button"; b.title = t("x.tbl." + sc.id);
      b.innerHTML = `<i style="background:${sc.head}"></i><i style="background:${sc.band}"></i><i></i><i style="background:${sc.band}"></i>`;
      b.onclick = () => { W.closeMenu(); let g = grid.range(); if (g.r1 === g.r2 && g.c1 === g.c2) g = grid.currentRegion(g.r1, g.c1) || g; if (g.r2 <= g.r1) { toast(t("toast.nofilter")); return; } book.formatTable(sheet(), g, sc, true); grid.flash(g); refocus(); };
      wrap.appendChild(b);
    }
    const h = el("div", "menu-title"); h.textContent = t("cmd.formatTable");
    W.openMenu([{ node: h }, { node: wrap }], anchor);
  }
  CMD.formatTable = { ico: "table", run: () => tableMenu(document.getElementById("tb-formatTable") || { x: 200, y: 160 }) };
  function stylesMenu(anchor) {
    const wrap = el("div", "gallery styles");
    for (const cs of CELL_STYLES) {
      const b = el("button", "cs"); b.type = "button"; b.textContent = t("x.cs." + cs.id);
      const s = cs.st || {}; if (s.bg) b.style.background = s.bg; if (s.fc) b.style.color = s.fc; if (s.b) b.style.fontWeight = "700"; if (s.u) b.style.textDecoration = "underline"; if (s.fs) b.style.fontSize = Math.min(s.fs, 16) + "px";
      if (s.bB) b.style.borderBottom = `2px solid ${s.bB}`; if (s.bT) b.style.borderTop = `1px solid ${s.bT}`;
      b.onclick = () => { W.closeMenu(); if (cs.reset) book.setStyleId(sheet(), grid.range(), 0); else book.applyStyle(sheet(), grid.range(), { ...s }); refocus(); };
      wrap.appendChild(b);
    }
    const h = el("div", "menu-title"); h.textContent = t("cmd.cellStyles");
    W.openMenu([{ node: h }, { node: wrap }], anchor);
  }
  CMD.cellStyles = { ico: "palette", run: () => stylesMenu(document.getElementById("tb-cellStyles") || { x: 200, y: 160 }) };

  // ───────────────────────── hide / unhide, painter, view, shortcuts ─────────────────────────
  CMD.hideRows = { ico: "eyeoff", run: () => { const g = grid.range(); book.hideLines(sheet(), "row", g.r1, g.r2, true); } };
  CMD.unhideRows = { ico: "eye", run: () => { const g = grid.range(); book.hideLines(sheet(), "row", Math.max(0, g.r1 - 1), g.r2 + 1, false); } };
  CMD.hideCols = { ico: "eyeoff", run: () => { const g = grid.range(); book.hideLines(sheet(), "col", g.c1, g.c2, true); } };
  CMD.unhideCols = { ico: "eye", run: () => { const g = grid.range(); book.hideLines(sheet(), "col", Math.max(0, g.c1 - 1), g.c2 + 1, false); } };
  CMD.autofitCols = { ico: "split", run: () => { const g = grid.range(), maxC = Math.max(book.bounds(sheet()).maxC, g.c1); grid.autoFitCols(Array.from({ length: Math.min(g.c2, maxC) - g.c1 + 1 }, (_, i) => g.c1 + i)); } };
  CMD.autofitRows = { ico: "split", run: () => { const g = grid.range(), maxR = Math.max(book.bounds(sheet()).maxR, g.r1); grid.autoFitRows(Array.from({ length: Math.min(g.r2, maxR) - g.r1 + 1 }, (_, i) => g.r1 + i)); } };
  CMD.painter = {
    ico: "brush", active: () => !!grid.painter,
    run: () => {
      if (grid.painter) { grid.painter = null; grid.root.classList.remove("painting"); ctx.refreshToolbar(); return; }
      const a = grid.active(), c = cell(a.r, a.c); grid.painter = { id: c ? c.s || 0 : 0 }; grid.root.classList.add("painting"); ctx.refreshToolbar(); toast(t("x.painter.tip"));
    },
  };
  hooks.painter = (rg) => { if (!grid.painter) return; book.setStyleId(sheet(), rg, grid.painter.id); grid.painter = null; grid.root.classList.remove("painting"); grid.flash(rg); ctx.refreshToolbar(); };
  CMD.showFormulas = { ico: "fx", key: "Ctrl+`", run: () => { grid.showFormulas = !grid.showFormulas; grid.requestRender(); }, active: () => grid.showFormulas };
  const stamp = (time) => {
    const a = grid.active(), d = new Date(), pad = (n) => String(n).padStart(2, "0");
    const txt = time ? `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    book.setInput(sheet(), a.r, a.c, txt);
  };
  CMD.insertDate = { ico: "sheet", key: "Ctrl+;", run: () => stamp(false) };
  CMD.insertTime = { ico: "sheet", key: "Ctrl+Shift+;", run: () => stamp(true) };

  return { CMD, cfMenu, tableMenu, stylesMenu, chartDialog, linkDialog, noteDialog, dvDialog, pasteSpecialDialog };
}
