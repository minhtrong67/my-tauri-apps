import { relaunch } from '@tauri-apps/plugin-process';
import { check, type Update } from '@tauri-apps/plugin-updater';

export interface UpdateInfo {
  version: string;
  notes: string;
  date?: string;
}

/** The Update object cannot live in the store (it is not serializable), so it is kept here */
let pending: Update | null = null;

/** Ask the update server (download/latest.json) whether a newer signed version exists */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const u = await check({ timeout: 15000 });
  pending = u;
  return u ? { version: u.version, notes: u.body ?? '', date: u.date } : null;
}

/** Download + install the update found by checkForUpdate, report progress, then restart the app */
export async function installUpdate(onProgress: (done: number, total: number) => void) {
  if (!pending) throw new Error('No update to install');
  let total = 0;
  let done = 0;
  await pending.downloadAndInstall((ev) => {
    if (ev.event === 'Started') total = ev.data.contentLength ?? 0;
    else if (ev.event === 'Progress') {
      done += ev.data.chunkLength;
      onProgress(done, total);
    } else if (ev.event === 'Finished') onProgress(total || done, total || done);
  });
  await relaunch();
}
