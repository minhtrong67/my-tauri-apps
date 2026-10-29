import { useRef, type ReactNode } from 'react'
import {
  AppWindow, Ban, BookmarkPlus, Download, FolderOpen, FileDown, Gem, Globe, ImagePlus, Images, Laptop, LayoutTemplate, Moon, PanelTop, PaintBucket, PenTool,
  RotateCcw, Share2, Smartphone, Sparkles, Sun, Tablet, Trash2, Type, Wand2, ArrowDownToLine, ArrowRightLeft, Layers,
  type LucideIcon,
} from 'lucide-react'
import type { Editor } from '../lib/editor'
import { GRADIENTS, LOOKS, RATIOS, SOCIALS } from '../lib/presets'
import type { UserPreset } from '../lib/presetStore'
import type { BgType, Corner, FrameId, OverlayId, Params } from '../lib/types'
import { useT } from '../lib/i18n'
import { cn } from '../lib/cn'
import { Button, IconButton } from './ui/Button'
import { Card, Chip, ColorField, Field, inputCls, Segmented, Slider, Switch } from './ui/Controls'
import { Select } from './ui/Select'
import { ScrollTop } from './ui/ScrollTop'
import { Tooltip } from './ui/Tooltip'
import { LookThumb } from './LookThumb'
import { TOOLS } from './Stage'

export type Tab = 'looks' | 'bg' | 'layout' | 'frame' | 'text' | 'annotate' | 'export'
export const TABS: { id: Tab; icon: LucideIcon; label: 'tabLooks' | 'tabBg' | 'tabLayout' | 'tabFrame' | 'tabText' | 'tabAnnotate' | 'tabExport' }[] = [
  { id: 'looks', icon: Sparkles, label: 'tabLooks' }, { id: 'bg', icon: PaintBucket, label: 'tabBg' }, { id: 'layout', icon: LayoutTemplate, label: 'tabLayout' },
  { id: 'frame', icon: AppWindow, label: 'tabFrame' }, { id: 'text', icon: Type, label: 'tabText' }, { id: 'annotate', icon: PenTool, label: 'tabAnnotate' }, { id: 'export', icon: Share2, label: 'tabExport' },
]

interface Props {
  ed: Editor; version: number; tab: Tab; onTab: (t: Tab) => void; font: string
  presets: UserPreset[]; socials: string[]; onSocials: (ids: string[]) => void
  onPickBg: () => void; onPickLogo: () => void; onSavePreset: () => void; onPresetIO: () => void; onDeletePreset: (p: UserPreset) => void
  onExportPack: () => void; onBatch: () => void; onResetStyle: () => void; saveDir: string; onPickDir: () => void
}

const pct = (v: number) => Math.round(v * 100) + '%'

export function Panel(p: Props) {
  const t = useT(), { ed, tab } = p, P = ed.P
  const scroller = useRef<HTMLDivElement>(null)
  const set = (patch: Partial<Params>) => ed.setP(patch)
  const frameIcons: Record<FrameId, LucideIcon> = { none: Ban, win: AppWindow, mac: PanelTop, browser: Globe, glass: Gem, phone: Smartphone, tablet: Tablet, laptop: Laptop }
  const frameLabel: Record<FrameId, 'fNone' | 'fWin' | 'fMac' | 'fBrowser' | 'fGlass' | 'fPhone' | 'fTablet' | 'fLaptop'> = { none: 'fNone', win: 'fWin', mac: 'fMac', browser: 'fBrowser', glass: 'fGlass', phone: 'fPhone', tablet: 'fTablet', laptop: 'fLaptop' }
  const ratioOpts = RATIOS.map((r) => ({ value: r as string, label: r === 'auto' ? t('auto') : r === 'custom' ? t('custom') : r }))
  const sel = ed.selected

  const body: Record<Tab, ReactNode> = {
    looks: (
      <>
        <div className="grid grid-cols-2 gap-2.5">
          {LOOKS.map((l, i) => (
            <button key={l.id} type="button" aria-pressed={Object.entries(l.params).every(([k, v]) => P[k as keyof Params] === v)} onClick={() => ed.applyLook(l)} style={{ ['--i' as string]: i }}
              className={cn('sl morph sq group overflow-hidden border bg-surface-container-lowest p-1.5 text-left transition-transform hover:-translate-y-0.5', Object.entries(l.params).every(([k, v]) => P[k as keyof Params] === v) ? 'border-primary ring-2 ring-primary/40' : 'border-outline-variant')}>
              <div className="overflow-hidden rounded-xl"><LookThumb params={l.params} font={p.font} /></div>
              <div className="px-1.5 pb-0.5 pt-1.5 text-[0.78rem] font-semibold">{l.id}</div>
            </button>
          ))}
        </div>
        <Button variant="text" size="sm" icon={RotateCcw} onClick={p.onResetStyle}>{t('resetStyle')}</Button>
        <Card title={t('myStyles')} icon={BookmarkPlus}>
          <div className="flex flex-col gap-2">
            {p.presets.length === 0 && <p className="text-[0.8rem] text-on-surface-variant">{t('noPresets')}</p>}
            <div className="grid grid-cols-2 gap-2.5">
              {p.presets.map((u) => (
                <div key={u.id} className="relative">
                  <button type="button" onClick={() => ed.setP(u.params)} className="sl morph sq w-full overflow-hidden border border-outline-variant bg-surface-container-lowest p-1.5 text-left">
                    <div className="overflow-hidden rounded-xl"><LookThumb params={u.params} font={p.font} /></div>
                    <div className="truncate px-1.5 pb-0.5 pt-1.5 pr-8 text-[0.78rem] font-semibold">{u.name}</div>
                  </button>
                  <div className="absolute bottom-1 right-1"><IconButton size="sm" variant="danger" icon={Trash2} label={t('delete')} onClick={() => p.onDeletePreset(u)} /></div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="filled" size="sm" icon={BookmarkPlus} onClick={p.onSavePreset}>{t('saveStyle')}</Button>
              <Button variant="tonal" size="sm" icon={ArrowRightLeft} onClick={p.onPresetIO}>{t('importExport')}</Button>
            </div>
          </div>
        </Card>
      </>
    ),

    bg: (
      <>
        <Card>
          <div className="flex flex-wrap gap-1.5">
            {([['gradient', 'bgGradient'], ['mesh', 'bgMesh'], ['solid', 'bgSolid'], ['image', 'bgImage'], ['none', 'bgNone']] as [BgType, 'bgGradient' | 'bgMesh' | 'bgSolid' | 'bgImage' | 'bgNone'][]).map(([v, l]) => (
              <Chip key={v} selected={P.bg === v} onClick={() => set({ bg: v })}>{t(l)}</Chip>
            ))}
          </div>
        </Card>
        {(P.bg === 'gradient' || P.bg === 'mesh') && (
          <Card title={P.bg === 'mesh' ? t('bgMesh') : t('bgGradient')} icon={PaintBucket}>
            <div className="flex flex-col gap-3.5">
              <div className="grid grid-cols-7 gap-2">
                {GRADIENTS.map(([a, b]) => {
                  const on = P.c1 === a && P.c2 === b && !P.use3
                  return <button key={a + b} type="button" aria-label={`${a} ${b}`} onClick={() => set({ c1: a, c2: b, use3: false })} className={cn('h-9 rounded-xl transition-all duration-300 ease-[var(--ease-spring)] hover:scale-110', on && 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-surface-container')} style={{ background: `linear-gradient(135deg,${a},${b})` }} />
                })}
              </div>
              <Button variant="tertiary" size="sm" icon={Wand2} onClick={() => ed.autoBackground()} disabled={!ed.has}>{t('autoBg')}</Button>
              <Slider label={t('angle')} value={P.angle} min={0} max={360} format={(v) => v + '°'} onChange={(v) => set({ angle: v })} />
              <div className="grid grid-cols-2 gap-3"><ColorField label={t('color1')} value={P.c1} onChange={(v) => set({ c1: v })} /><ColorField label={t('color2')} value={P.c2} onChange={(v) => set({ c2: v })} /></div>
              <Switch checked={P.use3} onChange={(v) => set({ use3: v })} label={t('use3')} />
              {P.use3 && <ColorField label={t('color3')} value={P.c3} onChange={(v) => set({ c3: v })} />}
            </div>
          </Card>
        )}
        {P.bg === 'solid' && <Card><ColorField label={t('color')} value={P.solid} onChange={(v) => set({ solid: v })} /></Card>}
        {P.bg === 'image' && (
          <Card><div className="flex flex-col gap-3"><Button variant="tonal" icon={ImagePlus} onClick={p.onPickBg}>{t('pickBg')}</Button><Slider label={t('blur')} value={P.blur} min={0} max={40} onChange={(v) => set({ blur: v })} /></div></Card>
        )}
        {P.bg !== 'none' && (
          <Card title={t('overlay')} icon={Layers}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {([['none', 'ovNone'], ['dots', 'ovDots'], ['grid', 'ovGrid'], ['grain', 'ovGrain']] as [OverlayId, 'ovNone' | 'ovDots' | 'ovGrid' | 'ovGrain'][]).map(([v, l]) => <Chip key={v} selected={P.overlay === v} onClick={() => set({ overlay: v })}>{t(l)}</Chip>)}
              </div>
              {P.overlay !== 'none' && <Slider label={t('opacity')} value={P.ovAlpha} min={0.05} max={1} step={0.05} format={pct} onChange={(v) => set({ ovAlpha: v })} />}
            </div>
          </Card>
        )}
      </>
    ),

    layout: (
      <>
        <Card title={t('secLayout')} icon={LayoutTemplate}>
          <div className="flex flex-col gap-3.5">
            <Slider label={t('pad')} value={P.pad} min={0} max={240} step={2} onChange={(v) => set({ pad: v })} />
            <Slider label={t('radius')} value={P.radius} min={0} max={64} onChange={(v) => set({ radius: v })} />
            <Field label={t('ratio')}><Select label={t('ratio')} value={P.ratio} options={ratioOpts} onChange={(v) => set({ ratio: v })} /></Field>
            {P.ratio === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('width')}><input className={inputCls} type="number" min={16} max={8000} value={P.cw} onChange={(e) => set({ cw: +e.target.value || 16 })} /></Field>
                <Field label={t('height')}><input className={inputCls} type="number" min={16} max={8000} value={P.ch} onChange={(e) => set({ ch: +e.target.value || 16 })} /></Field>
              </div>
            )}
          </div>
        </Card>
        <Card title={t('shadow')}>
          <div className="flex flex-col gap-3.5">
            <Switch checked={P.shOn} onChange={(v) => set({ shOn: v })} label={t('shadow')} />
            {P.shOn && (<>
              <Slider label={t('shBlur')} value={P.shBlur} min={0} max={150} onChange={(v) => set({ shBlur: v })} />
              <Slider label={t('opacity')} value={P.shAlpha} min={0} max={1} step={0.05} format={pct} onChange={(v) => set({ shAlpha: v })} />
              <Slider label={t('shY')} value={P.shY} min={-60} max={100} onChange={(v) => set({ shY: v })} />
              <ColorField label={t('color')} value={P.shColor} onChange={(v) => set({ shColor: v })} />
            </>)}
          </div>
        </Card>
        <Card title={t('border')}>
          <div className="flex flex-col gap-3.5">
            <Slider label={t('border')} value={P.bdW} min={0} max={16} onChange={(v) => set({ bdW: v })} />
            {P.bdW > 0 && (<><ColorField label={t('bdColor')} value={P.bdColor} onChange={(v) => set({ bdColor: v })} /><Slider label={t('opacity')} value={P.bdA} min={0} max={1} step={0.05} format={pct} onChange={(v) => set({ bdA: v })} /></>)}
          </div>
        </Card>
        <Card title={t('tilt')}>
          <div className="flex flex-col gap-3.5">
            <Slider label={t('rotate')} value={P.rot} min={-20} max={20} format={(v) => v + '°'} onChange={(v) => set({ rot: v })} />
            <Slider label={t('skew')} value={P.skew} min={-25} max={25} format={(v) => v + '°'} onChange={(v) => set({ skew: v })} />
            {(P.rot !== 0 || P.skew !== 0) && <Button variant="text" size="sm" icon={RotateCcw} onClick={() => set({ rot: 0, skew: 0 })}>{t('reset')}</Button>}
          </div>
        </Card>
      </>
    ),

    frame: (
      <>
        <Card>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(frameIcons) as FrameId[]).map((f) => {
              const I = frameIcons[f], on = P.frame === f
              return (
                <button key={f} type="button" aria-pressed={on} onClick={() => set({ frame: f })}
                  className={cn('sl morph sq flex h-12 items-center gap-2.5 border px-3.5 text-[0.82rem] font-medium', on ? 'border-secondary-container bg-secondary-container text-on-secondary-container' : 'border-outline-variant text-on-surface-variant')}>
                  <I size={18} /><span className="truncate">{t(frameLabel[f])}</span>
                </button>
              )
            })}
          </div>
        </Card>
        {P.frame !== 'none' && P.frame !== 'glass' && (
          <Card>
            <div className="flex flex-col gap-3.5">
              <Segmented value={P.ftheme} onChange={(v) => set({ ftheme: v })} options={[{ value: 'light', label: t('fLight'), icon: Sun }, { value: 'dark', label: t('fDark'), icon: Moon }]} />
              {['win', 'mac', 'browser'].includes(P.frame) && <Field label={t('fTitle')}><input className={inputCls} value={P.ftitle} placeholder={P.frame === 'browser' ? 'example.com' : ''} onChange={(e) => set({ ftitle: e.target.value })} /></Field>}
            </div>
          </Card>
        )}
      </>
    ),

    text: (
      <>
        <Card title={t('secCap')} icon={Type}>
          <div className="flex flex-col gap-3.5">
            <Field label={t('capText')}><input className={inputCls} value={P.cap} onChange={(e) => set({ cap: e.target.value })} /></Field>
            {P.cap && (<>
              <Segmented value={P.capPos} onChange={(v) => set({ capPos: v })} options={[{ value: 'top', label: t('capTop') }, { value: 'bottom', label: t('capBottom') }]} />
              <Slider label={t('size')} value={P.capSize} min={10} max={64} onChange={(v) => set({ capSize: v })} />
              <ColorField label={t('color')} value={P.capColor} onChange={(v) => set({ capColor: v })} />
            </>)}
          </div>
        </Card>
        <Card title={t('secWm')} icon={Images}>
          <div className="flex flex-col gap-3.5">
            <Segmented value={P.wmType} onChange={(v) => set({ wmType: v })} options={[{ value: 'text', label: t('wmText') }, { value: 'logo', label: t('wmLogo') }]} />
            {P.wmType === 'text' ? <Field label={t('capText')}><input className={inputCls} value={P.wm} placeholder="@minhtrong67" onChange={(e) => set({ wm: e.target.value })} /></Field>
              : <Button variant="tonal" icon={ImagePlus} onClick={p.onPickLogo}>{t('pickLogo')}</Button>}
            <Field label={t('position')}>
              <Select label={t('position')} value={P.wmPos} onChange={(v) => set({ wmPos: v as Corner })} options={([['tl', 'posTL'], ['tr', 'posTR'], ['bl', 'posBL'], ['br', 'posBR'], ['c', 'posC']] as const).map(([v, l]) => ({ value: v, label: t(l) }))} />
            </Field>
            <Slider label={t('size')} value={P.wmSize} min={8} max={64} onChange={(v) => set({ wmSize: v })} />
            <Slider label={t('opacity')} value={P.wmAlpha} min={0.1} max={1} step={0.05} format={pct} onChange={(v) => set({ wmAlpha: v })} />
            {P.wmType === 'text' && <ColorField label={t('color')} value={P.wmColor} onChange={(v) => set({ wmColor: v })} />}
          </div>
        </Card>
      </>
    ),

    annotate: (
      <>
        <Card>
          <div className="grid grid-cols-5 gap-1.5">
            {TOOLS.map((o) => <IconButton key={o.id} icon={o.icon} label={t(o.label)} shortcut={o.key} selected={ed.tool === o.id} onClick={() => ed.setTool(o.id)} className="!h-11 !w-full" />)}
          </div>
          <p className="mt-3 text-[0.78rem] leading-snug text-on-surface-variant">{t('annHint')}</p>
        </Card>
        <Card>
          <div className="flex flex-col gap-3.5">
            <ColorField label={t('color')} value={sel ? sel.c : P.ac} onChange={(v) => { set({ ac: v }); if (sel) ed.patchSelected({ c: v }) }} />
            <Slider label={t('stroke')} value={sel && 'lw' in sel && sel.lw ? sel.lw : P.alw} min={1} max={16} onChange={(v) => { set({ alw: v }); if (sel && sel.lw) ed.patchSelected({ lw: v }) }} />
            <Slider label={t('size')} value={sel && (sel.t === 'text' || sel.t === 'step') ? sel.size : P.asz} min={12} max={96} onChange={(v) => { set({ asz: v }); if (sel && (sel.t === 'text' || sel.t === 'step')) ed.patchSelected({ size: v }) }} />
            <Slider label={t('pixel')} value={sel && sel.t === 'blur' ? sel.px : P.apx} min={4} max={40} onChange={(v) => { set({ apx: v }); if (sel && sel.t === 'blur') ed.patchSelected({ px: v }) }} />
            <Switch checked={sel && sel.t === 'text' ? sel.bg : P.textBg} onChange={(v) => { set({ textBg: v }); if (sel && sel.t === 'text') ed.patchSelected({ bg: v }) }} label={t('textBg')} />
          </div>
        </Card>
        <div className="flex flex-wrap gap-2">
          <Button variant="dangerTonal" size="sm" icon={Trash2} disabled={ed.selId == null} onClick={() => ed.deleteSelected()}>{t('deleteSel')}</Button>
          <Button variant="tonal" size="sm" icon={Trash2} disabled={!ed.ann.length} onClick={() => ed.clearAnn()}>{t('clearAnn')}</Button>
        </div>
      </>
    ),

    export: (
      <>
        <Card title={t('secExp')} icon={FileDown}>
          <div className="flex flex-col gap-3.5">
            <Segmented value={P.fmt} onChange={(v) => set({ fmt: v })} options={[{ value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPEG' }, { value: 'webp', label: 'WebP' }]} />
            {P.fmt !== 'png' && <Slider label={t('quality')} value={P.q} min={0.5} max={1} step={0.01} format={pct} onChange={(v) => set({ q: v })} />}
            <Field label={t('scale')}><Segmented value={P.sc} onChange={(v) => set({ sc: v })} options={[{ value: 1, label: '1x' }, { value: 2, label: '2x' }, { value: 3, label: '3x' }]} /></Field>
            {ed.has && <p className="text-[0.8rem] text-on-surface-variant">{t('outSize')}: <b className="text-on-surface">{ed.outputSize().w} × {ed.outputSize().h} px</b></p>}
          </div>
        </Card>
        <Card title={t('sSave')} icon={FolderOpen}>
          <div className="flex flex-col gap-3">
            <div className="rounded-xl bg-surface-container-high px-3.5 py-2.5 text-[0.8rem]"><span className="block truncate" dir="rtl"><bdi>{p.saveDir || t('saveDefault')}</bdi></span></div>
            <Button variant="tonal" size="sm" icon={FolderOpen} onClick={p.onPickDir} className="self-start">{t('changeFolder')}</Button>
          </div>
        </Card>
        <Card title={t('socialPack')} icon={Share2}>
          <div className="flex flex-col gap-3">
            <p className="text-[0.78rem] text-on-surface-variant">{t('socialHint')}</p>
            <div className="flex flex-wrap gap-1.5">
              {SOCIALS.map((s) => (
                <Tooltip key={s.id} label={`${s.w} × ${s.h}`}><Chip selected={p.socials.includes(s.id)} onClick={() => p.onSocials(p.socials.includes(s.id) ? p.socials.filter((x) => x !== s.id) : [...p.socials, s.id])}>{t(('soc_' + s.id) as 'soc_og')}</Chip></Tooltip>
              ))}
            </div>
            <Button variant="filled" icon={Download} disabled={!ed.has || !p.socials.length} onClick={p.onExportPack}>{t('exportSelected', { n: p.socials.length })}</Button>
          </div>
        </Card>
        <Card title={t('batch')} icon={ArrowDownToLine}>
          <p className="mb-3 text-[0.78rem] text-on-surface-variant">{t('batchHint')}</p>
          <Button variant="tertiary" icon={Images} onClick={p.onBatch}>{t('batchOpen')}</Button>
        </Card>
      </>
    ),
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div role="tablist" aria-label="Options" className="flex gap-1 px-2.5 pb-2 pt-2.5">
        {TABS.map((x) => {
          const on = x.id === tab, I = x.icon
          return (
            <Tooltip key={x.id} label={t(x.label)} className="inline-flex flex-1">
              <button type="button" role="tab" aria-selected={on} aria-label={t(x.label)} onClick={() => p.onTab(x.id)}
                className={cn('sl morph flex h-11 flex-1 items-center justify-center transition-[flex,background-color,color] duration-300', on ? 'sq bg-primary text-on-primary elev-1' : 'text-on-surface-variant')}>
                <I size={20} strokeWidth={on ? 2.3 : 2} />
              </button>
            </Tooltip>
          )
        })}
      </div>
      <div className="relative min-h-0 flex-1">
        <div ref={scroller} className="h-full overflow-y-auto px-3 pb-4 pt-1">
          <h2 className="mb-2.5 px-1.5 text-[1.15rem] font-semibold tracking-tight">{t(TABS.find((x) => x.id === tab)!.label)}</h2>
          <div key={tab} className="stagger flex flex-col gap-3">
            {(Array.isArray(body[tab]) ? (body[tab] as ReactNode[]) : [body[tab]]).map((n, i) => <div key={i} style={{ ['--i' as string]: i }} className="contents">{n}</div>)}
          </div>
        </div>
        <ScrollTop target={scroller} label={t('scrollTop')} />
      </div>
    </div>
  )
}

