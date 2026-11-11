import { ChevronDown, Eye, PanelRight, Settings, Terminal, Table2, LayoutGrid, List, Download, Rows3, Columns3, ArrowDownUp, ListFilter, Search, Wrench, type Icon } from '../lib/icons';
import { useApp, cur, activeFilters, app } from '../lib/store';
import { CMD, label, keyOf, isEnabled, isChecked, run } from '../lib/commands';
import { openNamedMenu } from '../lib/menus';
import { t } from '../lib/i18n';
import { tip, cx } from './ui';

function Cmd({ id, text, filled, icon, hideLabel }: { id: string; text?: boolean; filled?: boolean; icon?: Icon; hideLabel?: boolean }) {
  const c = CMD[id], I = icon || c.icon;
  const on = c.checked ? isChecked(id) : false;
  return (
    <button className={cx(text || filled ? 'btn' : 'ibtn', filled && 'btn-filled', on && 'on')} disabled={!isEnabled(id)} onClick={() => run(id)} {...tip(label(id), keyOf(id))}>
      <I size={18} />{(text || filled) && <span className={hideLabel ? '@max-[1320px]:hidden' : ''}>{label(id)}</span>}
    </button>
  );
}

function MenuBtn({ name, icon: I, text, badge }: { name: string; icon: Icon; text: string; badge?: number }) {
  const d = cur();
  return (
    <button className="btn !px-3" disabled={!d} onClick={e => openNamedMenu(name, e.currentTarget)} aria-haspopup="menu" {...tip(text)}>
      <I size={18} /><span className="@max-[1320px]:hidden">{text}</span>
      {!!badge && <span className="grid min-w-[1.15rem] place-items-center rounded-full bg-accent px-1 text-[.68rem] leading-[1.15rem] text-on-accent">{badge}</span>}
      <ChevronDown size={12} className="opacity-70" />
    </button>
  );
}

const Sep = () => <i className="mx-1 h-6 w-px flex-none bg-stroke" />;

export function CommandBar() {
  useApp();
  const d = cur();
  const nf = d ? activeFilters(d).length + Object.keys(d.cf).filter(k => d.cf[k]).length : 0;
  return (
    <section className="@container cmdbar flex flex-none flex-wrap items-center gap-0.5 border-b border-stroke px-2 py-1" aria-label="Toolbar">
      <Cmd id="file.new" /><Cmd id="file.open" />
      <button className="btn btn-filled" disabled={!d} onClick={() => run('file.save')} {...tip(label('file.save'), keyOf('file.save'))}>{(() => { const I = CMD['file.save'].icon; return <I size={18} />; })()}<span>{t('c.file.save')}</span></button>
      <MenuBtn name="export" icon={Download} text={t('menu.export')} />
      <Sep />
      <Cmd id="edit.undo" /><Cmd id="edit.redo" /><Cmd id="edit.cut" /><Cmd id="edit.copy" /><Cmd id="edit.paste" />
      <Sep />
      <MenuBtn name="rows" icon={Rows3} text={t('menu.rows')} /><MenuBtn name="cols" icon={Columns3} text={t('menu.cols')} />
      <Sep />
      <MenuBtn name="sort" icon={ArrowDownUp} text={t('menu.sort')} /><MenuBtn name="filter" icon={ListFilter} text={t('menu.filter')} badge={nf} />
      <button className="btn !px-3" disabled={!d} onClick={() => run('data.find')} {...tip(label('data.find'), keyOf('data.find'))}><Search size={18} /><span className="@max-[1320px]:hidden">{t('menu.find')}</span></button>
      <MenuBtn name="tools" icon={Wrench} text={t('menu.tools')} />
      <div className="min-w-4 flex-1" />
      <div className="bgroup ico flex-none" role="group">
        {([['view.table', Table2], ['view.cards', LayoutGrid], ['view.list', List]] as [string, Icon][]).map(([id, I]) => (
          <button key={id} className={isChecked(id) ? 'on' : ''} disabled={!isEnabled(id)} onClick={() => run(id)} {...tip(label(id))}><I size={18} /></button>))}
      </div>
      <button className="ibtn" disabled={!d} onClick={e => openNamedMenu('colsvis', e.currentTarget)} {...tip(t('menu.columns'))}><Eye size={18} /></button>
      <button className={cx('ibtn', app.settings.details && d && 'on')} disabled={!d} onClick={() => run('view.details')} {...tip(label('view.details'), keyOf('view.details'))}><PanelRight size={18} /></button>
      <Sep />
      <button className="ibtn" onClick={() => run('app.palette')} {...tip(label('app.palette'), keyOf('app.palette'))}><Terminal size={18} /></button>
    </section>
  );
}
