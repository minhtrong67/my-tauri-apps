import { useEffect, useMemo, useRef, useState } from "react";
import {
  IcSettings,
  IcClose,
  IcPaint,
  IcFont,
  IcLanguage,
  IcWindow,
  IcFolder,
  IcEdit,
  IcCheck,
  IcOpen,
  IcDelete,
  IcReset,
  IcSparkleS,
  IcPersonS,
  IcKeyboard,
  IcBook,
  IcDoc,
  IcDocText,
  IcTask,
  IcBadge,
  IcSearchS,
  IcWrap,
  IcNums,
  IcSync,
  IcSave,
  IcRecent,
  IcZoomIn,
  IcLayer,
  IcColor,
  IcTag,
  IcSystem,
  IcTab,
  type FluentIcon,
} from "../lib/icons";
import { useSettings, type Material } from "../lib/settings";
import { useOverlay, showOverlay, confirmDialog, toast } from "../lib/ui";
import {
  useT,
  PALETTE_EN,
  PALETTE_VI,
  resolveLang,
  type Key,
} from "../lib/i18n";
import { PALETTE } from "../lib/theme";
import { FONTS, type SizeKey, type FontKey } from "../lib/fonts";
import { isHex, cx } from "../lib/utils";
import { api, isTauri } from "../lib/tauri";
import { probeSupport, resolveFx, type FxSupport } from "../lib/material";
import * as C from "../lib/controller";
import { useApp } from "../lib/controller";
import { COMMANDS, KEY_ROWS } from "../lib/commands";
import {
  BADGE_PRESETS,
  badgeMd,
  badgeUrl,
  type TemplateId,
} from "../lib/templates";
import {
  Btn,
  IconBtn,
  Modal,
  Seg,
  Select,
  Switch,
  SettingRow,
  Radios,
} from "./base";

declare const __APP_VERSION__: string;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="sx">
      <h4>{title}</h4>
      <div className="card">{children}</div>
    </section>
  );
}

/** Mini window drawn with the colours each material has, so the choice is easy to see. */
const MATERIALS: { id: Material; name: Key; desc: Key }[] = [
  { id: "mica", name: "mat_mica", desc: "mat_mica_d" },
  { id: "alt", name: "mat_alt", desc: "mat_alt_d" },
  { id: "acrylic", name: "mat_acrylic", desc: "mat_acrylic_d" },
];

export function SettingsSheet() {
  const t = useT();
  const open = useOverlay((s) => s.open === "settings");
  const S = useSettings();
  const winMode = useApp((s) => s.winMode);
  const lang = resolveLang(S.lang),
    names = lang === "vi" ? PALETTE_VI : PALETTE_EN;
  const [hex, setHex] = useState(S.accent);
  const [sup, setSup] = useState<FxSupport | null>(null);
  useEffect(() => {
    setHex(S.accent);
  }, [S.accent]);
  useEffect(() => {
    probeSupport().then(setSup);
  }, []);
  const isPreset = PALETTE.some(
    (p) => p.hex.toLowerCase() === S.accent.toLowerCase(),
  );
  const close = () => showOverlay(null);
  const slider = ((S.zoom - 60) / 160) * 100;
  const fx = sup ? resolveFx(S.material, sup) : "off";
  const fxName =
    fx === "off" ? t("mat_solid") : t(MATERIALS.find((m) => m.id === fx)!.name);

  const pickDir = async () => {
    const p = await api.pickDir(S.saveDir);
    if (p) S.set({ saveDir: p });
  };
  const reset = async () => {
    const r = await confirmDialog({
      title: t("reset_q_title"),
      body: t("reset_q"),
      icon: IcReset,
      kind: "warning",
      actions: [
        { id: "ok", label: t("reset"), tone: "filled" },
        { id: "cancel", label: t("cancel"), tone: "tonal" },
      ],
    });
    if (r === "ok") {
      C.resetEverything();
      toast.success(t("reset_done"), { ms: 2200 });
    }
  };

  return (
    <Modal open={open} onClose={close} className="sheet" label={t("settings")}>
      <div className="sh">
        <header className="sh-head">
          <h2>
            <IcSettings aria-hidden="true" />
            {t("settings")}
          </h2>
          <IconBtn icon={IcClose} tip={t("close")} sc="Esc" onClick={close} />
        </header>
        <div className="sh-body">
          <Section title={t("s_appearance")}>
            <SettingRow
              icon={IcPaint}
              title={t("s_theme")}
              desc={t("s_theme_d")}
            >
              <Seg
                value={S.mode}
                onChange={(v) => S.set({ mode: v })}
                label={t("s_theme")}
                compact
                items={[
                  { value: "system", icon: IcSystem, tip: t("theme_system") },
                  { value: "light", label: t("theme_light") },
                  { value: "dark", label: t("theme_dark") },
                ]}
              />
            </SettingRow>
            <SettingRow
              icon={IcLayer}
              title={t("s_material")}
              desc={t("s_material_d")}
              stack
            >
              <div
                className="mats"
                role="radiogroup"
                aria-label={t("s_material")}
              >
                {MATERIALS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={S.material === m.id}
                    className={cx("mat", S.material === m.id && "on")}
                    onClick={() => S.set({ material: m.id })}
                  >
                    <span className={cx("mat-prev", m.id)}>
                      <i />
                      <i />
                    </span>
                    <b>{t(m.name)}</b>
                    <small>{t(m.desc)}</small>
                    {S.material === m.id && (
                      <IcCheck className="mat-ck" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
              <small className="hint">
                {isTauri ? t("mat_active", { m: fxName }) : t("mat_browser")}
                {isTauri && sup && !(sup.mica && sup.alt)
                  ? " · " + t("mat_need11")
                  : ""}
              </small>
            </SettingRow>
            <SettingRow
              icon={IcColor}
              title={t("s_color")}
              desc={t("s_color_d")}
              stack
            >
              <div
                className="swatches"
                role="radiogroup"
                aria-label={t("s_color")}
              >
                {PALETTE.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={
                      p.hex.toLowerCase() === S.accent.toLowerCase()
                    }
                    aria-label={names[p.id]}
                    data-tip={names[p.id]}
                    className={cx(
                      "swatch",
                      p.hex.toLowerCase() === S.accent.toLowerCase() && "on",
                    )}
                    style={{ ["--c" as string]: p.hex }}
                    onClick={() => S.set({ accent: p.hex })}
                  >
                    <IcCheck aria-hidden="true" />
                  </button>
                ))}
              </div>
              <div className="custom-c">
                <input
                  type="color"
                  aria-label={t("pick_color")}
                  data-tip={t("pick_color")}
                  value={isHex(S.accent) ? S.accent.toLowerCase() : "#0078d4"}
                  onChange={(e) =>
                    S.set({ accent: e.target.value.toUpperCase() })
                  }
                />
                <label className="fb-field">
                  <span aria-hidden="true">#</span>
                  <input
                    value={hex.replace("#", "")}
                    maxLength={6}
                    aria-label={t("s_custom")}
                    onChange={(e) => {
                      const v =
                        "#" +
                        e.target.value.replace(/[^0-9a-f]/gi, "").slice(0, 6);
                      setHex(v);
                      if (isHex(v)) S.set({ accent: v.toUpperCase() });
                    }}
                  />
                </label>
                <small className="hint">{isPreset ? "" : t("s_custom")}</small>
              </div>
            </SettingRow>
          </Section>

          <Section title={t("s_type")}>
            <SettingRow icon={IcFont} title={t("s_font")}>
              <Select<FontKey>
                label={t("s_font")}
                value={S.font}
                onChange={(v) => S.set({ font: v })}
                options={FONTS.map((f) => ({
                  value: f.key,
                  label: f.label,
                  style: { fontFamily: f.stack },
                }))}
              />
            </SettingRow>
            <SettingRow icon={IcDoc} title={t("s_size")}>
              <Seg<SizeKey>
                compact
                value={S.size}
                onChange={(v) => S.set({ size: v })}
                label={t("s_size")}
                items={[
                  { value: "sm", label: t("size_sm") },
                  { value: "md", label: t("size_md") },
                  { value: "lg", label: t("size_lg") },
                ]}
              />
            </SettingRow>
            <SettingRow icon={IcZoomIn} title={t("opt_zoom")}>
              <div className="slider-row">
                <input
                  type="range"
                  min={60}
                  max={220}
                  step={10}
                  value={S.zoom}
                  aria-label={t("opt_zoom")}
                  style={{ ["--p" as string]: slider + "%" }}
                  onChange={(e) => C.setZoom(+e.target.value)}
                />
                <output>{S.zoom}%</output>
              </div>
            </SettingRow>
          </Section>

          <Section title={t("s_language")}>
            <SettingRow icon={IcLanguage} title={t("s_language")}>
              <Seg
                compact
                value={S.lang}
                onChange={(v) => S.set({ lang: v })}
                label={t("s_language")}
                items={[
                  { value: "auto", label: t("lang_auto") },
                  { value: "en", label: "English" },
                  { value: "vi", label: "Tiếng Việt" },
                ]}
              />
            </SettingRow>
          </Section>

          <Section title={t("s_window")}>
            <SettingRow icon={IcWindow} title={t("s_window")} stack>
              <Radios<"remember" | "maximized">
                label={t("s_window")}
                value={winMode}
                onChange={(v) => C.setWindowMode(v)}
                items={[
                  {
                    value: "remember",
                    label: t("win_remember"),
                    desc: t("win_remember_d"),
                  },
                  {
                    value: "maximized",
                    label: t("win_max"),
                    desc: t("win_max_d"),
                  },
                ]}
              />
            </SettingRow>
          </Section>

          <Section title={t("s_files")}>
            <SettingRow
              icon={IcFolder}
              title={t("save_dir")}
              desc={t("save_dir_d")}
              stack
            >
              <div className="path-field">
                <div
                  className={cx("pf", S.saveDir && "set")}
                  data-tip={S.saveDir || undefined}
                >
                  <IcFolder aria-hidden="true" />
                  <span>{S.saveDir || t("save_dir_none")}</span>
                </div>
                <Btn tone="tonal" icon={IcOpen} size="sm" onClick={pickDir}>
                  {t("browse")}
                </Btn>
                {S.saveDir && (
                  <IconBtn
                    icon={IcDelete}
                    size="sm"
                    tip={t("clear")}
                    onClick={() => S.set({ saveDir: "" })}
                  />
                )}
              </div>
            </SettingRow>
            <Switch
              icon={IcSave}
              checked={S.autosave}
              onChange={(v) => S.set({ autosave: v })}
              title={t("opt_auto")}
              desc={t("opt_auto_d")}
            />
            <Switch
              icon={IcRecent}
              checked={S.restore}
              onChange={(v) => S.set({ restore: v })}
              title={t("opt_restore")}
              desc={t("opt_restore_d")}
            />
          </Section>

          <Section title={t("s_editor")}>
            <Switch
              icon={IcWrap}
              checked={S.wrap}
              onChange={(v) => {
                S.set({ wrap: v });
                C.applyEditorOptions();
              }}
              title={t("opt_wrap")}
              desc={t("opt_wrap_d")}
            />
            <Switch
              icon={IcNums}
              checked={S.lineNumbers}
              onChange={(v) => {
                S.set({ lineNumbers: v });
                C.applyEditorOptions();
              }}
              title={t("opt_nums")}
              desc={t("opt_nums_d")}
            />
            <Switch
              icon={IcSync}
              checked={S.syncScroll}
              onChange={(v) => S.set({ syncScroll: v })}
              title={t("opt_sync")}
              desc={t("opt_sync_d")}
            />
            <Switch
              icon={IcEdit}
              checked={S.spellcheck}
              onChange={(v) => {
                S.set({ spellcheck: v });
                C.applyEditorOptions();
              }}
              title={t("opt_spell")}
              desc={t("opt_spell_d")}
            />
          </Section>

          <Btn
            tone="error"
            icon={IcReset}
            onClick={reset}
            style={{ width: "100%" }}
          >
            {t("reset")}
          </Btn>

          <div className="credit-card">
            <b>{t("app_name")}</b>
            <span className="ver">
              {t("version")} {__APP_VERSION__}
            </span>
            <div className="rowc">
              <span>{t("made_by")}</span>
              <span className="chip-a">
                <IcPersonS aria-hidden="true" />
                minhtrong67
              </span>
            </div>
            <div className="rowc">
              <span>{t("with_ai")}</span>
              <span className="chip-ai">
                <IcSparkleS aria-hidden="true" />
                Claude
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function DlgHead({
  icon: I,
  title,
  onClose,
  sc,
}: {
  icon: FluentIcon;
  title: string;
  onClose: () => void;
  sc?: string;
}) {
  const t = useT();
  return (
    <div className="dlg-head">
      <span className="dlg-icon">
        <I aria-hidden="true" />
      </span>
      <h2>{title}</h2>
      <IconBtn
        icon={IcClose}
        size="sm"
        tip={t("close")}
        sc={sc}
        onClick={onClose}
      />
    </div>
  );
}

export function ShortcutsDialog() {
  const t = useT();
  const open = useOverlay((s) => s.open === "shortcuts");
  return (
    <Modal open={open} onClose={() => showOverlay(null)} label={t("shortcuts")}>
      <div className="dlg-in wide">
        <DlgHead
          icon={IcKeyboard}
          title={t("shortcuts")}
          onClose={() => showOverlay(null)}
          sc="Esc"
        />
        <div className="dlg-body">
          <div className="kbd-grid">
            {KEY_ROWS.map((r) => (
              <div className="r" key={r.label + r.keys}>
                <span>{t(r.label)}</span>
                <span>
                  {r.keys.split("+").map((k, i) => (
                    <kbd key={i} style={{ marginLeft: i ? 4 : 0 }}>
                      {k}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

const TPL: { id: TemplateId; icon: FluentIcon; k: Key; d: Key }[] = [
  { id: "blank", icon: IcDoc, k: "tpl_blank", d: "tpl_blank_d" },
  { id: "readme", icon: IcBook, k: "tpl_readme", d: "tpl_readme_d" },
  { id: "api", icon: IcDocText, k: "tpl_api", d: "tpl_api_d" },
  { id: "changelog", icon: IcTask, k: "tpl_changelog", d: "tpl_changelog_d" },
  { id: "notes", icon: IcEdit, k: "tpl_notes", d: "tpl_notes_d" },
];
export function TemplatesDialog() {
  const t = useT();
  const open = useOverlay((s) => s.open === "templates");
  return (
    <Modal open={open} onClose={() => showOverlay(null)} label={t("tpl_title")}>
      <div className="dlg-in wide">
        <DlgHead
          icon={IcBook}
          title={t("tpl_title")}
          onClose={() => showOverlay(null)}
          sc="Esc"
        />
        <div className="dlg-body">
          <div className="tpl-grid">
            {TPL.map((x) => (
              <button
                key={x.id}
                type="button"
                className="tpl"
                onClick={() => {
                  showOverlay(null);
                  setTimeout(() => C.newFromTemplate(x.id), 60);
                }}
              >
                <span className="ti">
                  <x.icon aria-hidden="true" />
                </span>
                <span className="tt">
                  <b>{t(x.k)}</b>
                  <small>{t(x.d)}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function BadgeDialog() {
  const t = useT();
  const open = useOverlay((s) => s.open === "badge");
  const [b, setB] = useState({
    label: "license",
    message: "MIT",
    color: "#2E7D32",
  });
  return (
    <Modal
      open={open}
      onClose={() => showOverlay(null)}
      label={t("badge_title")}
    >
      <div className="dlg-in confirm">
        <div className="dlg-text">
          <DlgHead
            icon={IcBadge}
            title={t("badge_title")}
            onClose={() => showOverlay(null)}
          />
          <div className="form">
            <div className="chips" aria-label={t("badge_presets")}>
              {BADGE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="chip-btn"
                  onClick={() =>
                    setB({
                      label: p.label,
                      message: p.message,
                      color: "#" + p.color,
                    })
                  }
                >
                  {p.label}: {p.message}
                </button>
              ))}
            </div>
            <div className="field">
              <label htmlFor="bl">{t("badge_label")}</label>
              <input
                id="bl"
                value={b.label}
                onChange={(e) => setB({ ...b, label: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="bm">{t("badge_message")}</label>
              <input
                id="bm"
                value={b.message}
                onChange={(e) => setB({ ...b, message: e.target.value })}
              />
            </div>
            <div className="custom-c" style={{ margin: 0 }}>
              <input
                type="color"
                aria-label={t("badge_color")}
                value={b.color.toLowerCase()}
                onChange={(e) => setB({ ...b, color: e.target.value })}
              />
              <small className="hint">
                {t("badge_color")}: {b.color.toUpperCase()}
              </small>
            </div>
            <div className="badge-prev" aria-label={t("badge_preview")}>
              {b.label && b.message ? (
                <img alt="" src={badgeUrl(b.label, b.message, b.color)} />
              ) : null}
            </div>
            <small className="hint">{t("badge_offline")}</small>
          </div>
        </div>
        <div className="dlg-act">
          <Btn
            tone="filled"
            disabled={!b.label || !b.message}
            onClick={() => {
              C.insertText(badgeMd(b.label, b.message, b.color));
              showOverlay(null);
            }}
          >
            {t("insert")}
          </Btn>
          <Btn tone="tonal" onClick={() => showOverlay(null)}>
            {t("cancel")}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

export function CommandPalette() {
  const t = useT();
  const open = useOverlay((s) => s.open === "palette");
  const hasDoc = useApp((s) => s.activeId !== null);
  const [q, setQ] = useState(""),
    [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null),
    list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) {
      setQ("");
      setI(0);
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [open]);
  const label = (c: (typeof COMMANDS)[number]) =>
    t(c.label) + (/^h[1-3]$/.test(c.id) ? " " + c.id[1] : "");
  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return COMMANDS.filter(
      (c) => !(c.needsDoc || c.needsEditor) || hasDoc,
    ).filter(
      (c) => !s || label(c).toLowerCase().includes(s) || c.id.includes(s),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, hasDoc, t]);
  useEffect(() => {
    setI(0);
  }, [q]);
  useEffect(() => {
    list.current?.children[i]?.scrollIntoView({ block: "nearest" });
  }, [i]);
  const run = (n: number) => {
    const c = items[n];
    if (!c) return;
    showOverlay(null);
    setTimeout(c.run, 80);
  };
  return (
    <Modal
      open={open}
      onClose={() => showOverlay(null)}
      label={t("commands")}
      align="top"
    >
      <div
        className="pal"
        role="combobox"
        aria-expanded="true"
        aria-haspopup="listbox"
      >
        <label className="fb-field">
          <IcSearchS aria-hidden="true" />
          <input
            ref={input}
            value={q}
            placeholder={t("pal_ph")}
            aria-label={t("pal_ph")}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setI((x) => Math.min(items.length - 1, x + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setI((x) => Math.max(0, x - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                run(i);
              }
            }}
          />
        </label>
        <div className="pal-list" ref={list} role="listbox">
          {items.length ? (
            items.map((c, n) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={n === i}
                className={cx("item", n === i && "on")}
                onMouseMove={() => setI(n)}
                onClick={() => run(n)}
              >
                <c.icon aria-hidden="true" />
                <span className="tx">
                  <b>{label(c)}</b>
                </span>
                {c.shortcut && <span className="sc">{c.shortcut}</span>}
              </button>
            ))
          ) : (
            <div className="pal-none">{t("pal_none")}</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
