import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useI18n } from "./i18n";
import { Logo } from "./ui";

const win = () => {
  try {
    return getCurrentWindow();
  } catch {
    return null; // chạy ngoài Tauri (trình duyệt)
  }
};

const Min = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M0 5.5h10" stroke="currentColor" strokeWidth="1" fill="none" /></svg>
);
const Max = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><rect x=".5" y=".5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1" fill="none" /></svg>
);
const Restore = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
    <path d="M2.5 2.5v-.8a1.2 1.2 0 0 1 1.2-1.2h4.6a1.2 1.2 0 0 1 1.2 1.2v4.6a1.2 1.2 0 0 1-1.2 1.2h-.8" stroke="currentColor" strokeWidth="1" fill="none" />
    <rect x=".5" y="2.5" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1" fill="none" />
  </svg>
);
const Close = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M.5.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1" fill="none" /></svg>
);

/** Thanh tiêu đề Fluent: biểu tượng + tên app, vùng kéo cửa sổ, ba nút Windows 11 (thu nhỏ / phóng to / đóng). */
export function TitleBar() {
  const { t } = useI18n();
  const [max, setMax] = useState(false);

  useEffect(() => {
    const w = win();
    if (!w) return;
    let un: (() => void) | undefined;
    const sync = () => w.isMaximized().then(setMax).catch(() => {});
    sync();
    w.onResized(sync).then((f) => (un = f)).catch(() => {});
    return () => un?.();
  }, []);

  // Cửa sổ không ở tiền cảnh -> chữ trên thanh tiêu đề mờ đi như Windows
  useEffect(() => {
    const on = () => (document.documentElement.dataset.active = String(document.hasFocus()));
    on();
    window.addEventListener("focus", on);
    window.addEventListener("blur", on);
    return () => {
      window.removeEventListener("focus", on);
      window.removeEventListener("blur", on);
    };
  }, []);

  const act = (f: (w: NonNullable<ReturnType<typeof win>>) => Promise<unknown>) => () => {
    const w = win();
    if (w) f(w).catch(() => {});
  };

  return (
    <header className="titlebar" data-tauri-drag-region>
      <Logo size={16} />
      <span className="tb-title" data-tauri-drag-region>Fluent Claude</span>
      <div className="caption" role="group">
        <button className="cap" aria-label={t("win.min")} tabIndex={-1} onClick={act((w) => w.minimize())}>
          <Min />
        </button>
        <button className="cap" aria-label={max ? t("win.restore") : t("win.max")} tabIndex={-1} onClick={act((w) => w.toggleMaximize())}>
          {max ? <Restore /> : <Max />}
        </button>
        <button className="cap close" aria-label={t("win.close")} tabIndex={-1} onClick={act((w) => w.close())}>
          <Close />
        </button>
      </div>
    </header>
  );
}
