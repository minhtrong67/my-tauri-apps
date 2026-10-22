import { useState } from "react";
import { Copy, Download, Loader2, Monitor, Moon, Settings, Sun } from "lucide-react";
import { useApp, type ThemeMode } from "../lib/store";
import { useT } from "../lib/i18n";
import { Btn, IconBtn } from "./ui";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="15" fill="rgb(var(--md-primary))" />
      <rect x="10" y="15" width="44" height="35" rx="6" fill="rgb(var(--md-on-primary))" />
      <path d="M10 21a6 6 0 0 1 6-6h32a6 6 0 0 1 6 6v3H10Z" fill="rgb(var(--md-primary-container))" />
      <circle cx="17" cy="19.5" r="1.6" fill="rgb(var(--md-primary))" /><circle cx="23" cy="19.5" r="1.6" fill="rgb(var(--md-primary))" /><circle cx="29" cy="19.5" r="1.6" fill="rgb(var(--md-primary))" />
      <path d="M26 31l-6 6 6 6M38 31l6 6-6 6" fill="none" stroke="rgb(var(--md-primary))" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NEXT: Record<ThemeMode, ThemeMode> = { light: "dark", dark: "system", system: "light" };

export function AppBar({ busy, onDownload, onCopy, onSettings }: { busy: boolean; onDownload: () => void; onCopy: () => void; onSettings: () => void }) {
  const t = useT();
  const mode = useApp((s) => s.themeMode);
  const set = useApp((s) => s.set);
  const [spin, setSpin] = useState(false);
  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 px-4">
      <Logo />
      <div className="min-w-0">
        <h1 className="truncate text-lg font-medium leading-tight text-on-surface">{t("appName")}</h1>
        <p className="hidden truncate text-xs text-on-surface-variant sm:block">{t("tagline")}</p>
      </div>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <Btn variant="tonal" onClick={onCopy} disabled={busy} className="!px-3 sm:!px-5" aria-label={t("copy")} icon={<Copy size={18} />}>
          <span className="hidden md:inline">{t("copy")}</span>
        </Btn>
        <Btn variant="filled" onClick={onDownload} disabled={busy} className="!px-3 sm:!px-5" aria-label={t("download")}
          icon={busy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}>
          <span className="hidden md:inline">{t("download")}</span>
        </Btn>
        <IconBtn label={t(mode)} onClick={() => set({ themeMode: NEXT[mode] })}><Icon size={22} key={mode} className="animate-rise" /></IconBtn>
        <IconBtn label={t("settings")} onClick={() => { setSpin(true); onSettings(); }}>
          <Settings size={22} className={spin ? "animate-gear" : ""} onAnimationEnd={() => setSpin(false)} />
        </IconBtn>
      </div>
    </header>
  );
}
