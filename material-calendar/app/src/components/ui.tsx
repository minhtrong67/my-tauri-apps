import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Info, X, XCircle } from 'lucide-react';
import { t } from '../lib/core';
import { dismiss, useStore } from '../lib/store';

export const Tip = ({ text, side, children }: { text: string; side?: 'r'; children: ReactNode }) => (
  <span className={`tip relative inline-flex ${side || ''}`}>{children}<span role="tooltip" className="tipbox">{text}</span></span>
);

const V = {
  filled: 'bg-primary text-onp shadow-md', tonal: 'bg-sc text-onsc', plain: 'bg-cont text-on',
  danger: 'bg-[#b3261e] text-white dark:bg-[#f2b8b5] dark:text-[#601410]',
};
export function Btn({ v = 'plain', icon, children, className = '', ...r }: { v?: keyof typeof V; icon?: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...r} className={`btn ${V[v]} ${className}`}>{icon}{children}</button>;
}
export function IconBtn({ tip, side, children, className = '', ...r }: { tip: string; side?: 'r' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Tip text={tip} side={side}><button {...r} aria-label={tip} className={`size-11 grid place-items-center rounded-full hover:rounded-2xl hover:bg-cont morph press ${className}`}>{children}</button></Tip>;
}

export function Select({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={`w-full h-12 px-4 bg-cont flex items-center justify-between gap-2 morph ${open ? 'rounded-xl ring-2 ring-primary' : 'rounded-2xl'}`}>
        <span className="truncate">{options.find((o) => o[0] === value)?.[1]}</span><ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <ul className="pop absolute z-50 mt-1 w-full max-h-52 overflow-auto rounded-2xl bg-high shadow-xl p-1">
        {options.map(([v, l]) => <li key={v}><button type="button" onClick={() => { onChange(v); setOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl ${v === value ? 'bg-sc text-onsc font-semibold' : 'hover:bg-cont'}`}>{l}</button></li>)}
      </ul>}
    </div>
  );
}

export function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: [T, ReactNode][]; onChange: (v: T) => void }) {
  return <div className="flex gap-1 p-1 rounded-full bg-cont">{options.map(([v, l]) => (
    <button key={String(v)} onClick={() => onChange(v)} className={`flex-1 h-9 px-3 inline-flex items-center justify-center gap-1.5 text-sm font-medium morph press ${v === value ? 'bg-primary text-onp rounded-full' : 'rounded-xl hover:rounded-full hover:bg-high'}`}>{l}</button>))}</div>;
}
export const Switch = ({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) => (
  <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`relative w-14 h-8 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-high border-2 border-outline'}`}>
    <span className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-onp transition-all duration-300 ${on ? 'left-7 size-6' : 'left-1.5 size-4 bg-outline'}`} /></button>
);

export function Modal({ side, onClose, children }: { side?: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', h); return () => removeEventListener('keydown', h); }, [onClose]);
  return <div onMouseDown={(e) => e.target === e.currentTarget && onClose()} className={`fade fixed inset-0 z-40 bg-black/45 backdrop-blur-sm flex ${side ? 'justify-end' : 'items-center justify-center p-4'}`}>
    <div className={`${side ? 'slide h-full w-[min(440px,100%)] rounded-l-[32px]' : 'pop w-[min(680px,100%)] max-h-full rounded-[32px]'} bg-high shadow-2xl flex flex-col overflow-hidden`}>{children}</div></div>;
}

const TC = {
  info: ['bg-[#d6e6ff] text-[#0b2e63] dark:bg-[#1a3558] dark:text-[#cfe1ff]', Info], success: ['bg-[#d3f2d6] text-[#0d3b13] dark:bg-[#1b3a20] dark:text-[#b9f0be]', CheckCircle2],
  warning: ['bg-[#ffecc2] text-[#4a3300] dark:bg-[#4a3a10] dark:text-[#ffe4a0]', AlertTriangle], error: ['bg-[#ffdad6] text-[#601410] dark:bg-[#5c1a16] dark:text-[#ffb4ab]', XCircle],
} as const;
export function Toasts() {
  const { toasts } = useStore();
  return <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center">{toasts.map((x) => { const [c, Ic] = TC[x.type]; return (
    <div key={x.id} className={`pop flex items-center gap-3 pl-4 pr-2 py-2 min-h-12 rounded-2xl shadow-xl ${c}`}><Ic className="size-5" /><span className="font-medium">{t(x.msg)}</span>
      {x.act && <button onClick={() => { x.act!.fn(); dismiss(x.id); }} className="px-3 h-8 rounded-full font-bold hover:bg-black/10">{t(x.act.label)}</button>}
      <button aria-label="close" onClick={() => dismiss(x.id)} className="size-8 grid place-items-center rounded-full hover:bg-black/10"><X className="size-4" /></button></div>); })}</div>;
}
