import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { inTauri } from "../lib/tauri";
import { useI18n } from "../lib/i18n";
import { Tooltip } from "../components/ui/Tooltip";
import { useActiveCount, useOverallPercent } from "../lib/queue";
import { ProgressRing } from "../components/ui/Progress";

/* Biểu tượng nút cửa sổ 10×10 giống Windows 11 */
const G = { fill: "none", stroke: "currentColor", strokeWidth: 1 } as const;
const MinIcon = () => <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M0 5.5h10" {...G} /></svg>;
const MaxIcon = () => <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><rect x=".5" y=".5" width="9" height="9" rx="1.5" {...G} /></svg>;
const RestoreIcon = () => <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M2.5 2.5v-1a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1" {...G} /><rect x=".5" y="2.5" width="7" height="7" rx="1.5" {...G} /></svg>;
const CloseIcon = () => <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M.5.5l9 9M9.5.5l-9 9" {...G} /></svg>;

/** Thanh tiêu đề Fluent: trong suốt trên nền Mica/Acrylic, nút cửa sổ 46×32 như Windows 11. */
export function TitleBar() {
  const { t } = useI18n();
  const [max, setMax] = useState(false);
  const [focus, setFocus] = useState(true);
  const count = useActiveCount();
  const pct = useOverallPercent();
  useEffect(() => {
    const f = () => setFocus(true), b = () => setFocus(false);
    addEventListener("focus", f); addEventListener("blur", b);
    return () => { removeEventListener("focus", f); removeEventListener("blur", b); };
  }, []);
  useEffect(() => {
    if (!inTauri) return;
    const w = getCurrentWindow();
    const sync = () => w.isMaximized().then(setMax).catch(() => {});
    sync();
    const un = w.onResized(sync);
    return () => { un.then((f) => f()); };
  }, []);
  const w = () => getCurrentWindow();
  const Btn = ({ label, onClick, close, children }: { label: string; onClick: () => void; close?: boolean; children: React.ReactNode }) => (
    <Tooltip label={label}>
      <button type="button" aria-label={label} onClick={onClick} tabIndex={-1}
        className={`grid h-8 w-[46px] place-items-center text-fg transition-colors duration-75 ${close ? "hover:bg-[#c42b1c] hover:text-white active:bg-[#c42b1c]/90" : "hover:bg-hov active:bg-prs"}`}>{children}</button>
    </Tooltip>
  );
  return (
    <header data-tauri-drag-region className={`relative z-[500] flex h-8 flex-none select-none items-center ${focus ? "" : "opacity-60"}`}>
      <img src="/app-icon.png" alt="" width={16} height={16} className="pointer-events-none ml-3 mr-2.5 h-4 w-4" />
      <span data-tauri-drag-region className="text-cap text-fg">Fluent MP3</span>
      <div data-tauri-drag-region className="h-full flex-1" />
      {count > 0 && (
        <span className="animate-pop mr-2 inline-flex h-6 items-center gap-1.5 rounded-full bg-acc/15 pl-1.5 pr-2.5 text-cap text-acc-text" role="status">
          <ProgressRing size={14} />{t("tb.active", { n: count })}{pct > 0 ? ` · ${pct}%` : ""}
        </span>)}
      {inTauri && <>
        <Btn label={t("tb.min")} onClick={() => w().minimize()}><MinIcon /></Btn>
        <Btn label={max ? t("tb.restore") : t("tb.max")} onClick={() => w().toggleMaximize()}>{max ? <RestoreIcon /> : <MaxIcon />}</Btn>
        <Btn label={t("tb.close")} onClick={() => w().close()} close><CloseIcon /></Btn>
      </>}
    </header>
  );
}
