import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal20Regular, type FluentIcon } from "@fluentui/react-icons";
import { IconButton } from "./Button";

export interface MenuItem { label: string; icon?: FluentIcon; onClick: () => void; danger?: boolean }

/** MenuFlyout của Fluent gắn vào nút "…". */
export function MoreMenu({ items, label }: { items: MenuItem[]; label: string }) {
  const btn = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ right: number; top: number; up: boolean } | null>(null);
  const close = () => setPos(null);
  const toggle = () => {
    if (pos) return close();
    const r = btn.current!.getBoundingClientRect();
    const h = items.length * 36 + 8;
    const up = window.innerHeight - r.bottom < h + 12 && r.top > h;
    setPos({ right: window.innerWidth - r.right, top: up ? r.top - 4 : r.bottom + 4, up });
  };
  useEffect(() => {
    if (!pos) return;
    pop.current?.querySelector<HTMLElement>("button")?.focus();
    const down = (e: PointerEvent) => { if (!pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); close(); btn.current?.querySelector("button")?.focus(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const bs = [...(pop.current?.querySelectorAll<HTMLElement>("button") ?? [])];
        const i = bs.indexOf(document.activeElement as HTMLElement);
        bs[(i + (e.key === "ArrowDown" ? 1 : bs.length - 1)) % bs.length]?.focus();
      }
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key, true);
    window.addEventListener("resize", close);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key, true); window.removeEventListener("resize", close); };
  }, [pos]);
  return (
    <>
      <div ref={btn}><IconButton icon={MoreHorizontal20Regular} label={label} onClick={toggle} active={!!pos} /></div>
      {pos && createPortal(
        <div ref={pop} role="menu" style={{ right: pos.right, top: pos.top, transform: pos.up ? "translateY(-100%)" : undefined }}
          className="animate-flyout fixed z-[650] min-w-[200px] rounded-ovl border border-flyout-line bg-flyout p-1 shadow-fly">
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" onClick={() => { close(); it.onClick(); }}
              className={`flex h-9 w-full items-center gap-3 rounded-ctl px-3 text-left text-body hover:bg-hov active:bg-prs ${it.danger ? "text-err" : ""}`}>
              {it.icon && <it.icon className="h-4 w-4" />}{it.label}
            </button>
          ))}
        </div>, document.body)}
    </>
  );
}
