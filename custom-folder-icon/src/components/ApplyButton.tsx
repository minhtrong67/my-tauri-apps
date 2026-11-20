import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Wand2 } from "lucide-react";
import { ASPECTS, type Aspect } from "../lib/scope";
import type { Key } from "../lib/i18n";
import { Checkbox, useT } from "./ui";

const LABEL: Record<Aspect, Key> = { style: "aspStyle", color: "aspColor", pattern: "aspPattern", icon: "aspIcon", text: "aspText" };

interface Props { count: number; disabled: boolean; scope: Aspect[]; onScope: (s: Aspect[]) => void; onApply: () => void }

/** Split button: Apply + a menu to choose which parts of the design are applied. */
export default function ApplyButton({ count, disabled, scope, onScope, onApply }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const root = useRef<HTMLDivElement>(null);
  const partial = scope.length < ASPECTS.length;

  const toggleMenu = () => {
    if (!open && root.current) {
      const r = root.current.getBoundingClientRect();
      setPos({ left: Math.max(8, Math.min(r.right - 300, innerWidth - 308)), top: r.bottom + 6 });
    }
    setOpen(!open);
  };
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open]);

  const flip = (a: Aspect) => onScope(scope.includes(a) ? scope.filter((x) => x !== a) : [...scope, a]);

  return (
    <>
      <div ref={root} className="split">
        <button className="btn btn-accent split-main" disabled={disabled} onClick={onApply}>
          <Wand2 size={16} />{t("apply")}{count > 1 ? ` (${count})` : ""}
        </button>
        <button className="btn btn-accent split-arrow" data-tip={t("applyOptions")} onClick={toggleMenu} data-open={open}>
          {partial && <span className="text-[11px] font-semibold tabular-nums">{scope.length}/{ASPECTS.length}</span>}
          <ChevronDown size={16} />
        </button>
      </div>
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[99]" onMouseDown={() => setOpen(false)} />
          <div className="menu !p-3" style={{ left: pos.left, top: pos.top, width: 300, transformOrigin: "top right" }}>
            <div className="mb-1 flex items-center justify-between">
              <b className="text-[13px]">{t("scopeTitle")}</b>
              <button className="btn btn-subtle btn-sm" onClick={() => onScope(scope.length === ASPECTS.length ? [] : ASPECTS)}>
                {scope.length === ASPECTS.length ? t("scopeNone") : t("scopeAll")}
              </button>
            </div>
            <div className="flex flex-col">
              {ASPECTS.map((a) => (
                <div key={a} className="opt !h-9 gap-3" onClick={() => flip(a)} role="button">
                  <Checkbox checked={scope.includes(a)} onChange={() => flip(a)} />
                  <span>{t(LABEL[a])}</span>
                </div>
              ))}
            </div>
            <p className="m-0 mt-2 text-[12px] leading-snug" style={{ color: "var(--text2)" }}>{t("scopeHint")}</p>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
