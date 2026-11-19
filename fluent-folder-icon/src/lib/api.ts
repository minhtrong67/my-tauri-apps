import { invoke } from "@tauri-apps/api/core";

export interface FolderInfo {
  path: string;
  name: string;
  isDir: boolean;
  customized: boolean;
}

export const api = {
  inspect: (paths: string[]) => invoke<FolderInfo[]>("inspect_folders", { paths }),
  apply: (path: string, data: string) => invoke<void>("apply_icon", { path, data }),
  restore: (path: string) => invoke<void>("restore_icon", { path }),
  saveBytes: (path: string, data: string) => invoke<void>("save_bytes", { path, data }),
  readText: (path: string) => invoke<string>("read_text", { path }),
  writeText: (path: string, content: string) => invoke<void>("write_text", { path, content }),
  launchPaths: () => invoke<string[]>("take_launch_paths"),
  getContextMenu: () => invoke<boolean>("get_context_menu"),
  setContextMenu: (enabled: boolean) => invoke<void>("set_context_menu", { enabled }),
};

/** A folder in one of the sidebar lists. */
export type Item = FolderInfo & { sel: boolean };
