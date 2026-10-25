// Single source of truth for the file formats Material Xlsx can open and write.
export const OOXML = ["xlsx", "xlsm", "xltx", "xltm"];      // Excel workbooks / templates (macros are not run and are dropped on save)
export const TEXT = ["csv", "tsv", "txt"];                   // delimiter is auto-detected: , ; tab |
export const OPEN_EXT = [...OOXML, ...TEXT, "json"];
export const MACRO_EXT = ["xlsm", "xltm"], TEMPLATE_EXT = ["xltx", "xltm"];
export const extOf = (name) => (String(name).split(".").pop() || "").toLowerCase();
export const canOpen = (name) => OPEN_EXT.includes(extOf(name));
export const OPEN_REGEX = new RegExp(`\\.(${OPEN_EXT.join("|")})$`, "i");
export const ACCEPT = OPEN_EXT.map((e) => "." + e).join(",");
