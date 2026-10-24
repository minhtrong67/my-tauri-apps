import { useEffect, useState } from 'react';
import { CheckCircle2, Download, RefreshCw, TriangleAlert, X } from 'lucide-react';
import { closeModal, useUI } from '../../store/ui';
import { useT } from '../../lib/i18n';
import { api } from '../../lib/api';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Buttons';
import { APP_VERSION, GITHUB_REPO } from '../../lib/constants';

interface Release { tag: string; url: string; notes: string }
const num = (v: string) => v.replace(/^v/i, '').split('.').map((x) => parseInt(x, 10) || 0);
export const isNewer = (a: string, b: string) => { const x = num(a), y = num(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };

export async function fetchLatest(): Promise<Release | null> {
  const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('http ' + r.status);
  const j = await r.json();
  return { tag: String(j.tag_name || ''), url: String(j.html_url || `https://github.com/${GITHUB_REPO}/releases`), notes: String(j.body || '') };
}

export function UpdateDialog() {
  const t = useT(); const p = useUI((s) => s.modals.update) as { manual?: boolean; release?: Release } | undefined;
  const [state, setState] = useState<'checking' | 'new' | 'latest' | 'error'>('checking'); const [rel, setRel] = useState<Release | null>(null);
  useEffect(() => {
    if (!p) return;
    if (p.release) { setRel(p.release); setState('new'); return; }
    let live = true; setState('checking');
    fetchLatest().then((r) => { if (!live) return; setRel(r); setState(r && isNewer(r.tag, APP_VERSION) ? 'new' : 'latest'); }).catch(() => live && setState('error'));
    return () => { live = false; };
  }, [p]);
  const icon = state === 'checking' ? <RefreshCw className="size-8 animate-spin" /> : state === 'new' ? <Download className="size-8" /> : state === 'latest' ? <CheckCircle2 className="size-8" /> : <TriangleAlert className="size-8" />;
  return (
    <Modal open={!!p} onClose={() => closeModal('update')} width={460} footer={<>
      <Button tone="text" icon={X} label={t('common.close')} onClick={() => closeModal('update')} />
      {state === 'new' && rel && <Button tone="filled" icon={Download} label={t('update.download')} data-autofocus onClick={() => { void api.openItem(rel.url); closeModal('update'); }} />}
    </>}>
      <div className="px-6 pt-6 pb-2 text-center">
        <div className={`mx-auto mb-4 grid size-16 place-items-center rounded-[1.4rem] ${state === 'error' ? 'bg-warning/20 text-warning' : state === 'latest' ? 'bg-success/20 text-success' : 'bg-primary-container text-on-primary-container'}`}>{icon}</div>
        <h2 className="mb-1 text-xl font-semibold">{state === 'new' ? t('update.available') : state === 'latest' ? t('update.latest') : state === 'error' ? t('update.error') : t('update.checking')}</h2>
        <p className="text-on-surface-variant">{state === 'new' && rel ? t('update.newVersion', { v: rel.tag.replace(/^v/i, ''), cur: APP_VERSION }) : state === 'latest' ? t('update.currentVersion', { cur: APP_VERSION }) : state === 'error' ? t('update.errorHint') : ''}</p>
      </div>
    </Modal>
  );
}
