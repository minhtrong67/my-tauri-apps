import { useEffect, useState } from "react";
import { Keyboard, Scale, Sparkles, User, X } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { Dialog } from "./ui/Overlay";
import { Button } from "./ui/Button";
import { useI18n } from "../lib/i18n";
import { inTauri } from "../lib/tauri";

export function AboutDialog({ open, onClose, onShortcuts }: { open: boolean; onClose: () => void; onShortcuts: () => void }) {
  const { t } = useI18n();
  const [v, setV] = useState("0.5.0");
  useEffect(() => { if (inTauri) getVersion().then(setV).catch(() => {}); }, []);
  return (
    <Dialog open={open} onClose={onClose} centered title="MP3 Downloader"
      actions={<><Button variant="tonal" icon={Keyboard} onClick={() => { onClose(); onShortcuts(); }}>{t("about.shortcuts")}</Button><Button variant="filled" icon={X} onClick={onClose} data-autofocus>{t("about.close")}</Button></>}>
      <div className="flex flex-col items-center gap-1">
        <img src="/app-icon.png" alt="" width={88} height={88} className="mb-1 h-[88px] w-[88px] animate-pop drop-shadow-lg" />
        <p>{t("about.version", { v })}</p>
        <p className="mt-2 max-w-[32ch] text-on-surface">{t("about.desc")}</p>
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="flex flex-col items-center gap-1"><span className="t-small">{t("about.author")}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container py-1 pl-2.5 pr-4 text-base font-bold text-on-primary-container"><User className="h-[18px] w-[18px]" />minhtrong67</span></div>
          <div className="flex flex-col items-center gap-1"><span className="t-small">{t("about.ai")}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-tertiary-container py-1 pl-2.5 pr-4 text-base font-bold text-on-tertiary-container"><Sparkles className="h-[18px] w-[18px]" />Claude</span></div>
        </div>
        <p className="t-small mt-4 inline-flex items-center gap-1.5"><Scale className="h-3.5 w-3.5" />{t("about.license")}</p>
      </div>
    </Dialog>
  );
}
