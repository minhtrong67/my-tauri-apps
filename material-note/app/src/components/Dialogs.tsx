import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, X, Search, Github, Heart, Sparkles, Info, Command as CommandIcon, Check } from "lucide-react";
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

/** Highlighted author credit (always the last thing in Settings, also shown in About). */
export function CreditCard({ compact }: { compact?: boolean }) {
  const t = useT();
  return (
    <div className="relative flex w-full items-center gap-3 overflow-hidden rounded-3xl bg-tertiary-container px-4 py-3 text-on-tertiary-container">
      <div className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-[40%_60%_55%_45%] bg-primary opacity-15 blur-xl" />
      <span className="relative grid h-10 w-10 flex-none place-items-center rounded-2xl bg-tertiary text-on-tertiary">
        <Heart size={20} fill="currentColor" strokeWidth={2} />
      </span>
      <p className="relative min-w-0 flex-1 text-[0.8125rem] leading-snug">
        {t("credit.by")} <strong className="rounded-md bg-on-tertiary-container/12 px-1.5 py-0.5 font-bold">minhtrong67</strong>{" "}
        {t("credit.with")}{" "}
        <strong className="inline-flex items-center gap-1 rounded-md bg-on-tertiary-container/12 px-1.5 py-0.5 font-bold">
          <Sparkles size={12} /> Claude
        </strong>
      </p>
      {!compact && (
        <button
          type="button"
          data-tip={t("credit.open")}
          aria-label={t("credit.open")}
          onClick={() => void openUrl(REPO_URL)}
          className="icon-btn ripple relative text-on-tertiary-container"
        >
          <Github size={20} />
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
      <p className="selectable px-6 pb-2 text-[0.9375rem] leading-relaxed text-on-surface-variant">{v.message}</p>
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
      <div className="px-6 pb-2">
        <label className="mb-1.5 block text-[0.75rem] font-semibold text-on-surface-variant" htmlFor="goto-input">{t("goto.label")}</label>
        <input
          id="goto-input"
          data-autofocus
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 9))}
          onKeyDown={(e) => e.key === "Enter" && go()}
          className="h-12 w-full rounded-2xl bg-surface-highest px-4 text-[1rem] outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="mt-2 text-[0.75rem] text-on-surface-variant">{t("goto.hint", { n: total })}</p>
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
          <Button tone="tonal" icon={Github} onClick={() => void openUrl(REPO_URL)}>GitHub</Button>
          <Button tone="primary" icon={Check} onClick={close} data-autofocus>{t("common.close")}</Button>
        </>
      }
    >
      <div className="relative overflow-hidden px-6 pb-3">
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-[45%_55%_60%_40%] bg-primary-container opacity-60 blur-2xl [animation:drift_12s_ease-in-out_infinite]" />
        <div className="relative flex flex-col items-center py-4 text-center">
          <div className="[animation:float_6s_ease-in-out_infinite]">
            <Logo size={88} spin />
          </div>
          <h3 className="mt-3 text-[1.375rem] font-bold tracking-tight">{t("app.name")}</h3>
          <p className="selectable mt-1 max-w-sm text-[0.875rem] text-on-surface-variant">{t("about.desc")}</p>
          <span className="mt-3 inline-flex items-center rounded-full bg-secondary-container px-3 py-1 text-[0.75rem] font-semibold text-on-secondary-container">
            {t("about.version")} {__APP_VERSION__}
          </span>
        </div>
        <CreditCard compact />
        <p className="mt-3 text-center text-[0.75rem] text-on-surface-variant">{t("about.ai")}</p>
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
    <Dialog open={open} onClose={close} title={t("palette.title")} size="lg" headerless className="max-h-[min(34rem,90vh)]" bodyClassName="flex flex-col">
      <div className="flex flex-none items-center gap-3 px-5 pb-2 pt-5">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-primary-container text-on-primary-container"><CommandIcon size={20} /></span>
        <div className="flex h-12 flex-1 items-center gap-2 rounded-2xl bg-surface-highest px-4 focus-within:ring-2 focus-within:ring-primary">
          <Search size={18} className="flex-none text-on-surface-variant" />
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
            className="h-full min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-on-surface-variant"
          />
        </div>
      </div>
      <div ref={list} role="listbox" className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {items.length === 0 && <p className="px-4 py-8 text-center text-[0.875rem] text-on-surface-variant">{t("palette.empty")}</p>}
        {items.map((c, i) => {
          const header = c.group !== lastGroup ? c.group : null;
          lastGroup = c.group;
          const Icon = c.icon;
          return (
            <div key={c.id}>
              {header && <div className="px-3 pb-1 pt-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant">{t("palette.group." + header)}</div>}
              <div
                data-i={i}
                role="option"
                aria-selected={i === idx}
                onPointerMove={() => setIdx(i)}
                onClick={() => run(c)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-[0.875rem] transition-[background-color,border-radius] duration-200",
                  i === idx ? "rounded-xl bg-secondary-container text-on-secondary-container" : "text-on-surface",
                )}
              >
                <Icon size={18} className="flex-none opacity-80" />
                <span className="min-w-0 flex-1 truncate">{t(c.label)}</span>
                {c.checked && c.checked() && <Check size={16} className="text-primary" />}
                {c.kbd && <span className="kbd">{c.kbd}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex-none border-t border-outline-variant/50 px-5 py-2.5 text-[0.6875rem] text-on-surface-variant">{t("palette.hint")}</div>
    </Dialog>
  );
}
