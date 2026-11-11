import { ReactNode, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Alert20Regular, AlertOn20Regular, AnimalCat20Regular, ArrowDownload20Regular, ArrowMaximize20Regular, ArrowReset20Regular, Checkmark16Regular, ChevronRight16Regular, Color20Regular, Copy20Regular, Database20Regular, Delete20Regular, Desktop20Regular, Eye20Regular, EyeOff20Regular, Key20Regular, KeyReset20Regular, LocalLanguage20Regular, Power20Regular, PlugConnected20Regular, Save20Regular, Stethoscope20Regular, TextFont20Regular, TextFontSize20Regular, WeatherMoon20Regular, Window20Regular, Layer20Regular, Flash20Regular,
} from "@fluentui/react-icons";
import type { AppData, Settings, WindowMode } from "./types";
import type { EffectId, EffectResult, Prefs } from "./prefs";
import { ACCENTS } from "./accents";
import { FONT_FAMILIES } from "./fonts";
import { accountTitle } from "./lib";
import { Key, rich, useI18n } from "./i18n";
import { ConfirmDialog, InfoBar, Logo, Segmented, Select, Switch, Tip, ToastKind } from "./ui";

async function copyText(t: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {}
  try {
    await invoke("copy_text", { text: t });
    return true;
  } catch {
    return false;
  }
}

function CopyButton({ text }: { text: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  const click = async () => {
    setState((await copyText(text)) ? "ok" : "fail");
    setTimeout(() => setState("idle"), 1800);
  };
  return (
    <button className="btn" onClick={click}>
      {state === "ok" ? <Checkmark16Regular /> : <Copy20Regular />}
      {state === "ok" ? t("set.copied") : state === "fail" ? t("set.copyFail") : t("set.copy")}
    </button>
  );
}

/* ----- SettingsCard kiểu Windows 11: biểu tượng · tiêu đề + mô tả · điều khiển bên phải ----- */
function SGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="sgroup">
      {title && <h2 className="sgroup-title">{title}</h2>}
      <div className="sgroup-body">{children}</div>
    </section>
  );
}
function SCard({ icon, title, desc, children, stack, disabled }: { icon?: ReactNode; title: string; desc?: ReactNode; children?: ReactNode; stack?: boolean; disabled?: boolean }) {
  return (
    <div className={`scard ${stack ? "stack" : ""} ${disabled ? "disabled" : ""}`}>
      <div className="scard-head">
        {icon && <span className="scard-ic" aria-hidden="true">{icon}</span>}
        <div className="scard-text">
          <div className="scard-title">{title}</div>
          {desc && <div className="scard-desc">{desc}</div>}
        </div>
        {!stack && children && <div className="scard-ctl">{children}</div>}
      </div>
      {stack && children && <div className="scard-stack">{children}</div>}
    </div>
  );
}
function RadioCard({ icon, title, desc, on, onClick }: { icon: ReactNode; title: string; desc: string; on: boolean; onClick: () => void }) {
  return (
    <button role="radio" aria-checked={on} className={`scard pick ${on ? "on" : ""}`} onClick={onClick}>
      <div className="scard-head">
        <span className="scard-ic" aria-hidden="true">{icon}</span>
        <div className="scard-text">
          <div className="scard-title">{title}</div>
          <div className="scard-desc">{desc}</div>
        </div>
        <span className="radio" aria-hidden="true" />
      </div>
    </button>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const toHM = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const fromHM = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : 0;
};

function Range({ id, label, value, min, max, step, disabled, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; disabled?: boolean; onChange: (v: number) => void }) {
  return (
    <div className={`slider ${disabled ? "disabled" : ""}`}>
      <input id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled} aria-label={label} onChange={(e) => onChange(Number(e.target.value))} style={{ ["--p" as string]: `${((value - min) / (max - min)) * 100}%` }} />
      <output className="value-pill" htmlFor={id}>{value}%</output>
    </div>
  );
}

/** Xem trước chất liệu: cửa sổ thu nhỏ đặt trên hình nền mô phỏng */
function FxPreview({ kind }: { kind: EffectId }) {
  return (
    <div className="fx-prev" data-v={kind} aria-hidden="true">
      <div className="fx-win">
        <div className="fx-bar"><i /><i /><i /></div>
        <div className="fx-body">
          <div className="fx-nav"><b className="sel" /><b /><b /></div>
          <div className="fx-layer"><u /><u /></div>
        </div>
      </div>
    </div>
  );
}

type Cat = "appearance" | "system" | "notify" | "conn" | "data" | "about";
const FX_ORDER: EffectId[] = ["mica", "acrylic", "tabbed"];

export function SettingsView({ data, prefs, setPrefs, fx, onSettings, onWindowMode, notify, refresh }: {
  data: AppData;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  fx: EffectResult;
  onSettings: (s: Settings) => void;
  onWindowMode: (m: WindowMode) => void;
  notify: (kind: ToastKind, text: string, ms?: number) => void;
  refresh: () => Promise<AppData>;
}) {
  const { t } = useI18n();
  const [cat, setCat] = useState<Cat>("appearance");
  const s = data.settings;
  const mode = data.window?.mode ?? "remember";
  const [showToken, setShowToken] = useState(false);
  const [port, setPort] = useState(String(data.port));
  const [dlg, setDlg] = useState<null | { kind: "token" } | { kind: "port" } | { kind: "forget"; id: string; name: string }>(null);
  useEffect(() => setPort(String(data.port)), [data.port]);
  const portNum = Number(port);
  const portOk = Number.isInteger(portNum) && portNum >= 1024 && portNum <= 65535;
  const hidden = data.accounts.filter((a) => a.hidden);
  const connected = !!data.ext_seen;

  const cats: [Cat, Key][] = [
    ["appearance", "set.cat.appearance"],
    ["system", "set.cat.system"],
    ["notify", "set.cat.notify"],
    ["conn", "set.cat.conn"],
    ["data", "set.cat.data"],
    ["about", "set.cat.about"],
  ];
  const catIdx = cats.findIndex(([id]) => id === cat);

  const set = (p: Partial<Settings>) => onSettings({ ...s, ...p });
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      notify("error", String(e));
    }
  };
  const inTauri = "__TAURI_INTERNALS__" in window || document.documentElement.dataset.mock === "1";

  return (
    <div className="settings">
      <div className="pivot" role="tablist" aria-label={t("nav.settings")}>
        {cats.map(([id, key]) => (
          <button key={id} role="tab" aria-selected={cat === id} className={`pivot-tab ${cat === id ? "on" : ""}`} onClick={() => setCat(id)}>
            {t(key)}
          </button>
        ))}
      </div>

      <div className="set-body" key={cat} data-i={catIdx}>
        {cat === "appearance" && (
          <>
            <SGroup title={t("set.appearance")}>
              <SCard icon={<WeatherMoon20Regular />} title={t("set.theme")} desc={t("set.theme.desc")}>
                <Select
                  label={t("set.theme")}
                  value={prefs.theme}
                  onChange={(v) => setPrefs({ theme: v })}
                  options={[
                    { value: "light", label: t("set.theme.light") },
                    { value: "dark", label: t("set.theme.dark") },
                    { value: "system", label: t("set.theme.system") },
                  ]}
                />
              </SCard>
              <SCard stack icon={<Color20Regular />} title={t("set.accent")} desc={t("set.accent.hint")}>
                <div className="swatches" role="radiogroup" aria-label={t("set.accent")}>
                  {ACCENTS.map((a) => (
                    <Tip key={a.id} label={t(`acc.${a.id}` as Key)}>
                      <button type="button" role="radio" aria-checked={prefs.accent === a.id} aria-label={t(`acc.${a.id}` as Key)} className={`swatch ${a.id === "system" ? "sys" : ""} ${prefs.accent === a.id ? "on" : ""}`} style={{ ["--sw" as string]: a.seed }} onClick={() => setPrefs({ accent: a.id })}>
                        {a.id === "system" ? <Desktop20Regular aria-hidden="true" /> : <Checkmark16Regular aria-hidden="true" />}
                      </button>
                    </Tip>
                  ))}
                </div>
              </SCard>
            </SGroup>

            <SGroup title={t("set.material")}>
              <SCard icon={<Layer20Regular />} title={t("set.fx.enable")} desc={t("set.fx.enable.desc")}>
                <Switch checked={prefs.transparency} onChange={(v) => setPrefs({ transparency: v })} label={t("set.fx.enable")} />
              </SCard>
              <SCard stack disabled={!prefs.transparency} icon={<Flash20Regular />} title={t("set.material")} desc={t("set.material.desc")}>
                <div className="fx-grid" role="radiogroup" aria-label={t("set.material")}>
                  {FX_ORDER.map((id) => (
                    <button key={id} role="radio" aria-checked={prefs.effect === id} disabled={!prefs.transparency} className={`fx-card ${prefs.effect === id ? "on" : ""}`} onClick={() => setPrefs({ effect: id })}>
                      <FxPreview kind={id} />
                      <span className="fx-meta">
                        <span className="radio" aria-hidden="true" />
                        <span className="fx-text">
                          <b>{t(`fx.${id}` as Key)}</b>
                          <small>{t(`fx.${id}.desc` as Key)}</small>
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                {prefs.transparency && inTauri && fx.applied !== prefs.effect && fx.error && !fx.error.includes("only available on Windows") && (
                  <InfoBar kind="warning">{fx.applied === "none" ? t("fx.solid", { req: t(`fx.${prefs.effect}` as Key) }) : t("fx.fallback", { req: t(`fx.${prefs.effect}` as Key), used: t(`fx.${fx.applied}` as Key) })}</InfoBar>
                )}
                {!inTauri && <InfoBar kind="info">{t("fx.browser")}</InfoBar>}
                <p className="hint">{t("fx.hint")}</p>
              </SCard>
            </SGroup>

            <SGroup title={t("set.font")}>
              <SCard icon={<TextFontSize20Regular />} title={t("set.font")}>
                <Segmented
                  label={t("set.font")}
                  value={prefs.font}
                  onChange={(v) => setPrefs({ font: v })}
                  options={[
                    { value: "sm", label: t("set.font.sm") },
                    { value: "md", label: t("set.font.md") },
                    { value: "lg", label: t("set.font.lg") },
                  ]}
                />
              </SCard>
              <SCard icon={<TextFont20Regular />} title={t("set.ff")} desc={t("set.ff.hint")}>
                <Select label={t("set.ff")} value={prefs.ff} onChange={(v) => setPrefs({ ff: v })} options={FONT_FAMILIES.map((f) => ({ value: f.id, label: f.name, style: { fontFamily: f.css } }))} />
              </SCard>
              <SCard icon={<LocalLanguage20Regular />} title={t("set.lang")} desc={t("set.lang.hint")}>
                <Segmented
                  label={t("set.lang")}
                  value={prefs.lang}
                  onChange={(v) => setPrefs({ lang: v })}
                  options={[
                    { value: "system", label: t("set.lang.system") },
                    { value: "en", label: "English" },
                    { value: "vi", label: "Tiếng Việt" },
                  ]}
                />
              </SCard>
              <SCard icon={<AnimalCat20Regular />} title={t("set.motion")} desc={t("set.motion.desc")}>
                <Switch checked={prefs.motion} onChange={(v) => setPrefs({ motion: v })} label={t("set.motion")} />
              </SCard>
            </SGroup>
          </>
        )}

        {cat === "system" && (
          <>
            <SGroup title={t("set.window")}>
              <div role="radiogroup" aria-label={t("set.window")} className="radio-list">
                <RadioCard icon={<Save20Regular />} title={t("set.window.remember")} desc={t("set.window.remember.desc")} on={mode === "remember"} onClick={() => onWindowMode("remember")} />
                <RadioCard icon={<ArrowMaximize20Regular />} title={t("set.window.max")} desc={t("set.window.max.desc")} on={mode === "maximized"} onClick={() => onWindowMode("maximized")} />
              </div>
            </SGroup>
            <SGroup title={t("set.system")}>
              <SCard icon={<Window20Regular />} title={t("set.tray")} desc={t("set.tray.desc")}>
                <Switch checked={s.close_to_tray} onChange={(v) => set({ close_to_tray: v })} label={t("set.tray")} />
              </SCard>
              <SCard icon={<Power20Regular />} title={t("set.autostart")} desc={t("set.autostart.desc")}>
                <Switch checked={!!data.autostart} onChange={(v) => run(async () => { await invoke("set_autostart", { enabled: v }); await refresh(); })} label={t("set.autostart")} />
              </SCard>
            </SGroup>
          </>
        )}

        {cat === "notify" && (
          <SGroup title={t("set.notify")}>
            <SCard icon={<Alert20Regular />} title={t("set.notify.enable")}>
              <Switch checked={s.notify_enabled} onChange={(v) => set({ notify_enabled: v })} label={t("set.notify.enable")} />
            </SCard>
            <SCard icon={<AlertOn20Regular />} title={t("set.notify.warn")} disabled={!s.notify_enabled}>
              <Switch checked={s.warn_enabled} disabled={!s.notify_enabled} onChange={(v) => set({ warn_enabled: v })} label={t("set.notify.warn")} />
            </SCard>
            <SCard stack title={t("set.notify.warnAt")} disabled={!s.notify_enabled || !s.warn_enabled}>
              <Range id="warn" label={t("set.notify.warnAt")} value={s.warn_at} min={50} max={95} step={5} disabled={!s.notify_enabled || !s.warn_enabled} onChange={(v) => set({ warn_at: v })} />
            </SCard>
            <SCard stack title={t("set.notify.reset")} desc={t("set.notify.threshold")} disabled={!s.notify_enabled}>
              <Range id="thr" label={t("set.notify.threshold")} value={s.notify_threshold} min={10} max={100} step={5} disabled={!s.notify_enabled} onChange={(v) => set({ notify_threshold: v })} />
            </SCard>
            <SCard title={t("set.notify.quiet")} desc={t("set.notify.quiet.desc")} disabled={!s.notify_enabled}>
              <Switch checked={s.quiet_enabled} disabled={!s.notify_enabled} onChange={(v) => set({ quiet_enabled: v })} label={t("set.notify.quiet")} />
            </SCard>
            <SCard stack title={`${t("set.notify.from")} → ${t("set.notify.to")}`} disabled={!s.quiet_enabled || !s.notify_enabled}>
              <div className="time-row">
                <label className="tf">
                  <span>{t("set.notify.from")}</span>
                  <input type="time" value={toHM(s.quiet_from)} disabled={!s.quiet_enabled || !s.notify_enabled} onChange={(e) => set({ quiet_from: fromHM(e.target.value) })} />
                </label>
                <label className="tf">
                  <span>{t("set.notify.to")}</span>
                  <input type="time" value={toHM(s.quiet_to)} disabled={!s.quiet_enabled || !s.notify_enabled} onChange={(e) => set({ quiet_to: fromHM(e.target.value) })} />
                </label>
              </div>
            </SCard>
            <p className="hint pad">{rich(t("set.notify.hint"))}</p>
            <button className="btn" onClick={() => invoke("test_notification")}>
              <AlertOn20Regular aria-hidden="true" />
              {t("set.notify.test")}
            </button>
          </SGroup>
        )}

        {cat === "conn" && (
          <>
            <SGroup title={t("set.conn")}>
              <InfoBar kind={connected ? "success" : "warning"}>{connected ? t("set.conn.ok") : t("set.conn.wait")}</InfoBar>
              {data.server_error && <InfoBar kind="error">{t("server.error", { port: data.port })}</InfoBar>}
              <SCard stack icon={<PlugConnected20Regular />} title={t("set.conn")} desc={t("set.conn.desc")}>
                <ol className="steps">
                  <li>{rich(t("set.conn.s1"))}</li>
                  <li>{rich(t("set.conn.s2"))}</li>
                  <li>{rich(t("set.conn.s3"))}</li>
                </ol>
              </SCard>
              <SCard icon={<Desktop20Regular />} title={t("set.conn.port")} desc={t("set.conn.port.hint")}>
                <div className="port-row">
                  <input className="num" inputMode="numeric" value={port} aria-label={t("set.conn.port")} aria-invalid={!portOk} onChange={(e) => setPort(e.target.value.replace(/\D/g, "").slice(0, 5))} />
                  <button className="btn" disabled={!portOk || portNum === data.port} onClick={() => setDlg({ kind: "port" })}>
                    <ArrowReset20Regular aria-hidden="true" />
                    {t("set.conn.port.save")}
                  </button>
                </div>
              </SCard>
              <SCard stack icon={<Key20Regular />} title={t("set.conn.token")}>
                <div className="token-row">
                  <code className="token">{showToken ? data.token : "•".repeat(24)}</code>
                  <Tip label={showToken ? t("set.conn.hide") : t("set.conn.show")}>
                    <button className="btn subtle icon-btn" aria-label={showToken ? t("set.conn.hide") : t("set.conn.show")} onClick={() => setShowToken((v) => !v)}>
                      {showToken ? <EyeOff20Regular /> : <Eye20Regular />}
                    </button>
                  </Tip>
                  <CopyButton text={data.token} />
                  <button className="btn" onClick={() => setDlg({ kind: "token" })}>
                    <KeyReset20Regular aria-hidden="true" />
                    {t("set.conn.regen")}
                  </button>
                </div>
              </SCard>
            </SGroup>
            <SGroup title={t("set.diag")}>
              <p className="hint pad">{t("set.diag.desc")}</p>
              {data.accounts.filter((a) => !a.hidden).length === 0 ? (
                <p className="hint pad">{t("set.diag.none")}</p>
              ) : (
                data.accounts.filter((a) => !a.hidden).map((a) => (
                  <details key={a.id} className="diag">
                    <summary>
                      <Stethoscope20Regular aria-hidden="true" />
                      <span>{a.email ?? a.id}</span>
                      <ChevronRight16Regular className="diag-chev" aria-hidden="true" />
                    </summary>
                    <pre>{JSON.stringify(a.last_raw ?? null, null, 2)}</pre>
                  </details>
                ))
              )}
            </SGroup>
          </>
        )}

        {cat === "data" && (
          <>
            <SGroup title={t("set.data.hidden")}>
              {hidden.length === 0 ? (
                <p className="hint pad">{t("set.data.hidden.none")}</p>
              ) : (
                hidden.map((a) => {
                  const name = accountTitle(a);
                  return (
                    <SCard key={a.id} icon={<EyeOff20Regular />} title={name} desc={a.email && a.email !== name ? a.email : undefined}>
                      <div className="btn-row">
                        <button className="btn" onClick={() => run(async () => { await invoke("restore_account", { id: a.id }); await refresh(); notify("success", t("set.data.restored")); })}>
                          <ArrowReset20Regular aria-hidden="true" />
                          {t("set.data.restore")}
                        </button>
                        <Tip label={t("set.data.forget")}>
                          <button className="btn subtle icon-btn crit" aria-label={t("set.data.forget")} onClick={() => setDlg({ kind: "forget", id: a.id, name })}>
                            <Delete20Regular />
                          </button>
                        </Tip>
                      </div>
                    </SCard>
                  );
                })
              )}
            </SGroup>
            <SGroup title={t("set.data.export")}>
              <SCard icon={<Database20Regular />} title={t("set.data.export")} desc={t("set.data.export.desc")}>
                <button className="btn accent" onClick={() => run(async () => notify("success", t("set.data.exported", { path: await invoke<string>("export_csv") }), 8000))}>
                  <ArrowDownload20Regular aria-hidden="true" />
                  {t("set.data.export")}
                </button>
              </SCard>
            </SGroup>
          </>
        )}

        {cat === "about" && (
          <>
            <SGroup title={t("set.about")}>
              <div className="about-card">
                <Logo size={72} />
                <div className="about-text">
                  <div className="about-name">Fluent Claude</div>
                  <p className="hint">{t("set.about.tag")}</p>
                  <dl className="facts">
                    <dt>{t("set.about.author")}</dt>
                    <dd><b>minhtrong67</b> <span className="muted">· {t("set.about.ai")}</span></dd>
                    <dt>{t("set.about.license")}</dt>
                    <dd>{t("set.about.license.value")}</dd>
                    <dt>{t("set.about.version")}</dt>
                    <dd>{__APP_VERSION__}</dd>
                  </dl>
                </div>
              </div>
            </SGroup>
            <SGroup title={t("set.shortcuts")}>
              <ul className="shortcuts">
                {(
                  [
                    ["Ctrl+R", t("short.refresh")],
                    ["Ctrl+F", t("short.search")],
                    ["Ctrl+1", t("short.dashboard")],
                    ["Ctrl+,", t("short.settings")],
                    ["Ctrl+B", t("nav.toggle")],
                  ] as [string, string][]
                ).map(([k, l]) => (
                  <li key={k}>
                    <kbd>{k}</kbd>
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </SGroup>
          </>
        )}
      </div>

      {dlg?.kind === "token" && (
        <ConfirmDialog confirmIcon={<KeyReset20Regular aria-hidden="true" />} title={t("set.conn.regen.title")} body={t("set.conn.regen.body")} confirm={t("set.conn.regen.confirm")} cancel={t("dialog.cancel")} onCancel={() => setDlg(null)} onConfirm={() => run(async () => { setDlg(null); await invoke("regenerate_token"); await refresh(); setShowToken(true); })} />
      )}
      {dlg?.kind === "port" && (
        <ConfirmDialog tone="primary" confirmIcon={<ArrowReset20Regular aria-hidden="true" />} title={t("set.conn.port.title")} body={t("set.conn.port.body", { port: portNum })} confirm={t("set.conn.port.confirm")} cancel={t("dialog.cancel")} onCancel={() => setDlg(null)} onConfirm={() => run(async () => { setDlg(null); await invoke("set_port", { port: portNum }); })} />
      )}
      {dlg?.kind === "forget" && (
        <ConfirmDialog confirmIcon={<Delete20Regular aria-hidden="true" />} title={t("set.data.forget.title")} body={t("set.data.forget.body", { name: dlg.name })} confirm={t("set.data.forget")} cancel={t("dialog.cancel")} onCancel={() => setDlg(null)} onConfirm={() => run(async () => { const id = dlg.id; setDlg(null); await invoke("forget_account", { id }); await refresh(); })} />
      )}
    </div>
  );
}
