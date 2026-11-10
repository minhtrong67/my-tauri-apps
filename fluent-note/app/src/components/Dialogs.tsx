import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, X, Search, Github, Heart, Sparkles, Info, Check } from "./ui/icons";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Logo } from "./AppBar";
import { useUi, resolveConfirm } from "../store/ui";
import { useSettings } from "../store/settings";
import { commands, type Command, type Group } from "../lib/commands";
import { goToLine, lineCount } from "../lib/editorOps";
import { activeEditor } from "../lib/editors";
import { openUrl } from "../lib/tauri";
import { useT } from "../lib/i18n";
import { cn } from "../lib/utils";

export const REPO_URL = "https://github.com/minhtrong67/my-tauri-apps";

/** Author credit (always the last thing in Settings, also shown in About). */
export function CreditCard({ compact }: { compact?: boolean }) {
  const t = useT();
  return (
    <div className="fl-card flex w-full items-center gap-3 px-4 py-3">
      <Heart size={18} strokeWidth={1.6} className="flex-none text-brand" aria-hidden />
      <p className="min-w-0 flex-1 text-sm leading-snug text-fg2">
        {t("credit.by")} <strong className="font-semibold text-fg">minhtrong67</strong>{" "}
        {t("credit.with")}{" "}
        <strong className="inline-flex items-center gap-1 font-semibold text-fg">
          <Sparkles size={12} strokeWidth={1.8} /> Claude
        </strong>
      </p>
      {!compact && (
        <button
          type="button"
          data-tip={t("credit.open")}
          aria-label={t("credit.open")}
          onClick={() => void openUrl(REPO_URL)}
          className="icon-btn"
        >
          <Github size={17} strokeWidth={1.6} />
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Confirm */
export function ConfirmDialog() {
  const c = useUi((s) => s.confirm);
  const last = useRef(c);
  if (c) last.current = c;
  const v = c ?? last.current;
  const cancelId = v?.actions.find((a) => a.id === "cancel")?.id ?? v?.actions[0]?.id ?? "cancel";
  if (!v) return null;
  return (
    <Dialog
      open={!!c}
      onClose={() => resolveConfirm(cancelId)}
      title={v.title}
      icon={v.icon}
      iconTone={v.iconTone ?? "primary"}
      size="sm"
      hideClose
      footer={v.actions.map((a, i) => (
        <Button key={a.id} tone={a.tone} icon={a.icon} onClick={() => resolveConfirm(a.id)} data-autofocus={i === v.actions.length - 1 ? true : undefined}>
          {a.label}
        </Button>
      ))}
    >
      <p className="selectable px-6 pb-6 text-sm leading-5 text-fg2">{v.message}</p>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ Go to */
export function GotoDialog() {
  const t = useT();
  const open = useUi((s) => s.gotoOpen);
  const [value, setValue] = useState("");
  const [total, setTotal] = useState(1);
  useEffect(() => {
    if (open) {
      const ta = activeEditor();
      setTotal(ta ? lineCount(ta.value) : 1);
      setValue("");
    }
  }, [open]);
  const close = () => useUi.setState({ gotoOpen: false });
  const go = () => {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return;
    close();
    setTimeout(() => goToLine(Math.min(Math.max(1, n), total)), 60);
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title={t("goto.title")}
      icon={ArrowDownToLine}
      size="sm"
      footer={
        <>
          <Button tone="neutral" icon={X} onClick={close}>{t("common.cancel")}</Button>
          <Button tone="primary" icon={ArrowDownToLine} onClick={go} disabled={!value}>{t("goto.go")}</Button>
        </>
      }
    >
      <div className="px-6 pb-6">
        <label className="mb-1 block text-sm" htmlFor="goto-input">{t("goto.label")}</label>
        <div className="fl-field">
          <input
            id="goto-input"
            data-autofocus
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 9))}
            onKeyDown={(e) => e.key === "Enter" && go()}
          />
        </div>
        <p className="mt-2 text-xs text-fg2">{t("goto.hint", { n: total })}</p>
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ About */
export function AboutDialog() {
  const t = useT();
  const open = useUi((s) => s.aboutOpen);
  const close = () => useUi.setState({ aboutOpen: false });
  return (
    <Dialog
      open={open}
      onClose={close}
      title={t("about.title")}
      icon={Info}
      size="md"
      footer={
        <>
          <Button tone="neutral" icon={Github} onClick={() => void openUrl(REPO_URL)}>GitHub</Button>
          <Button tone="primary" icon={Check} onClick={close} data-autofocus>{t("common.close")}</Button>
        </>
      }
    >
      <div className="px-6 pb-6">
        <div className="flex items-center gap-4 pb-5">
          <Logo size={56} />
          <div className="min-w-0">
            <h3 className="text-xl font-semibold leading-7">{t("app.name")}</h3>
            <p className="text-sm text-fg2">{t("about.version")} {__APP_VERSION__}</p>
          </div>
        </div>
        <p className="selectable pb-4 text-sm leading-5">{t("about.desc")}</p>
        <CreditCard compact />
        <p className="mt-3 text-xs text-fg2">{t("about.ai")}</p>
      </div>
    </Dialog>
  );
}

/* --------------------------------------------------------- Command palette */
const GROUPS: Group[] = ["file", "edit", "view", "app"];

export function CommandPalette() {
  const t = useT();
  const open = useUi((s) => s.paletteOpen);
  useSettings((s) => s.lang);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const close = () => useUi.setState({ paletteOpen: false });

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
    }
  }, [open]);

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return commands
      .filter((c) => !c.hidden && (!c.enabled || c.enabled()))
      .filter((c) => !needle || t(c.label).toLowerCase().includes(needle) || t("palette.group." + c.group).toLowerCase().includes(needle))
      .sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group));
  }, [q, t, open]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${idx}"]`)?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  const run = (c: Command | undefined) => {
    if (!c) return;
    close();
    setTimeout(c.run, 120);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") setIdx((i) => Math.min(items.length - 1, i + 1));
    else if (e.key === "ArrowUp") setIdx((i) => Math.max(0, i - 1));
    else if (e.key === "Enter") run(items[idx]);
    else return;
    e.preventDefault();
  };

  let lastGroup: Group | null = null;
  return (
    <Dialog open={open} onClose={close} title={t("palette.title")} size="lg" headerless placement="top" className="max-h-[min(32rem,80vh)]" bodyClassName="flex flex-col">
      <div className="flex-none px-3 pb-2 pt-3">
        <div className="fl-field h-10">
          <Search size={16} strokeWidth={1.6} className="ml-3 flex-none text-fg2" />
          <input
            data-autofocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            onKeyDown={onKey}
            placeholder={t("palette.placeholder")}
            aria-label={t("palette.title")}
          />
        </div>
      </div>
      <div ref={list} role="listbox" className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-fg2">{t("palette.empty")}</p>}
        {items.map((c, i) => {
          const header = c.group !== lastGroup ? c.group : null;
          lastGroup = c.group;
          const Icon = c.icon;
          return (
            <div key={c.id}>
              {header && <div className="px-3 pb-1 pt-3 text-xs font-semibold text-fg2">{t("palette.group." + header)}</div>}
              <div
                data-i={i}
                role="option"
                aria-selected={i === idx}
                onPointerMove={() => setIdx(i)}
                onClick={() => run(c)}
                className={cn(
                  "flex h-9 cursor-default items-center gap-3 rounded px-3 text-sm transition-colors duration-75",
                  i === idx ? "fl-selected" : "",
                )}
              >
                <Icon size={16} strokeWidth={1.6} className="flex-none text-fg2" />
                <span className="min-w-0 flex-1 truncate">{t(c.label)}</span>
                {c.checked && c.checked() && <Check size={16} strokeWidth={2} className="text-brand" />}
                {c.kbd && <span className="kbd">{c.kbd}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex-none border-t border-divider px-4 py-2 text-xs text-fg2">{t("palette.hint")}</div>
    </Dialog>
  );
}
