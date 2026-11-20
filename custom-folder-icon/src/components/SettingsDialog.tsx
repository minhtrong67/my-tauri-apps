import { useEffect, useState, type ReactNode } from "react";
import { FolderCog, Info, Layers, Monitor, Palette, RefreshCw, Check, X } from "lucide-react";
import type { EffectId, Settings } from "../lib/settings";
import { inTauri } from "../lib/settings";
import { api } from "../lib/api";
import { confirmRestartExplorer } from "../lib/explorer";
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
/** Official Claude mark (Simple Icons, CC0), embedded so the brand set is not loaded just for one logo. */
const CLAUDE_PATH = "m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z";
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
                  <div className="flex items-center gap-2.5">
                    {ACCENTS.map((c) => {
                      const on = settings.accent.toLowerCase() === c.toLowerCase();
                      return (
                        <button key={c} aria-label={c} data-tip={c} className="dot" data-on={on} style={{ background: c }} onClick={() => up({ accent: c })}>
                          {on && <Check size={14} color="#fff" strokeWidth={3} />}
                        </button>
                      );
                    })}
                    <label className="dot" data-on={!ACCENTS.some((c) => c.toLowerCase() === settings.accent.toLowerCase())} data-tip={t("customColor")} style={{ background: ACCENTS.some((c) => c.toLowerCase() === settings.accent.toLowerCase()) ? "conic-gradient(#f43f5e, #f59e0b, #84cc16, #06b6d4, #6366f1, #d946ef, #f43f5e)" : settings.accent }}>
                      {!ACCENTS.some((c) => c.toLowerCase() === settings.accent.toLowerCase()) && <Check size={14} color="#fff" strokeWidth={3} />}
                      <input type="color" value={settings.accent} onChange={(e) => up({ accent: e.target.value })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                    </label>
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
                  <button className="btn btn-warn" onClick={() => confirmRestartExplorer(t).catch((e) => alert(String(e)))}><RefreshCw size={16} />{t("restartExplorer")}</button>
                </Row>
              </>
            )}

            {sec === "about" && (
              <>
                <div className="credit">
                  <img src="/icon.png" alt="" className="h-16 w-16 flex-none" draggable={false} />
                  <div className="min-w-0">
                    <div className="text-[20px] font-semibold">{t("appName")}</div>
                    <div className="text-[12.5px]" style={{ color: "var(--text2)" }}>{t("aboutVersion")} 1.0.0</div>
                    <p className="m-0 mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text2)" }}>{t("aboutText")}</p>
                  </div>
                </div>

                <div className="px-1 pt-2 text-[12.5px] font-semibold" style={{ color: "var(--text2)" }}>{t("aboutBy")}</div>
                <div className="credit">
                  <div className="avatar2" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>M</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[16px] font-semibold">minhtrong67</div>
                    <div className="text-[12.5px]" style={{ color: "var(--text2)" }}>{t("roleAuthorDesc")}</div>
                  </div>
                  <span className="pill2">{t("roleAuthor")}</span>
                </div>
                <div className="credit">
                  <div className="avatar2" style={{ background: "#D97757" }}>
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff" aria-hidden><path d={CLAUDE_PATH} /></svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[16px] font-semibold">Claude</div>
                    <div className="text-[12.5px]" style={{ color: "var(--text2)" }}>{t("aboutAiBy")}</div>
                  </div>
                  <span className="pill2">{t("roleAi")}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
