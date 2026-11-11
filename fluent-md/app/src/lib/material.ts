/** Windows 11 system backdrop (Mica, Acrylic, Mica Alt). The window is transparent; the OS paints the material behind the page. */
import { api, isTauri } from './tauri';
import { getSettings, type Material } from './settings';

export type Fx = Material | 'off';
export interface FxSupport { mica: boolean; alt: boolean; acrylic: boolean }

const isWindows = typeof navigator !== 'undefined' && /Windows/i.test(navigator.userAgent);
let support: FxSupport = { mica: false, alt: false, acrylic: false };
let probed: Promise<FxSupport> | null = null;

/** Windows 11 reports a platformVersion of 13 or more (22H2, build 22621, is 14). Without the hint, assume a current Windows 11. */
export function probeSupport(): Promise<FxSupport> {
  probed = probed || (async () => {
    if (!isTauri || !isWindows) return support;
    let major = 0;
    try {
      const uad = (navigator as Navigator & { userAgentData?: { getHighEntropyValues: (k: string[]) => Promise<{ platformVersion?: string }> } }).userAgentData;
      major = parseInt((await uad?.getHighEntropyValues(['platformVersion']))?.platformVersion || '0', 10) || 0;
    } catch { /* keep 0 */ }
    support = { mica: major === 0 || major >= 13, alt: major === 0 || major >= 14, acrylic: true };
    return support;
  })();
  return probed;
}
export const getSupport = () => support;

/** The material that will really be used: Mica Alt falls back to Mica, and everything falls back to solid colours. */
export function resolveFx(m: Material, s: FxSupport = support): Fx {
  if (m === 'alt') return s.alt ? 'alt' : s.mica ? 'mica' : s.acrylic ? 'acrylic' : 'off';
  if (m === 'mica') return s.mica ? 'mica' : s.acrylic ? 'acrylic' : 'off';
  return s.acrylic ? 'acrylic' : 'off';
}

let seq = 0;
/** Applies the material from the settings. Resolves with the effect that is active. */
export async function applyMaterial(dark: boolean): Promise<Fx> {
  const my = ++seq, root = document.documentElement;
  const s = await probeSupport(), fx = resolveFx(getSettings().material, s);
  if (!isTauri || fx === 'off') { root.dataset.fx = 'off'; if (isTauri) await api.setEffect('none', dark).catch(() => {}); return 'off'; }
  try { await api.setEffect(fx, dark); if (my === seq) root.dataset.fx = fx; return fx; } catch { if (my === seq) root.dataset.fx = 'off'; return 'off'; }
}
