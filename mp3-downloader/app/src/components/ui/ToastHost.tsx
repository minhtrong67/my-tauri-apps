import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from "lucide-react";
import { useToasts, type ToastItem, type ToastType } from "../../lib/stores";
import { useI18n } from "../../lib/i18n";
import { IconButton } from "./Button";

const STYLE: Record<ToastType, { box: string; Icon: typeof Info; bar: string }> = {
  info: { box: "bg-info-container text-on-info-container", Icon: Info, bar: "bg-info" },
  success: { box: "bg-success-container text-on-success-container", Icon: CheckCircle2, bar: "bg-success" },
  warning: { box: "bg-warning-container text-on-warning-container", Icon: TriangleAlert, bar: "bg-warning" },
  error: { box: "bg-error-container text-on-error-container", Icon: CircleAlert, bar: "bg-error" },
};

function Toast({ item }: { item: ToastItem }) {
  const dismiss = useToasts((s) => s.dismiss);
  const { t } = useI18n();
  const [leaving, setLeaving] = useState(false);
  const { box, Icon, bar } = STYLE[item.type];
  const close = () => { setLeaving(true); setTimeout(() => dismiss(item.id), 220); };
  useEffect(() => { const id = setTimeout(close, item.duration); return () => clearTimeout(id); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div role={item.type === "error" ? "alert" : "status"} style={{ animation: `${leaving ? "toast-out .22s ease-in forwards" : "toast-in .45s cubic-bezier(.34,1.56,.64,1) both"}` }}
      className={`pointer-events-auto relative flex w-[min(380px,calc(100vw-2rem))] items-center gap-3 overflow-hidden rounded-m3-lg py-3 pl-4 pr-2 shadow-e3 ${box}`}>
      <Icon className="h-6 w-6 flex-none" />
      <p className="t-body selectable min-w-0 flex-1 break-words font-medium">{item.text}</p>
      {item.action && <button type="button" onClick={() => { item.action!.fn(); close(); }} className="state-layer h-9 flex-none rounded-full px-4 text-sm font-bold">{item.action.label}</button>}
      <IconButton icon={X} label={t("b.close")} small onClick={close} />
      <span className={`absolute inset-x-0 bottom-0 h-1 origin-left ${bar} opacity-60`} style={{ animation: `toast-timer ${item.duration}ms linear forwards` }} />
    </div>
  );
}

export function ToastHost() {
  const items = useToasts((s) => s.items);
  return <div className="pointer-events-none fixed bottom-4 right-4 z-[300] flex flex-col items-end gap-2 max-sm:bottom-24">{items.map((i) => <Toast key={i.id} item={i} />)}</div>;
}
