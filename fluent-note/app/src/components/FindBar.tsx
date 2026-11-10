import { memo, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, ChevronRight, X, CaseSensitive, WholeWord, Regex, Replace, ReplaceAll } from "./ui/icons";
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
        "grid h-6 w-6 flex-none place-items-center rounded transition-colors duration-100",
        on ? "bg-brand text-on-brand hover:bg-brand-hover active:bg-brand-pressed" : "text-fg2 hover:bg-sub-hover active:bg-sub-press",
      )}
    >
      <Icon size={15} strokeWidth={1.8} />
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
      className="fl-flyout anim-slide-down absolute right-4 top-3 z-20 flex w-[min(34rem,calc(100%-2rem))] flex-col gap-2 p-2"
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
        <div className="fl-field min-w-0 flex-1 pr-1">
          <input
            ref={input}
            value={f.query}
            onChange={(e) => change({ query: e.target.value })}
            placeholder={t("find.placeholder")}
            aria-label={t("find.placeholder")}
            spellCheck={false}
            className={cn(f.invalid && "text-err")}
          />
          <Toggle on={f.matchCase} label={t("find.case")} icon={CaseSensitive} onClick={() => change({ matchCase: !f.matchCase })} />
          <Toggle on={f.wholeWord} label={t("find.word")} icon={WholeWord} onClick={() => change({ wholeWord: !f.wholeWord })} />
          <Toggle on={f.regex} label={t("find.regex")} icon={Regex} onClick={() => change({ regex: !f.regex })} />
        </div>
        <span className={cn("min-w-[4.2rem] flex-none px-1 text-center text-xs tabular-nums", f.invalid || (f.query && !f.total) ? "text-err" : "text-fg2")}>
          {status}
        </span>
        <IconButton icon={ChevronUp} label={t("find.prev")} kbd="Shift+F3" small onClick={() => findStep(-1)} />
        <IconButton icon={ChevronDown} label={t("find.next")} kbd="F3" small onClick={() => findStep(1)} />
        <IconButton icon={X} label={t("find.close")} kbd="Esc" small onClick={closeFind} />
      </div>
      {f.replaceMode && (
        <div className="anim-fade-in flex items-center gap-1.5 pl-[2rem]">
          <div className="fl-field min-w-0 flex-1">
          <input
            value={f.replace}
            onChange={(e) => useFind.setState({ replace: e.target.value })}
            placeholder={t("replace.placeholder")}
            aria-label={t("replace.placeholder")}
            spellCheck={false}
          />
          </div>
          <Button tone="tonal" icon={Replace} small onClick={() => { replaceCurrent(); refreshFind(); }}>{t("find.replace")}</Button>
          <Button tone="primary" icon={ReplaceAll} small onClick={replaceAll}>{t("find.replaceAll")}</Button>
        </div>
      )}
    </div>
  );
});
