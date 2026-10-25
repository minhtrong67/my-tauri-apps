import { useEffect, useMemo, useState } from 'react';
import { tr, type Key } from '../lib/i18n';
import { Button, Chip, Icon, IconButton, Modal, Segmented, Select, Slider, Switch } from './ui';
import { LoadingIndicator, WavySeek } from './Expressive';
import { installUpdate } from '../lib/updater';
import { Cover } from './Cover';
import { useStore } from '../lib/store';
import { EQ_LABELS, EQ_PRESETS, engine } from '../lib/audio';
import { fmtSize, fmtTime } from '../lib/utils';
import { ACTIONS, RESERVED, comboFor, comboFromEvent, conflictFor, prettyCombo, type ActionId } from '../lib/keymap';
import { defaultRules, ruleTracks, rulesAreEmpty } from '../lib/smart';
import type { SmartRules } from '../lib/types';

function PromptDialog({ d, onClose }: { d: Extract<NonNullable<ReturnType<typeof useStore.getState>['dialog']>, { type: 'prompt' }>; onClose: () => void }) {
  const [v, setV] = useState(d.initial ?? '');
  const submit = () => { if (v.trim()) { d.onSubmit(v.trim()); onClose(); } };
  return (
    <Modal title={d.title} onClose={onClose} actions={<><Button variant="tonal" icon="close" onClick={onClose}>{tr('cancel')}</Button><Button icon="check" onClick={submit} disabled={!v.trim()}>{d.confirmLabel ?? tr('ok')}</Button></>}>
      <label className="block relative mt-1">
        <span className="absolute -top-2.5 left-3 px-1 bg-surface-container-high text-body-sm text-primary">{d.label}</span>
        <input autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} maxLength={80}
          className="w-full h-14 px-4 rounded bg-transparent border-2 border-primary outline-none text-body-lg text-on-surface" />
      </label>
    </Modal>
  );
}

function AddToPlaylist({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const playlists = useStore((s) => s.playlists);
  const byId = useStore((s) => s.byId);
  const { addToPlaylist, createPlaylist, showToast } = useStore.getState();
  const [name, setName] = useState('');
  const create = () => { if (!name.trim()) return; createPlaylist(name, ids); showToast(tr('playlistCreated', { name: name.trim() }), undefined, undefined, 'success'); onClose(); };
  return (
    <Modal title={tr('addToPlaylist')} onClose={onClose} actions={<Button variant="tonal" icon="close" onClick={onClose}>{tr('close')}</Button>}>
      <div className="flex gap-2 mb-3">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} placeholder={tr('newPlaylistPlaceholder')} maxLength={80}
          className="flex-1 h-12 px-4 rounded-full bg-surface-container-highest outline-none text-body-md focus:ring-2 ring-primary" />
        <Button variant="tonal" icon="add" onClick={create} disabled={!name.trim()}>{tr('create')}</Button>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {playlists.filter((p) => !p.folder || true).map((p) => (
          <button key={p.id} className="w-full h-14 px-3 rounded-xl flex items-center gap-3 hover:bg-on-surface/[.08] text-left" onClick={() => { addToPlaylist(p.id, ids); onClose(); }}>
            <Cover track={byId[p.trackIds[0]]} className="w-10 h-10 rounded-lg" iconSize={20} />
            <div className="min-w-0"><div className="truncate text-body-lg">{p.name}</div><div className="text-body-sm text-on-surface-variant">{tr('nSongs', { n: p.trackIds.length })}</div></div>
          </button>
        ))}
        {!playlists.length && <div className="text-on-surface-variant text-body-md py-6 text-center">{tr('noPlaylists')}</div>}
      </div>
    </Modal>
  );
}

function InfoDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useStore((s) => s.byId[id]);
  if (!t) return null;
  const rows: [string, string][] = [
    [tr('infoTitle'), t.title], [tr('infoArtist'), t.artist], [tr('infoAlbum'), t.album], [tr('infoGenre'), t.genre || '—'], [tr('infoYear'), t.year ? String(t.year) : '—'],
    [tr('infoDuration'), fmtTime(t.duration)], [tr('infoFormat'), t.format.toUpperCase()], [tr('infoBitrate'), t.bitrate ? `${t.bitrate} kbps` : '—'],
    [tr('infoSampleRate'), t.sampleRate ? `${(t.sampleRate / 1000).toFixed(1)} kHz` : '—'], [tr('infoSize'), fmtSize(t.size)], [tr('infoPath'), t.path],
  ];
  return (
    <Modal title={tr('songInfo')} wide onClose={onClose} actions={<Button variant="tonal" icon="close" onClick={onClose}>{tr('close')}</Button>}>
      <div className="flex gap-4 mb-4"><Cover track={t} eager className="w-28 h-28 rounded-2xl" iconSize={48} /></div>
      <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-body-md">
        {rows.map(([k, v]) => (<div key={k} className="contents"><dt className="text-on-surface-variant">{k}</dt><dd className="break-all select-text">{v}</dd></div>))}
      </dl>
    </Modal>
  );
}

function TagField({ label, value, onChange, numeric, wide }: { label: string; value: string; onChange: (v: string) => void; numeric?: boolean; wide?: boolean }) {
  return (
    <label className={`block relative ${wide ? 'col-span-2' : ''}`}>
      <span className="absolute -top-2 left-3 px-1 bg-surface-container-high text-body-sm text-on-surface-variant">{label}</span>
      <input
        value={value} inputMode={numeric ? 'numeric' : undefined} maxLength={numeric ? 4 : 200}
        onChange={(e) => onChange(numeric ? e.target.value.replace(/\D/g, '') : e.target.value)}
        className="w-full h-12 px-4 rounded-lg bg-transparent border border-outline focus:border-2 focus:border-primary outline-none text-body-lg text-on-surface select-text transition-colors"
      />
    </label>
  );
}

function EditTagsDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useStore((s) => s.byId[id]);
  const editTags = useStore((s) => s.editTags);
  // the library shows a localized "Unknown ..." placeholder for empty tags: edit them as empty
  const clean = (v: string, key: 'unknownArtist' | 'unknownAlbum') => (v === tr(key, undefined, 'en') || v === tr(key, undefined, 'vi') ? '' : v);
  const [f, setF] = useState(() => ({
    title: t?.title ?? '', artist: clean(t?.artist ?? '', 'unknownArtist'), album: clean(t?.album ?? '', 'unknownAlbum'),
    albumArtist: t?.albumArtist ?? '', genre: t?.genre ?? '', year: t?.year ? String(t.year) : '', trackNo: t?.trackNo ? String(t.trackNo) : '',
  }));
  const [busy, setBusy] = useState(false);
  if (!t) return null;
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    setBusy(true);
    const ok = await editTags(id, { ...f, year: parseInt(f.year, 10) || 0, trackNo: parseInt(f.trackNo, 10) || 0 });
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Modal
      title={tr('editTagsTitle')} wide onClose={busy ? () => undefined : onClose}
      actions={<><Button variant="tonal" icon="close" onClick={onClose} disabled={busy}>{tr('cancel')}</Button><Button icon="save" onClick={save} disabled={busy || !f.title.trim()}>{busy ? tr('lyricsSearching') : tr('saveTags')}</Button></>}
    >
      <div className="flex gap-4 mb-5 items-center">
        <Cover track={t} eager className="w-20 h-20 rounded-2xl shrink-0" iconSize={36} />
        <div className="min-w-0">
          <div className="text-title-md truncate">{t.title}</div>
          <div className="text-body-sm text-on-surface-variant break-all line-clamp-2">{t.path}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 pt-1">
        <TagField wide label={tr('infoTitle')} value={f.title} onChange={set('title')} />
        <TagField label={tr('infoArtist')} value={f.artist} onChange={set('artist')} />
        <TagField label={tr('infoAlbumArtist')} value={f.albumArtist} onChange={set('albumArtist')} />
        <TagField wide label={tr('infoAlbum')} value={f.album} onChange={set('album')} />
        <TagField label={tr('infoGenre')} value={f.genre} onChange={set('genre')} />
        <div className="grid grid-cols-2 gap-3">
          <TagField numeric label={tr('infoYear')} value={f.year} onChange={set('year')} />
          <TagField numeric label={tr('infoTrackNo')} value={f.trackNo} onChange={set('trackNo')} />
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 text-body-sm text-on-surface-variant"><Icon name="info" size={16} />{tr('tagsHint')}</p>
    </Modal>
  );
}

function UpdateDialog({ d, onClose }: { d: { version: string; notes: string; date?: string }; onClose: () => void }) {
  const showToast = useStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState({ done: 0, total: 0 });
  const go = async () => {
    setBusy(true);
    try {
      await installUpdate((done, total) => setProg({ done, total }));
    } catch (e) {
      setBusy(false);
      showToast(tr('updateFailed', { e: String(e) }), undefined, undefined, 'error');
    }
  };
  const known = prog.total > 0;
  const pct = known ? Math.min(100, Math.round((prog.done / prog.total) * 100)) : 0;
  const finished = known && prog.done >= prog.total;
  return (
    <Modal
      title={tr('updateAvailableTitle')} wide onClose={busy ? () => undefined : onClose}
      actions={<><Button variant="tonal" icon="schedule" onClick={onClose} disabled={busy}>{tr('updateLater')}</Button><Button icon="download" onClick={go} disabled={busy}>{busy ? tr('updating') : tr('updateNow')}</Button></>}
    >
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="px-3 h-8 inline-flex items-center rounded-full bg-surface-container-highest text-on-surface-variant text-label-lg">v{__APP_VERSION__}</span>
        <Icon name="chevron_right" size={20} className="text-on-surface-variant" />
        <span className="px-3 h-8 inline-flex items-center rounded-full bg-primary text-on-primary text-label-lg">v{d.version}</span>
        {d.date && <span className="text-body-sm text-on-surface-variant ml-1">{new Date(d.date).toLocaleDateString()}</span>}
      </div>
      {busy ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <LoadingIndicator size={56} />
          <div className="text-body-md text-on-surface-variant">{finished ? tr('installingUpdate') : known ? `${tr('downloadingUpdate')} ${pct}%` : tr('downloadingUpdate')}</div>
          {known && <div className="w-full pointer-events-none"><WavySeek value={prog.done} max={prog.total} playing={!finished} onChange={() => undefined} onCommit={() => undefined} label={tr('downloadingUpdate')} /></div>}
        </div>
      ) : (
        <>
          <div className="text-label-lg text-on-surface-variant mb-2">{tr('releaseNotes')}</div>
          <div className="max-h-56 overflow-y-auto rounded-2xl bg-surface-container-highest p-4 text-body-md whitespace-pre-wrap select-text">{d.notes.trim() || tr('noReleaseNotes')}</div>
        </>
      )}
    </Modal>
  );
}

function SleepDialog({ onClose }: { onClose: () => void }) {
  const sleepAt = useStore((s) => s.sleepAt);
  const eot = useStore((s) => s.sleepEndOfTrack);
  const setSleep = useStore((s) => s.setSleep);
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(i); }, []);
  const remaining = sleepAt ? Math.max(0, Math.round((sleepAt - Date.now()) / 1000)) : 0;
  const pick = (m: number | 'track' | null) => { setSleep(m); onClose(); };
  return (
    <Modal title={tr('sleepTitle')} onClose={onClose} actions={<Button variant="tonal" icon="close" onClick={onClose}>{tr('close')}</Button>}>
      {(sleepAt || eot) && (
        <div className="mb-4 p-4 rounded-2xl bg-primary-container text-on-primary-container flex items-center gap-3">
          <Icon name="bedtime" fill />
          <div className="flex-1 text-body-lg">{eot ? tr('sleepEndOfTrack') : tr('sleepRemaining', { time: fmtTime(remaining) })}</div>
          <Button variant="tonal" icon="close" onClick={() => pick(null)}>{tr('turnOff')}</Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {[15, 30, 45, 60, 90, 120].map((m) => <Chip key={m} icon="schedule" onClick={() => pick(m)}>{tr('nMinutes', { n: m })}</Chip>)}
        <Chip icon="music_note" onClick={() => pick('track')}>{tr('afterThisSong')}</Chip>
      </div>
    </Modal>
  );
}

function AudioDialog({ onClose }: { onClose: () => void }) {
  const s = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const setGain = (i: number, v: number) => { const g = [...s.eqGains]; g[i] = v; update({ eqGains: g, eqPreset: 'custom' }); };
  const fx = engine.fxAvailable;
  return (
    <Modal title={tr('audioTitle')} wide onClose={onClose} actions={<Button icon="check" onClick={onClose}>{tr('done')}</Button>}>
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1"><span className="text-title-md">{tr('playbackSpeed')}</span><span className="text-label-lg text-primary">{s.playbackRate.toFixed(2)}×</span></div>
        <Slider min={0.5} max={2} step={0.05} value={s.playbackRate} onChange={(v) => update({ playbackRate: v })} label={tr('playbackSpeed')} format={(v) => `${v.toFixed(2)}×`} />
        <div className="flex gap-2 mt-2">{[0.75, 1, 1.25, 1.5, 2].map((r) => <Chip key={r} selected={s.playbackRate === r} onClick={() => update({ playbackRate: r })}>{r}×</Chip>)}</div>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-title-md">{tr('eqTitle')}</span>
        <Switch checked={s.eqEnabled} onChange={(v) => update({ eqEnabled: v })} />
      </div>
      {!fx && <div className="mb-3 p-3 rounded-xl bg-error-container text-on-error-container text-body-md">{tr('eqUnavailable')}</div>}
      <div className={`${s.eqEnabled && fx ? '' : 'opacity-50 pointer-events-none'} transition-opacity`}>
        <div className="flex gap-2 flex-wrap mb-4">
          {Object.keys(EQ_PRESETS).map((p) => <Chip key={p} selected={s.eqPreset === p} onClick={() => update({ eqGains: EQ_PRESETS[p], eqPreset: p })}>{p === 'custom' ? tr('eqCustom') : tr(`eq_${p}` as Key)}</Chip>)}
        </div>
        <div className="flex justify-between gap-1 px-2">
          {EQ_LABELS.map((l, i) => (
            <div key={l} className="flex flex-col items-center gap-2">
              <span className="text-label-md text-on-surface-variant tabular-nums w-8 text-center">{s.eqGains[i] > 0 ? '+' : ''}{s.eqGains[i]}</span>
              <div className="relative w-6 h-36">
                <div className="absolute left-1/2 top-1/2 w-36 h-6 -translate-x-1/2 -translate-y-1/2 -rotate-90">
                  <Slider size="sm" min={-12} max={12} step={1} value={s.eqGains[i]} onChange={(v) => setGain(i, v)} label={tr('band', { l })} />
                </div>
              </div>
              <span className="text-label-md text-on-surface-variant">{l}</span>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="flex justify-between"><span className="text-title-sm">Preamp</span><span className="text-label-lg text-primary">{s.preamp > 0 ? '+' : ''}{s.preamp} dB</span></div>
          <Slider min={-12} max={12} step={1} value={s.preamp} onChange={(v) => update({ preamp: v })} label="Preamp" format={(v) => `${v > 0 ? '+' : ''}${v} dB`} />
        </div>
      </div>
    </Modal>
  );
}

const BITRATES = ['0', '128', '192', '256', '320'];
const ADDED = ['0', '7', '30', '90', '365'];
const LENGTHS = ['0', '5', '10', '20'];
const FORMATS = ['mp3', 'flac', 'wav', 'ogg', 'opus', 'm4a', 'aac'];

function SmartEditor({ id, onClose }: { id?: string; onClose: () => void }) {
  const existing = useStore((s) => s.smartLists.find((l) => l.id === id));
  const byId = useStore((s) => s.byId);
  const plays = useStore((s) => s.plays);
  const liked = useStore((s) => s.liked);
  const [name, setName] = useState(existing?.name ?? '');
  const [r, setR] = useState<SmartRules>(existing?.rules ?? defaultRules());
  const set = <K extends keyof SmartRules>(k: K, v: SmartRules[K]) => setR((p) => ({ ...p, [k]: v }));
  const count = useMemo(() => ruleTracks(r, byId, plays, liked).length, [r, byId, plays, liked]);
  const empty = rulesAreEmpty(r);
  const num = (v: string) => parseInt(v, 10) || 0;
  const save = () => {
    const { saveSmartList, nav, showToast } = useStore.getState();
    const sid = saveSmartList({ id, name, rules: r });
    showToast(tr('smartSaved'), undefined, undefined, 'success');
    nav({ name: 'smartlist', id: sid });
    onClose();
  };
  const opt = (values: string[], any: Key, one: (n: number) => string) => values.map((v) => ({ value: v, label: v === '0' ? tr(any) : one(Number(v)) }));
  return (
    <Modal
      title={id ? tr('smartEditTitle') : tr('smartNewTitle')} wide onClose={onClose}
      actions={<><Button variant="tonal" icon="close" onClick={onClose}>{tr('cancel')}</Button><Button icon="save" onClick={save} disabled={empty || !name.trim()}>{tr('save')}</Button></>}
    >
      <div className="space-y-5 pt-1">
        <TagField wide label={tr('playlistName')} value={name} onChange={setName} />
        <div className="grid grid-cols-3 gap-3">
          <TagField label={tr('smartGenre')} value={r.genre} onChange={(v) => set('genre', v)} />
          <TagField numeric label={tr('smartYearFrom')} value={r.yearFrom ? String(r.yearFrom) : ''} onChange={(v) => set('yearFrom', num(v))} />
          <TagField numeric label={tr('smartYearTo')} value={r.yearTo ? String(r.yearTo) : ''} onChange={(v) => set('yearTo', num(v))} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><div className="text-label-md text-on-surface-variant mb-1.5">{tr('smartBitrate')}</div><Select className="w-full" minWidth={150} label={tr('smartBitrate')} value={String(r.minBitrate)} onChange={(v) => set('minBitrate', num(v))} options={opt(BITRATES, 'smartAny', (n) => `≥ ${n} kbps`)} /></div>
          <div><div className="text-label-md text-on-surface-variant mb-1.5">{tr('smartAdded')}</div><Select className="w-full" minWidth={150} label={tr('smartAdded')} value={String(r.addedDays)} onChange={(v) => set('addedDays', num(v))} options={opt(ADDED, 'smartAny', (n) => tr('smartLastDays', { n }))} /></div>
          <div><div className="text-label-md text-on-surface-variant mb-1.5">{tr('smartLength')}</div><Select className="w-full" minWidth={150} label={tr('smartLength')} value={String(r.maxMinutes)} onChange={(v) => set('maxMinutes', num(v))} options={opt(LENGTHS, 'smartAny', (n) => tr('smartUnderMin', { n }))} /></div>
        </div>
        <div>
          <div className="text-label-md text-on-surface-variant mb-1.5">{tr('smartFormats')}</div>
          <div className="flex flex-wrap gap-2">{FORMATS.map((f) => <Chip key={f} selected={r.formats.includes(f)} onClick={() => set('formats', r.formats.includes(f) ? r.formats.filter((x) => x !== f) : [...r.formats, f])}>{f.toUpperCase()}</Chip>)}</div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Segmented value={r.played} onChange={(v) => set('played', v)} options={[{ value: 'any', label: tr('smartAny') }, { value: 'played', label: tr('smartPlayed'), icon: 'play_arrow' }, { value: 'unplayed', label: tr('smartNotPlayed'), icon: 'eye_off' }]} />
          <label className="inline-flex items-center gap-3 cursor-pointer select-none text-body-lg"><Switch checked={r.onlyLiked} onChange={(v) => set('onlyLiked', v)} label={tr('smartOnlyLiked')} />{tr('smartOnlyLiked')}</label>
        </div>
        <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 transition-colors ${empty ? 'bg-surface-container-highest text-on-surface-variant' : 'bg-primary-container text-on-primary-container'}`}>
          <Icon name={empty ? 'info' : 'wand'} size={20} />
          <span className="text-body-md">{empty ? tr('smartNeedRule') : tr('smartPreview', { n: count })}</span>
        </div>
      </div>
    </Modal>
  );
}

const GLOBAL_KEYS: [string, Key][] = [['Ctrl + Alt + Space', 'scPlay'], ['Ctrl + Alt + →', 'scNext'], ['Ctrl + Alt + ←', 'scPrev'], ['Ctrl + Alt + M', 'miniPlayer'], ['Ctrl + Alt + T', 'alwaysOnTop']];

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const keymap = useStore((s) => s.settings.keymap);
  const update = useStore((s) => s.updateSettings);
  const toast = useStore((s) => s.showToast);
  const [rec, setRec] = useState<ActionId | null>(null);
  useEffect(() => {
    if (!rec) return;
    const h = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.key === 'Escape') { setRec(null); return; }
      const c = comboFromEvent(e);
      if (!c) return; // only a modifier so far
      if (RESERVED.includes(c)) { toast(tr('scReserved', { k: prettyCombo(c) }), undefined, undefined, 'warning'); return; }
      const other = conflictFor(c, keymap, rec);
      if (other) { toast(tr('scConflict', { k: prettyCombo(c), a: tr(ACTIONS.find((x) => x.id === other)!.label) }), undefined, undefined, 'warning'); return; }
      const next = { ...keymap };
      if (c === ACTIONS.find((x) => x.id === rec)!.def) delete next[rec];
      else next[rec] = c;
      update({ keymap: next });
      setRec(null);
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [rec, keymap, update, toast]);
  const customized = Object.keys(keymap).length > 0;
  return (
    <Modal
      title={tr('shortcutsTitle')} wide onClose={onClose}
      actions={<><Button variant="tonal" icon="restart" disabled={!customized} onClick={() => { update({ keymap: {} }); setRec(null); }}>{tr('scResetAll')}</Button><Button icon="check" onClick={onClose}>{tr('done')}</Button></>}
    >
      <p className="text-body-md text-on-surface-variant mb-3">{tr('scHelp')}</p>
      <div className="space-y-0.5" data-recording={rec ? '' : undefined}>
        {ACTIONS.map((a) => {
          const on = rec === a.id;
          const mine = keymap[a.id] !== undefined;
          return (
            <div key={a.id} className="h-12 px-2 rounded-xl flex items-center gap-3 hover:bg-on-surface/[.05]">
              <span className="flex-1 text-body-lg truncate">{tr(a.label)}</span>
              {mine && <IconButton icon="restart" size="sm" title={tr('scReset')} onClick={() => { const n = { ...keymap }; delete n[a.id]; update({ keymap: n }); }} />}
              <button
                type="button" onClick={() => setRec(on ? null : a.id)} aria-label={`${tr(a.label)}: ${prettyCombo(comboFor(a.id, keymap))}`}
                className={`ripple min-w-[132px] h-9 px-3 rounded-lg text-label-lg tabular-nums border transition-colors focus-ring ${on ? 'border-primary bg-primary-container text-on-primary-container animate-pulse' : mine ? 'border-transparent bg-secondary-container text-on-secondary-container' : 'border-outline-variant bg-surface-container-highest text-on-surface'}`}
              >
                {on ? tr('scPress') : prettyCombo(comboFor(a.id, keymap))}
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-outline-variant/50 grid grid-cols-[150px_1fr] gap-y-2 text-body-md">
        <div className="contents"><dt><kbd className="px-2 py-0.5 rounded-md bg-surface-container-highest text-label-md">Ctrl + F</kbd></dt><dd>{tr('scSearch')}</dd></div>
        <div className="contents"><dt><kbd className="px-2 py-0.5 rounded-md bg-surface-container-highest text-label-md">Esc</kbd></dt><dd>{tr('scExit')}</dd></div>
      </div>
      <div className="mt-4 pt-3 border-t border-outline-variant/50">
        <div className="text-label-lg text-on-surface-variant mb-2">{tr('scGlobal')}</div>
        <dl className="grid grid-cols-[170px_1fr] gap-y-2 text-body-md">
          {GLOBAL_KEYS.map(([k, v]) => (<div key={k} className="contents"><dt><kbd className="px-2 py-0.5 rounded-md bg-surface-container-highest text-label-md">{k}</kbd></dt><dd>{tr(v)}</dd></div>))}
        </dl>
      </div>
    </Modal>
  );
}

export function Dialogs() {
  const d = useStore((s) => s.dialog);
  const close = () => useStore.getState().openDialog(null);
  if (!d) return null;
  switch (d.type) {
    case 'prompt': return <PromptDialog d={d} onClose={close} />;
    case 'confirm':
      return (
        <Modal title={d.title} onClose={close} actions={<><Button variant="tonal" icon="close" onClick={close}>{tr('cancel')}</Button><Button icon={d.danger ? 'delete' : 'check'} danger={d.danger} onClick={() => { d.onConfirm(); close(); }}>{d.confirmLabel ?? tr('confirm')}</Button></>}>
          <p className="text-body-lg text-on-surface-variant">{d.text}</p>
        </Modal>
      );
    case 'info': return <InfoDialog id={d.id} onClose={close} />;
    case 'addToPlaylist': return <AddToPlaylist ids={d.ids} onClose={close} />;
    case 'sleep': return <SleepDialog onClose={close} />;
    case 'editTags': return <EditTagsDialog id={d.id} onClose={close} />;
    case 'update': return <UpdateDialog d={d} onClose={close} />;
    case 'audio': return <AudioDialog onClose={close} />;
    case 'shortcuts': return <ShortcutsDialog onClose={close} />;
    case 'smartEditor': return <SmartEditor id={d.id} onClose={close} />;
  }
}
