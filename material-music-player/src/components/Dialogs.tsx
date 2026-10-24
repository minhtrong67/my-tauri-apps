import { useEffect, useState } from 'react';
import { tr, type Key } from '../lib/i18n';
import { Button, Chip, Icon, Modal, Slider, Switch } from './ui';
import { Cover } from './Cover';
import { useStore } from '../lib/store';
import { EQ_LABELS, EQ_PRESETS, engine } from '../lib/audio';
import { fmtSize, fmtTime } from '../lib/utils';

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

const SHORTCUTS: [string, Key][] = [
  ['Space', 'scPlay'], ['Ctrl + ← / →', 'scNextPrev'], ['← / →', 'scSeek'], ['↑ / ↓', 'scVolume'], ['M', 'scMute'], ['S', 'scShuffle'], ['R', 'scRepeat'],
  ['L', 'scLike'], ['Q', 'scQueue'], ['N', 'scNow'], ['Ctrl + F', 'scSearch'], ['F5', 'scRefresh'], ['F11', 'scFullscreen'], ['Esc', 'scExit'],
];

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
    case 'audio': return <AudioDialog onClose={close} />;
    case 'shortcuts':
      return (
        <Modal title={tr('shortcutsTitle')} onClose={close} actions={<Button variant="tonal" icon="close" onClick={close}>{tr('close')}</Button>}>
          <dl className="grid grid-cols-[150px_1fr] gap-y-2 text-body-md">
            {SHORTCUTS.map(([k, v]) => (<div key={k} className="contents"><dt><kbd className="px-2 py-0.5 rounded-md bg-surface-container-highest text-label-md">{k}</kbd></dt><dd>{tr(v)}</dd></div>))}
          </dl>
        </Modal>
      );
  }
}
