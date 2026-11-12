import { useState } from "react";
import { ArrowSync20Regular, CloudArrowDown20Regular, Dismiss20Regular } from "@fluentui/react-icons";
import { useTools } from "../lib/stores";
import { IS_WINDOWS } from "../lib/tauri";
import { installTools, useToolState, type ToolId } from "../lib/tools";
import { useI18n } from "../lib/i18n";
import { Button } from "./ui/Button";
import { ProgressBar } from "./ui/Progress";
import { InfoBar } from "./ui/InfoBar";

export function ToolsBanner() {
  const { t } = useI18n();
  const tools = useTools((s) => s.tools);
  const { installing, progress, outdated } = useToolState();
  const [denoHidden, setDenoHidden] = useState(() => sessionStorage.getItem("fluentmp3.deno") === "1");
  if (!tools) return null;
  const has = (v: string | null) => v != null;
  const missing = [!has(tools.ytdlp) && "yt-dlp", !has(tools.ffmpeg) && "ffmpeg"].filter(Boolean) as string[];
  const pct = Math.max(...Object.values(progress).map((v) => v ?? -1), -1);

  let title = "", desc = "", label = "", list: ToolId[] = [], dismiss = false;
  if (missing.length) {
    title = t("ban.missing", { list: missing.join(t("ban.and")) });
    const manual = !IS_WINDOWS && !has(tools.ffmpeg);
    desc = t(manual ? "ban.manual" : "ban.auto"); label = t("ban.install");
    if (!has(tools.ytdlp)) list.push("ytdlp");
    if (!has(tools.ffmpeg) && IS_WINDOWS) list.push("ffmpeg");
    if (!has(tools.deno) && IS_WINDOWS) list.push("deno");
    if (manual && has(tools.ytdlp)) list = [];
  } else if (outdated) {
    title = t("ban.updateTitle"); desc = `${outdated.current} → ${outdated.latest}`; label = t("b.updateNow"); list = ["ytdlp"];
  } else if (!has(tools.deno) && IS_WINDOWS && !denoHidden) {
    title = t("ban.denoTitle"); desc = t("ban.denoDesc"); label = t("ban.denoInstall"); list = ["deno"]; dismiss = true;
  } else return null;

  return (
    <div className="animate-pop mb-5">
      <InfoBar severity={missing.length ? "warning" : "info"} title={title}
        actions={<>
          {dismiss && <Button size="sm" icon={Dismiss20Regular} onClick={() => { sessionStorage.setItem("fluentmp3.deno", "1"); setDenoHidden(true); }}>{t("ban.later")}</Button>}
          {list.length > 0 && <Button size="sm" variant="accent" icon={missing.length ? CloudArrowDown20Regular : ArrowSync20Regular} disabled={installing} onClick={() => installTools(list)}>{label}</Button>}
        </>}>
        {desc}
        {installing && <ProgressBar className="mt-2" value={pct} indeterminate={pct < 0 || pct >= 100} />}
      </InfoBar>
    </div>
  );
}
