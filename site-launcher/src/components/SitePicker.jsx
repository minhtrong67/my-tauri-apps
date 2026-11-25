import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MAX_SITES, labelOf, normalizeUrl } from "../sites.js";
import Fav from "./Fav.jsx";
import { Cb } from "./Controls.jsx";
import { Chevron, Cross, Plus } from "./Icons.jsx";

// Ô chọn nhiều trang web: gõ địa chỉ mới hoặc tick trong danh sách đã lưu (tối đa MAX_SITES)
export default function SitePicker({ value, onChange, sites, onRemember, onForget, t }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const [pos, setPos] = useState(null);
  const box = useRef(null);
  const input = useRef(null);

  const full = value.length >= MAX_SITES;
  const q = text.trim().toLowerCase();
  const typed = normalizeUrl(text); // "" | null (sai) | địa chỉ đầy đủ
  const bad = text.trim() !== "" && typed === null;

  // Các trang đã lưu, cộng thêm trang đang chọn nhưng đã bị xóa khỏi danh sách đã lưu
  const items = useMemo(() => {
    const urls = sites.map((s) => s.url);
    for (const u of value) if (!urls.includes(u)) urls.push(u);
    const list = urls.filter((u) => !q || u.toLowerCase().includes(q)).map((url) => ({ url }));
    if (typed && !urls.includes(typed)) list.unshift({ url: typed, add: true });
    return list;
  }, [sites, value, q, typed]);

  const show = () => {
    const r = box.current?.getBoundingClientRect();
    if (r) setPos({ left: r.left, top: r.bottom + 4, width: r.width });
    setOpen(true);
  };
  const hide = () => {
    setOpen(false);
    setHi(-1);
  };

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

  const toggle = (url) => {
    if (value.includes(url)) onChange(value.filter((u) => u !== url));
    else if (!full) {
      onChange([...value, url]);
      onRemember([url]);
    }
  };
  // Gõ xong: luôn ghi nhớ địa chỉ; chọn luôn nếu còn chỗ
  const addTyped = () => {
    if (!typed) return;
    onRemember([typed]);
    if (!value.includes(typed) && !full) onChange([...value, typed]);
    setText("");
    setHi(-1);
  };
  const pickItem = (it) => (it.add ? addTyped() : toggle(it.url));

  const onKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) show();
      setHi((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && hi >= 0 && items[hi]) pickItem(items[hi]);
      else addTyped();
    } else if (e.key === "Backspace" && !text && value.length) {
      onChange(value.slice(0, -1));
    } else if (e.key === "Escape" && open) {
      e.stopPropagation();
      hide();
    }
  };

  return (
    <div className="picker">
      <div
        ref={box}
        className={`pick ${bad ? "bad" : ""}`}
        onMouseDown={(e) => {
          if (e.target.closest("button, input")) return;
          e.preventDefault();
          input.current?.focus();
        }}
      >
        {value.map((u) => (
          <span key={u} className="tok" title={u}>
            <Fav url={u} size={16} />
            <span className="tl">{labelOf(u)}</span>
            <button
              type="button"
              className="tx"
              aria-label={`${t("removeSite")}: ${labelOf(u)}`}
              title={t("removeSite")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange(value.filter((x) => x !== u))}
            >
              <Cross size={12} />
            </button>
          </span>
        ))}
        <input
          ref={input}
          value={text}
          placeholder={value.length ? t("placeholderMore") : t("placeholder")}
          aria-label={t("placeholder")}
          role="combobox"
          aria-expanded={open}
          aria-invalid={bad}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => {
            setText(e.target.value);
            setHi(-1);
            if (!open) show();
          }}
          onFocus={show}
          onBlur={() => {
            hide();
            addTyped();
          }}
          onKeyDown={onKey}
        />
        <button
          type="button"
          className="cv"
          tabIndex={-1}
          aria-label={t("toggleList")}
          title={t("toggleList")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (open) return hide();
            input.current?.focus();
            show();
          }}
        >
          <Chevron />
        </button>
      </div>

      {bad ? (
        <p className="pnote err">{t("invalidUrl")}</p>
      ) : full ? (
        <p className="pnote">{t("maxReached", { max: MAX_SITES })}</p>
      ) : null}

      {open &&
        pos &&
        createPortal(
          <ul
            className="drop"
            role="listbox"
            aria-multiselectable="true"
            style={{ left: pos.left, top: pos.top, width: pos.width }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <li className="dh" aria-hidden="true">
              <span>{t("savedSites")}</span>
              <span className="cnt">
                {value.length}/{MAX_SITES}
              </span>
            </li>
            {items.length === 0 && <li className="dempty">{t("noSaved")}</li>}
            {items.map((it, i) => {
              const on = value.includes(it.url);
              const dis = !on && full && !it.add;
              return (
                <li
                  key={it.add ? "add" : it.url}
                  role="option"
                  aria-selected={on}
                  aria-disabled={dis}
                  className={`site ${i === hi ? "hi" : ""} ${it.add ? "add" : ""}`}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => !dis && pickItem(it)}
                >
                  {it.add ? (
                    <span className="plus">
                      <Plus />
                    </span>
                  ) : (
                    <span className={`chk ${on ? "on" : ""}`}>
                      <Cb />
                    </span>
                  )}
                  <Fav url={it.url} />
                  <span className="si">
                    <b>{it.add ? t("addSite", { url: labelOf(it.url) }) : labelOf(it.url)}</b>
                    <small>{it.url}</small>
                  </span>
                  {!it.add && (
                    <button
                      type="button"
                      className="x"
                      aria-label={t("forget")}
                      title={t("forget")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onForget(it.url);
                      }}
                    >
                      <Cross size={14} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
}
