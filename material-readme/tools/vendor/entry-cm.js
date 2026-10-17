// CodeMirror 6 bundle exposed as window.CM
import { EditorState, Compartment, Prec, EditorSelection } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, placeholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo, undoDepth, redoDepth } from '@codemirror/commands';
import { markdown, markdownLanguage, markdownKeymap } from '@codemirror/lang-markdown';
import { LanguageSupport, syntaxHighlighting, HighlightStyle, indentOnInput, bracketMatching, StreamLanguage, LanguageDescription, indentUnit } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { search, SearchQuery, setSearchQuery, findNext, findPrevious, replaceNext, replaceAll, closeSearchPanel, highlightSelectionMatches } from '@codemirror/search';
import { tags as t } from '@lezer/highlight';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/legacy-modes/mode/rust';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { toml } from '@codemirror/legacy-modes/mode/toml';
import { yaml } from '@codemirror/legacy-modes/mode/yaml';

const S = (mode) => new LanguageSupport(StreamLanguage.define(mode));
const L = (name, alias, support) => LanguageDescription.of({ name, alias, support });
const codeLanguages = [
  L('javascript', ['js', 'jsx', 'mjs', 'ts', 'tsx', 'typescript'], javascript({ jsx: true, typescript: true })),
  L('json', ['jsonc'], json()),
  L('css', ['scss'], css()),
  L('html', ['xml', 'svg', 'vue'], html()),
  L('python', ['py'], python()),
  L('rust', ['rs'], S(rust)),
  L('shell', ['sh', 'bash', 'zsh', 'powershell', 'ps1', 'cmd', 'console'], S(shell)),
  L('toml', [], S(toml)),
  L('yaml', ['yml'], S(yaml)),
];

// Colours come from CSS variables, so the editor follows the Material theme.
const v = (n) => `var(--md-sys-color-${n})`;
const highlight = HighlightStyle.define([
  { tag: t.heading1, color: v('primary'), fontWeight: '700', fontSize: '1.28em' },
  { tag: t.heading2, color: v('primary'), fontWeight: '700', fontSize: '1.16em' },
  { tag: [t.heading3, t.heading4, t.heading5, t.heading6], color: v('primary'), fontWeight: '700' },
  { tag: t.strong, fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through', color: v('outline') },
  { tag: [t.link, t.url], color: v('tertiary') },
  { tag: t.url, textDecoration: 'underline' },
  { tag: t.monospace, color: v('secondary') },
  { tag: t.quote, color: v('on-surface-variant'), fontStyle: 'italic' },
  { tag: [t.processingInstruction, t.contentSeparator, t.list], color: v('outline') },
  { tag: [t.meta, t.comment], color: v('outline'), fontStyle: 'italic' },
  { tag: [t.keyword, t.operatorKeyword, t.modifier, t.controlKeyword], color: v('primary') },
  { tag: [t.string, t.regexp, t.special(t.string)], color: v('tertiary') },
  { tag: [t.number, t.bool, t.atom, t.null], color: v('secondary') },
  { tag: [t.typeName, t.className, t.namespace], color: v('secondary') },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.variableName)], color: v('primary') },
  { tag: [t.propertyName, t.attributeName], color: v('on-surface') },
  { tag: [t.tagName, t.angleBracket], color: v('primary') },
  { tag: [t.punctuation, t.operator, t.bracket, t.separator], color: v('on-surface-variant') },
  { tag: t.invalid, color: v('error') },
]);

export {
  EditorState, Compartment, Prec, EditorSelection, EditorView, keymap, lineNumbers, highlightActiveLine,
  highlightActiveLineGutter, drawSelection, dropCursor, placeholder, defaultKeymap, history, historyKeymap,
  indentWithTab, undo, redo, undoDepth, redoDepth, markdown, markdownLanguage, markdownKeymap,
  syntaxHighlighting, indentOnInput, bracketMatching, indentUnit, closeBrackets, closeBracketsKeymap,
  search, SearchQuery, setSearchQuery, findNext, findPrevious, replaceNext, replaceAll, closeSearchPanel,
  highlightSelectionMatches, codeLanguages, highlight,
};
