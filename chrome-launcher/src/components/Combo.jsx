import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { labelOf, normalizeUrl } from "../sites.js";
import Fav from "./Fav.jsx";
import { Chevron, Cross } from "./Icons.jsx";

// Ô nhập địa chỉ kèm dropdown các trang đã lưu
export default function Combo({ value, onChange, onCommit, sites, onForget, t, autoFocus }) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(true); // true: hiện toàn bộ danh sách, false: lọc theo chữ đã gõ
  const [hi, setHi] = useState(-1);
  const [pos, setPos] = useState(null);
  const box = useRef(null);
  const input = useRef(null);

  const q = value.trim().toLowerCase();
  const list = useMemo(
    () => sites.filter((s) => all || !q || s.url.toLowerCase().includes(q)).slice(0, 8),
    [sites, q, all]
  );
  const bad = value.trim() !== "" && normalizeUrl(value) === null;

  const show = () => {
    const r = box.current?.getBoundingClientRect();
    if (r) setPos({ left: r.left, top: r.bottom + 4, width: r.width });
    setOpen(true);
  };
  const hide = () => {
    setOpen(false);
    setHi(-1);
  };

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  // Đóng khi cuộn vùng khác hoặc đổi cỡ cửa sổ
  useEffect(() => {
    if (!open) return;
    const off = (e) => {
      if (e.target instanceof Element && e.target.closest(".drop")) return;
      hide();
    };
    addEventListener("resize", off);
    addEventListener("scroll", off, true);
    return () => {
      removeEventListener("resize", off);
      removeEventListener("scroll", off, true);
    };
  }, [open]);

  const commit = () => {
    const u = normalizeUrl(value);
    if (u) {
      if (u !== value) onChange(u);
      onCommit(u);
    }
  };
  const pick = (s) => {
    onChange(s.url);
    onCommit(s.url);
    hide();
  };

  const onKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) show();
      setHi((h) => Math.min(h + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && hi >= 0 && list[hi]) pick(list[hi]);
      else {
        commit();
        hide();
      }
    } else if (e.key === "Escape" && open) {
      e.stopPropagation();
      hide();
    }
  };

  return (
    <div ref={box} className={`combo ${bad ? "bad" : ""}`}>
      <input
        ref={input}
        value={value}
        placeholder={t("tabPlaceholder")}
        aria-label={t("tabPlaceholder")}
        role="combobox"
        aria-expanded={open}
        aria-invalid={bad}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => {
          setAll(false);
          onChange(e.target.value);
          if (!open) show();
          setHi(-1);
        }}
        onFocus={() => {
          setAll(true);
          show();
        }}
        onBlur={() => {
          hide();
          commit();
        }}
        onKeyDown={onKey}
      />
      <button
        type="button"
        className="cv"
        tabIndex={-1}
        aria-label={t("savedSites")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (open) return hide();
          input.current?.focus();
          setAll(true);
          show();
        }}
      >
        <Chevron />
      </button>

      {open &&
        pos &&
        list.length > 0 &&
        createPortal(
          <ul
            className="drop"
            role="listbox"
            style={{ left: pos.left, top: pos.top, width: pos.width }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {list.map((s, i) => (
              <li
                key={s.url}
                role="option"
                aria-selected={i === hi}
                className="site"
                onMouseEnter={() => setHi(i)}
                onClick={() => pick(s)}
              >
                <Fav url={s.url} />
                <span className="si">
                  <b>{labelOf(s.url)}</b>
                  <small>{s.url}</small>
                </span>
                <button
                  type="button"
                  className="x"
                  aria-label={t("forget")}
                  title={t("forget")}
                  onClick={(e) => {
                    e.stopPropagation();
                    onForget(s.url);
                  }}
                >
                  <Cross size={18} />
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
}
