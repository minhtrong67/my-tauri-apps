import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Bell, BellRing, Check, ChevronRight, Copy, Database, Download, Eye, EyeOff, Info, KeyRound, Languages, Maximize, Monitor, Moon, Palette, PanelTop, Plug, Power, RotateCcw, Save, Stethoscope, Sun, Trash2, Type, TriangleAlert,
} from "lucide-react";
import type { AppData, Settings, WindowMode } from "./types";
import type { Prefs } from "./prefs";
import { ACCENTS } from "./accents";
import { FONT_FAMILIES } from "./fonts";
import { accountTitle } from "./lib";
import { rich, useI18n } from "./i18n";
import { ConfirmDialog, Logo, Segmented, Select, Switch, Tip, ToastKind } from "./ui";

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
    <button className="btn outlined" onClick={click}>
      {state === "ok" ? <Check size={16} /> : <Copy size={16} />}
      {state === "ok" ? t("set.copied") : state === "fail" ? t("set.copyFail") : t("set.copy")}
    </button>
  );
}

function Panel({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <header className="panel-head">
        <span className="panel-icon" aria-hidden="true">{icon}</span>
        <div>
          <h2>{title}</h2>
          {desc && <p className="hint">{desc}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

function ToggleRow({ title, desc, checked, onChange }: { title: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="row-between toggle-row">
      <div>
        <div className="field-label">{title}</div>
        {desc && <p className="hint">{desc}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
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
    <div className={`threshold ${disabled ? "disabled" : ""}`}>
      <div className="row-between">
        <label htmlFor={id}>{label}</label>
        <output className="value-pill">{value}%</output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} style={{ ["--p" as string]: `${((value - min) / (max - min)) * 100}%` }} />
    </div>
  );
}

type Cat = "appearance" | "system" | "notify" | "conn" | "data" | "about";

export function SettingsView({
  data,
  prefs,
  setPrefs,
  onSettings,
  onWindowMode,
  notify,
  refresh,
}: {
  data: AppData;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
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

  const cats: [Cat, string, React.ReactNode][] = [
    ["appearance", t("set.cat.appearance"), <Palette size={19} key="a" />],
    ["system", t("set.cat.system"), <PanelTop size={19} key="s" />],
    ["notify", t("set.cat.notify"), <Bell size={19} key="n" />],
    ["conn", t("set.cat.conn"), <Plug size={19} key="c" />],
    ["data", t("set.cat.data"), <Database size={19} key="d" />],
    ["about", t("set.cat.about"), <Info size={19} key="i" />],
  ];

  const set = (p: Partial<Settings>) => onSettings({ ...s, ...p });
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      notify("error", String(e));
    }
  };

  return (
    <div className="settings">
      <nav className="set-nav" role="tablist" aria-orientation="vertical" aria-label={t("nav.settings")}>
        {cats.map(([id, label, icon]) => (
          <button key={id} role="tab" aria-selected={cat === id} className={`set-tab ${cat === id ? "on" : ""}`} onClick={() => setCat(id)}>
            {icon}
            <span>{label}</span>
            <ChevronRight size={16} className="set-go" aria-hidden="true" />
          </button>
        ))}
      </nav>

      <div className="set-body" key={cat}>
        {cat === "appearance" && (
          <Panel icon={<Palette size={20} />} title={t("set.appearance")} desc={t("set.appearance.desc")}>
            <Field label={t("set.theme")} hint={t("set.theme.hint")}>
              <Segmented
                label={t("set.theme")}
                value={prefs.theme}
                onChange={(v) => setPrefs({ theme: v })}
                options={[
                  { value: "light", label: t("set.theme.light"), icon: <Sun size={16} /> },
                  { value: "dark", label: t("set.theme.dark"), icon: <Moon size={16} /> },
                  { value: "system", label: t("set.theme.system"), icon: <Monitor size={16} /> },
                ]}
              />
            </Field>
            <Field label={t("set.accent")} hint={t("set.accent.hint")}>
              <div className="swatches" role="radiogroup" aria-label={t("set.accent")}>
                {ACCENTS.map((a) => (
                  <button key={a.id} type="button" role="radio" aria-checked={prefs.accent === a.id} className={`swatch ${prefs.accent === a.id ? "on" : ""}`} style={{ ["--sw" as string]: a.seed }} onClick={() => setPrefs({ accent: a.id })}>
                    <span className="dot" aria-hidden="true">
                      <Check size={16} strokeWidth={3} />
                    </span>
                    <span className="sw-name">{t(`acc.${a.id}` as never)}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t("set.font")}>
              <Segmented
                label={t("set.font")}
                value={prefs.font}
                onChange={(v) => setPrefs({ font: v })}
                options={[
                  { value: "sm", label: t("set.font.sm"), icon: <Type size={13} /> },
                  { value: "md", label: t("set.font.md"), icon: <Type size={16} /> },
                  { value: "lg", label: t("set.font.lg"), icon: <Type size={19} /> },
                ]}
              />
            </Field>
            <Field label={t("set.ff")} hint={t("set.ff.hint")}>
              <Select
                label={t("set.ff")}
                icon={<Type size={17} aria-hidden="true" />}
                value={prefs.ff}
                onChange={(v) => setPrefs({ ff: v })}
                options={FONT_FAMILIES.map((f) => ({ value: f.id, label: f.id === "system" ? t("set.ff.system") : f.name, style: { fontFamily: f.css } }))}
              />
            </Field>
            <Field label={t("set.lang")} hint={t("set.lang.hint")}>
              <Segmented
                label={t("set.lang")}
                value={prefs.lang}
                onChange={(v) => setPrefs({ lang: v })}
                options={[
                  { value: "system", label: t("set.lang.system"), icon: <Languages size={16} /> },
                  { value: "en", label: "English" },
                  { value: "vi", label: "Tiếng Việt" },
                ]}
              />
            </Field>
          </Panel>
        )}

        {cat === "system" && (
          <>
            <Panel icon={<PanelTop size={20} />} title={t("set.window")} desc={t("set.window.desc")}>
              <div className="choices" role="radiogroup" aria-label={t("set.window")}>
                {(
                  [
                    ["remember", <Save size={20} key="s" />, t("set.window.remember"), t("set.window.remember.desc")],
                    ["maximized", <Maximize size={20} key="m" />, t("set.window.max"), t("set.window.max.desc")],
                  ] as [WindowMode, React.ReactNode, string, string][]
                ).map(([v, icon, title, desc]) => (
                  <button key={v} role="radio" aria-checked={mode === v} className={`choice ${mode === v ? "on" : ""}`} onClick={() => onWindowMode(v)}>
                    <span className="choice-icon">{icon}</span>
                    <span className="choice-text">
                      <b>{title}</b>
                      <span>{desc}</span>
                    </span>
                    <span className="radio" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </Panel>
            <Panel icon={<Power size={20} />} title={t("set.system")} desc={t("set.system.desc")}>
              <ToggleRow title={t("set.tray")} desc={t("set.tray.desc")} checked={s.close_to_tray} onChange={(v) => set({ close_to_tray: v })} />
              <ToggleRow
                title={t("set.autostart")}
                desc={t("set.autostart.desc")}
                checked={!!data.autostart}
                onChange={(v) => run(async () => { await invoke("set_autostart", { enabled: v }); await refresh(); })}
              />
            </Panel>
          </>
        )}

        {cat === "notify" && (
          <Panel icon={<Bell size={20} />} title={t("set.notify")}>
            <ToggleRow title={t("set.notify.enable")} checked={s.notify_enabled} onChange={(v) => set({ notify_enabled: v })} />
            <div className={`sub ${s.notify_enabled ? "" : "off"}`}>
              <ToggleRow title={t("set.notify.warn")} checked={s.warn_enabled} onChange={(v) => set({ warn_enabled: v })} />
              <Range id="warn" label={t("set.notify.warnAt")} value={s.warn_at} min={50} max={95} step={5} disabled={!s.notify_enabled || !s.warn_enabled} onChange={(v) => set({ warn_at: v })} />
              <div className="field-label">{t("set.notify.reset")}</div>
              <Range id="thr" label={t("set.notify.threshold")} value={s.notify_threshold} min={10} max={100} step={5} disabled={!s.notify_enabled} onChange={(v) => set({ notify_threshold: v })} />
              <ToggleRow title={t("set.notify.quiet")} desc={t("set.notify.quiet.desc")} checked={s.quiet_enabled} onChange={(v) => set({ quiet_enabled: v })} />
              <div className={`time-row ${s.quiet_enabled && s.notify_enabled ? "" : "disabled"}`}>
                <label className="tf">
                  <span>{t("set.notify.from")}</span>
                  <input type="time" value={toHM(s.quiet_from)} disabled={!s.quiet_enabled || !s.notify_enabled} onChange={(e) => set({ quiet_from: fromHM(e.target.value) })} />
                </label>
                <label className="tf">
                  <span>{t("set.notify.to")}</span>
                  <input type="time" value={toHM(s.quiet_to)} disabled={!s.quiet_enabled || !s.notify_enabled} onChange={(e) => set({ quiet_to: fromHM(e.target.value) })} />
                </label>
              </div>
            </div>
            <p className="hint">{rich(t("set.notify.hint"))}</p>
            <button className="btn tonal" onClick={() => invoke("test_notification")}>
              <BellRing size={16} aria-hidden="true" />
              {t("set.notify.test")}
            </button>
          </Panel>
        )}

        {cat === "conn" && (
          <>
            <Panel icon={<Plug size={20} />} title={t("set.conn")} desc={t("set.conn.desc")}>
              <div className={`conn-status ${connected ? "ok" : ""}`}>
                {connected ? <Check size={16} aria-hidden="true" /> : <TriangleAlert size={16} aria-hidden="true" />}
                {connected ? t("set.conn.ok") : t("set.conn.wait")}
              </div>
              {data.server_error && (
                <div className="inline-alert">
                  <TriangleAlert size={16} aria-hidden="true" />
                  <span>{t("server.error", { port: data.port })}</span>
                </div>
              )}
              <div className="conn">
                <ol className="steps">
                  <li>{rich(t("set.conn.s1"))}</li>
                  <li>{rich(t("set.conn.s2"))}</li>
                  <li>{rich(t("set.conn.s3"))}</li>
                </ol>
                <div className="creds">
                  <div className="cred">
                    <span className="muted">{t("set.conn.port")}</span>
                    <div className="port-row">
                      <input className="num" inputMode="numeric" value={port} aria-label={t("set.conn.port")} aria-invalid={!portOk} onChange={(e) => setPort(e.target.value.replace(/\D/g, "").slice(0, 5))} />
                      <button className="btn tonal sm" disabled={!portOk || portNum === data.port} onClick={() => setDlg({ kind: "port" })}>
                        <RotateCcw size={15} aria-hidden="true" />
                        {t("set.conn.port.save")}
                      </button>
                    </div>
                    <span className="hint">{t("set.conn.port.hint")}</span>
                  </div>
                  <div className="cred">
                    <span className="muted">{t("set.conn.token")}</span>
                    <div className="token-row">
                      <code className="token">{showToken ? data.token : "•".repeat(24)}</code>
                      <Tip label={showToken ? t("set.conn.hide") : t("set.conn.show")}>
                        <button className="btn icon-btn" aria-label={showToken ? t("set.conn.hide") : t("set.conn.show")} onClick={() => setShowToken((v) => !v)}>
                          {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </Tip>
                    </div>
                  </div>
                  <div className="btn-row">
                    <CopyButton text={data.token} />
                    <button className="btn outlined" onClick={() => setDlg({ kind: "token" })}>
                      <KeyRound size={16} aria-hidden="true" />
                      {t("set.conn.regen")}
                    </button>
                  </div>
                </div>
              </div>
            </Panel>
            <Panel icon={<Stethoscope size={20} />} title={t("set.diag")} desc={t("set.diag.desc")}>
              {data.accounts.filter((a) => !a.hidden).length === 0 ? (
                <p className="hint">{t("set.diag.none")}</p>
              ) : (
                data.accounts
                  .filter((a) => !a.hidden)
                  .map((a) => (
                    <details key={a.id} className="diag">
                      <summary>
                        <ChevronRight size={16} aria-hidden="true" />
                        {a.email ?? a.id}
                      </summary>
                      <pre>{JSON.stringify(a.last_raw ?? null, null, 2)}</pre>
                    </details>
                  ))
              )}
            </Panel>
          </>
        )}

        {cat === "data" && (
          <>
            <Panel icon={<Database size={20} />} title={t("set.data.hidden")}>
              {hidden.length === 0 ? (
                <p className="hint">{t("set.data.hidden.none")}</p>
              ) : (
                <ul className="hidden-list">
                  {hidden.map((a) => {
                    const name = accountTitle(a);
                    return (
                      <li key={a.id}>
                        <div className="hl-text">
                          <b>{name}</b>
                          {a.email && a.email !== name && <span className="muted">{a.email}</span>}
                        </div>
                        <button className="btn tonal sm" onClick={() => run(async () => { await invoke("restore_account", { id: a.id }); await refresh(); notify("success", t("set.data.restored")); })}>
                          <RotateCcw size={15} aria-hidden="true" />
                          {t("set.data.restore")}
                        </button>
                        <Tip label={t("set.data.forget")}>
                          <button className="btn icon-btn danger-ic" aria-label={t("set.data.forget")} onClick={() => setDlg({ kind: "forget", id: a.id, name })}>
                            <Trash2 size={18} />
                          </button>
                        </Tip>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
            <Panel icon={<Download size={20} />} title={t("set.data.export")} desc={t("set.data.export.desc")}>
              <button className="btn filled" onClick={() => run(async () => notify("success", t("set.data.exported", { path: await invoke<string>("export_csv") }), 8000))}>
                <Download size={17} aria-hidden="true" />
                {t("set.data.export")}
              </button>
            </Panel>
          </>
        )}

        {cat === "about" && (
          <Panel icon={<Info size={20} />} title={t("set.about")}>
            <div className="about-row">
              <div className="about">
                <Logo size={56} />
                <div>
                  <div className="about-name">Claude Tracker</div>
                  <p className="hint">{t("set.about.tag")}</p>
                </div>
              </div>
              <dl className="facts">
                <dt>{t("set.about.author")}</dt>
                <dd>
                  <b>minhtrong67</b> <span className="muted">· {t("set.about.ai")}</span>
                </dd>
                <dt>{t("set.about.license")}</dt>
                <dd>{t("set.about.license.value")}</dd>
                <dt>{t("set.about.version")}</dt>
                <dd>{__APP_VERSION__}</dd>
              </dl>
            </div>
            <div className="field">
              <div className="field-label">{t("set.shortcuts")}</div>
              <ul className="shortcuts">
                {(
                  [
                    ["Ctrl+R", t("short.refresh")],
                    ["Ctrl+F", t("short.search")],
                    ["Ctrl+1", t("short.dashboard")],
                    ["Ctrl+,", t("short.settings")],
                  ] as [string, string][]
                ).map(([k, l]) => (
                  <li key={k}>
                    <kbd>{k}</kbd>
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        )}
      </div>

      {dlg?.kind === "token" && (
        <ConfirmDialog
          icon={<KeyRound size={22} />}
          confirmIcon={<KeyRound size={17} aria-hidden="true" />}
          title={t("set.conn.regen.title")}
          body={t("set.conn.regen.body")}
          confirm={t("set.conn.regen.confirm")}
          cancel={t("dialog.cancel")}
          onCancel={() => setDlg(null)}
          onConfirm={() => run(async () => { setDlg(null); await invoke("regenerate_token"); await refresh(); setShowToken(true); })}
        />
      )}
      {dlg?.kind === "port" && (
        <ConfirmDialog
          tone="primary"
          icon={<RotateCcw size={22} />}
          confirmIcon={<RotateCcw size={17} aria-hidden="true" />}
          title={t("set.conn.port.title")}
          body={t("set.conn.port.body", { port: portNum })}
          confirm={t("set.conn.port.confirm")}
          cancel={t("dialog.cancel")}
          onCancel={() => setDlg(null)}
          onConfirm={() => run(async () => { setDlg(null); await invoke("set_port", { port: portNum }); })}
        />
      )}
      {dlg?.kind === "forget" && (
        <ConfirmDialog
          icon={<Trash2 size={22} />}
          confirmIcon={<Trash2 size={17} aria-hidden="true" />}
          title={t("set.data.forget.title")}
          body={t("set.data.forget.body", { name: dlg.name })}
          confirm={t("set.data.forget")}
          cancel={t("dialog.cancel")}
          onCancel={() => setDlg(null)}
          onConfirm={() => run(async () => { const id = dlg.id; setDlg(null); await invoke("forget_account", { id }); await refresh(); })}
        />
      )}
    </div>
  );
}
