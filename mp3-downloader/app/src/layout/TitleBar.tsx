import { useEffect, useState } from "react";
import { Copy, Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { inTauri } from "../lib/tauri";
import { useI18n } from "../lib/i18n";
import { Tooltip } from "../components/ui/Tooltip";

/** Thanh tiêu đề tuỳ chỉnh (cửa sổ không viền) — đổi màu theo giao diện sáng/tối. */
export function TitleBar() {
  const { t } = useI18n();
  const [max, setMax] = useState(false);
  useEffect(() => {
    if (!inTauri) return;
    const w = getCurrentWindow();
    const sync = () => w.isMaximized().then(setMax).catch(() => {});
    sync();
    const un = w.onResized(sync);
    return () => { un.then((f) => f()); };
  }, []);
  const w = () => getCurrentWindow();
  const Btn = ({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) => (
    <Tooltip label={label}>
      <button type="button" aria-label={label} onClick={onClick}
        className={`grid h-10 w-12 place-items-center text-on-surface-variant transition-colors ${danger ? "hover:bg-error hover:text-on-error" : "hover:bg-on-surface/10"}`}>{children}</button>
    </Tooltip>
  );
  return (
    <header data-tauri-drag-region className="flex h-10 flex-none items-center bg-surface pl-3">
      <img src="/app-icon.png" alt="" width={20} height={20} className="pointer-events-none mr-2 h-5 w-5 rounded-md" />
      <span data-tauri-drag-region className="t-small flex-1 font-semibold text-on-surface-variant">MP3 Downloader</span>
      {inTauri && <>
        <Btn label={t("tb.min")} onClick={() => w().minimize()}><Minus className="h-4 w-4" /></Btn>
        <Btn label={max ? t("tb.restore") : t("tb.max")} onClick={() => w().toggleMaximize()}>{max ? <Copy className="h-3.5 w-3.5 -scale-x-100" /> : <Square className="h-3.5 w-3.5" />}</Btn>
        <Btn label={t("tb.close")} onClick={() => w().close()} danger><X className="h-[18px] w-[18px]" /></Btn>
      </>}
    </header>
  );
}
