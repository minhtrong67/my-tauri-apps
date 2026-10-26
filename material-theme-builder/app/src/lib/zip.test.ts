import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildZip, crc32 } from "./zip";

describe("zip", () => {
  it("computes the standard CRC-32", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("writes a structurally valid archive", () => {
    const zip = buildZip([
      { name: "a.css", content: ":root{}" },
      { name: "dir/b.json", content: "{\"x\":1}" },
      { name: "tên-việt.txt", content: "xin chào" },
    ]);
    const v = new DataView(zip.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    expect(v.getUint32(zip.length - 22, true)).toBe(0x06054b50);
    expect(v.getUint16(zip.length - 22 + 10, true)).toBe(3);
  });

  it("passes `unzip -t` when unzip is available", () => {
    const dir = mkdtempSync(join(tmpdir(), "mtb-zip-"));
    const file = join(dir, "t.zip");
    writeFileSync(file, buildZip([{ name: "a.txt", content: "hello" }, { name: "b/c.txt", content: "world".repeat(1000) }]));
    let out = "";
    try {
      out = execFileSync("unzip", ["-t", file], { encoding: "utf8" });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
      throw e;
    }
    expect(out).toContain("No errors detected");
  });
});
