import { useEffect, useState, type ReactNode } from "react";
import { FolderCog, Info, Layers, Monitor, Palette, Sparkles, Check, X, Code2 } from "lucide-react";
import type { EffectId, Settings } from "../lib/settings";
import { inTauri } from "../lib/settings";
import { api } from "../lib/api";
import type { Key } from "../lib/i18n";
import { Segmented, Switch, useT } from "./ui";

type Section = "appearance" | "material" | "window" | "shell" | "about";

const NAV: { id: Section; label: Key; icon: ReactNode }[] = [
  { id: "appearance", label: "appearance", icon: <Palette size={18} /> },
  { id: "material", label: "material", icon: <Layers size={18} /> },
  { id: "window", label: "window", icon: <Monitor size={18} /> },
  { id: "shell", label: "shell", icon: <FolderCog size={18} /> },
  { id: "about", label: "about", icon: <Info size={18} /> },
];

const EFFECTS: { id: EffectId; name: Key; desc: Key; bg: string }[] = [
  { id: "mica", name: "mica", desc: "micaDesc", bg: "linear-gradient(135deg,#8fa6c4,#b9a6c9 60%,#d4b8c0)" },
  { id: "micaAlt", name: "micaAlt", desc: "micaAltDesc", bg: "linear-gradient(135deg,#566a85,#7a6490 60%,#94707c)" },
  { id: "acrylic", name: "acrylic", desc: "acrylicDesc", bg: "linear-gradient(135deg,#6fa8dc88,#c27ba088 50%,#f6b26b88), repeating-linear-gradient(45deg,#ffffff22 0 2px,transparent 2px 5px)" },
  { id: "blur", name: "blur", desc: "blurDesc", bg: "linear-gradient(135deg,#9db7d6,#c9d6e8)" },
  { id: "liquid", name: "liquid", desc: "liquidDesc", bg: "radial-gradient(circle at 20% 20%,#ff9ad5,transparent 50%),radial-gradient(circle at 80% 70%,#6ad5ff,transparent 55%),linear-gradient(135deg,#7b6cf6,#35c3d8)" },
  { id: "frosted", name: "frosted", desc: "frostedDesc", bg: "linear-gradient(135deg,#c7d2e6,#e4d6e6 60%,#e8e2d2)" },
  { id: "none", name: "none", desc: "noneDesc", bg: "linear-gradient(135deg,#2b2b2b,#3a3a3a)" },
];
const ACCENTS = ["#0067C0", "#0F7B0F", "#C239B3", "#D13438", "#CA5010", "#8764B8", "#00B7C3", "#7A7574"];

function Row({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="srow">
      <div className="min-w-0">
        <div className="font-medium">{title}</div>
        {desc && <div className="mt-0.5 text-[12.5px]" style={{ color: "var(--text2)" }}>{desc}</div>}
      </div>
      <div className="flex-none">{children}</div>
    </div>
  );
}

export default function SettingsDialog({ settings, onChange, onClose }: { settings: Settings; onChange: (s: Settings) => void; onClose: () => void }) {
  const t = useT();
  const up = (p: Partial<Settings>) => onChange({ ...settings, ...p });
  const [sec, setSec] = useState<Section>("appearance");
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (inTauri) api.getContextMenu().then(setMenu).catch(() => {});
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [onClose]);

  const toggleMenu = async (v: boolean) => {
    try {
      await api.setContextMenu(v);
      setMenu(v);
    } catch (e) {
      alert(String(e));
    }
  };

  return (
    <div className="anim-fade fixed inset-0 z-50 grid place-items-center p-6" style={{ background: "rgba(0,0,0,.4)" }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="anim-pop flex h-[min(600px,100%)] w-full max-w-[820px] overflow-hidden rounded-xl" style={{ background: "var(--dialog)", border: "1px solid var(--stroke-strong)", boxShadow: "0 28px 80px rgba(0,0,0,.45)" }}>
        <nav className="flex w-[210px] flex-none flex-col gap-1 p-3" style={{ background: "var(--layer2)", borderRight: "1px solid var(--stroke)" }}>
          <h2 className="m-0 px-3 pb-3 pt-2 text-[18px] font-semibold">{t("settings")}</h2>
          {NAV.map((n) => (
            <button key={n.id} className="nav-item" data-on={sec === n.id} onClick={() => setSec(n.id)}>
              {n.icon}
              <span>{t(n.label)}</span>
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between px-6 pt-4">
            <h3 className="m-0 text-[20px] font-semibold">{t(NAV.find((n) => n.id === sec)!.label)}</h3>
            <button className="btn btn-subtle btn-icon" onClick={onClose} aria-label={t("close")}><X size={18} /></button>
          </div>

          <div key={sec} className="anim-tab flex flex-1 flex-col gap-2.5 overflow-y-auto px-6 pb-6 pt-3">
            {sec === "appearance" && (
              <>
                <Row title={t("theme")} desc={t("themeDesc")}>
                  <div className="w-[260px]">
                    <Segmented value={settings.theme} onChange={(v) => up({ theme: v })} options={[
                      { value: "system", label: t("themeSystem") },
                      { value: "light", label: t("themeLight") },
                      { value: "dark", label: t("themeDark") },
                    ]} />
                  </div>
                </Row>
                <Row title={t("accent")} desc={t("accentDesc")}>
                  <div className="flex max-w-[260px] flex-wrap items-center justify-end gap-2">
                    {ACCENTS.map((c) => (
                      <button key={c} aria-label={c} onClick={() => up({ accent: c })} className="grid h-7 w-7 cursor-pointer place-items-center rounded-full transition-transform hover:scale-110" style={{ background: c, border: "none", outline: settings.accent.toLowerCase() === c.toLowerCase() ? "2px solid var(--text)" : "1px solid var(--stroke-strong)", outlineOffset: 2 }}>
                        {settings.accent.toLowerCase() === c.toLowerCase() && <Check size={14} color="#fff" strokeWidth={3} />}
                      </button>
                    ))}
                    <input type="color" value={settings.accent} onChange={(e) => up({ accent: e.target.value })} />
                  </div>
                </Row>
                <Row title={t("language")} desc={t("languageDesc")}>
                  <div className="w-[220px]">
                    <Segmented value={settings.lang} onChange={(v) => up({ lang: v })} options={[{ value: "en", label: "English" }, { value: "vi", label: "Tiếng Việt" }]} />
                  </div>
                </Row>
              </>
            )}

            {sec === "material" && (
              <>
                <p className="m-0 mb-1 text-[13px]" style={{ color: "var(--text2)" }}>{t("materialHint")}</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {EFFECTS.map((e, i) => {
                    const on = settings.effect === e.id;
                    return (
                      <button key={e.id} className="mat anim-row" style={{ animationDelay: `${i * 40}ms` }} data-on={on} onClick={() => up({ effect: e.id })}>
                        <div className="relative h-16 w-full overflow-hidden rounded-md" style={{ background: e.bg }}>
                          <div className="absolute inset-x-3 bottom-0 top-4 rounded-t-md" style={{ background: "var(--layer)", border: "1px solid var(--stroke-strong)", borderBottom: 0, backdropFilter: ["acrylic", "blur", "liquid", "frosted"].includes(e.id) ? "blur(6px)" : undefined }} />
                          {on && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full" style={{ background: "var(--accent)" }}><Check size={12} color="var(--on-accent)" strokeWidth={3} /></span>}
                        </div>
                        <div className="px-0.5 pb-0.5">
                          <div className="font-medium">{t(e.name)}{e.id === "mica" && <span className="ml-1.5 rounded px-1.5 py-px text-[10.5px]" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>Default</span>}</div>
                          <div className="text-[12px]" style={{ color: "var(--text2)" }}>{t(e.desc)}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {sec === "window" && (
              <Row title={t("startup")} desc={`${t("startupDesc")}. ${t("startupHint")}`}>
                <div className="w-[300px]">
                  <Segmented value={settings.startup} onChange={(v) => up({ startup: v })} options={[
                    { value: "remember", label: t("startupRemember") },
                    { value: "maximized", label: t("startupMax") },
                  ]} />
                </div>
              </Row>
            )}

            {sec === "shell" && (
              <>
                <Row title={t("shellMenu")} desc={`${t("contextMenu")}. ${t("contextMenuHint")}`}>
                  <Switch checked={menu} onChange={toggleMenu} />
                </Row>
                <Row title={t("restartExplorerTitle")} desc={t("restartExplorerDesc")}>
                  <button className="btn" onClick={() => api.restartExplorer().catch((e) => alert(String(e)))}>{t("restartExplorer")}</button>
                </Row>
              </>
            )}

            {sec === "about" && (
              <>
                <div className="hero">
                  <div className="flex items-center gap-4">
                    <img src="/icon.png" alt="" className="h-[72px] w-[72px]" draggable={false} />
                    <div>
                      <div className="text-[22px] font-semibold">{t("appName")}</div>
                      <div className="text-[12.5px]" style={{ color: "var(--text2)" }}>{t("aboutVersion")} 1.0.0</div>
                    </div>
                  </div>
                  <p className="mb-0 mt-4 text-[13px] leading-relaxed">{t("aboutText")}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="px-1 text-[12.5px] font-semibold" style={{ color: "var(--text2)" }}>{t("aboutBy")}</div>
                  <div className="persona" style={{ borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)", background: "color-mix(in srgb, var(--accent) 8%, var(--layer))" }}>
                    <div className="avatar" style={{ background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #7a3df0))" }}>M</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[16px] font-semibold" style={{ color: "var(--accent)" }}>minhtrong67</div>
                      <div className="text-[12.5px]" style={{ color: "var(--text2)" }}>{t("roleAuthor")}</div>
                    </div>
                    <span className="pill"><Code2 size={12} />Author</span>
                  </div>
                  <div className="persona" style={{ borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)", background: "color-mix(in srgb, var(--accent) 8%, var(--layer))" }}>
                    <div className="avatar" style={{ background: "linear-gradient(135deg, #d97757, #c25a3c)" }}><Sparkles size={22} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[16px] font-semibold" style={{ color: "var(--accent)" }}>Claude</div>
                      <div className="text-[12.5px]" style={{ color: "var(--text2)" }}>{t("roleAi")} · {t("aboutAiBy")}</div>
                    </div>
                    <span className="pill"><Sparkles size={12} />AI</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
