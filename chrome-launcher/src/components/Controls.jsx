import { Check } from "./Icons.jsx";

// Nút phân đoạn của Material 3
export function Seg({ label, value, options, onChange }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)}>
          <Check className="ck" />
          {o.l}
        </button>
      ))}
    </div>
  );
}

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
