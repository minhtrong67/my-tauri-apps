import { useEffect, useState } from "react";
import { Keyboard20Regular, Person16Regular, Scales16Regular, Sparkle16Regular } from "@fluentui/react-icons";
import { getVersion } from "@tauri-apps/api/app";
import { Dialog } from "./ui/Overlay";
import { Button } from "./ui/Button";
import { Tag } from "./ui/Controls";
import { useI18n } from "../lib/i18n";
import { inTauri } from "../lib/tauri";

export function AboutDialog({ open, onClose, onShortcuts }: { open: boolean; onClose: () => void; onShortcuts: () => void }) {
  const { t } = useI18n();
  const [v, setV] = useState("0.5.0");
  useEffect(() => { if (inTauri) getVersion().then(setV).catch(() => {}); }, []);
  return (
    <Dialog open={open} onClose={onClose} title={t("about.name")}
      actions={<><Button icon={Keyboard20Regular} onClick={() => { onClose(); onShortcuts(); }}>{t("about.shortcuts")}</Button><Button variant="accent" onClick={onClose} data-autofocus>{t("about.close")}</Button></>}>
      <div className="flex items-start gap-4">
        <img src="/app-icon.png" alt="" width={72} height={72} className="h-[72px] w-[72px] flex-none" />
        <div className="min-w-0">
          <p className="text-fg-2">{t("about.version", { v })}</p>
          <p className="mt-1">{t("about.desc")}</p>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 border-t border-line pt-4">
        <dt className="text-fg-2">{t("about.author")}</dt><dd><Tag><Person16Regular />minhtrong67</Tag></dd>
        <dt className="text-fg-2">{t("about.ai")}</dt><dd><Tag><Sparkle16Regular />Claude</Tag></dd>
      </dl>
      <p className="mt-4 inline-flex items-center gap-1.5 text-cap text-fg-2"><Scales16Regular />{t("about.license")}</p>
    </Dialog>
  );
}
