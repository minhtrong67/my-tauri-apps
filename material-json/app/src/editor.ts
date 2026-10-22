import { Compartment, EditorSelection, EditorState, type Extension } from '@codemirror/state';
import { EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers, placeholder, dropCursor } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo } from '@codemirror/commands';
import { bracketMatching, foldAll, unfoldAll, foldGutter, foldKeymap, HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { highlightSelectionMatches, openSearchPanel, searchKeymap } from '@codemirror/search';
import { lintGutter, linter, lintKeymap, type Diagnostic } from '@codemirror/lint';
import { json } from '@codemirror/lang-json';
import { tags as tg } from '@lezer/highlight';
import { analyze } from './json';
import { t, type Key } from './i18n';
import { settings } from './settings';
import { isDark } from './theme';

export function errText(e: { code: string; arg?: string }): string {
  const c = e.arg === undefined ? '' : e.arg === '\n' ? '↵' : `“${e.arg}”`;
  return t(`err.${e.code}` as Key, { c });
}

const highlight = HighlightStyle.define([
  { tag: tg.propertyName, color: 'var(--json-key)' },
  { tag: tg.string, color: 'var(--json-string)' },
  { tag: tg.number, color: 'var(--json-number)' },
  { tag: tg.bool, color: 'var(--json-bool)', fontWeight: '600' },
  { tag: tg.null, color: 'var(--json-null)', fontWeight: '600' },
  { tag: [tg.separator, tg.brace, tg.squareBracket], color: 'var(--md-on-surface-variant)' },
  { tag: tg.lineComment, color: 'var(--md-outline)', fontStyle: 'italic' },
]);

const cWrap = new Compartment();
const cDark = new Compartment();
const cIndent = new Compartment();
const cPlace = new Compartment();

const jsonLinter = linter((view): Diagnostic[] => {
  const text = view.state.doc.toString();
  const r = analyze(text);
  if (!r.error) return [];
  const from = Math.max(0, Math.min(r.error.pos, text.length - 1));
  return [{ from, to: Math.min(text.length, from + 1), severity: 'error', message: errText(r.error) }];
}, { delay: 280 });

function indentExt(): Extension[] {
  const u = settings.indent === 'tab' ? '\t' : ' '.repeat(settings.indent);
  return [indentUnit.of(u), EditorState.tabSize.of(settings.indent === 'tab' ? 4 : settings.indent)];
}

let view!: EditorView;
let hooks: { change: () => void; selection: () => void } = { change: () => undefined, selection: () => undefined };

function extensions(): Extension[] {
  return [
    lineNumbers(), highlightActiveLineGutter(), history(), foldGutter({ openText: '▾', closedText: '▸' }), drawSelection(), dropCursor(),
    bracketMatching(), closeBrackets(), highlightActiveLine(), highlightSelectionMatches(), json(), syntaxHighlighting(highlight),
    lintGutter(), jsonLinter,
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...foldKeymap, ...lintKeymap, indentWithTab]),
    cWrap.of(settings.wrap ? EditorView.lineWrapping : []),
    cDark.of(EditorView.darkTheme.of(isDark())),
    cIndent.of(indentExt()),
    cPlace.of(placeholder(t('editor.placeholder'))),
    EditorView.updateListener.of((u) => {
      if (u.docChanged) hooks.change();
      if (u.selectionSet || u.docChanged) hooks.selection();
    }),
    EditorState.allowMultipleSelections.of(true),
  ];
}

export function makeState(text: string): EditorState {
  return EditorState.create({ doc: text, extensions: extensions() });
}

export function createEditor(host: HTMLElement, h: typeof hooks) {
  hooks = h;
  view = new EditorView({ state: makeState(''), parent: host });
  return view;
}

export const ed = {
  get view() { return view; },
  get state() { return view.state; },
  text: () => view.state.doc.toString(),
  setState(s: EditorState) { view.setState(s); ed.syncConfig(); },
  /** Re-apply user settings to whatever state is currently loaded (states persist per tab). */
  syncConfig() {
    view.dispatch({ effects: [
      cWrap.reconfigure(settings.wrap ? EditorView.lineWrapping : []),
      cDark.reconfigure(EditorView.darkTheme.of(isDark())),
      cIndent.reconfigure(indentExt()),
      cPlace.reconfigure(placeholder(t('editor.placeholder'))),
    ] });
  },
  replaceAll(text: string) {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text }, selection: EditorSelection.cursor(0), scrollIntoView: true, userEvent: 'input.replace' });
  },
  replaceRange(from: number, to: number, text: string) {
    view.dispatch({ changes: { from, to, insert: text }, selection: EditorSelection.range(from, from + text.length), userEvent: 'input.replace' });
  },
  selection() { const s = view.state.selection.main; return { from: s.from, to: s.to, empty: s.empty }; },
  selectRange(from: number, to: number, focus = false) {
    view.dispatch({ selection: EditorSelection.range(from, to), effects: EditorView.scrollIntoView(from, { y: 'center' }) });
    if (focus) view.focus();
  },
  focus() { view.focus(); },
  undo: () => undo(view), redo: () => redo(view),
  find: () => { openSearchPanel(view); },
  foldAll: () => foldAll(view), unfoldAll: () => unfoldAll(view),
  measure() { view?.requestMeasure(); },
  /** Brief shimmer sweep, played after Format / Minify / Sort for tactile feedback. */
  flash() {
    if (document.documentElement.dataset.motion === 'off') return;
    const el = view.dom;
    el.classList.remove('sweep'); void el.offsetWidth; el.classList.add('sweep');
    setTimeout(() => el.classList.remove('sweep'), 800);
  },
};
