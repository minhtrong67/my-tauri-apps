import type { ReactNode } from "react";
import { CheckmarkCircle20Filled, Dismiss16Regular, ErrorCircle20Filled, Info20Filled, Warning20Filled, type FluentIcon } from "@fluentui/react-icons";
import { useI18n } from "../../lib/i18n";
import { Tooltip } from "./Tooltip";

export type Severity = "info" | "success" | "warning" | "error";
export const SEVERITY: Record<Severity, { bg: string; icon: FluentIcon; color: string }> = {
  info: { bg: "bg-info-bg", icon: Info20Filled, color: "text-acc-text" },
  success: { bg: "bg-ok-bg", icon: CheckmarkCircle20Filled, color: "text-ok" },
  warning: { bg: "bg-warn-bg", icon: Warning20Filled, color: "text-warn" },
  error: { bg: "bg-err-bg", icon: ErrorCircle20Filled, color: "text-err" },
};

interface Props { severity?: Severity; title?: ReactNode; children?: ReactNode; actions?: ReactNode; onClose?: () => void; className?: string; selectable?: boolean }
/** InfoBar của Fluent: thanh thông báo có biểu tượng mức độ, nội dung, hành động và nút đóng. */
export function InfoBar({ severity = "info", title, children, actions, onClose, className = "", selectable }: Props) {
  const { t } = useI18n();
  const { bg, icon: Icon, color } = SEVERITY[severity];
  return (
    <div role={severity === "error" ? "alert" : "status"} className={`flex items-start gap-3 rounded-ctl border border-card-line py-2.5 pl-4 pr-2 ${bg} ${className}`}>
      <Icon className={`mt-0.5 h-5 w-5 flex-none ${color}`} />
      <div className={`min-w-0 flex-1 py-px text-body ${selectable ? "selectable" : ""}`}>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "text-fg-2" : "text-fg"}>{children}</div>}
      </div>
      {actions && <div className="flex flex-none items-center gap-2 self-center">{actions}</div>}
      {onClose && <Tooltip label={t("b.close")}><button type="button" aria-label={t("b.close")} onClick={onClose} className="grid h-7 w-7 flex-none place-items-center self-center rounded-ctl text-fg hover:bg-hov active:bg-prs"><Dismiss16Regular /></button></Tooltip>}
    </div>
  );
}
