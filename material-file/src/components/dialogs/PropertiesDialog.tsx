import { useEffect, useState } from 'react';
import { FolderOpen, Info, X } from 'lucide-react';
import { useUI, closeModal } from '../../store/ui';
import { useT } from '../../lib/i18n';
import { api } from '../../lib/api';
import { fmtDate, fmtSize } from '../../lib/format';
import type { Drive, Entry, Props } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Buttons';
import { FileIcon } from '../FileIcon';
import { typeLabel } from '../../lib/view';
import { parentOf } from '../../lib/paths';
import { useSettings } from '../../store/settings';
import { navigate, useExplorer } from '../../store/explorer';
import { driveLabel } from '../Pages';

const Row = ({ k, v }: { k: string; v: string }) => v ? <div className="flex justify-between gap-4 py-2"><dt className="flex-none text-on-surface-variant">{k}</dt><dd className="min-w-0 text-right font-medium break-all">{v}</dd></div> : null;

export function PropertiesDialog() {
  const t = useT(); const payload = useUI((s) => s.modals.props) as { targets?: Entry[]; drive?: Drive } | undefined;
  const lang = useSettings((s) => s.lang); const id = useExplorer((s) => s.activePane);
  const [info, setInfo] = useState<Props[] | null>(null);
  const targets = payload?.targets;
  useEffect(() => {
    setInfo(null); if (!targets) return;
    let live = true;
    Promise.all(targets.slice(0, 200).map((e) => api.itemProperties(e.path).catch(() => null))).then((r) => live && setInfo(r.filter(Boolean) as Props[]));
    return () => { live = false; };
  }, [targets]);
  const d = payload?.drive;
  const one = info && info.length === 1 ? info[0] : null;
  const sum = info ? info.reduce((a, p) => ({ size: a.size + p.size, files: a.files + (p.isDir ? p.files : 1), folders: a.folders + (p.isDir ? p.folders + 1 : 0) }), { size: 0, files: 0, folders: 0 }) : null;
  const used = d ? d.total - d.free : 0; const pct = d?.total ? Math.round((used / d.total) * 100) : 0; const R = 54; const C = 2 * Math.PI * R;
  const loc = one ? parentOf(one.path) : '';
  return (
    <Modal open={!!payload} onClose={() => closeModal('props')} title={t('props.title')} icon={Info} width={480}
      footer={<>
        {one && <Button tone="tonal" icon={FolderOpen} label={t('cmd.openLocation')} onClick={() => { closeModal('props'); void navigate(id, loc || '', { select: [one.path] }); }} />}
        <Button tone="filled" icon={X} label={t('common.close')} onClick={() => closeModal('props')} data-autofocus />
      </>}>
      {d ? (
        <div className="px-6 pb-2">
          <div className="mb-4 flex items-center gap-5">
            <span className="relative grid size-32 flex-none place-items-center"><svg viewBox="0 0 128 128" className="size-32 -rotate-90"><circle cx="64" cy="64" r={R} fill="none" stroke="var(--surface-container-highest)" strokeWidth="14" />
              <circle cx="64" cy="64" r={R} fill="none" stroke={pct >= 90 ? 'var(--error)' : 'var(--primary)'} strokeWidth="14" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100} style={{ transition: 'stroke-dashoffset 1s var(--ease-emph)' }} /></svg>
              <span className="absolute text-2xl font-bold">{pct}%</span></span>
            <div className="min-w-0"><div className="truncate text-lg font-semibold">{driveLabel(d, t)}</div><div className="text-on-surface-variant">{d.fs}</div></div>
          </div>
          <dl className="divide-y divide-outline-variant/50"><Row k={t('props.used')} v={fmtSize(used, true)} /><Row k={t('props.freeSpace')} v={fmtSize(d.free, true)} /><Row k={t('props.capacity')} v={fmtSize(d.total, true)} /><Row k={t('props.location')} v={d.path} /></dl>
        </div>
      ) : !info ? <div className="space-y-3 px-6 pb-4">{[0, 1, 2, 3].map((k) => <div key={k} className="skeleton h-8" />)}</div> : (
        <div className="px-6 pb-2">
          {one && targets ? (
            <>
              <div className="mb-3 flex items-center gap-3"><span className="grid size-14 flex-none place-items-center rounded-2xl bg-surface-container-high"><FileIcon entry={targets[0]} size={32} /></span><div className="min-w-0 text-lg font-semibold break-words">{one.name}</div></div>
              <dl className="divide-y divide-outline-variant/50">
                <Row k={t('props.type')} v={typeLabel(targets[0], lang)} /><Row k={t('props.location')} v={loc || ''} />
                <Row k={t('props.size')} v={`${fmtSize(one.size, true)} (${one.size.toLocaleString()} ${t('props.bytes')})`} />
                {one.isDir && <Row k={t('props.contains')} v={t('props.containsVal', { files: one.files.toLocaleString(), folders: one.folders.toLocaleString() })} />}
                <Row k={t('props.created')} v={fmtDate(one.created, lang)} /><Row k={t('props.modified')} v={fmtDate(one.modified, lang)} /><Row k={t('props.accessed')} v={fmtDate(one.accessed, lang)} />
                <Row k={t('props.attributes')} v={[one.readonly && t('props.readonly'), one.hidden && t('props.hidden')].filter(Boolean).join(', ') || '—'} />
              </dl>
            </>
          ) : sum && (
            <><div className="mb-3 text-lg font-semibold">{t('props.multi', { n: info.length })}</div>
              <dl className="divide-y divide-outline-variant/50"><Row k={t('props.size')} v={fmtSize(sum.size, true)} /><Row k={t('props.contains')} v={t('props.containsVal', { files: sum.files.toLocaleString(), folders: sum.folders.toLocaleString() })} /></dl></>
          )}
        </div>
      )}
    </Modal>
  );
}
