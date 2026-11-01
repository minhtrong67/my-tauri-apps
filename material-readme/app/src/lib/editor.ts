import { EditorState, EditorSelection, Compartment, Prec, type Extension, type Transaction } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, drawSelection, dropCursor, highlightActiveLine } from '@codemirror/view';
import { history, defaultKeymap, historyKeymap, indentWithTab, undo, redo, undoDepth, redoDepth } from '@codemirror/commands';
import { indentUnit, bracketMatching, indentOnInput, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { markdown, markdownLanguage, markdownKeymap } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { search, SearchQuery, setSearchQuery, findNext, findPrevious, replaceNext, replaceAll, highlightSelectionMatches } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { tags as t } from '@lezer/highlight';

export type Cmd = 'undo' | 'redo' | 'bold' | 'italic' | 'strike' | 'code' | 'quote' | 'ul' | 'ol' | 'task' | 'heading' | 'codeblock' | 'link' | 'image' | 'table' | 'hr';

/** Syntax colours come from the Material colour roles, so they follow the theme. */
const highlight = HighlightStyle.define([
  { tag: [t.heading1, t.heading2, t.heading3, t.heading4, t.heading5, t.heading6], color: 'var(--md-primary)', fontWeight: '700' },
  { tag: t.strong, fontWeight: '700' }, { tag: t.emphasis, fontStyle: 'italic' }, { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: [t.link, t.url], color: 'var(--md-tertiary)' },
  { tag: [t.monospace], color: 'var(--md-secondary)' },
  { tag: [t.quote], color: 'var(--md-on-surface-variant)', fontStyle: 'italic' },
  { tag: [t.processingInstruction, t.contentSeparator, t.meta, t.comment], color: 'var(--md-outline)' },
  { tag: [t.keyword, t.operatorKeyword, t.modifier], color: 'var(--md-primary)' },
  { tag: [t.string, t.special(t.string), t.regexp], color: 'var(--md-tertiary)' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--md-secondary)' },
  { tag: [t.function(t.variableName), t.propertyName, t.className, t.typeName], color: 'var(--md-primary)' },
  { tag: [t.tagName, t.angleBracket], color: 'var(--md-error)' },
  { tag: [t.attributeName], color: 'var(--md-secondary)' },
]);

const LINE_MARK = /^(\s*)([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/;

export interface EditorHandlers {
  change: (u: { docChanged: boolean }) => void;
  cursor: () => void;
  scroll: () => void;
  wheel: () => void;
  key: () => void;
  focus: () => void;
  paste: (files: File[]) => boolean;
}
export interface EditorOpts { wrap: boolean; lineNumbers: boolean }

export function createEditor(parent: HTMLElement, h: EditorHandlers, initial: EditorOpts) {
  const cWrap = new Compartment(), cNums = new Compartment();
  const opts: EditorOpts = { ...initial };
  const fmt = (fn: (v: EditorView) => void) => (view: EditorView) => { fn(view); view.focus(); return true; };

  function wrap(view: EditorView, before: string, after = before, ph = 'text') {
    view.dispatch(view.state.changeByRange((r) => {
      const d = view.state.doc, sel = d.sliceString(r.from, r.to);
      const b = d.sliceString(Math.max(0, r.from - before.length), r.from), a = d.sliceString(r.to, Math.min(d.length, r.to + after.length));
      if (b === before && a === after && r.from >= before.length) {
        return { changes: [{ from: r.from - before.length, to: r.from }, { from: r.to, to: r.to + after.length }], range: EditorSelection.range(r.from - before.length, r.to - before.length) };
      }
      if (sel.length >= before.length + after.length && sel.startsWith(before) && sel.endsWith(after)) {
        const inner = sel.slice(before.length, sel.length - after.length);
        return { changes: { from: r.from, to: r.to, insert: inner }, range: EditorSelection.range(r.from, r.from + inner.length) };
      }
      const text = sel || ph;
      return { changes: { from: r.from, to: r.to, insert: before + text + after }, range: EditorSelection.range(r.from + before.length, r.from + before.length + text.length) };
    }));
  }
  function eachLine(view: EditorView, fn: (text: string, i: number) => string) {
    const d = view.state.doc, ch: { from: number; to: number; insert: string }[] = [];
    const seen = new Set<number>(); let i = 0;
    for (const r of view.state.selection.ranges) {
      const a = d.lineAt(r.from).number, b = d.lineAt(r.to).number;
      for (let n = a; n <= b; n++) {
        if (seen.has(n)) continue; seen.add(n);
        const ln = d.line(n), res = fn(ln.text, i++);
        if (res !== ln.text) ch.push({ from: ln.from, to: ln.to, insert: res });
      }
    }
    if (ch.length) view.dispatch({ changes: ch });
  }
  type Test = ((l: string) => boolean) & { re: RegExp };
  const mk = (test: (l: string) => boolean, re: RegExp): Test => Object.assign(test, { re });
  function prefixToggle(view: EditorView, test: Test, add: (l: string, i: number) => string) {
    const d = view.state.doc, lines: string[] = [];
    for (const r of view.state.selection.ranges) for (let n = d.lineAt(r.from).number; n <= d.lineAt(r.to).number; n++) lines.push(d.line(n).text);
    const all = lines.filter((l) => l.trim()).every(test);
    eachLine(view, (text, i) => (!text.trim() && !all ? text : all ? text.replace(test.re, '$1') : add(text, i)));
  }
  const quoteTest = mk((l) => /^\s*>\s?/.test(l), /^(\s*)>\s?/);
  const ulTest = mk((l) => /^\s*[-*+]\s+(?!\[[ xX]\])/.test(l), /^(\s*)[-*+]\s+/);
  const olTest = mk((l) => /^\s*\d+[.)]\s+/.test(l), /^(\s*)\d+[.)]\s+/);
  const taskTest = mk((l) => /^\s*[-*+]\s+\[[ xX]\]\s+/.test(l), /^(\s*)[-*+]\s+\[[ xX]\]\s+/);
  const bare = (l: string) => l.replace(LINE_MARK, '$1');

  function linkLike(v: EditorView, open: string, mid: string, close: string, ph: string, urlPh: string) {
    v.dispatch(v.state.changeByRange((r) => {
      const sel = v.state.doc.sliceString(r.from, r.to), isUrl = /^(https?:\/\/|www\.)\S+$/.test(sel);
      const text = isUrl ? ph : sel || ph, url = isUrl ? sel : urlPh;
      const ins = open + text + mid + url + close;
      const from = r.from + (isUrl ? open.length : open.length + text.length + mid.length);
      const len = isUrl ? text.length : url.length;
      return { changes: { from: r.from, to: r.to, insert: ins }, range: EditorSelection.range(from, from + len) };
    }));
  }

  const cmds: Record<Cmd, (v: EditorView, arg?: number) => void> = {
    undo: (v) => { undo(v); }, redo: (v) => { redo(v); },
    bold: (v) => wrap(v, '**'), italic: (v) => wrap(v, '_'), strike: (v) => wrap(v, '~~'), code: (v) => wrap(v, '`', '`', 'code'),
    quote: (v) => prefixToggle(v, quoteTest, (l) => l.replace(/^(\s*)/, '$1> ')),
    ul: (v) => prefixToggle(v, ulTest, (l) => bare(l).replace(/^(\s*)/, '$1- ')),
    ol: (v) => prefixToggle(v, olTest, (l, i) => bare(l).replace(/^(\s*)/, `$1${i + 1}. `)),
    task: (v) => prefixToggle(v, taskTest, (l) => bare(l).replace(/^(\s*)/, '$1- [ ] ')),
    heading: (v, level = 2) => {
      const first = v.state.doc.lineAt(v.state.selection.main.from).text.match(/^(#{1,6})\s/);
      const same = first && first[1].length === level;
      eachLine(v, (l) => { const s = l.replace(/^#{1,6}\s+/, ''); return level === 0 || same ? s : '#'.repeat(level) + ' ' + s; });
    },
    codeblock: (v) => {
      v.dispatch(v.state.changeByRange((r) => {
        const sel = v.state.doc.sliceString(r.from, r.to), lead = r.from > 0 && v.state.doc.sliceString(r.from - 1, r.from) !== '\n' ? '\n' : '';
        const body = '```\n' + sel + (sel ? '\n' : '') + '```';
        return { changes: { from: r.from, to: r.to, insert: lead + body + '\n' }, range: EditorSelection.cursor(r.from + lead.length + 4) };
      }));
    },
    link: (v) => linkLike(v, '[', '](', ')', 'text', 'https://'),
    image: (v) => linkLike(v, '![', '](', ')', 'alt', 'image.png'),
    table: (v) => {
      const ln = v.state.doc.lineAt(v.state.selection.main.to);
      const tpl = (ln.text.trim() ? '\n\n' : '') + '| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n|  |  |  |\n';
      v.dispatch({ changes: { from: ln.to, insert: tpl }, selection: EditorSelection.cursor(ln.to + tpl.length - 9) });
    },
    hr: (v) => {
      const ln = v.state.doc.lineAt(v.state.selection.main.to), ins = (ln.text.trim() ? '\n\n' : '\n') + '---\n';
      v.dispatch({ changes: { from: ln.to, insert: ins }, selection: EditorSelection.cursor(ln.to + ins.length) });
    },
  };

  const keys = Prec.high(keymap.of([
    { key: 'Mod-b', run: fmt(cmds.bold) }, { key: 'Mod-i', run: fmt(cmds.italic) },
    { key: 'Mod-Shift-x', run: fmt(cmds.strike) }, { key: 'Mod-e', run: fmt(cmds.code) }, { key: 'Mod-k', run: fmt(cmds.link) },
  ]));

  const listener = EditorView.updateListener.of((u) => {
    if (u.docChanged) h.change(u);
    if (u.docChanged || u.selectionSet) h.cursor();
  });

  const extensions = (): Extension[] => [
    cNums.of(opts.lineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : []),
    history(), drawSelection(), dropCursor(), indentOnInput(), bracketMatching(), closeBrackets(), highlightActiveLine(), highlightSelectionMatches(),
    search({ createPanel: () => ({ dom: document.createElement('div') }) }),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    syntaxHighlighting(highlight), indentUnit.of('  '), EditorState.tabSize.of(2),
    cWrap.of(opts.wrap ? EditorView.lineWrapping : []),
    keys,
    keymap.of([...closeBracketsKeymap, ...markdownKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
    EditorView.contentAttributes.of({ 'aria-label': 'Markdown editor', spellcheck: 'false', autocapitalize: 'off' }),
    listener,
    EditorView.domEventHandlers({
      wheel: () => { h.wheel(); },
      keydown: () => { h.key(); },
      focus: () => { h.focus(); },
      paste: (e) => {
        const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
        if (files.length && h.paste(files)) { e.preventDefault(); return true; }
        return false;
      },
      drop: (e) => {
        const files = [...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/'));
        if (files.length && h.paste(files)) { e.preventDefault(); return true; }
        return false;
      },
    }),
  ];

  const view = new EditorView({ state: EditorState.create({ doc: '', extensions: extensions() }), parent });
  view.scrollDOM.addEventListener('scroll', () => h.scroll(), { passive: true });

  const ed = {
    view, opts,
    makeState: (text: string) => EditorState.create({ doc: text, extensions: extensions() }),
    setState(st: EditorState) { view.setState(st); ed.applyOptions(); },
    getState: () => view.state,
    text: () => view.state.doc.toString(),
    focus: () => view.focus(),
    applyOptions() {
      view.dispatch({ effects: [
        cWrap.reconfigure(opts.wrap ? EditorView.lineWrapping : []),
        cNums.reconfigure(opts.lineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : []),
      ] });
    },
    run(cmd: Cmd, arg?: number) { cmds[cmd](view, arg); view.focus(); },
    insert(text: string) { view.dispatch(view.state.replaceSelection(text)); view.focus(); },
    insertAtCursor(text: string) {
      const { from, to } = view.state.selection.main;
      view.dispatch({ changes: { from, to, insert: text }, selection: EditorSelection.cursor(from + text.length) }); view.focus();
    },
    canUndo: () => undoDepth(view.state) > 0,
    canRedo: () => redoDepth(view.state) > 0,
    topLine() {
      const top = view.scrollDOM.scrollTop, b = view.lineBlockAtHeight(top), d = view.state.doc;
      return d.lineAt(b.from).number + Math.max(0, Math.min(1, (top - b.top) / Math.max(1, b.height)));
    },
    scrollToLineFrac(line: number) {
      const d = view.state.doc, n = Math.max(1, Math.min(d.lines, Math.floor(line))), f = line - n;
      const b = view.lineBlockAt(d.line(n).from);
      view.scrollDOM.scrollTop = b.top + b.height * Math.max(0, Math.min(1, f));
    },
    goToLine(n: number, select = true) {
      const d = view.state.doc, ln = d.line(Math.max(1, Math.min(d.lines, n)));
      view.dispatch({ selection: select ? EditorSelection.cursor(ln.from) : undefined, effects: EditorView.scrollIntoView(ln.from, { y: 'start', yMargin: 12 }) });
    },
    /* ---- search ---- */
    query: null as SearchQuery | null,
    setQuery(q: { search: string; caseSensitive: boolean; regexp: boolean; replace: string }) {
      ed.query = new SearchQuery({ search: q.search, caseSensitive: q.caseSensitive, regexp: q.regexp, replace: q.replace });
      view.dispatch({ effects: setSearchQuery.of(ed.query) });
      return ed.query.valid;
    },
    clearQuery() { ed.query = null; view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: '' })) }); },
    next() { if (ed.query?.valid) findNext(view); },
    prev() { if (ed.query?.valid) findPrevious(view); },
    replaceOne() { if (ed.query?.valid) replaceNext(view); },
    replaceAll() { if (ed.query?.valid) replaceAll(view); },
    count(cap = 20000) {
      if (!ed.query?.valid) return { total: 0, current: 0, valid: !!ed.query?.valid };
      const sel = view.state.selection.main; let total = 0, current = 0;
      const cur = ed.query.getCursor(view.state) as Iterator<{ from: number; to: number }>;
      for (let r = cur.next(); !r.done && total < cap; r = cur.next()) {
        total++;
        if (r.value.from === sel.from && r.value.to === sel.to) current = total;
      }
      return { total, current, valid: true };
    },
  };
  return ed;
}
export type Ed = ReturnType<typeof createEditor>;
export type { Transaction };
