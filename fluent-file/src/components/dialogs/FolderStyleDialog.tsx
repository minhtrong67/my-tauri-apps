import { useEffect, useState } from 'react';
import { Check, Palette, Pipette, RotateCcw, Ban } from 'lucide-react';
import { closeModal, useUI } from '../../store/ui';
import { useSettings } from '../../store/settings';
import { useT } from '../../lib/i18n';
import { pk, baseName } from '../../lib/paths';
import { validHex } from '../../lib/theme';
import { FOLDER_COLORS, FOLDER_GLYPHS, GLYPH_IDS } from '../../lib/folderStyle';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Buttons';
import { FolderIcon } from '../FolderIcon';

/** Per-folder icon colour and glyph. Changes apply live; Reset restores the default Windows folder. */
export function FolderStyleDialog() {
  const t = useT();
  const p = useUI((s) => s.modals.folderStyle) as { paths: string[] } | undefined;
  const styles = useSettings((s) => s.folderStyles);
  const paths = p?.paths ?? [];
  const cur = paths.length ? styles[pk(paths[0])] : undefined;
  const [hex, setHex] = useState('');
  useEffect(() => { setHex(cur?.color ?? ''); }, [p]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (patch: { color?: string | null; icon?: string | null }) => {
    const next = { ...useSettings.getState().folderStyles };
    for (const path of paths) {
      const k = pk(path); const o = { ...(next[k] || {}) };
      if ('color' in patch) { if (patch.color) o.color = patch.color; else delete o.color; }
      if ('icon' in patch) { if (patch.icon) o.icon = patch.icon; else delete o.icon; }
      if (!o.color && !o.icon) delete next[k]; else next[k] = o;
    }
    useSettings.getState().set({ folderStyles: next });
  };
  const reset = () => { apply({ color: null, icon: null }); setHex(''); };
  const color = cur?.color; const icon = cur?.icon;
  const name = paths.length === 1 ? baseName(paths[0]) : t('folder.count', { n: paths.length });
  return (
    <Modal open={!!p} onClose={() => closeModal('folderStyle')} title={t('folder.title')} icon={Palette} width={520}
      footer={<><Button tone="tonal" icon={RotateCcw} label={t('folder.reset')} onClick={reset} /><Button tone="filled" icon={Check} label={t('common.done')} onClick={() => closeModal('folderStyle')} data-autofocus /></>}>
      <div className="px-6 pb-5">
      <div className="flex items-center gap-4 rounded-lg border border-outline-variant bg-surface p-4">
        <FolderIcon size={72} color={color} glyph={icon} />
        <div className="min-w-0"><div className="truncate text-base font-semibold">{name}</div><div className="text-xs text-on-surface-variant">{color ? color.toUpperCase() : t('folder.default')}{icon ? ' · ' + icon : ''}</div></div>
      </div>
      <div className="mt-4 mb-2 text-xs font-semibold text-on-surface-variant">{t('folder.color')}</div>
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t('folder.color')}>
        {FOLDER_COLORS.map((c, i) => {
          const on = i === 0 ? !color : color?.toLowerCase() === c.toLowerCase();
          return <button key={c} type="button" role="radio" aria-checked={on} title={i === 0 ? t('folder.default') : c} onClick={() => { apply({ color: i === 0 ? null : c }); setHex(i === 0 ? '' : c); }} className={`swatch ${on ? 'on' : ''}`} style={{ background: c }}>
            {on && <Check className="size-4" strokeWidth={2.5} style={{ color: i === 0 || c === '#00B7C3' ? '#222' : '#fff' }} />}
          </button>;
        })}
        <label className="swatch cursor-pointer border border-outline" title={t('folder.custom')} style={{ background: validHex(hex) ? hex : 'transparent' }}>
          <Pipette className="size-4 text-on-surface" strokeWidth={1.75} style={{ mixBlendMode: validHex(hex) ? 'difference' : undefined, color: validHex(hex) ? '#fff' : undefined }} />
          <input type="color" className="absolute inset-0 size-full cursor-pointer opacity-0" value={validHex(hex) ? hex : '#F9B72E'} onChange={(e) => { setHex(e.target.value); apply({ color: e.target.value }); }} />
        </label>
        <input className="field !w-28 font-mono" value={hex} maxLength={7} placeholder="#RRGGBB" spellCheck={false} aria-label="HEX" onChange={(e) => { setHex(e.target.value); if (validHex(e.target.value)) apply({ color: e.target.value }); }} />
      </div>
      <div className="mt-4 mb-2 text-xs font-semibold text-on-surface-variant">{t('folder.glyph')}</div>
      <div className="grid grid-cols-7 gap-1.5 max-[460px]:grid-cols-5" role="radiogroup" aria-label={t('folder.glyph')}>
        <button type="button" role="radio" aria-checked={!icon} title={t('folder.none')} onClick={() => apply({ icon: null })} className={`ripple grid h-10 place-items-center rounded-md border ${!icon ? 'border-primary bg-primary/12 text-primary' : 'border-outline-variant'}`}><Ban className="size-[1.125rem]" strokeWidth={1.6} /></button>
        {GLYPH_IDS.map((g) => { const G = FOLDER_GLYPHS[g]; const on = icon === g; return (
          <button key={g} type="button" role="radio" aria-checked={on} title={g} onClick={() => apply({ icon: g })} className={`ripple grid h-10 place-items-center rounded-md border ${on ? 'border-primary bg-primary/12 text-primary' : 'border-outline-variant'}`}><G className="size-[1.125rem]" strokeWidth={1.6} /></button>
        ); })}
      </div>
      </div>
    </Modal>
  );
}
