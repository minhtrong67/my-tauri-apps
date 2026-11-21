import { useEffect, useMemo, useState } from 'react';
import { Check, Palette, Pipette, RotateCcw, Ban } from '../../lib/icons';
import { closeModal, useUI } from '../../store/ui';
import { useSettings } from '../../store/settings';
import { useT } from '../../lib/i18n';
import { pk, baseName } from '../../lib/paths';
import { validHex } from '../../lib/theme';
import { BRANDS, EMOJI, EMOJI_FONT, FOLDER_COLORS, GLYPHS } from '../../lib/folderStyle';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Buttons';
import { Segmented } from '../ui/Controls';
import { FolderIcon } from '../FolderIcon';

type Tab = 'icons' | 'emoji' | 'logos';
type Patch = { color?: string | null; icon?: string | null; tone?: 'light' | 'dark' | null };

/** Per-folder look: colour, a glyph (Fluent icon, emoji or platform logo) and the glyph tone. Changes apply live. */
export function FolderStyleDialog() {
  const t = useT();
  const p = useUI((s) => s.modals.folderStyle) as { paths: string[] } | undefined;
  const styles = useSettings((s) => s.folderStyles);
  const paths = p?.paths ?? [];
  const cur = paths.length ? styles[pk(paths[0])] : undefined;
  const [hex, setHex] = useState('');
  const [tab, setTab] = useState<Tab>('icons');
  const [q, setQ] = useState('');
  useEffect(() => { setHex(cur?.color ?? ''); setQ(''); const i = cur?.icon; setTab(i?.startsWith('e:') ? 'emoji' : i?.startsWith('b:') ? 'logos' : 'icons'); }, [p]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (patch: Patch) => {
    const next = { ...useSettings.getState().folderStyles };
    for (const path of paths) {
      const k = pk(path); const o = { ...(next[k] || {}) };
      for (const key of ['color', 'icon', 'tone'] as const) if (key in patch) { const v = patch[key]; if (v) (o as Record<string, string>)[key] = v; else delete o[key]; }
      if (!o.color && !o.icon && !o.tone) delete next[k]; else next[k] = o;
    }
    useSettings.getState().set({ folderStyles: next });
  };
  const reset = () => { apply({ color: null, icon: null, tone: null }); setHex(''); };
  const color = cur?.color; const icon = cur?.icon; const tone = cur?.tone;
  const name = paths.length === 1 ? baseName(paths[0]) : t('folder.count', { n: paths.length });
  const needle = q.trim().toLowerCase();
  const glyphs = useMemo(() => GLYPHS.filter((g) => !needle || g.id.includes(needle)), [needle]);
  const brands = useMemo(() => BRANDS.filter((b) => !needle || b.title.toLowerCase().includes(needle) || b.id.includes(needle)), [needle]);
  const cell = (on: boolean) => `ripple grid h-10 place-items-center rounded-md border ${on ? 'border-primary bg-primary/12 text-primary' : 'border-outline-variant'}`;
  return (
    <Modal open={!!p} onClose={() => closeModal('folderStyle')} title={t('folder.title')} icon={Palette} width={600}
      footer={<><Button tone="tonal" icon={RotateCcw} label={t('folder.reset')} onClick={reset} /><Button tone="filled" icon={Check} label={t('common.done')} onClick={() => closeModal('folderStyle')} data-autofocus /></>}>
      <div className="px-6 pb-5">
        <div className="flex items-center gap-4 rounded-lg border border-outline-variant bg-surface p-4">
          <FolderIcon size={72} color={color} glyph={icon} tone={tone} />
          <div className="min-w-0"><div className="truncate text-base font-semibold">{name}</div><div className="truncate text-xs text-on-surface-variant">{color ? color.toUpperCase() : t('folder.default')}{icon ? ' · ' + (icon.startsWith('e:') ? icon.slice(2) : icon.replace('b:', '')) : ''}</div></div>
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

        <div className="mt-4 mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-on-surface-variant">{t('folder.glyph')}</span>
          {(!icon || !(icon.startsWith('e:') || icon.startsWith('b:'))) && (
            <span className="flex items-center gap-2 text-xs text-on-surface-variant">{t('folder.tone')}
              <Segmented ariaLabel={t('folder.tone')} value={tone ?? 'auto'} onChange={(v) => apply({ tone: v === 'auto' ? null : v })} options={[{ value: 'auto', label: t('folder.tone.auto') }, { value: 'light', label: t('folder.tone.light') }, { value: 'dark', label: t('folder.tone.dark') }]} />
            </span>
          )}
        </div>
        <Segmented ariaLabel={t('folder.glyph')} value={tab} onChange={(v) => { setTab(v); setQ(''); }} options={[{ value: 'icons', label: t('folder.tab.icons') }, { value: 'emoji', label: t('folder.tab.emoji') }, { value: 'logos', label: t('folder.tab.logos') }]} />
        {tab !== 'emoji' && <input className="field mt-2" value={q} placeholder={t('folder.search')} aria-label={t('folder.search')} onChange={(e) => setQ(e.target.value)} />}

        <div className="mt-2 max-h-56 overflow-y-auto pr-1" role="radiogroup" aria-label={t('folder.glyph')}>
          {tab === 'icons' && (
            <div className="grid grid-cols-8 gap-1.5 max-[560px]:grid-cols-6">
              <button type="button" role="radio" aria-checked={!icon} title={t('folder.none')} onClick={() => apply({ icon: null })} className={cell(!icon)}><Ban className="size-[1.125rem]" /></button>
              {glyphs.map((g) => <button key={g.id} type="button" role="radio" aria-checked={icon === g.id} title={g.id} onClick={() => apply({ icon: g.id })} className={cell(icon === g.id)}><g.icon className="size-[1.125rem]" /></button>)}
              {!glyphs.length && <div className="col-span-full py-4 text-center text-on-surface-variant">{t('folder.noMatch')}</div>}
            </div>
          )}
          {tab === 'emoji' && Object.entries(EMOJI).map(([group, list]) => (
            <div key={group} className="mb-2 grid grid-cols-10 gap-1 max-[560px]:grid-cols-8">
              {list.map((e) => <button key={e} type="button" role="radio" aria-checked={icon === 'e:' + e} onClick={() => apply({ icon: 'e:' + e })} className={`${cell(icon === 'e:' + e)} !h-9 text-xl leading-none`} style={{ fontFamily: EMOJI_FONT }}>{e}</button>)}
            </div>
          ))}
          {tab === 'logos' && (
            <div className="grid grid-cols-8 gap-1.5 max-[560px]:grid-cols-6">
              {brands.map((b) => <button key={b.id} type="button" role="radio" aria-checked={icon === 'b:' + b.id} title={b.title} onClick={() => apply({ icon: 'b:' + b.id })} className={cell(icon === 'b:' + b.id)}><span className="grid size-7 place-items-center rounded-full bg-white"><svg viewBox="0 0 24 24" className="size-4" aria-label={b.title}><path d={b.path} fill={b.hex} /></svg></span></button>)}
              {!brands.length && <div className="col-span-full py-4 text-center text-on-surface-variant">{t('folder.noMatch')}</div>}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
