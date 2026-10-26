/** Keep in sync with package.json and src-tauri/tauri.conf.json (checked by update.test.ts). */
export const APP_VERSION = "1.0.0";
export const REPO = "minhtrong67/material-theme-builder";
export const RELEASES_URL = `https://github.com/${REPO}/releases`;

/** Compares two dotted versions ("v1.2.3" ok). Returns 1, 0 or -1. Pre-release suffixes are ignored. */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/i, "")
      .split("-")[0]
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

export type UpdateResult =
  | { status: "latest"; version: string }
  | { status: "available"; version: string; url: string }
  | { status: "none" };

/** Asks GitHub for the latest published release. Throws on network errors. */
export async function checkForUpdate(current = APP_VERSION, fetcher: typeof fetch = fetch): Promise<UpdateResult> {
  const res = await fetcher(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } });
  if (res.status === 404) return { status: "none" };
  if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
  const data = (await res.json()) as { tag_name?: string; html_url?: string };
  const version = (data.tag_name ?? "").replace(/^v/i, "");
  if (!version) return { status: "none" };
  return compareVersions(version, current) > 0
    ? { status: "available", version, url: data.html_url ?? RELEASES_URL }
    : { status: "latest", version };
}
