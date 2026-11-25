import { Check } from "./Icons.jsx";

// Nút phân đoạn kiểu Fluent (SelectorBar)
export function Seg({ label, value, options, onChange }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

// RadioButton kèm mô tả
export function Opt({ checked, title, hint, onClick }) {
  return (
    <button type="button" role="radio" aria-checked={checked} className="opt" onClick={onClick}>
      <i className="radio" />
      <span>
        <b>{title}</b>
        <small>{hint}</small>
      </span>
    </button>
  );
}

// CheckBox của Fluent
export function Cb({ checked }) {
  return (
    <span className="cb" aria-hidden="true">
      <Check />
    </span>
  );
}

// Pivot: các tab ngang để chọn trình duyệt
export function Pivot({ label, value, items, onChange }) {
  return (
    <div className="pivot" role="tablist" aria-label={label}>
      {items.map((o) => (
        <button key={o.v} type="button" role="tab" aria-selected={value === o.v} onClick={() => onChange(o.v)}>
          {o.l}
        </button>
      ))}
    </div>
  );
}
