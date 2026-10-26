import { useState } from 'react';
import { AlertTriangle, Check, Copy, Download, MapPin, Maximize2, Monitor, Moon, Save, Upload, Settings, Sun, Trash2, X } from 'lucide-react';
import { COLORS, mins, pad, t, uid, type Ev } from '../lib/core';
import { dup, remove, setS, toast, upsert, useStore } from '../lib/store';
import { FONTS, PRESETS } from '../lib/theme';
import { exportEvents, importEvents } from '../lib/data';
import { captureSize } from '../lib/window';
import { Btn, IconBtn, Modal, Select, Seg, Switch } from './ui';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block"><span className="text-xs font-semibold text-variant px-1">{label}</span>{children}</label>;
const tm = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

export function EventSheet({ init, onClose }: { init: { id?: string; date: string; start?: number }; onClose: () => void }) {
  const { events } = useStore(); const ex = init.id ? events.find((e) => e.id === init.id) : undefined, s0 = init.start ?? 540;
  const [f, setF] = useState<Ev>(() => ex ?? { id: '', title: '', loc: '', desc: '', date: init.date, allDay: false, start: tm(s0), end: tm(Math.min(s0 + 60, 1439)), color: COLORS[0], repeat: 'none', remind: -1 });
  const [ask, setAsk] = useState(false);
  const [bad, setBad] = useState(false); const up = (p: Partial<Ev>) => setF((x) => ({ ...x, ...p }));
  const save = () => {
    if (!f.title.trim()) { setBad(true); return toast('error', t('needTitle')); }
    if (!f.allDay && f.end && mins(f.end) <= mins(f.start)) return toast('warning', t('badTime'));
    upsert({ ...f, title: f.title.trim(), id: f.id || uid() }); toast('success', t('saved')); onClose();
  };
  return (
    <Modal side onClose={onClose}>
      <div className="flex items-center justify-between p-5 pb-2"><h2 className="text-2xl font-extrabold">{ex ? t('editEvent') : t('newEvent')}</h2><IconBtn tip={t('close')} onClick={onClose}><X /></IconBtn></div>
      <div className="flex-1 overflow-auto px-5 py-2 space-y-3">
        <Field label={t('title')}><input autoFocus className={`inp ${bad ? 'border-[#b3261e]' : ''}`} value={f.title} maxLength={120} onChange={(e) => { setBad(false); up({ title: e.target.value }); }} /></Field>
        <Field label={t('loc')}><div className="relative"><MapPin className="absolute left-4 top-3.5 size-5 text-variant" /><input className="inp !pl-11" value={f.loc} onChange={(e) => up({ loc: e.target.value })} /></div></Field>
        <div className="flex items-end gap-3"><div className="flex-1"><Field label={t('date')}><input type="date" className="inp" value={f.date} onChange={(e) => up({ date: e.target.value })} /></Field></div>
          <label className="flex items-center gap-2 h-12 font-medium">{t('allDay')}<Switch on={f.allDay} onChange={(v) => up({ allDay: v })} /></label></div>
        {!f.allDay && <div className="grid grid-cols-2 gap-3"><Field label={t('start')}><input type="time" className="inp" value={f.start} onChange={(e) => up({ start: e.target.value })} /></Field>
          <Field label={t('end')}><input type="time" className="inp" value={f.end} onChange={(e) => up({ end: e.target.value })} /></Field></div>}
        <Field label={t('repeat')}><Select value={f.repeat} onChange={(v) => up({ repeat: v })} options={['none', 'daily', 'weekly', 'monthly', 'yearly'].map((r) => [r, t('r.' + r)] as [string, string])} /></Field>
        {!f.allDay && <Field label={t('remind')}><Select value={String(f.remind)} onChange={(v) => up({ remind: Number(v) })} options={[-1, 0, 5, 15, 30, 60].map((r) => [String(r), t('rm.' + r)] as [string, string])} /></Field>}
        <div className="flex gap-2 flex-wrap">{COLORS.map((c) => <button key={c} aria-label={c} onClick={() => up({ color: c })} style={{ background: c }} className={`size-8 morph press ${f.color === c ? 'rounded-xl ring-2 ring-offset-2 ring-offset-[var(--surface-container-high)] ring-[var(--on-surface)]' : 'rounded-full'}`} />)}</div>
        <Field label={t('desc')}><textarea className="inp" value={f.desc} onChange={(e) => up({ desc: e.target.value })} /></Field>
      </div>
      <div className="p-4 flex flex-wrap gap-2 justify-end border-t border-ov">
        {ex && <><Btn v="danger" icon={<Trash2 className="size-4" />} onClick={() => setAsk(true)}>{t('delete')}</Btn>
          <Btn v="tonal" icon={<Copy className="size-4" />} onClick={() => { dup(f); toast('success', t('duplicated')); onClose(); }}>{t('duplicate')}</Btn></>}
        <span className="flex-1" /><Btn icon={<X className="size-4" />} onClick={onClose}>{t('cancel')}</Btn><Btn v="filled" icon={<Save className="size-4" />} onClick={save}>{t('save')}</Btn>
      </div>
      {ask && ex && <Modal onClose={() => setAsk(false)}><div className="p-6 text-center space-y-3"><span className="mx-auto size-14 grid place-items-center rounded-3xl bg-[#ffdad6] text-[#b3261e]"><AlertTriangle className="size-7" /></span>
        <h3 className="text-xl font-extrabold">{t('confirmDel')}</h3><p className="text-variant">{t('confirmHint')}</p>
        <div className="flex gap-2 justify-center pt-2"><Btn icon={<X className="size-4" />} onClick={() => setAsk(false)}>{t('cancel')}</Btn><Btn v="danger" icon={<Trash2 className="size-4" />} onClick={() => { remove(ex.id); onClose(); }}>{t('delete')}</Btn></div></div></Modal>}
    </Modal>
  );
}

const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => <div className="flex items-center justify-between gap-4 flex-wrap"><div><b>{label}</b>{hint && <small className="block text-variant">{hint}</small>}</div><div className="min-w-[200px]">{children}</div></div>;
const Card = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="rounded-3xl bg-card p-5 space-y-4"><h3 className="text-sm font-bold text-primary">{title}</h3>{children}</section>;

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { s } = useStore();
  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-3 p-5 pb-3"><span className="size-11 grid place-items-center rounded-2xl bg-pc text-onpc"><Settings /></span><h2 className="text-2xl font-extrabold flex-1">{t('settings')}</h2><IconBtn tip={t('close')} onClick={onClose}><X /></IconBtn></div>
      <div className="overflow-auto p-5 pt-2 space-y-3">
        <Card title={t('appearance')}>
          <Row label={t('theme')}><Seg value={s.theme} onChange={(v) => setS({ theme: v })} options={[['system', <Monitor className="size-4" />], ['light', <Sun className="size-4" />], ['dark', <Moon className="size-4" />]]} /></Row>
          <div><b>{t('color')}</b><div className="flex flex-wrap gap-3 mt-2">{PRESETS.map((c) => <button key={c} aria-label={c} onClick={() => setS({ seed: c })} style={{ background: c }} className={`size-10 morph press grid place-items-center text-white ${s.seed === c ? 'rounded-2xl' : 'rounded-full'}`}>{s.seed === c && <Check className="size-5" />}</button>)}
            <label title={t('custom')} className="size-10 rounded-full overflow-hidden cursor-pointer ring-2 ring-ov" style={{ background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' }}><input type="color" className="opacity-0 size-full" value={s.seed} onChange={(e) => setS({ seed: e.target.value })} /></label></div></div>
          <Row label={t('language')}><Seg value={s.lang} onChange={(v) => setS({ lang: v })} options={[['auto', 'Auto'], ['en', 'EN'], ['vi', 'VI']]} /></Row>
          <Row label={t('font')}><Select value={s.font} onChange={(v) => setS({ font: v })} options={Object.entries(FONTS).map(([k, v]) => [k, v[0]] as [string, string])} /></Row>
          <Row label={t('size')} hint={t('sizeHint')}><Seg value={s.size} onChange={(v) => setS({ size: v })} options={[['sm', t('sm')], ['md', t('md')], ['lg', t('lg')]]} /></Row>
        </Card>
        <Card title={t('window')}><div className="grid sm:grid-cols-2 gap-3">{([['remember', 'rememberD', Save], ['maximized', 'maximizedD', Maximize2]] as const).map(([k, d, Ic]) => (
          <button key={k} onClick={() => { setS({ windowMode: k }); if (k === 'remember') captureSize((z) => setS({ winSize: z })); }} className={`text-left p-4 flex gap-3 items-start morph press ${s.windowMode === k ? 'bg-pc text-onpc rounded-[28px]' : 'bg-cont rounded-2xl'}`}>
            <Ic className="size-5 mt-0.5" /><span><b className="block">{t(k)}</b><small className="opacity-80">{t(d)}</small></span></button>))}</div></Card>
        <Card title={t('calendar')}>
          <Row label={t('weekStart')}><Seg value={s.weekStart} onChange={(v) => setS({ weekStart: v })} options={[[1, t('mon')], [0, t('sun')]]} /></Row>
          <Row label={t('timeFmt')}><Seg value={s.timeFmt} onChange={(v) => setS({ timeFmt: v })} options={[['24', '24h'], ['12', '12h']]} /></Row>
          <Row label={t('lunar')}><Switch on={s.lunar} onChange={(v) => setS({ lunar: v })} /></Row>
          <Row label={t('notify')}><Switch on={s.notify} onChange={(v) => setS({ notify: v })} /></Row>
        </Card>
        <Card title={t('data')}><div className="flex gap-3 flex-wrap"><Btn v="tonal" icon={<Download className="size-4" />} onClick={exportEvents}>{t('export')}</Btn><Btn v="tonal" icon={<Upload className="size-4" />} onClick={importEvents}>{t('import')}</Btn></div></Card>
        <Card title={t('about')}><div className="flex items-center gap-4"><img src="/icon.png" className="size-14" alt="" /><div><b>Material Calendar</b> <small className="text-variant">v1.0.0</small>
          <p className="text-sm">{t('author')}: <span className="px-2 rounded-lg bg-pc text-onpc font-bold">minhtrong67</span> · {t('assist')} <span className="px-2 rounded-lg bg-sc text-onsc font-bold">Claude</span></p></div></div></Card>
      </div>
    </Modal>
  );
}
