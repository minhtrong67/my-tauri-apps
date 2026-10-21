import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Bell, Check, ChevronRight, Copy, Info, Languages, Maximize, Monitor, Moon, Palette, PanelTop, Plug, Save, Stethoscope, Sun, Type,
} from "lucide-react";
import type { AppData, Settings, WindowMode } from "./types";
import type { AccountView } from "./lib";
import type { Prefs } from "./prefs";
import { ACCENTS } from "./accents";
import { rich, useI18n } from "./i18n";
import { Logo, Segmented, Switch } from "./ui";

async function copyText(t: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    if (ok) return true;
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

function Panel({ icon, title, desc, children, wide }: { icon: React.ReactNode; title: string; desc?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={`panel ${wide ? "wide" : ""}`}>
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

export function SettingsView({
  data,
  views,
  prefs,
  setPrefs,
  onSettings,
  onWindowMode,
}: {
  data: AppData;
  views: AccountView[];
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  onSettings: (s: Settings) => void;
  onWindowMode: (m: WindowMode) => void;
}) {
  const { t } = useI18n();
  const s = data.settings;
  const mode = data.window?.mode ?? "remember";

  return (
    <div className="settings">
      <div className="col">
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
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={prefs.accent === a.id}
                  className={`swatch ${prefs.accent === a.id ? "on" : ""}`}
                  style={{ ["--sw" as string]: a.seed }}
                  onClick={() => setPrefs({ accent: a.id })}
                >
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

      </div>

      <div className="col">
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

        <Panel icon={<Bell size={20} />} title={t("set.notify")}>
          <div className="row-between">
            <span>{t("set.notify.enable")}</span>
            <Switch checked={s.notify_enabled} onChange={(v) => onSettings({ ...s, notify_enabled: v })} label={t("set.notify.enable")} />
          </div>
          <div className={`threshold ${s.notify_enabled ? "" : "disabled"}`}>
            <div className="row-between">
              <label htmlFor="thr">{t("set.notify.threshold")}</label>
              <output className="value-pill">{s.notify_threshold}%</output>
            </div>
            <input
              id="thr"
              type="range"
              min={10}
              max={100}
              step={5}
              value={s.notify_threshold}
              disabled={!s.notify_enabled}
              onChange={(e) => onSettings({ ...s, notify_threshold: Number(e.target.value) })}
              style={{ ["--p" as string]: `${((s.notify_threshold - 10) / 90) * 100}%` }}
            />
          </div>
          <p className="hint">{rich(t("set.notify.hint"))}</p>
          <button className="btn tonal" onClick={() => invoke("test_notification")}>
            <Bell size={16} />
            {t("set.notify.test")}
          </button>
        </Panel>

      </div>

      <Panel wide icon={<Plug size={20} />} title={t("set.conn")} desc={t("set.conn.desc")}>
        <div className="conn">
          <ol className="steps">
            <li>{rich(t("set.conn.s1"))}</li>
            <li>{rich(t("set.conn.s2"))}</li>
            <li>{rich(t("set.conn.s3"))}</li>
          </ol>
          <div className="creds">
            <div className="cred">
              <span className="muted">{t("set.conn.port")}</span>
              <code>{data.port}</code>
            </div>
            <div className="cred">
              <span className="muted">{t("set.conn.token")}</span>
              <code className="token">{data.token}</code>
            </div>
            <CopyButton text={data.token} />
          </div>
        </div>
      </Panel>

      <Panel wide icon={<Info size={20} />} title={t("set.about")}>
          <div className="about-row"><div className="about">
            <Logo size={52} />
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
          </dl></div>
      </Panel>

      <Panel wide icon={<Stethoscope size={20} />} title={t("set.diag")} desc={t("set.diag.desc")}>
        {views.length === 0 && <div className="muted">{t("set.diag.none")}</div>}
        {views.map((v) => (
          <details key={v.account.id} className="diag">
            <summary>
              <ChevronRight size={16} aria-hidden="true" />
              {v.account.label}
            </summary>
            <pre>{JSON.stringify(v.account.last_raw ?? null, null, 2)}</pre>
          </details>
        ))}
      </Panel>
    </div>
  );
}
