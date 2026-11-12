import { useEffect, useState } from "react";
import { useToasts, type ToastItem } from "../../lib/stores";
import { Button } from "./Button";
import { InfoBar } from "./InfoBar";

function Toast({ item }: { item: ToastItem }) {
  const dismiss = useToasts((s) => s.dismiss);
  const [leaving, setLeaving] = useState(false);
  const close = () => { setLeaving(true); setTimeout(() => dismiss(item.id), 180); };
  useEffect(() => { const id = setTimeout(close, item.duration); return () => clearTimeout(id); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ animation: leaving ? "toast-out .18s ease-in forwards" : "toast-in .3s cubic-bezier(0,0,0,1) both" }}
      className="pointer-events-auto w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-ctl shadow-fly">
      <InfoBar severity={item.type} selectable onClose={close} className="!border-flyout-line"
        actions={item.action && <Button size="sm" onClick={() => { item.action!.fn(); close(); }}>{item.action.label}</Button>}>
        {item.text}
      </InfoBar>
    </div>
  );
}

export function ToastHost() {
  const items = useToasts((s) => s.items);
  return <div className="pointer-events-none fixed bottom-4 right-4 z-[600] flex flex-col items-end gap-2">{items.map((i) => <Toast key={i.id} item={i} />)}</div>;
}
