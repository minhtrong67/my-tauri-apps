/* A tiny in-memory file system so the UI can be developed and previewed in a normal browser
   (`npm run web:dev`). Inside Tauri the real Rust commands are used instead. */
import type { Entry } from './types';

const DAY = 86400000;
const now = Date.now();
const f = (name: string, size: number, ago: number, dir = false): Omit<Entry, 'path'> => ({
  name, size, isDir: dir, modified: now - ago * DAY, created: now - (ago + 30) * DAY, hidden: false, readonly: false
});
const TREE: Record<string, Omit<Entry, 'path'>[]> = {
  'C:\\Users\\minhtrong67': [f('Desktop', 0, 1, true), f('Documents', 0, 2, true), f('Downloads', 0, 0, true), f('Pictures', 0, 5, true), f('Music', 0, 9, true), f('Videos', 0, 14, true), f('Projects', 0, 3, true), f('notes.txt', 2048, 1)],
  'C:\\Users\\minhtrong67\\Documents': [f('Reports', 0, 4, true), f('Invoices', 0, 12, true), f('Budget 2026.xlsx', 48210, 2), f('Resume.docx', 90210, 20), f('Proposal.pdf', 1820400, 6), f('Meeting notes.md', 5230, 1), f('Slides.pptx', 4820400, 33), f('todo.txt', 812, 0), f('Contract.pdf', 640210, 90)],
  'C:\\Users\\minhtrong67\\Downloads': [f('Material-File-Setup.exe', 8420000, 0), f('wallpaper.png', 2410000, 3), f('archive.zip', 52400000, 8), f('song.mp3', 7410000, 11), f('clip.mp4', 184200000, 15), f('data.csv', 120400, 2), f('photo-01.jpg', 3120000, 7), f('photo-02.jpg', 2980000, 7), f('setup-tools.rar', 12400000, 40)],
  'C:\\Users\\minhtrong67\\Projects': [f('material-file', 0, 0, true), f('landing-page', 0, 4, true), f('api-server', 0, 12, true), f('README.md', 3200, 2), f('package.json', 1200, 2), f('main.rs', 24000, 1), f('App.tsx', 18000, 0)]
};
const HOMEP = 'C:\\Users\\minhtrong67';
const entries = (path: string): Entry[] => (TREE[path] || [f('Item 1.txt', 1200, 1), f('Item 2.png', 220000, 3), f('Folder', 0, 2, true)]).map((e) => ({ ...e, path: path.endsWith('\\') ? path + e.name : path + '\\' + e.name }));

export async function mockInvoke(cmd: string, a: Record<string, unknown> = {}): Promise<unknown> {
  switch (cmd) {
    case 'list_dir': return entries(String(a.path));
    case 'search_dir': return entries(HOMEP + '\\Documents').filter((e) => e.name.toLowerCase().includes(String(a.query).toLowerCase()));
    case 'get_places': return ['home', 'desktop', 'documents', 'downloads', 'pictures', 'music', 'videos'].map((id) => ({ id, path: id === 'home' ? HOMEP : HOMEP + '\\' + id[0].toUpperCase() + id.slice(1) }));
    case 'get_drives': return [{ name: 'Windows', path: 'C:\\', total: 512e9, free: 148e9, fs: 'NTFS' }, { name: 'Data', path: 'D:\\', total: 1e12, free: 910e9, fs: 'NTFS' }];
    case 'tools_available': return { winrar: true, sevenzip: false, code: true, terminal: true };
    case 'startup_path': return null;
    case 'item_properties': return { name: 'item', path: String(a.path), isDir: true, size: 12400000, files: 24, folders: 3, created: now, modified: now, accessed: now, readonly: false, hidden: false };
    case 'preview_text': return '# Notes\n\nHello from Material File.\n- fast\n- simple\n- beautiful';
    case 'check_conflicts': return [];
    case 'paste_items': return (a.sources as string[]).map((s) => s);
    case 'find_duplicates': return [{ size: 3120000, paths: [HOMEP + '\\Downloads\\photo-01.jpg', HOMEP + '\\Pictures\\photo-01 (copy).jpg'] }];
    case 'folder_sizes': return entries(String(a.path)).map((e) => ({ name: e.name, path: e.path, isDir: e.isDir, size: e.isDir ? 40e6 + e.name.length * 9e6 : e.size })).sort((x, y) => y.size - x.size);
    case 'get_thumbnail': throw new Error('unsupported');
    case 'create_item': return String(a.dir) + '\\' + String(a.name);
    case 'rename_item': return String(a.path).replace(/[^\\]+$/, String(a.newName));
    default: return undefined;
  }
}
