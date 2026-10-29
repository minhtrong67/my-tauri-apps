import { memo, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, ChevronRight, X, CaseSensitive, WholeWord, Regex, Replace, ReplaceAll } from "lucide-react";
import { IconButton, Button } from "./ui/Button";
import { useFind } from "../store/ui";
import { useT } from "../lib/i18n";
import { closeFind, findFromCaret, findStep, refreshFind, replaceAll, replaceCurrent } from "../lib/find";
import { cn } from "../lib/utils";

function Toggle({ on, label, icon: Icon, onClick }: { on: boolean; label: string; icon: typeof Regex; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      data-tip={label}
      onClick={onClick}
      className={cn(
        "ripple grid h-8 w-8 flex-none place-items-center rounded-lg transition-[background-color,color,border-radius] duration-200 ease-standard active:scale-90",
        on ? "rounded-full bg-primary text-on-primary" : "text-on-surface-variant",
      )}
    >
      <Icon size={17} strokeWidth={2.2} />
    </button>
  );
}

export const FindBar = memo(function FindBar() {
  const t = useT();
  const f = useFind();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (f.open) {
      input.current?.focus();
      input.current?.select();
    }
  }, [f.open, f.focusTick]);

  if (!f.open) return null;

  const status = f.invalid
    ? t("find.invalid")
    : f.query && f.total === 0
      ? t("find.none")
      : f.query
        ? t("find.count", { c: f.current || "–", n: f.total >= 5000 ? "5000+" : f.total })
        : "";

  const change = (patch: Partial<typeof f>) => {
    useFind.setState(patch);
    queueMicrotask(findFromCaret);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeFind();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.target === input.current) findStep(e.shiftKey ? -1 : 1);
      else replaceCurrent();
    }
  };

  return (
    <div
      data-find
      onKeyDown={onKey}
      className="anim-slide-down absolute right-4 top-3 z-20 flex w-[min(34rem,calc(100%-2rem))] flex-col gap-2 rounded-[1.75rem] bg-surface-high p-2.5 shadow-e3 ring-1 ring-outline-variant/40"
    >
      <div className="flex items-center gap-1">
        <IconButton
          icon={ChevronRight}
          label={t("find.toggleReplace")}
          kbd="Ctrl+H"
          small
          pressed={f.replaceMode}
          onClick={() => useFind.setState({ replaceMode: !f.replaceMode })}
          className={cn("transition-transform duration-200 ease-standard", f.replaceMode && "rotate-90")}
        />
        <div className="flex min-w-0 flex-1 items-center rounded-2xl bg-surface-highest pr-1 focus-within:ring-2 focus-within:ring-primary">
          <input
            ref={input}
            value={f.query}
            onChange={(e) => change({ query: e.target.value })}
            placeholder={t("find.placeholder")}
            aria-label={t("find.placeholder")}
            spellCheck={false}
            className={cn("h-10 min-w-0 flex-1 bg-transparent px-3 text-[0.875rem] outline-none placeholder:text-on-surface-variant", f.invalid && "text-error")}
          />
          <Toggle on={f.matchCase} label={t("find.case")} icon={CaseSensitive} onClick={() => change({ matchCase: !f.matchCase })} />
          <Toggle on={f.wholeWord} label={t("find.word")} icon={WholeWord} onClick={() => change({ wholeWord: !f.wholeWord })} />
          <Toggle on={f.regex} label={t("find.regex")} icon={Regex} onClick={() => change({ regex: !f.regex })} />
        </div>
        <span className={cn("min-w-[4.2rem] flex-none px-1 text-center text-[0.75rem] font-medium tabular-nums", f.invalid || (f.query && !f.total) ? "text-error" : "text-on-surface-variant")}>
          {status}
        </span>
        <IconButton icon={ChevronUp} label={t("find.prev")} kbd="Shift+F3" small onClick={() => findStep(-1)} />
        <IconButton icon={ChevronDown} label={t("find.next")} kbd="F3" small onClick={() => findStep(1)} />
        <IconButton icon={X} label={t("find.close")} kbd="Esc" small onClick={closeFind} />
      </div>
      {f.replaceMode && (
        <div className="anim-fade-in flex items-center gap-1.5 pl-[2.1rem]">
          <input
            value={f.replace}
            onChange={(e) => useFind.setState({ replace: e.target.value })}
            placeholder={t("replace.placeholder")}
            aria-label={t("replace.placeholder")}
            spellCheck={false}
            className="h-10 min-w-0 flex-1 rounded-2xl bg-surface-highest px-3 text-[0.875rem] outline-none placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary"
          />
          <Button tone="tonal" icon={Replace} small onClick={() => { replaceCurrent(); refreshFind(); }}>{t("find.replace")}</Button>
          <Button tone="primary" icon={ReplaceAll} small onClick={replaceAll}>{t("find.replaceAll")}</Button>
        </div>
      )}
    </div>
  );
});
