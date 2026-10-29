import { memo, useCallback, useRef, useState } from "react";
import { Popover, MenuList, type MenuEntry } from "./ui/Popover";
import { useCursor } from "../store/ui";
import { useDocs } from "../store/docs";
import { useSettings } from "../store/settings";
import { ENCODINGS, changeEncoding, encLabel, setZoom, toggleEol } from "../lib/actions";
import { useT } from "../lib/i18n";
import { cn } from "../lib/utils";

function Chip({ children, tip, onClick, className, buttonRef }: {
  children: React.ReactNode; tip?: string; onClick?: () => void; className?: string; buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  const cls = cn("ripple flex h-7 items-center rounded-full px-3 text-[0.75rem] font-medium tabular-nums transition-[border-radius] duration-300 ease-spring", onClick && "hover:rounded-lg active:scale-95", className);
  return onClick ? (
    <button ref={buttonRef} type="button" data-tip={tip} data-tip-pos="top" className={cls} onClick={onClick}>
      {children}
    </button>
  ) : (
    <span className={cls}>{children}</span>
  );
}

export const StatusBar = memo(function StatusBar() {
  const t = useT();
  const { ln, col, sel, chars, words } = useCursor();
  const doc = useDocs((s) => s.docs.find((d) => d.id === s.activeId));
  const zoom = useSettings((s) => s.zoom);
  const [encOpen, setEncOpen] = useState(false);
  const encBtn = useRef<HTMLButtonElement>(null);
  const closeEnc = useCallback(() => setEncOpen(false), []);
  if (!doc) return null;

  const entries: MenuEntry[] = [
    { type: "header", label: t("enc.hint") },
    ...ENCODINGS.map<MenuEntry>((e) => ({ label: e.label, checked: e.id === doc.encoding, onClick: () => void changeEncoding(doc.id, e.id) })),
  ];

  return (
    <footer className="flex h-10 flex-none items-center gap-1 px-3 text-on-surface-variant">
      <Chip>{t("status.ln")} {ln}, {t("status.col")} {col}</Chip>
      {sel > 0 && <Chip className="bg-primary-container text-on-primary-container">{t("status.selected", { n: sel.toLocaleString() })}</Chip>}
      <Chip className="hidden sm:flex">{t("status.words", { n: words.toLocaleString() })}</Chip>
      <Chip className="hidden md:flex">{t("status.chars", { n: chars.toLocaleString() })}</Chip>
      <div className="flex-1" />
      <Chip buttonRef={encBtn} tip={t("status.encoding")} onClick={() => setEncOpen((o) => !o)}>{encLabel(doc.encoding)}</Chip>
      <Popover anchor={encBtn.current} open={encOpen} onClose={closeEnc} align="end" maxHeight={360}>
        <MenuList entries={entries} onDone={closeEnc} />
      </Popover>
      <Chip tip={t("status.toggleEol")} onClick={toggleEol}>{doc.eol === "crlf" ? t("status.crlf") : t("status.lf")}</Chip>
      <Chip tip={t("status.zoom")} onClick={() => setZoom(100)}>{zoom}%</Chip>
    </footer>
  );
});
