import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Ban, Check, Palette, Pipette, RotateCcw, Search } from '../../lib/icons';
import { closeModal, useUI } from '../../store/ui';
import { useSettings } from '../../store/settings';
import { pk, baseName } from '../../lib/paths';
import { validHex } from '../../lib/theme';
import { PRESETS } from '../../lib/presets.generated';
import { GRADIENTS, SOLID_COLORS, STYLES, luminance, shadeHex, DEFAULT_C1, DEFAULT_C2, type FillMode, type FolderDesign } from '../../lib/folderDesign';
import { loadEmoji, loadSet, type EmojiData, type IconSet, type VecKind } from '../../lib/iconLibs';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Buttons';
import { Segmented } from '../ui/Controls';
import { Slider } from '../ui/Slider';
import { FolderIcon } from '../FolderIcon';

type Tab = 'folder' | 'icon' | 'presets';
type Coll = VecKind | 'emoji';
const STEP = 150;
const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 py-1"><span className="text-on-surface-variant">{label}</span>{children}</div>
);
const Title = ({ children }: { children: React.ReactNode }) => <div className="mt-3 mb-1.5 text-xs font-semibold text-on-surface-variant first:mt-0">{children}</div>;

/** Colour field: swatch + native picker + hex. */
function ColorBox({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [t, setT] = useState(value);
  useEffect(() => setT(value), [value]);
  return (
    <span className="flex items-center gap-2">
      <span className="swatch !size-7 cursor-pointer border border-outline" title={label} style={{ background: validHex(value) ? value : 'transparent' }}>
        <input type="color" className="absolute inset-0 size-full cursor-pointer opacity-0" value={validHex(value) ? value : '#FFC83D'} onChange={(e) => onChange(e.target.value)} />
      </span>
      <input className="field !h-7 !w-24 font-mono" value={t} maxLength={7} spellCheck={false} aria-label={label} onChange={(e) => { setT(e.target.value); if (validHex(e.target.value)) onChange(e.target.value); }} />
    </span>
  );
}

/** One virtualised-by-pagination collection grid (Material / Font Awesome / logos). */
const IconGrid = memo(function IconGrid({ kind, q, current, onPick }: { kind: VecKind; q: string; current?: string; onPick: (kind: VecKind, name: string) => void }) {
  const [set, setSet] = useState<IconSet | null>(null);
  const [limit, setLimit] = useState(STEP);
  const dark = document.documentElement.dataset.scheme === 'dark';
  useEffect(() => { setSet(null); let off = false; void loadSet(kind).then((s) => !off && setSet(s)); return () => { off = true; }; }, [kind]);
  useEffect(() => setLimit(STEP), [q, kind]);
  const matches = useMemo(() => { if (!set) return []; const s = q.trim().toLowerCase(); return s ? set.names.filter((_, i) => set.search[i].includes(s)) : set.names; }, [set, q]);
  const tint = (hex?: string) => (hex && luminance(hex) > (dark ? 0.22 : 0.05) && luminance(hex) < (dark ? 1 : 0.92) ? hex : 'currentColor');
  return (
    <div className="grid max-h-[17rem] grid-cols-8 content-start gap-1.5 overflow-y-auto pr-1" onScroll={(e) => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight > el.scrollHeight - 240) setLimit((l) => Math.min(l + STEP, matches.length)); }}>
      {!set && <div className="col-span-full py-8 text-center text-on-surface-variant">…</div>}
      {set && matches.length === 0 && <div className="col-span-full py-8 text-center text-on-surface-variant">—</div>}
      {matches.slice(0, limit).map((n) => { const v = set!.get(n); if (!v) return null; const id = kind + ':' + n; return (
        <button key={n} type="button" title={set!.label(n)} onClick={() => onPick(kind, n)} className={`ripple grid h-10 place-items-center rounded-md border ${current === id ? 'border-primary bg-primary/12' : 'border-outline-variant'}`}>
          <svg viewBox={`0 0 ${v.w} ${v.h}`} width="22" height="22" fill={kind === 'brand' ? tint(v.hex) : 'currentColor'}><path d={v.path} /></svg>
        </button>
      ); })}
    </div>
  );
});

function EmojiGrid({ q, current, onPick }: { q: string; current?: string; onPick: (e: string) => void }) {
  const [data, setData] = useState<EmojiData | null>(null);
  const [cat, setCat] = useState(0);
  useEffect(() => { let off = false; void loadEmoji().then((d) => !off && setData(d)); return () => { off = true; }; }, []);
  const list = useMemo(() => { if (!data) return []; const s = q.trim().toLowerCase(); return s ? data.all.filter((x) => x.q.includes(s)).slice(0, 400) : data.categories[cat].list; }, [data, q, cat]);
  return (
    <div>
      {!q.trim() && <div className="mb-1.5 flex gap-1 overflow-x-auto pb-1">{(data?.categories ?? []).map((c, i) => <button key={c.icon} type="button" onClick={() => setCat(i)} className={`ripple grid h-8 min-w-8 place-items-center rounded-md border text-lg ${cat === i ? 'border-primary bg-primary/12' : 'border-outline-variant'}`} style={{ fontFamily: EMOJI_FONT }}>{c.icon}</button>)}</div>}
      <div className="grid max-h-[15rem] grid-cols-9 content-start gap-1 overflow-y-auto pr-1">
        {!data && <div className="col-span-full py-8 text-center text-on-surface-variant">…</div>}
        {list.map((x) => <button key={x.e} type="button" title={x.q.split(' ')[0]} onClick={() => onPick(x.e)} className={`ripple grid h-9 place-items-center rounded-md border text-xl leading-none ${current === 'emoji:' + x.e ? 'border-primary bg-primary/12' : 'border-outline-variant'}`} style={{ fontFamily: EMOJI_FONT }}>{x.e}</button>)}
      </div>
    </div>
  );
}

/** Per-folder look, modelled on the Custom Folder Icon app: folder style, solid / gradient fills, and an icon layer
 *  (Material, Font Awesome, platform logos, emoji) with colour, badge, size, opacity and offset. Changes apply live. */
export function FolderStyleDialog() {
  const lang = useSettings((s) => s.lang);
  const L = (en: string, vi: string) => (lang === 'vi' ? vi : en);
  const p = useUI((s) => s.modals.folderStyle) as { paths: string[] } | undefined;
  const styles = useSettings((s) => s.folderStyles);
  const paths = p?.paths ?? [];
  const cur: FolderDesign = (paths.length ? styles[pk(paths[0])] : undefined) ?? {};
  const [tab, setTab] = useState<Tab>('folder');
  const [coll, setColl] = useState<Coll>('mdi');
  const [q, setQ] = useState('');
  const lastPaths = useRef<string[]>([]);
  useEffect(() => { if (p && lastPaths.current !== paths) { lastPaths.current = paths; setQ(''); setTab('folder'); const i = cur.icon; setColl(i?.startsWith('emoji:') ? 'emoji' : i?.startsWith('fa:') ? 'fa' : i?.startsWith('brand:') ? 'brand' : 'mdi'); } }); // eslint-disable-line react-hooks/exhaustive-deps

  /** merge a patch into every selected folder; undefined removes a key, an empty design removes the entry */
  const apply = (patch: Partial<FolderDesign>) => {
    const next = { ...useSettings.getState().folderStyles };
    for (const path of paths) {
      const k = pk(path); const o: Record<string, unknown> = { ...(next[k] || {}) };
      for (const [key, v] of Object.entries(patch)) { if (v === undefined || v === null || v === '') delete o[key]; else o[key] = v; }
      if (Object.keys(o).length === 0) delete next[k]; else next[k] = o as FolderDesign;
    }
    useSettings.getState().set({ folderStyles: next });
  };
  const name = paths.length === 1 ? baseName(paths[0]) : L(`${paths.length} folders`, `${paths.length} thư mục`);
  const c1 = cur.color || DEFAULT_C1; const c2 = cur.color2 || (cur.color ? shadeHex(cur.color, -0.2) : DEFAULT_C2);
  const fill: FillMode = cur.color2 ? cur.fill || 'linear' : cur.color ? 'linear' : 'linear';
  const solid = cur.fill === 'solid' && !!cur.color2;
  const setFill = (m: FillMode) => { if (m === 'solid') apply({ fill: 'solid', color: c1, color2: c1 }); else apply({ fill: m, color: c1, color2: cur.color2 && cur.color2 !== c1 ? cur.color2 : shadeHex(c1, -0.25) }); };
  const pickColor = (c: string) => { if (solid) apply({ color: c, color2: c, fill: 'solid' }); else apply({ color: c, color2: cur.color2 && cur.color2 !== cur.color ? cur.color2 : undefined, fill: cur.color2 ? cur.fill : undefined }); };

  const pickVec = async (kind: VecKind, nm: string) => {
    const v = (await loadSet(kind)).get(nm); if (!v) return;
    apply({ icon: `${kind}:${nm}`, vec: { p: v.path, w: v.w, h: v.h, hex: v.hex }, emoji: undefined, iconColor: kind === 'brand' ? 'brand' : cur.iconColor === 'brand' ? undefined : cur.iconColor });
  };
  const pickEmoji = (e: string) => apply({ icon: 'emoji:' + e, emoji: e, vec: undefined, iconColor: undefined });
  const applyPreset = (id: string) => {
    const pr = PRESETS.find((x) => x.id === id); if (!pr) return;
    const reset: Partial<FolderDesign> = { style: undefined, color: undefined, color2: undefined, fill: undefined, angle: undefined, icon: undefined, vec: undefined, emoji: undefined, iconColor: undefined, badge: undefined, badgeColor: undefined, size: undefined, x: undefined, y: undefined, opacity: undefined };
    apply({ ...reset, ...pr.design });
  };
  const hasIcon = !!(cur.vec || cur.emoji);
  const brand = coll === 'brand' && cur.icon?.startsWith('brand:');
  const colorMode = !cur.iconColor || cur.iconColor === 'auto' ? 'auto' : cur.iconColor === 'brand' ? 'brand' : 'custom';

  return (
    <Modal open={!!p} onClose={() => closeModal('folderStyle')} title={L('Customize folder', 'Tùy chỉnh thư mục')} icon={Palette} width={880}
      footer={<><Button tone="tonal" icon={RotateCcw} label={L('Reset to default', 'Đặt lại mặc định')} onClick={() => apply({ style: undefined, color: undefined, color2: undefined, fill: undefined, angle: undefined, icon: undefined, vec: undefined, emoji: undefined, iconColor: undefined, badge: undefined, badgeColor: undefined, size: undefined, x: undefined, y: undefined, opacity: undefined })} /><Button tone="filled" icon={Check} label={L('Done', 'Xong')} onClick={() => closeModal('folderStyle')} data-autofocus /></>}>
      <div className="grid gap-5 px-6 pb-5 md:grid-cols-[15rem_1fr]">
        <div>
          <div className="grid place-items-center rounded-lg border border-outline-variant bg-surface p-4"><FolderIcon size={150} design={cur} /></div>
          <div className="mt-2 truncate text-center text-base font-semibold">{name}</div>
          <div className="mt-3 grid grid-cols-5 gap-1">
            {PRESETS.slice(0, 10).map((pr) => <button key={pr.id} type="button" title={L(pr.en, pr.vi)} onClick={() => applyPreset(pr.id)} className="ripple grid place-items-center rounded-md border border-outline-variant p-1"><FolderIcon size={34} design={pr.design} /></button>)}
          </div>
          <Button tone="tonal" small className="mt-2 w-full" label={L(`All presets (${PRESETS.length})`, `Tất cả mẫu (${PRESETS.length})`)} onClick={() => setTab('presets')} />
        </div>

        <div className="min-w-0">
          <Segmented ariaLabel="tab" value={tab} onChange={setTab} options={[{ value: 'folder', label: L('Folder', 'Thư mục') }, { value: 'icon', label: L('Icon', 'Biểu tượng') }, { value: 'presets', label: L('Presets', 'Mẫu') }]} />
          <div className="mt-3 max-h-[30rem] overflow-y-auto pr-1">
            {tab === 'presets' && (
              <div className="grid grid-cols-5 gap-1.5 max-[760px]:grid-cols-4">
                {PRESETS.map((pr) => <button key={pr.id} type="button" onClick={() => applyPreset(pr.id)} className="ripple flex flex-col items-center gap-0.5 rounded-md border border-outline-variant p-1.5 text-center text-xs"><FolderIcon size={56} design={pr.design} /><span className="w-full truncate">{L(pr.en, pr.vi)}</span></button>)}
              </div>
            )}
            {tab === 'folder' && (<>
              <Title>{L('Style', 'Kiểu')}</Title>
              <div className="grid grid-cols-4 gap-1.5">
                {STYLES.map((s) => <button key={s.id} type="button" onClick={() => apply({ style: s.id === 'win11' ? undefined : s.id })} className={`ripple flex flex-col items-center gap-0.5 rounded-md border p-1.5 text-xs ${(cur.style ?? 'win11') === s.id ? 'border-primary bg-primary/12' : 'border-outline-variant'}`}><FolderIcon size={40} design={{ ...cur, style: s.id, vec: undefined, emoji: undefined }} />{L(s.en, s.vi)}</button>)}
              </div>
              <Title>{L('Fill', 'Tô màu')}</Title>
              <Segmented ariaLabel="fill" value={solid ? 'solid' : fill} onChange={(v) => setFill(v as FillMode)} options={[{ value: 'solid', label: L('Solid', 'Đặc') }, { value: 'linear', label: L('Linear', 'Tuyến tính') }, { value: 'radial', label: L('Radial', 'Tỏa tròn') }]} />
              <Row label={solid ? L('Color', 'Màu') : L('Color 1', 'Màu 1')}><ColorBox label="color 1" value={c1} onChange={pickColor} /></Row>
              {!solid && <Row label={L('Color 2', 'Màu 2')}><ColorBox label="color 2" value={c2} onChange={(v) => apply({ color2: v, color: c1, fill: fill })} /></Row>}
              {!solid && fill === 'linear' && <Row label={L('Angle', 'Góc')}><Slider label="angle" value={cur.angle ?? 90} min={0} max={360} step={5} width={200} format={(v) => v + '°'} onChange={(v) => apply({ angle: v, color: c1, color2: c2, fill: 'linear' })} /></Row>}
              <Title>{L('Colors', 'Màu có sẵn')}</Title>
              <div className="flex flex-wrap gap-1.5" role="radiogroup">
                {SOLID_COLORS.map((c) => <button key={c} type="button" role="radio" aria-checked={c1.toLowerCase() === c.toLowerCase()} title={c} onClick={() => pickColor(c)} className={`swatch !size-7 ${c1.toLowerCase() === c.toLowerCase() ? 'on' : ''}`} style={{ background: c }} />)}
              </div>
              <Title>{L('Gradients', 'Gradient')}</Title>
              <div className="grid grid-cols-9 gap-1.5">
                {GRADIENTS.map((g) => <button key={g.name} type="button" title={g.name} onClick={() => apply({ fill: 'linear', color: g.c1, color2: g.c2, angle: cur.angle ?? 90 })} className="swatch !size-7" style={{ background: `linear-gradient(135deg, ${g.c1}, ${g.c2})` }} />)}
              </div>
            </>)}

            {tab === 'icon' && (<>
              <Segmented ariaLabel="collection" value={coll} onChange={(v) => { setColl(v); setQ(''); }} options={[{ value: 'mdi', label: 'Material' }, { value: 'fa', label: 'Font Awesome' }, { value: 'brand', label: L('Logos', 'Logo') }, { value: 'emoji', label: 'Emoji' }]} />
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-on-surface-variant" />
                <input className="field !pl-8" value={q} placeholder={L('Search…', 'Tìm…')} aria-label="search" onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="mt-2">
                {coll === 'emoji' ? <EmojiGrid q={q} current={cur.icon} onPick={pickEmoji} /> : <IconGrid kind={coll} q={q} current={cur.icon} onPick={(k, n) => void pickVec(k, n)} />}
              </div>
              <div className="mt-3 border-t border-outline-variant pt-2">
                <Row label={L('Icon', 'Biểu tượng')}><Button tone="tonal" small icon={Ban} label={L('Remove icon', 'Bỏ biểu tượng')} disabled={!hasIcon} onClick={() => apply({ icon: undefined, vec: undefined, emoji: undefined })} /></Row>
                {!cur.emoji && <Row label={L('Icon color', 'Màu biểu tượng')}>
                  <span className="flex items-center gap-2">
                    <Segmented ariaLabel="icon color" value={colorMode} onChange={(v) => apply({ iconColor: v === 'auto' ? undefined : v === 'brand' ? 'brand' : cur.iconColor && cur.iconColor !== 'brand' && cur.iconColor !== 'auto' ? cur.iconColor : '#FFFFFF' })} options={[{ value: 'auto', label: L('Auto', 'Tự động') }, ...(brand || cur.vec?.hex ? [{ value: 'brand', label: L('Logo', 'Logo') }] : []), { value: 'custom', label: <Pipette className="size-4" /> as unknown as string }]} />
                    {colorMode === 'custom' && <ColorBox label="icon color" value={cur.iconColor || '#FFFFFF'} onChange={(v) => apply({ iconColor: v })} />}
                  </span>
                </Row>}
                <Row label={L('Backdrop', 'Nền biểu tượng')}>
                  <span className="flex items-center gap-2">
                    <Segmented ariaLabel="badge" value={cur.badge ?? 'none'} onChange={(v) => apply({ badge: v === 'none' ? undefined : v })} options={[{ value: 'none', label: L('None', 'Không') }, { value: 'circle', label: L('Circle', 'Tròn') }, { value: 'rounded', label: L('Rounded', 'Bo góc') }]} />
                    {cur.badge && cur.badge !== 'none' && <ColorBox label="badge color" value={cur.badgeColor || '#FFFFFF'} onChange={(v) => apply({ badgeColor: v })} />}
                  </span>
                </Row>
                <Row label={L('Size', 'Kích thước')}><Slider label="size" value={cur.size ?? 100} min={30} max={170} step={5} width={220} format={(v) => v + '%'} onChange={(v) => apply({ size: v === 100 ? undefined : v })} /></Row>
                <Row label={L('Opacity', 'Độ mờ')}><Slider label="opacity" value={cur.opacity ?? 1} min={0.1} max={1} step={0.05} width={220} format={(v) => Math.round(v * 100) + '%'} onChange={(v) => apply({ opacity: v === 1 ? undefined : v })} /></Row>
                <Row label={L('Offset X', 'Lệch ngang')}><Slider label="offset x" value={cur.x ?? 0} min={-60} max={60} width={220} onChange={(v) => apply({ x: v || undefined })} /></Row>
                <Row label={L('Offset Y', 'Lệch dọc')}><Slider label="offset y" value={cur.y ?? 0} min={-60} max={60} width={220} onChange={(v) => apply({ y: v || undefined })} /></Row>
              </div>
            </>)}
          </div>
        </div>
      </div>
    </Modal>
  );
}

