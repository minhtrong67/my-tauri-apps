import { Dialog } from "./ui/Overlay";
import { Button } from "./ui/Button";
import { useI18n } from "../lib/i18n";

const Key = ({ k }: { k: string }) => <kbd className="inline-grid h-6 min-w-6 place-items-center rounded-ctl border border-stroke border-b-strong bg-ctl px-1.5 text-cap">{k}</kbd>;

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const rows: [string[], string][] = [
    [["Ctrl", "K"], t("sc.focus")], [["/"], t("sc.focus")], [["Ctrl", "V"], t("sc.paste")], [["Enter"], t("sc.add")],
    [["Ctrl", "1 · 2 · 3"], t("sc.nav")], [["Ctrl", ","], t("sc.settings")], [["?"], t("sc.help")], [["Esc"], t("sc.close")],
  ];
  return (
    <Dialog open={open} onClose={onClose} title={t("sc.title")} actions={<Button data-autofocus variant="accent" onClick={onClose}>{t("b.close")}</Button>}>
      <ul className="flex flex-col">
        {rows.map(([keys, label], i) => (
          <li key={i} className="flex items-center justify-between gap-4 rounded-ctl px-2 py-2 odd:bg-hov">
            <span>{label}</span>
            <span className="flex flex-none items-center gap-1">{keys.map((k, j) => <span key={j} className="flex items-center gap-1">{j > 0 && <span className="text-cap text-fg-3">+</span>}<Key k={k} /></span>)}</span>
          </li>))}
      </ul>
    </Dialog>
  );
}
