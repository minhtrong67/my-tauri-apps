import { useState } from "react";
import { Copy, Download, Loader2, Monitor, Moon, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Settings, Sun } from "lucide-react";
import { useApp, type ThemeMode } from "../lib/store";
import { useT } from "../lib/i18n";
import { Btn, IconBtn, Tooltip } from "./ui";

/** A smooth "cookie" blob (Material 3 Expressive shape) as an SVG path. */
export function cookiePath(c: number, r: number, amp: number, lobes: number, steps = 180) {
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const rad = r * (1 - amp + amp * Math.cos(lobes * a));
    d += `${i ? "L" : "M"}${(c + rad * Math.cos(a)).toFixed(2)} ${(c + rad * Math.sin(a)).toFixed(2)}`;
  }
  return d + "Z";
}
const COOKIE = cookiePath(32, 32.6, 0.045, 9);

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d={COOKIE} fill="rgb(var(--md-primary))" />
      <g transform="rotate(-7 32 34)">
        <rect x="14" y="19" width="36" height="28" rx="8" fill="rgb(var(--md-primary-container))" />
        <circle cx="21" cy="25" r="1.8" fill="rgb(var(--md-primary))" /><circle cx="27" cy="25" r="1.8" fill="rgb(var(--md-primary))" />
        <path d="M27.5 33l-5 5 5 5M36.5 33l5 5-5 5" fill="none" stroke="rgb(var(--md-primary))" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <path d="M47 8c.5 4 2 5.5 6 6-4 .5-5.5 2-6 6-.5-4-2-5.5-6-6 4-.5 5.5-2 6-6Z" fill="rgb(var(--md-tertiary-container))" />
    </svg>
  );
}

const NEXT: Record<ThemeMode, ThemeMode> = { light: "dark", dark: "system", system: "light" };

export function AppBar({ busy, onDownload, onCopy, onSettings }: { busy: boolean; onDownload: () => void; onCopy: () => void; onSettings: () => void }) {
  const t = useT();
  const mode = useApp((s) => s.themeMode);
  const set = useApp((s) => s.set);
  const showLeft = useApp((s) => s.showLeft);
  const showRight = useApp((s) => s.showRight);
  const [spin, setSpin] = useState(false);
  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 px-4">
      <div className="transition-transform duration-500 ease-spring hover:rotate-[24deg] hover:scale-110"><Logo size={36} /></div>
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold leading-tight tracking-tight text-on-surface">{t("appName")}</h1>
        <p className="hidden truncate text-xs text-on-surface-variant sm:block">{t("tagline")}</p>
      </div>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <div className="mr-1 hidden items-center gap-0.5 rounded-full bg-surface-container p-1 lg:flex">
          <IconBtn label={t("toggleLeft")} hint="Ctrl+B" aria-pressed={showLeft} onClick={() => set({ showLeft: !showLeft })}
            className={`!h-9 !w-9 ${showLeft ? "!bg-secondary-container !text-on-secondary-container" : ""}`}>
            {showLeft ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </IconBtn>
          <IconBtn label={t("toggleRight")} hint="Ctrl+Alt+B" aria-pressed={showRight} onClick={() => set({ showRight: !showRight })}
            className={`!h-9 !w-9 ${showRight ? "!bg-secondary-container !text-on-secondary-container" : ""}`}>
            {showRight ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
          </IconBtn>
        </div>
        <Tooltip label={t("copy")} hint="Ctrl+Shift+C">
          <Btn variant="tonal" onClick={onCopy} disabled={busy} className="!px-3 sm:!px-5" aria-label={t("copy")} icon={<Copy size={18} />}>
            <span className="hidden md:inline">{t("copy")}</span>
          </Btn>
        </Tooltip>
        <Tooltip label={t("download")} hint="Ctrl+S">
          <Btn variant="filled" onClick={onDownload} disabled={busy} className="!px-3 sm:!px-5" aria-label={t("download")}
            icon={busy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}>
            <span className="hidden md:inline">{t("download")}</span>
          </Btn>
        </Tooltip>
        <IconBtn label={`${t("themeMode")}: ${t(mode)}`} onClick={() => set({ themeMode: NEXT[mode] })}><Icon size={22} key={mode} className="animate-pop" /></IconBtn>
        <IconBtn label={t("settings")} hint="Ctrl+," onClick={() => { setSpin(true); onSettings(); }}>
          <Settings size={22} className={spin ? "animate-gear" : ""} onAnimationEnd={() => setSpin(false)} />
        </IconBtn>
      </div>
    </header>
  );
}
