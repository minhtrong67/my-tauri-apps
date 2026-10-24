import { useEffect, useState } from 'react';
import { PanelRightClose } from 'lucide-react';
import { useExplorer, getView, previewEntry, selectedEntries } from '../store/explorer';
import { useSettings } from '../store/settings';
import { useT } from '../lib/i18n';
import { api } from '../lib/api';
import { fmtDate, fmtSize } from '../lib/format';
import { extOf, isVirtual, parentOf, pk } from '../lib/paths';
import { isRaster, isSvg, catOf } from '../lib/fileTypes';
import { typeLabel } from '../lib/view';
import { FileIcon, Thumb } from './FileIcon';
import { IconButton } from './ui/Buttons';
import { TAGS } from '../lib/menus';
import type { Entry } from '../lib/types';

const TEXT_EXT = new Set(['txt', 'md', 'json', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'xml', 'yml', 'yaml', 'toml', 'ini', 'log', 'csv', 'rs', 'py', 'sh', 'bat', 'sql', 'c', 'cpp', 'h', 'java', 'go', 'vue', 'tsv']);
const Row = ({ k, v }: { k: string; v: string }) => v ? <div className="flex justify-between gap-3 py-1.5"><dt className="text-on-surface-variant">{k}</dt><dd className="min-w-0 text-right font-medium break-words">{v}</dd></div> : null;

function TextPreview({ e }: { e: Entry }) {
  const [txt, setTxt] = useState<string | null>(null);
  useEffect(() => { let live = true; setTxt(null); api.previewText(e.path).then((r) => live && setTxt(r)).catch(() => live && setTxt('')); return () => { live = false; }; }, [e.path]);
  if (txt === null) return <div className="skeleton h-32" />;
  return txt ? <pre className="max-h-64 overflow-auto rounded-2xl bg-surface-container p-3 font-mono text-xs leading-5 whitespace-pre-wrap break-words select-text">{txt}</pre> : null;
}

export function DetailsPane() {
  const t = useT(); const S = useSettings();
  const id = useExplorer((s) => s.activePane); const path = useExplorer((s) => s.panes[s.activePane].path);
  const selected = useExplorer((s) => s.panes[s.activePane].selected); const entries = useExplorer((s) => s.panes[s.activePane].entries);
  const sel = selectedEntries(id); void selected; void entries;
  const one = sel.length === 1 ? sel[0] : null;
  const total = sel.reduce((n, e) => n + (e.isDir ? 0 : e.size), 0);
  const list = path && !isVirtual(path) ? getView(id).list : [];
  return (
    <aside aria-label={t('details.aria')} className="flex w-[19rem] flex-none flex-col overflow-y-auto bg-surface-container p-3 max-[1000px]:w-64 anim-slide">
      <div className="mb-2 flex items-center justify-between px-1"><h3 className="text-sm font-bold tracking-wide text-primary uppercase">{t('details.title')}</h3><IconButton icon={PanelRightClose} label={t('details.close')} kbd="Alt+P" small onClick={() => S.set({ showDetails: false })} /></div>
      {one ? (
        <div className="card p-4" key={one.path}>
          <button type="button" onClick={() => previewEntry(one)} disabled={one.isDir} className="mx-auto mb-3 grid size-40 place-items-center overflow-hidden rounded-3xl bg-surface-container-high transition-[border-radius,transform] duration-500 ease-spring enabled:hover:scale-[1.03] enabled:hover:rounded-[2rem]">
            {one.isDir ? <FileIcon entry={one} size={72} /> : <Thumb entry={one} size={320} iconSize={64} big enabled={S.thumbnails && (isRaster(one) || isSvg(one))} />}
          </button>
          <h4 className="mb-3 text-center text-base font-semibold break-words">{one.name}</h4>
          <dl className="divide-y divide-outline-variant/50">
            <Row k={t('props.type')} v={typeLabel(one, S.lang)} />
            <Row k={t('col.size')} v={one.isDir ? '' : fmtSize(one.size, true)} />
            <Row k={t('col.modified')} v={fmtDate(one.modified, S.lang)} />
            <Row k={t('col.created')} v={fmtDate(one.created, S.lang)} />
            <Row k={t('props.location')} v={parentOf(one.path) || ''} />
          </dl>
          {(S.tags[pk(one.path)] || []).length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{(S.tags[pk(one.path)] || []).map((x) => { const tg = TAGS.find((y) => y.id === x)!; return <span key={x} className="flex items-center gap-1.5 rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs font-medium"><i className="tag-dot !size-2.5" style={{ background: tg.color }} />{t(tg.key)}</span>; })}</div>}
          {!one.isDir && (TEXT_EXT.has(extOf(one.name)) || catOf(one) === 'text') && one.size < 5e6 && <div className="mt-3"><TextPreview e={one} /></div>}
        </div>
      ) : sel.length > 1 ? (
        <div className="card p-6 text-center"><div className="mb-1 text-4xl font-bold text-primary">{sel.length}</div><div className="font-semibold">{t('details.items')}</div>{total > 0 && <div className="mt-1 text-on-surface-variant">{fmtSize(total, true)}</div>}</div>
      ) : (
        <div className="card p-6 text-center text-on-surface-variant">{list.length ? <><div className="mb-1 text-4xl font-bold text-primary">{list.length}</div><div>{t('details.folderItems')}</div></> : t('details.none')}</div>
      )}
    </aside>
  );
}
