import { getSettings } from '../store/settings';
import { api } from './api';
import { baseName, parentOf } from './paths';

/** Context menu entries the user can show or hide (Settings > Context menu). `def` is the default visibility. */
export interface MenuDef { id: string; key: string; group: 'file' | 'folder' | 'bg'; def: boolean }
export const MENU_DEFS: MenuDef[] = [
  { id: 'f.open', key: 'cmd.open', group: 'file', def: true },
  { id: 'f.preview', key: 'cmd.preview', group: 'file', def: true },
  { id: 'f.openWith', key: 'cmd.openWith', group: 'file', def: true },
  { id: 'f.wallpaper', key: 'cmd.setWallpaper', group: 'file', def: true },
  { id: 'f.extract', key: 'cmd.extractHere', group: 'file', def: true },
  { id: 'f.compress', key: 'cmd.compress', group: 'file', def: true },
  { id: 'f.reveal', key: 'cmd.reveal', group: 'file', def: true },
  { id: 'f.random', key: 'cmd.randomRename', group: 'file', def: true },
  { id: 'f.tag', key: 'tag.title', group: 'file', def: true },
  { id: 'f.otherPane', key: 'cmd.copyOther', group: 'file', def: true },
  { id: 'f.copyPath', key: 'cmd.copyPath', group: 'file', def: true },
  { id: 'f.properties', key: 'cmd.properties', group: 'file', def: true },

  { id: 'd.open', key: 'cmd.open', group: 'folder', def: true },
  { id: 'd.newTab', key: 'cmd.openNewTab', group: 'folder', def: true },
  { id: 'd.newWindow', key: 'cmd.openNewWindow', group: 'folder', def: false },
  { id: 'd.terminal', key: 'cmd.openTerminal', group: 'folder', def: true },
  { id: 'd.code', key: 'cmd.openCode', group: 'folder', def: true },
  { id: 'd.pin', key: 'cmd.pin', group: 'folder', def: true },
  { id: 'd.customize', key: 'cmd.customizeFolder', group: 'folder', def: true },
  { id: 'd.compress', key: 'cmd.compress', group: 'folder', def: true },
  { id: 'd.random', key: 'cmd.randomRename', group: 'folder', def: true },
  { id: 'd.tag', key: 'tag.title', group: 'folder', def: true },
  { id: 'd.otherPane', key: 'cmd.copyOther', group: 'folder', def: true },
  { id: 'd.copyPath', key: 'cmd.copyPath', group: 'folder', def: true },
  { id: 'd.properties', key: 'cmd.properties', group: 'folder', def: true },

  { id: 'b.view', key: 'cmd.view', group: 'bg', def: true },
  { id: 'b.sort', key: 'cmd.sortBy', group: 'bg', def: true },
  { id: 'b.refresh', key: 'nav.refresh', group: 'bg', def: true },
  { id: 'b.new', key: 'cmd.new', group: 'bg', def: true },
  { id: 'b.paste', key: 'cmd.paste', group: 'bg', def: true },
  { id: 'b.undo', key: 'cmd.undo', group: 'bg', def: true },
  { id: 'b.terminal', key: 'cmd.openTerminal', group: 'bg', def: true },
  { id: 'b.code', key: 'cmd.openCode', group: 'bg', def: true },
  { id: 'b.newTab', key: 'cmd.openNewTab', group: 'bg', def: false },
  { id: 'b.newWindow', key: 'cmd.openNewWindow', group: 'bg', def: false },
  { id: 'b.pin', key: 'cmd.pin', group: 'bg', def: false },
  { id: 'b.customize', key: 'cmd.customizeFolder', group: 'bg', def: false },
  { id: 'b.copyPath', key: 'cmd.copyPathBtn', group: 'bg', def: true },
  { id: 'b.selectAll', key: 'cmd.selectAll', group: 'bg', def: true },
  { id: 'b.properties', key: 'cmd.properties', group: 'bg', def: true }
];
const DEF = new Map(MENU_DEFS.map((d) => [d.id, d.def]));
export const menuOn = (id: string): boolean => { const v = getSettings().menu[id]; return v !== undefined ? v : DEF.get(id) ?? true; };

/** Splits "--flag \"a b\" {path}" into arguments. */
function splitArgs(s: string): string[] {
  const out: string[] = []; const re = /"([^"]*)"|(\S+)/g; let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out.push(m[1] ?? m[2]);
  return out;
}
/** Runs a user-defined entry once per selected path; {path}, {dir} and {name} are replaced in the arguments. */
export async function runCustomEntry(c: { program: string; args: string }, paths: string[]) {
  for (const p of paths.length ? paths : ['']) {
    const args = splitArgs(c.args || '{path}').map((a) => a.replace(/\{path\}/g, p).replace(/\{dir\}/g, parentOf(p) || p).replace(/\{name\}/g, baseName(p)));
    await api.runCustom(c.program, args);
  }
}
