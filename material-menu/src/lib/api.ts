import { invoke } from '@tauri-apps/api/core'

export type ScopeKey = 'files' | 'folders' | 'background' | 'drives' | 'desktop' | 'image' | 'video' | 'audio' | 'text' | 'ext'
export interface Entry {
  id: string; label: string; command: string; icon: string
  scopes: ScopeKey[]; extensions: string[]; submenu: string
  position: 'default' | 'top' | 'bottom'
  shiftOnly: boolean; separatorBefore: boolean; separatorAfter: boolean; enabled: boolean
}
export interface HiddenVerb { base: string; name: string }
export interface AppState { entries: Entry[]; hiddenVerbs: HiddenVerb[]; blockedClsids: string[]; classic: boolean }
export interface SystemItem {
  id: string; kind: 'verb' | 'handler'; base: string; name: string; display: string
  command: string; clsid: string; hidden: boolean; scopes: string[]
}
export interface OsInfo { name: string; build: number; ubr: number; displayVersion: string; isWin11: boolean }
export interface BackupFile { name: string; path: string; size: number; modified: number }
export interface Settings {
  theme: 'system' | 'light' | 'dark'; seed: string; fontSize: 'sm' | 'md' | 'lg'; font: string
  language: 'en' | 'vi'; savePath: string | null; windowMode: 'remember' | 'maximized'
}

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/* ------------------------------------------------------------------ */
/* Browser preview backend (used by `npm run web:dev` and screenshots) */
/* ------------------------------------------------------------------ */
const mk = (id: string, label: string, command: string, scopes: ScopeKey[], extra: Partial<Entry> = {}): Entry => ({
  id, label, command, icon: '', scopes, extensions: [], submenu: '', position: 'default',
  shiftOnly: false, separatorBefore: false, separatorAfter: false, enabled: true, ...extra,
})
const mock = {
  state: {
    classic: false,
    entries: [
      mk('a1b2c3d4', 'Open in Windows Terminal', 'wt.exe -d "%V"', ['folders', 'background'], { position: 'top' }),
      mk('b2c3d4e5', 'Open with VS Code', '"C:\\Program Files\\Microsoft VS Code\\Code.exe" "%1"', ['files', 'folders'], { icon: 'C:\\Program Files\\Microsoft VS Code\\Code.exe' }),
      mk('c3d4e5f6', 'Copy as path', 'cmd.exe /c echo|set /p="%1"|clip', ['files', 'folders'], { submenu: 'Quick tools' }),
      mk('d4e5f6a7', 'Edit with Notepad', 'notepad.exe "%1"', ['ext'], { extensions: ['.txt', '.md', '.log'], shiftOnly: true }),
    ],
    hiddenVerbs: [{ base: 'Folder', name: 'pintohome' }],
    blockedClsids: ['{09A47860-11B0-4DA5-AFA5-26D86198A780}'],
  } as AppState,
  items: [
    { id: 'v|DesktopBackground|Display', kind: 'verb', base: 'DesktopBackground', name: 'Display', display: '', command: '', clsid: '', hidden: false, scopes: ['desktop'] },
    { id: 'v|DesktopBackground|Personalize', kind: 'verb', base: 'DesktopBackground', name: 'Personalize', display: '', command: '', clsid: '', hidden: false, scopes: ['desktop'] },
    { id: 'v|Directory\\Background|wt', kind: 'verb', base: 'Directory\\Background', name: 'wt', display: 'Open in Terminal', command: 'wt.exe -d "%V"', clsid: '', hidden: false, scopes: ['background'] },
    { id: 'v|Directory\\Background|VisualStudio', kind: 'verb', base: 'Directory\\Background', name: 'VisualStudio', display: 'Open with Visual Studio', command: 'devenv.exe', clsid: '', hidden: false, scopes: ['background'] },
    { id: 'v|Directory\\Background|Cursor', kind: 'verb', base: 'Directory\\Background', name: 'Cursor', display: 'Open with Cursor', command: 'cursor.exe', clsid: '', hidden: false, scopes: ['background'] },
    { id: 'v|Directory\\Background|git_gui', kind: 'verb', base: 'Directory\\Background', name: 'git_gui', display: 'Open Git GUI here', command: 'git-gui.exe', clsid: '', hidden: false, scopes: ['background'] },
    { id: 'v|Directory\\Background|git_shell', kind: 'verb', base: 'Directory\\Background', name: 'git_shell', display: 'Open Git Bash here', command: 'git-bash.exe', clsid: '', hidden: false, scopes: ['background'] },
    { id: 'v|Directory\\Background|VSCode', kind: 'verb', base: 'Directory\\Background', name: 'VSCode', display: 'Open with Code', command: 'Code.exe', clsid: '', hidden: false, scopes: ['background'] },
    { id: 'v|Directory\\Background|SVNCheckout', kind: 'verb', base: 'Directory\\Background', name: 'SVNCheckout', display: 'SVN Checkout…', command: 'TortoiseProc.exe', clsid: '', hidden: false, scopes: ['background'] },
    { id: 'h|{D969A300-E7FF-11D0-A93B-00A0C90F2719}', kind: 'handler', base: 'Directory\\Background', name: 'New', display: 'New', command: '', clsid: '{D969A300-E7FF-11D0-A93B-00A0C90F2719}', hidden: false, scopes: ['background'] },
    { id: 'h|{30D2F2E9-9F5A-4C0A-9B8E-0D7B7A1C5E11}', kind: 'handler', base: 'Directory\\Background', name: 'TortoiseSVN', display: 'TortoiseSVN', command: '', clsid: '{30D2F2E9-9F5A-4C0A-9B8E-0D7B7A1C5E11}', hidden: false, scopes: ['background', 'folders'] },
    { id: 'v|Directory|cmd', kind: 'verb', base: 'Directory', name: 'cmd', display: 'Open command window here', command: 'cmd.exe /s /k pushd "%V"', clsid: '', hidden: false, scopes: ['folders'] },
    { id: 'v|Folder|pintohome', kind: 'verb', base: 'Folder', name: 'pintohome', display: '', command: '', clsid: '', hidden: false, scopes: ['folders'] },
    { id: 'v|*|VSCode', kind: 'verb', base: '*', name: 'VSCode', display: 'Open with Code', command: 'Code.exe', clsid: '', hidden: false, scopes: ['files'] },
    { id: 'h|{8AB635F8-9A67-4698-AB99-784AD929F3B4}', kind: 'handler', base: 'Directory\\Background', name: 'Open With', display: 'Open with', command: '', clsid: '{8AB635F8-9A67-4698-AB99-784AD929F3B4}', hidden: false, scopes: ['files'] },
    { id: 'h|{596AB062-B4D2-4215-9F74-E9109B0A8153}', kind: 'handler', base: 'Directory\\Background', name: 'PreviousVersions', display: 'Previous Versions', command: '', clsid: '{596AB062-B4D2-4215-9F74-E9109B0A8153}', hidden: false, scopes: ['allobjects'] },
    { id: 'h|{09A47860-11B0-4DA5-AFA5-26D86198A780}', kind: 'handler', base: 'Directory\\Background', name: 'Windows Defender', display: 'Microsoft Defender scan', command: '', clsid: '{09A47860-11B0-4DA5-AFA5-26D86198A780}', hidden: true, scopes: ['files', 'folders'] },
    { id: 'v|Drive|format', kind: 'verb', base: 'Drive', name: 'format', display: 'Format…', command: '', clsid: '', hidden: false, scopes: ['drives'] },
  ] as SystemItem[],
  backups: [] as BackupFile[],
  files: {} as Record<string, string>,
}
const delay = <T,>(v: T, ms = 120) => new Promise<T>((r) => setTimeout(() => r(v), ms))
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

async function mockInvoke(cmd: string, a: Record<string, any> = {}): Promise<any> {
  switch (cmd) {
    case 'app_ready': return
    case 'load_settings': return clone(JSON.parse(localStorage.getItem('mm-settings') ?? '{}'))
    case 'save_settings': localStorage.setItem('mm-settings', JSON.stringify(a.settings)); return
    case 'default_save_dir': return 'C:\\Users\\you\\Documents\\Material Menu'
    case 'get_state': return delay(clone(mock.state), 40)
    case 'get_os_info': return { name: 'Windows 11 Pro', build: 26200, ubr: 7019, displayVersion: '25H2', isWin11: true }
    case 'set_classic_menu': mock.state.classic = a.enabled; return
    case 'save_entries': mock.state.entries = clone(a.entries); return delay(clone(mock.state))
    case 'scan_system_items': return delay(clone(mock.items), 350)
    case 'set_item_hidden': {
      const it = mock.items.find((i) => i.kind === a.kind && (a.kind === 'handler' ? i.clsid === a.clsid : i.base === a.base && i.name === a.name))
      if (it) it.hidden = a.hidden
      return
    }
    case 'restart_explorer': return delay(undefined, 900)
    case 'open_uri': case 'open_path': return
    case 'write_backup': {
      const path = `${a.dir}\\${a.fileName}`
      mock.files[path] = a.content
      mock.backups.unshift({ name: a.fileName, path, size: a.content.length, modified: Math.floor(Date.now() / 1000) })
      return path
    }
    case 'read_text': return mock.files[a.path] ?? '{}'
    case 'list_backups': return clone(mock.backups)
    case 'delete_backup': mock.backups = mock.backups.filter((b) => b.path !== a.path); return
    case 'restore_state': mock.state = clone(a.incoming); return clone(mock.state)
    case 'reset_all': mock.state = { entries: [], hiddenVerbs: [], blockedClsids: [], classic: false }; mock.items.forEach((i) => (i.hidden = false)); return clone(mock.state)
  }
  throw new Error('Unknown command ' + cmd)
}

const call = <T,>(cmd: string, args?: Record<string, unknown>): Promise<T> =>
  isTauri ? invoke<T>(cmd, args) : mockInvoke(cmd, args as Record<string, any>)

export const api = {
  ready: () => call<void>('app_ready'),
  loadSettings: () => call<Partial<Settings>>('load_settings'),
  saveSettings: (settings: Settings) => call<void>('save_settings', { settings }),
  defaultSaveDir: () => call<string>('default_save_dir'),
  getState: () => call<AppState>('get_state'),
  osInfo: () => call<OsInfo>('get_os_info'),
  setClassic: (enabled: boolean) => call<void>('set_classic_menu', { enabled }),
  saveEntries: (entries: Entry[]) => call<AppState>('save_entries', { entries }),
  scan: () => call<SystemItem[]>('scan_system_items'),
  setHidden: (i: SystemItem, hidden: boolean) =>
    call<void>('set_item_hidden', { kind: i.kind, base: i.base, name: i.name, clsid: i.clsid, hidden }),
  restartExplorer: () => call<void>('restart_explorer'),
  openUri: (uri: string) => call<void>('open_uri', { uri }),
  openPath: (path: string) => call<void>('open_path', { path }),
  writeBackup: (dir: string, fileName: string, content: string) => call<string>('write_backup', { dir, fileName, content }),
  readText: (path: string) => call<string>('read_text', { path }),
  listBackups: (dir: string) => call<BackupFile[]>('list_backups', { dir }),
  deleteBackup: (path: string) => call<void>('delete_backup', { path }),
  restore: (incoming: AppState) => call<AppState>('restore_state', { incoming }),
  resetAll: () => call<AppState>('reset_all'),
}

export const uid = () => Math.random().toString(36).slice(2, 10).padEnd(8, '0')
export const errMsg = (e: unknown) => (typeof e === 'string' ? e : e instanceof Error ? e.message : JSON.stringify(e))

/** Friendly names for well known Windows items, keyed by lowercase verb name or CLSID. */
export const KNOWN: Record<string, { en: string; vi: string }> = {
  pintohome: { en: 'Pin to Quick access', vi: 'Ghim vào Truy cập nhanh' },
  cmd: { en: 'Open command window here', vi: 'Mở cửa sổ lệnh tại đây' },
  powershell: { en: 'Open PowerShell window here', vi: 'Mở cửa sổ PowerShell tại đây' },
  find: { en: 'Search', vi: 'Tìm kiếm' },
  format: { en: 'Format…', vi: 'Định dạng…' },
  'manage-bde': { en: 'Manage BitLocker', vi: 'Quản lý BitLocker' },
  opennewprocess: { en: 'Open in new process', vi: 'Mở trong tiến trình mới' },
  opennewwindow: { en: 'Open in new window', vi: 'Mở trong cửa sổ mới' },
  opennewtab: { en: 'Open in new tab', vi: 'Mở trong thẻ mới' },
  display: { en: 'Display settings', vi: 'Cài đặt hiển thị' },
  personalize: { en: 'Personalize', vi: 'Cá nhân hoá' },
  '{d969a300-e7ff-11d0-a93b-00a0c90f2719}': { en: 'New', vi: 'Mới' },
  explore: { en: 'Explore', vi: 'Khám phá' },
  '{596ab062-b4d2-4215-9f74-e9109b0a8153}': { en: 'Previous Versions', vi: 'Phiên bản trước' },
  '{f81e9010-6ea4-11ce-a7ff-00aa003ca9f6}': { en: 'Sharing', vi: 'Chia sẻ' },
  '{8ab635f8-9a67-4698-ab99-784ad929f3b4}': { en: 'Open with', vi: 'Mở bằng' },
  '{09a47860-11b0-4da5-afa5-26d86198a780}': { en: 'Microsoft Defender scan', vi: 'Quét bằng Microsoft Defender' },
  '{a2a9545d-a0c2-42b4-9708-a0b2badd77c8}': { en: 'Pin to Start', vi: 'Ghim vào Start' },
  '{7ba4c740-9e81-11cf-99d3-00aa004ae837}': { en: 'Sharing', vi: 'Chia sẻ' },
  '{ebf80c50-3a16-4e26-8f9a-1bd96ddb6b37}': { en: 'Send to', vi: 'Gửi tới' },
}
