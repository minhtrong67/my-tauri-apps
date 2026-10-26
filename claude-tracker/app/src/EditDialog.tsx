import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { useI18n } from "./i18n";
import { Dialog } from "./ui";

export function EditDialog({ name, alias, note, onSave, onClose }: { name: string; alias: string; note: string; onSave: (alias: string, note: string) => void; onClose: () => void }) {
  const { t } = useI18n();
  const [a, setA] = useState(alias);
  const [n, setN] = useState(note);
  return (
    <Dialog
      title={t("edit.title")}
      icon={<Pencil size={22} />}
      onClose={onClose}
      actions={
        <>
          <button className="btn outlined" onClick={onClose}>
            <X size={17} aria-hidden="true" />
            {t("dialog.cancel")}
          </button>
          <button className="btn filled" onClick={() => onSave(a, n)}>
            <Check size={17} aria-hidden="true" />
            {t("edit.save")}
          </button>
        </>
      }
    >
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(a, n);
        }}
      >
        <label className="tf">
          <span>{t("edit.alias")}</span>
          <input data-autofocus value={a} maxLength={60} placeholder={name || t("edit.alias.ph")} onChange={(e) => setA(e.target.value)} />
        </label>
        <label className="tf">
          <span>{t("edit.note")}</span>
          <input value={n} maxLength={120} placeholder={t("edit.note.ph")} onChange={(e) => setN(e.target.value)} />
        </label>
      </form>
    </Dialog>
  );
}
