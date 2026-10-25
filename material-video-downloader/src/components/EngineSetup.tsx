import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import { useT } from "../lib/hooks";
import type { EngineSetup as Setup } from "../lib/types";
import { Button, Loader } from "./ui";

/** Floating card that shows the silent first-run install of yt-dlp / ffmpeg. */
export function EngineSetupCard() {
  const { t } = useT();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [stage, setStage] = useState("yt-dlp");
  const [pct, setPct] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const offs = [
      api.onEngineSetup((s) => {
        setSetup(s);
        if (s.stage) setStage(s.stage);
        if (s.state === "working") {
          setVisible(true);
          setPct(0);
        }
        if (s.state === "done") window.setTimeout(() => setVisible(false), 2200);
      }),
      api.onEngineProgress((p) => setPct(p.total ? Math.round((p.downloaded / p.total) * 100) : 0)),
    ];
    return () => offs.forEach((o) => void o.then((off) => off()));
  }, []);

  if (!visible || !setup) return null;
  const error = setup.state === "error";
  const done = setup.state === "done";

  const retry = async () => {
    setSetup({ stage: "yt-dlp", state: "working", message: null });
    try {
      await api.installYtdlp();
      await api.installFfmpeg().catch(() => undefined);
      setSetup({ stage: "", state: "done", message: null });
      window.setTimeout(() => setVisible(false), 2200);
    } catch (e) {
      setSetup({ stage: "", state: "error", message: String(e) });
    }
  };

  return (
    <div className="anim-toast fixed bottom-24 left-4 z-[55] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[28px] bg-surface-high p-4 shadow-2xl ring-1 ring-outline-variant/50 sm:bottom-6 sm:left-24">
      <div className="flex items-center gap-4">
        {error ? (
          <AlertTriangle className="text-error" size={36} />
        ) : done ? (
          <CheckCircle2 className="anim-pop text-primary" size={36} />
        ) : (
          <Loader size={40} />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-on-surface">
            {error ? t("setupError") : done ? t("setupDone") : t("setupWorking", { name: stage })}
          </p>
          <p className="mt-0.5 text-xs text-on-surface-variant" data-selectable>
            {error ? setup.message : done ? "" : t("setupWorkingBody")}
          </p>
        </div>
      </div>
      {!error && !done && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary-container">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      )}
      {error && (
        <div className="mt-3 flex justify-end">
          <Button size="md" variant="tonal" onClick={retry}>
            {t("setupRetry")}
          </Button>
        </div>
      )}
    </div>
  );
}
