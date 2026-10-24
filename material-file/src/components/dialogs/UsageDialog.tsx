import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, FolderOpen, HardDrive, X } from 'lucide-react';
import { closeModal, toast, useUI } from '../../store/ui';
import { useT } from '../../lib/i18n';
import { api } from '../../lib/api';
import { fmtSize } from '../../lib/format';
import type { SizeItem } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Buttons';
import { errText, navigate, useExplorer } from '../../store/explorer';
import { baseName, isVirtual, parentOf, samePath } from '../../lib/paths';
import { squarify } from '../../lib/treemap';
import { FileIcon } from '../FileIcon';

export function UsageDialog() {
  const t = useT(); const open = useUI((s) => !!s.modals.usage);
  const id = useExplorer((s) => s.activePane); const start = useExplorer((s) => s.panes[s.activePane].path);
  const [path, setPath] = useState<string | null>(null); const [items, setItems] = useState<SizeItem[] | null>(null);
  const box = useRef<HTMLDivElement>(null); const [w, setW] = useState(640);
  const root = useRef<string | null>(null);
  useEffect(() => { if (open && start && !isVirtual(start)) { root.current = start; setPath(start); } }, [open, start]);
  useEffect(() => {
    if (!open || !path) return; let live = true; setItems(null);
    api.folderSizes(path).then((r) => live && setItems(r)).catch((e) => { toast(errText(e), 'error'); if (live) setItems([]); });
    return () => { live = false; };
  }, [open, path]);
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); return () => ro.disconnect(); }, [open, items]);
  const total = items?.reduce((n, i) => n + i.size, 0) || 0;
  const H = 340;
  const rects = useMemo(() => {
    if (!items || !total) return [];
    const top = items.filter((i) => i.size / total > 0.004).slice(0, 70);
    return squarify(top.map((i) => ({ value: i.size, data: i })), 0, 0, w, H);
  }, [items, total, w]);
  const hue = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };
  const up = path && root.current && !samePath(path, root.current) ? parentOf(path) : null;
  return (
    <Modal open={open} onClose={() => closeModal('usage')} title={t('usage.title')} icon={HardDrive} width={820}
      footer={<><Button tone="tonal" icon={ArrowUp} label={t('nav.up')} disabled={!up} onClick={() => up && setPath(up)} />
        <Button tone="tonal" icon={FolderOpen} label={t('usage.openPane')} disabled={!path} onClick={() => { if (path) { closeModal('usage'); void navigate(id, path); } }} />
        <Button tone="filled" icon={X} label={t('common.close')} onClick={() => closeModal('usage')} data-autofocus /></>}>
      <div className="px-6 pb-2">
        <div className="mb-3 flex items-baseline justify-between gap-3"><span className="min-w-0 truncate font-semibold" title={path || ''}>{path ? baseName(path) : ''}</span><span className="text-on-surface-variant tabular-nums">{items ? fmtSize(total, true) : ''}</span></div>
        <div ref={box} className="relative overflow-hidden rounded-2xl bg-surface-container-high" style={{ height: H }}>
          {!items && <div className="skeleton absolute inset-0 !rounded-none" />}
          {items && !rects.length && <div className="grid h-full place-items-center text-on-surface-variant">{t('usage.empty')}</div>}
          {rects.map((r, k) => {
            const it = r.item.data; const small = r.w < 70 || r.h < 40;
            return (
              <button key={it.path} type="button" disabled={!it.isDir} onClick={() => setPath(it.path)} title={`${it.name}\n${fmtSize(it.size, true)} · ${Math.round((it.size / total) * 100)}%`}
                className="ripple absolute overflow-hidden rounded-lg p-1.5 text-left transition-[filter,border-radius] duration-300 hover:z-10 hover:rounded-2xl hover:brightness-110 anim-item"
                style={{ left: r.x + 1.5, top: r.y + 1.5, width: Math.max(0, r.w - 3), height: Math.max(0, r.h - 3), background: `oklch(${it.isDir ? 0.62 : 0.72} 0.12 ${hue(it.name)})`, color: 'oklch(0.2 0.03 260)', animationDelay: Math.min(k, 30) * 12 + 'ms' }}>
                {!small && <><span className="flex items-center gap-1.5 text-xs font-bold"><FileIcon entry={{ name: it.name, isDir: it.isDir }} size={14} /><span className="truncate">{it.name}</span></span><span className="text-[0.6875rem] font-medium opacity-80">{fmtSize(it.size, true)}</span></>}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-on-surface-variant">{t('usage.hint')}</p>
      </div>
    </Modal>
  );
}
