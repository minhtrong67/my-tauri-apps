import { Check, Scale } from 'lucide-react';
import { Info } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useSettings } from '@/lib/settings';
import { MOD } from '@/lib/utils';
import logo from '@/assets/logo.svg';
import { AuthorStrip } from './SettingsDialog';

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useSettings();
  const shortcuts: [string, string][] = [
    [`${MOD}+K`, t('shPalette')], [`${MOD}+Shift+C`, t('shCopy')], [`${MOD}+Shift+X`, t('shClear')], [`${MOD}+O`, t('shOpen')],
    [`${MOD}+S`, t('shSave')], [`${MOD}+H`, t('shHistory')], [`${MOD}+,`, t('shSettings')], ['Alt+1 – 3', t('shTabs')],
  ];
  return (
    <Modal open={open} onClose={onClose} title={t('about')} icon={Info} footer={<Button icon={Check} onClick={onClose}>{t('done')}</Button>}>
      <div className="flex flex-col items-center gap-1 pb-4 text-center">
        <img src={logo} alt="" className="size-24 drop-shadow-lg [animation:float_5s_ease-in-out_infinite]" />
        <h3 className="mt-2 text-xl font-medium">{t('appName')}</h3>
        <p className="text-sm text-on-surface-variant">{t('version')} {__APP_VERSION__}</p>
        <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1 text-xs font-medium text-on-secondary-container">
          <Scale className="size-3.5" aria-hidden /> {t('license')}
        </p>
      </div>
      <AuthorStrip />
      <h4 className="mb-2 mt-5 text-sm font-medium">{t('shortcuts')}</h4>
      <dl className="grid gap-1.5 text-sm">
        {shortcuts.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 rounded-md bg-surface-container px-3 py-2">
            <dt className="text-on-surface-variant">{v}</dt>
            <dd><kbd className="rounded-xs bg-surface-container-highest px-2 py-0.5 font-sans text-xs font-medium">{k}</kbd></dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
