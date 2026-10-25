import { Keyboard, X } from "lucide-react";
import { Dialog } from "./ui/Overlay";
import { Button } from "./ui/Button";
import { useI18n } from "../lib/i18n";

const Key = ({ k }: { k: string }) => <kbd className="inline-grid h-7 min-w-7 place-items-center rounded-lg border border-outline-variant bg-surface-highest px-2 text-xs font-bold shadow-[0_2px_0_rgb(var(--c-outline-variant))]">{k}</kbd>;

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const rows: [string[], string][] = [
    [["Ctrl", "K"], t("sc.focus")], [["/"], t("sc.focus")], [["Ctrl", "V"], t("sc.paste")], [["Enter"], t("sc.add")],
    [["Ctrl", "1 · 2 · 3"], t("sc.nav")], [["Ctrl", ","], t("sc.settings")], [["?"], t("sc.help")], [["Esc"], t("sc.close")],
  ];
  return (
    <Dialog open={open} onClose={onClose} icon={Keyboard} title={t("sc.title")} actions={<Button icon={X} data-autofocus variant="tonal" onClick={onClose}>{t("b.close")}</Button>}>
      <ul className="flex flex-col gap-1">
        {rows.map(([keys, label], i) => (
          <li key={i} className="flex items-center justify-between gap-4 rounded-m3-sm px-2 py-1.5 even:bg-surface-container/60">
            <span className="text-on-surface">{label}</span>
            <span className="flex flex-none items-center gap-1">{keys.map((k, j) => <span key={j} className="flex items-center gap-1">{j > 0 && <span className="text-xs">+</span>}<Key k={k} /></span>)}</span>
          </li>))}
      </ul>
    </Dialog>
  );
}
