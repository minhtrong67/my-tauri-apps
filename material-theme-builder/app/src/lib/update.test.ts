import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APP_VERSION, checkForUpdate, compareVersions } from "./update";

const json = (rel: string) => JSON.parse(readFileSync(new URL(rel, import.meta.url), "utf8"));
const reply = (status: number, body: unknown = {}) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("compareVersions", () => {
  it("orders versions numerically", () => {
    expect(compareVersions("1.10.0", "1.9.9")).toBe(1);
    expect(compareVersions("v1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.0", "1.0.1")).toBe(-1);
    expect(compareVersions("2.0.0-beta.1", "1.9.0")).toBe(1);
  });
});

describe("checkForUpdate", () => {
  it("reports a newer release", async () => {
    const r = await checkForUpdate("1.0.0", reply(200, { tag_name: "v1.1.0", html_url: "https://example.com/r" }));
    expect(r).toEqual({ status: "available", version: "1.1.0", url: "https://example.com/r" });
  });
  it("reports up to date, no release and errors", async () => {
    expect((await checkForUpdate("1.1.0", reply(200, { tag_name: "v1.1.0" }))).status).toBe("latest");
    expect((await checkForUpdate("1.0.0", reply(404))).status).toBe("none");
    await expect(checkForUpdate("1.0.0", reply(500))).rejects.toThrow();
  });
});

describe("version sync", () => {
  it("matches package.json and tauri.conf.json", () => {
    expect(json("../../../package.json").version).toBe(APP_VERSION);
    expect(json("../../../src-tauri/tauri.conf.json").version).toBe(APP_VERSION);
  });
});
