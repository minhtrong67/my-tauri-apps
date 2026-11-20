import { ask } from "@tauri-apps/plugin-dialog";
import { api } from "./api";
import type { Key } from "./i18n";

/** Ask first (a restart stops file copies in progress), then restart. Resolves true when it was started. */
export async function confirmRestartExplorer(t: (k: Key) => string): Promise<boolean> {
  const ok = await ask(t("restartConfirm"), { title: t("restartConfirmTitle"), kind: "warning", okLabel: t("restartNow"), cancelLabel: t("cancel") });
  if (!ok) return false;
  await api.restartExplorer();
  return true;
}
