/* Drag files out of the window into other programs (Explorer, Chrome upload areas, chat apps ...).
   The in-app drag is pointer based; once the pointer leaves the window a real OS drag takes over (tauri-plugin-drag). */
import { startDrag } from '@crabnebula/tauri-plugin-drag';
import { IS_TAURI } from './api';
import { isVirtual, baseName } from './paths';
import { toast } from '../store/ui';
import { errText } from '../store/explorer';

/** a small card with the file name (and a count) as the drag image */
function dragImage(paths: string[]): string {
  const c = document.createElement('canvas'); c.width = 220; c.height = 52;
  const g = c.getContext('2d'); if (!g) return '';
  const dark = document.documentElement.dataset.scheme === 'dark';
  g.fillStyle = dark ? '#2f2f2f' : '#ffffff'; g.strokeStyle = dark ? '#555' : '#c8c8c8';
  g.beginPath(); g.roundRect(1, 1, 218, 50, 8); g.fill(); g.stroke();
  g.fillStyle = dark ? '#fff' : '#1a1a1a'; g.font = '14px "Segoe UI", system-ui, sans-serif'; g.textBaseline = 'middle';
  let name = baseName(paths[0]); while (g.measureText(name).width > 150 && name.length > 4) name = name.slice(0, -2);
  g.fillText(name + (name !== baseName(paths[0]) ? '…' : ''), 14, 26);
  if (paths.length > 1) {
    g.fillStyle = '#0067c0'; g.beginPath(); g.arc(190, 26, 14, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 13px "Segoe UI", system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(String(paths.length), 190, 27);
  }
  return c.toDataURL('image/png');
}

let active = false;
/** true while an OS drag started by this window is running (and just after), so its own drop is not treated as an external file drop */
export const isNativeDragActive = () => active;

export async function dragOut(paths: string[]) {
  const real = paths.filter((p) => p && !isVirtual(p));
  if (!IS_TAURI || !real.length) return;
  active = true;
  try { await startDrag({ item: real, icon: dragImage(real), mode: 'copy' }); } catch (e) { toast(errText(e), 'error'); } finally { setTimeout(() => { active = false; }, 400); }
}
