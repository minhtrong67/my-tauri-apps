import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MenuList } from "./ui/Popover";
import { useUi } from "../store/ui";

export const closeContextMenu = () => useUi.setState({ contextMenu: null });

/** Fluent flyout shown at the pointer for right-clicks (editor, tabs). */
export function ContextMenuHost() {
  const menu = useUi((s) => s.contextMenu);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // keep the menu inside the window
  useLayoutEffect(() => {
    if (!menu) return setPos(null);
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pad = 8;
    setPos({
      left: Math.max(pad, Math.min(menu.x, window.innerWidth - r.width - pad)),
      top: Math.max(pad, Math.min(menu.y, window.innerHeight - r.height - pad)),
    });
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const down = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) closeContextMenu();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeContextMenu();
      }
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key, true);
    window.addEventListener("blur", closeContextMenu);
    window.addEventListener("resize", closeContextMenu);
    window.addEventListener("wheel", closeContextMenu, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("keydown", key, true);
      window.removeEventListener("blur", closeContextMenu);
      window.removeEventListener("resize", closeContextMenu);
      window.removeEventListener("wheel", closeContextMenu);
    };
  }, [menu]);

  if (!menu) return null;
  return createPortal(
    <div
      ref={ref}
      className="fl-flyout anim-menu-in fixed z-[130] max-h-[calc(100vh-1rem)] overflow-y-auto p-1 text-fg"
      style={{ left: pos?.left ?? menu.x, top: pos?.top ?? menu.y, visibility: pos ? "visible" : "hidden" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <MenuList entries={menu.entries} onDone={closeContextMenu} />
    </div>,
    document.body,
  );
}
