// CodeMirror 6 wrapper: Markdown editing, formatting commands and search.
const CM = window.CM;
const { EditorState, EditorView, Compartment, EditorSelection, Prec, keymap } = CM;

const LINE_MARK = /^(\s*)([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/;

export function createEditor(parent, h) {
  const cWrap = new Compartment(), cNums = new Compartment();
  const opts = { wrap: true, lineNumbers: false };

  const fmt = (fn) => (view) => { fn(view); view.focus(); return true; };

  function wrap(view, before, after = before, ph = 'text') {
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

  /** Applies fn(lineText, index) to each selected line (index counts lines in the selection). */
  function eachLine(view, fn) {
    const d = view.state.doc, ch = [];
    const seen = new Set(); let i = 0;
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
  function prefixToggle(view, test, add) {
    const d = view.state.doc, lines = [];
    for (const r of view.state.selection.ranges) for (let n = d.lineAt(r.from).number; n <= d.lineAt(r.to).number; n++) lines.push(d.line(n).text);
    const all = lines.filter((l) => l.trim()).every(test);
    eachLine(view, (text, i) => (!text.trim() && !all ? text : all ? text.replace(test.re, '') : add(text, i)));
  }
  const quoteTest = Object.assign((l) => /^\s*>\s?/.test(l), { re: /^(\s*)>\s?/ });
  const ulTest = Object.assign((l) => /^\s*[-*+]\s+(?!\[[ xX]\])/.test(l), { re: /^(\s*)[-*+]\s+/ });
  const olTest = Object.assign((l) => /^\s*\d+[.)]\s+/.test(l), { re: /^(\s*)\d+[.)]\s+/ });
  const taskTest = Object.assign((l) => /^\s*[-*+]\s+\[[ xX]\]\s+/.test(l), { re: /^(\s*)[-*+]\s+\[[ xX]\]\s+/ });
  const bare = (l) => l.replace(LINE_MARK, '$1');

  const cmds = {
    undo: (v) => CM.undo(v), redo: (v) => CM.redo(v),
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
      const pos = v.state.selection.main.to, ln = v.state.doc.lineAt(pos);
      const tpl = (ln.text.trim() ? '\n\n' : '') + '| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n|  |  |  |\n';
      v.dispatch({ changes: { from: ln.to, insert: tpl }, selection: EditorSelection.cursor(ln.to + tpl.length - 9) });
    },
    hr: (v) => {
      const ln = v.state.doc.lineAt(v.state.selection.main.to), ins = (ln.text.trim() ? '\n\n' : '\n') + '---\n';
      v.dispatch({ changes: { from: ln.to, insert: ins }, selection: EditorSelection.cursor(ln.to + ins.length) });
    },
  };
  function linkLike(v, open, mid, close, ph, urlPh) {
    v.dispatch(v.state.changeByRange((r) => {
      const sel = v.state.doc.sliceString(r.from, r.to), isUrl = /^(https?:\/\/|www\.)\S+$/.test(sel);
      const text = isUrl ? ph : sel || ph, url = isUrl ? sel : urlPh;
      const ins = open + text + mid + url + close;
      const from = r.from + (isUrl ? open.length : open.length + text.length + mid.length);
      const len = isUrl ? text.length : url.length;
      return { changes: { from: r.from, to: r.to, insert: ins }, range: EditorSelection.range(from, from + len) };
    }));
  }

  const keys = Prec.high(keymap.of([
    { key: 'Mod-b', run: fmt(cmds.bold) }, { key: 'Mod-i', run: fmt(cmds.italic) },
    { key: 'Mod-Shift-x', run: fmt(cmds.strike) }, { key: 'Mod-e', run: fmt(cmds.code) }, { key: 'Mod-k', run: fmt(cmds.link) },
  ]));

  const listener = EditorView.updateListener.of((u) => {
    if (u.docChanged) h.change(u);
    if (u.docChanged || u.selectionSet) h.cursor(u);
  });

  const extensions = () => [
    cNums.of(opts.lineNumbers ? [CM.lineNumbers(), CM.highlightActiveLineGutter()] : []),
    CM.history(), CM.drawSelection(), CM.dropCursor(), CM.indentOnInput(), CM.bracketMatching(),
    CM.closeBrackets(), CM.highlightActiveLine(), CM.highlightSelectionMatches(),
    CM.search({ createPanel: () => ({ dom: document.createElement('div') }) }),
    CM.markdown({ base: CM.markdownLanguage, codeLanguages: CM.codeLanguages }),
    CM.syntaxHighlighting(CM.highlight), CM.indentUnit.of('  '), EditorState.tabSize.of(2),
    cWrap.of(opts.wrap ? EditorView.lineWrapping : []),
    keys,
    keymap.of([...CM.closeBracketsKeymap, ...CM.markdownKeymap, ...CM.defaultKeymap, ...CM.historyKeymap, CM.indentWithTab]),
    EditorView.contentAttributes.of({ 'aria-label': 'Markdown editor', spellcheck: 'false', autocapitalize: 'off' }),
    listener,
    EditorView.domEventHandlers({ wheel: (e) => { h.wheel(e); }, keydown: (e) => { h.key(e); }, focus: () => { h.focus(); } }),
  ];

  const view = new EditorView({ state: EditorState.create({ doc: '', extensions: extensions() }), parent });
  view.scrollDOM.addEventListener('scroll', (e) => h.scroll(e), { passive: true });

  const ed = {
    view, opts,
    makeState: (text) => EditorState.create({ doc: text, extensions: extensions() }),
    setState(st) { view.setState(st); ed.applyOptions(); },
    getState: () => view.state,
    text: () => view.state.doc.toString(),
    focus: () => view.focus(),
    applyOptions() {
      view.dispatch({ effects: [
        cWrap.reconfigure(opts.wrap ? EditorView.lineWrapping : []),
        cNums.reconfigure(opts.lineNumbers ? [CM.lineNumbers(), CM.highlightActiveLineGutter()] : []),
      ] });
    },
    run(cmd, arg) { if (cmds[cmd]) { cmds[cmd](view, arg); view.focus(); } },
    insert(text) { view.dispatch(view.state.replaceSelection(text)); view.focus(); },
    /** Fractional 1-based line at the top of the viewport. */
    topLine() {
      const top = view.scrollDOM.scrollTop, b = view.lineBlockAtHeight(top), d = view.state.doc;
      return d.lineAt(b.from).number + Math.max(0, Math.min(1, (top - b.top) / Math.max(1, b.height)));
    },
    scrollToLineFrac(line) {
      const d = view.state.doc, n = Math.max(1, Math.min(d.lines, Math.floor(line))), f = line - n;
      const b = view.lineBlockAt(d.line(n).from);
      view.scrollDOM.scrollTop = b.top + b.height * Math.max(0, Math.min(1, f));
    },
    goToLine(n, select = true) {
      const d = view.state.doc, ln = d.line(Math.max(1, Math.min(d.lines, n)));
      view.dispatch({ selection: select ? EditorSelection.cursor(ln.from) : undefined, effects: EditorView.scrollIntoView(ln.from, { y: 'start', yMargin: 12 }) });
    },
    /* ---- search ---- */
    query: null,
    setQuery(q) {
      ed.query = new CM.SearchQuery({ search: q.search, caseSensitive: !!q.caseSensitive, regexp: !!q.regexp, replace: q.replace || '' });
      view.dispatch({ effects: CM.setSearchQuery.of(ed.query) });
      return ed.query.valid;
    },
    clearQuery() {
      ed.query = null;
      view.dispatch({ effects: CM.setSearchQuery.of(new CM.SearchQuery({ search: '' })) });
    },
    next() { if (ed.query?.valid) { CM.findNext(view); } },
    prev() { if (ed.query?.valid) { CM.findPrevious(view); } },
    replaceOne() { if (ed.query?.valid) CM.replaceNext(view); },
    replaceAll() { if (ed.query?.valid) CM.replaceAll(view); },
    /** { total, current } where current is 1-based or 0 when the selection is not a match. */
    count(cap = 20000) {
      if (!ed.query?.valid) return { total: 0, current: 0, valid: !!ed.query?.valid };
      const sel = view.state.selection.main; let total = 0, current = 0;
      const cur = ed.query.getCursor(view.state);
      for (let r = cur.next(); !r.done && total < cap; r = cur.next()) {
        total++;
        if (r.value.from === sel.from && r.value.to === sel.to) current = total;
      }
      return { total, current, valid: true };
    },
  };
  return ed;
}
