import { useState } from "react";
import { CloudDownload, RefreshCw, Wrench, X } from "lucide-react";
import { useTools } from "../lib/stores";
import { IS_WINDOWS } from "../lib/tauri";
import { installTools, useToolState, type ToolId } from "../lib/tools";
import { useI18n } from "../lib/i18n";
import { Button } from "./ui/Button";
import { WavyProgress } from "./ui/Progress";

export function ToolsBanner() {
  const { t } = useI18n();
  const tools = useTools((s) => s.tools);
  const { installing, progress, outdated } = useToolState();
  const [denoHidden, setDenoHidden] = useState(() => sessionStorage.getItem("mp3dl.deno") === "1");
  if (!tools) return null;
  const has = (v: string | null) => v != null;
  const missing = [!has(tools.ytdlp) && "yt-dlp", !has(tools.ffmpeg) && "ffmpeg"].filter(Boolean) as string[];
  const pct = Math.max(...Object.values(progress).map((v) => v ?? -1), -1);

  let title = "", desc = "", label = "", list: ToolId[] = [], Icon = Wrench, dismiss = false;
  if (missing.length) {
    title = t("ban.missing", { list: missing.join(t("ban.and")) });
    const manual = !IS_WINDOWS && !has(tools.ffmpeg);
    desc = t(manual ? "ban.manual" : "ban.auto"); label = t("ban.install");
    if (!has(tools.ytdlp)) list.push("ytdlp");
    if (!has(tools.ffmpeg) && IS_WINDOWS) list.push("ffmpeg");
    if (!has(tools.deno) && IS_WINDOWS) list.push("deno");
    if (manual && has(tools.ytdlp)) list = [];
  } else if (outdated) {
    title = t("ban.updateTitle"); desc = `${outdated.current} → ${outdated.latest}`; label = t("b.updateNow"); list = ["ytdlp"]; Icon = RefreshCw;
  } else if (!has(tools.deno) && IS_WINDOWS && !denoHidden) {
    title = t("ban.denoTitle"); desc = t("ban.denoDesc"); label = t("ban.denoInstall"); list = ["deno"]; dismiss = true;
  } else return null;

  return (
    <div className="animate-pop relative mb-5 flex flex-wrap items-center gap-4 overflow-hidden rounded-m3-lg bg-tertiary-container p-4 text-on-tertiary-container">
      <span className="grid h-12 w-12 flex-none place-items-center rounded-m3-md bg-on-tertiary-container/10"><Icon className="h-6 w-6" /></span>
      <div className="min-w-[200px] flex-1"><p className="t-title">{title}</p><p className="t-body opacity-90">{desc}</p></div>
      <div className="flex gap-2">
        {dismiss && <Button variant="tonal" size="sm" icon={X} onClick={() => { sessionStorage.setItem("mp3dl.deno", "1"); setDenoHidden(true); }}>{t("ban.later")}</Button>}
        {list.length > 0 && <Button size="sm" icon={CloudDownload} disabled={installing} onClick={() => installTools(list)}>{label}</Button>}
      </div>
      {installing && <div className="absolute inset-x-4 bottom-1"><WavyProgress value={pct} indeterminate={pct < 0 || pct >= 100} /></div>}
    </div>
  );
}
