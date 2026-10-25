import { useEffect, useRef } from "react";
import { AddDialog } from "./components/AddDialog";
import { EngineSetupCard } from "./components/EngineSetup";
import { Nav } from "./components/Nav";
import { Toasts } from "./components/Toasts";
import { api, isTauri } from "./lib/api";
import { extractUrls } from "./lib/format";
import { useGlobalRipple, useT } from "./lib/hooks";
import { AboutPage } from "./pages/AboutPage";
import { DownloadsPage } from "./pages/DownloadsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useDownloads } from "./store/downloads";
import { useSettings } from "./store/settings";
import { useUi } from "./store/ui";

const LOOKS_LIKE_MEDIA = /(youtube\.com|youtu\.be|vimeo\.com|facebook\.com|fb\.watch|tiktok\.com|twitter\.com|x\.com|instagram\.com|dailymotion\.com|twitch\.tv|bilibili\.com|\.m3u8|\.(mp4|webm|mkv|mov|mp3|m4a)(\?|$))/i;

export default function App() {
  const { t, lang } = useT();
  const page = useUi((s) => s.page);
  const { load: loadSettings, ready } = useSettings();
  const { load: loadDownloads, upsert, drop } = useDownloads();
  useGlobalRipple();

  // Keep <html lang> in sync.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Initial data + backend events.
  useEffect(() => {
    void loadSettings();
    void loadDownloads();
    const offs: Promise<() => void>[] = [
      api.onUpdate(upsert),
      api.onRemoved(drop),
      api.onExtensionAdd((p) => {
        const { core } = useSettings.getState();
        useUi.getState().openDialog({
          url: p.url,
          title: p.title,
          referer: p.referer ?? p.pageUrl,
          userAgent: p.userAgent,
          cookie: p.cookie,
          auto: true,
        });
        if (!core.askQuality) useUi.getState().toast(t("extensionRequest"));
      }),
    ];
    return () => {
      offs.forEach((o) => void o.then((off) => off()));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clipboard watcher: offer to download a copied video link when the window regains focus.
  const lastSeen = useRef("");
  useEffect(() => {
    if (!isTauri || !ready) return;
    const check = async () => {
      const { core } = useSettings.getState();
      if (!core.clipboardWatch) return;
      const clip = (await api.readClipboard()).trim();
      if (!clip || clip === lastSeen.current) return;
      lastSeen.current = clip;
      const [url] = extractUrls(clip);
      if (!url || !LOOKS_LIKE_MEDIA.test(url)) return;
      if (useDownloads.getState().items.some((d) => d.url === url)) return;
      useUi.getState().toast(t("clipboardFound"), {
        action: { label: t("clipboardAction"), run: () => useUi.getState().openDialog({ url, auto: true }) },
      });
    };
    void api.readClipboard().then((c) => (lastSeen.current = c.trim()));
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, lang]);

  // Block the browser context menu in the packaged app (keep it in dev for inspection).
  useEffect(() => {
    if (import.meta.env.DEV) return;
    const stop = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("input, textarea, [data-selectable]")) e.preventDefault();
    };
    window.addEventListener("contextmenu", stop);
    return () => window.removeEventListener("contextmenu", stop);
  }, []);

  return (
    <div className="flex h-full flex-col bg-surface-container text-on-surface sm:flex-row">
      <Nav />
      <main className="min-h-0 min-w-0 flex-1 sm:py-2 sm:pr-2"><div className="relative h-full overflow-hidden bg-background sm:rounded-[32px] sm:bg-surface-lowest sm:shadow-sm">
        {page === "downloads" && <DownloadsPage />}
        {page === "settings" && <SettingsPage />}
        {page === "about" && <AboutPage />}
      </div></main>
      <AddDialog />
      <EngineSetupCard />
      <Toasts />
    </div>
  );
}
