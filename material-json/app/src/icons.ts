import {
  createElement, Settings, FileJson, FolderOpen, Save, Plus, X, Search, Replace, GitCompareArrows, ArrowRightLeft, ShieldCheck,
  WrapText, Wand2, ArrowDownAZ, ArrowUpAZ, ListTree, Copy, ChevronRight, History, Download, Braces, Minimize2, Maximize2,
  FoldVertical, UnfoldVertical, CircleCheck, CircleAlert, Info, Undo2, Redo2, ClipboardPaste, Languages, Palette, Type,
  Monitor, Sun, Moon, AppWindow, Trash2, Pencil, Quote, Eraser, Columns2, Code, Check, Keyboard, FileCode, Wrench, Play,
  SquareCode, ChartNoAxesColumn, ArrowUpDown, FilePlus, Upload, Sparkles, Heart, ScrollText, RotateCcw, SaveAll, TextCursorInput, Ellipsis,
  TriangleAlert, FileText, ListFilter, ChevronsUpDown, ChevronsDownUp, Target, Link, Github, Plug, Layers, ArrowUp, Power, Command, ListPlus, CornerDownLeft,
} from 'lucide';

const MAP = {
  warn: TriangleAlert, settings: Settings, file: FileJson, open: FolderOpen, save: Save, plus: Plus, close: X, search: Search, replace: Replace,
  compare: GitCompareArrows, convert: ArrowRightLeft, schema: ShieldCheck, wrap: WrapText, wand: Wand2, sortAsc: ArrowDownAZ,
  sortDesc: ArrowUpAZ, tree: ListTree, copy: Copy, chevron: ChevronRight, history: History, download: Download, braces: Braces,
  minify: Minimize2, expand: Maximize2, fold: FoldVertical, unfold: UnfoldVertical, ok: CircleCheck, error: CircleAlert, info: Info,
  undo: Undo2, redo: Redo2, paste: ClipboardPaste, language: Languages, palette: Palette, type: Type, monitor: Monitor, sun: Sun,
  moon: Moon, window: AppWindow, trash: Trash2, edit: Pencil, quote: Quote, eraser: Eraser, split: Columns2, code: Code, check: Check,
  keyboard: Keyboard, filecode: FileCode, tool: Wrench, play: Play, query: SquareCode, stats: ChartNoAxesColumn, updown: ArrowUpDown,
  filePlus: FilePlus, upload: Upload, sparkles: Sparkles, heart: Heart, license: ScrollText, reset: RotateCcw, saveAll: SaveAll,
  cursor: TextCursorInput, more: Ellipsis, text: FileText, filter: ListFilter, expandAll: ChevronsUpDown, collapseAll: ChevronsDownUp,
  target: Target, link: Link, github: Github, plug: Plug, layers: Layers, up: ArrowUp, power: Power, command: Command, listPlus: ListPlus, enter: CornerDownLeft,
} as const;

export type IconName = keyof typeof MAP;
const cache = new Map<string, string>();

export function icon(name: IconName, cls = ''): string {
  const k = name + cls;
  let s = cache.get(k);
  if (!s) {
    const el = createElement(MAP[name]);
    el.removeAttribute('width'); el.removeAttribute('height');
    el.setAttribute('class', ('ic ' + cls).trim());
    el.setAttribute('aria-hidden', 'true');
    s = el.outerHTML;
    cache.set(k, s);
  }
  return s;
}

/** Replace <i data-icon="name"> placeholders in static markup. */
export function hydrateIcons(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('i[data-icon]').forEach((i) => {
    i.outerHTML = icon(i.dataset.icon as IconName, i.dataset.cls ?? '');
  });
}
