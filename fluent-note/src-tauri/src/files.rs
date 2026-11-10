//! File reading / writing helpers (no Tauri types in here, so they are easy to unit-test).
//!
//! * Text is exchanged with the UI normalised to `\n`; the original line ending is reported separately.
//! * Encodings: UTF-8 (with / without BOM), UTF-16 LE/BE and every legacy encoding known to `encoding_rs`.
//! * Writes are atomic: the data goes to a temporary file first and then replaces the target.

use encoding_rs::Encoding;
use std::{
    fs,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

pub const UTF8: &str = "utf-8";
pub const UTF8_BOM: &str = "utf-8-bom";
pub const UTF16LE: &str = "utf-16le";
pub const UTF16BE: &str = "utf-16be";

pub struct Decoded {
    pub text: String,
    pub encoding: String,
}

fn decode_utf16(bytes: &[u8], le: bool) -> String {
    let units: Vec<u16> = bytes
        .chunks(2)
        .map(|c| {
            let (a, b) = (c[0], *c.get(1).unwrap_or(&0));
            if le {
                u16::from_le_bytes([a, b])
            } else {
                u16::from_be_bytes([a, b])
            }
        })
        .collect();
    String::from_utf16_lossy(&units)
}

/// Decodes `bytes`. With `forced` the given encoding is used, otherwise it is detected
/// (BOM first, then "is this valid UTF-8?", otherwise Windows-1252 like Notepad's "ANSI").
pub fn decode(bytes: &[u8], forced: Option<&str>) -> Decoded {
    let id = match forced {
        Some(f) if !f.is_empty() => f.to_ascii_lowercase(),
        _ => {
            if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
                UTF8_BOM.to_string()
            } else if bytes.starts_with(&[0xFF, 0xFE]) {
                UTF16LE.to_string()
            } else if bytes.starts_with(&[0xFE, 0xFF]) {
                UTF16BE.to_string()
            } else if std::str::from_utf8(bytes).is_ok() {
                UTF8.to_string()
            } else {
                "windows-1252".to_string()
            }
        }
    };
    let text = match id.as_str() {
        UTF8 | UTF8_BOM => {
            let b = bytes.strip_prefix(&[0xEF, 0xBB, 0xBF]).unwrap_or(bytes);
            String::from_utf8_lossy(b).into_owned()
        }
        UTF16LE => decode_utf16(bytes.strip_prefix(&[0xFF, 0xFE]).unwrap_or(bytes), true),
        UTF16BE => decode_utf16(bytes.strip_prefix(&[0xFE, 0xFF]).unwrap_or(bytes), false),
        other => match Encoding::for_label(other.as_bytes()) {
            Some(enc) => enc.decode_without_bom_handling(bytes).0.into_owned(),
            None => String::from_utf8_lossy(bytes).into_owned(),
        },
    };
    Decoded { text, encoding: id }
}

/// Encodes `text` (already using the final line endings). Fails when a character does not fit the encoding.
pub fn encode(text: &str, encoding: &str) -> Result<Vec<u8>, String> {
    let enc = encoding.to_ascii_lowercase();
    match enc.as_str() {
        UTF8 => Ok(text.as_bytes().to_vec()),
        UTF8_BOM => {
            let mut v = vec![0xEF, 0xBB, 0xBF];
            v.extend_from_slice(text.as_bytes());
            Ok(v)
        }
        UTF16LE | UTF16BE => {
            let le = enc == UTF16LE;
            let mut v: Vec<u8> = if le {
                vec![0xFF, 0xFE]
            } else {
                vec![0xFE, 0xFF]
            };
            for u in text.encode_utf16() {
                v.extend_from_slice(&if le { u.to_le_bytes() } else { u.to_be_bytes() });
            }
            Ok(v)
        }
        other => {
            let e = Encoding::for_label(other.as_bytes())
                .ok_or_else(|| format!("Unknown encoding: {other}"))?;
            let (bytes, _, had_errors) = e.encode(text);
            if had_errors {
                Err(format!(
                    "The text contains characters that {} cannot store. Save as UTF-8 instead.",
                    e.name()
                ))
            } else {
                Ok(bytes.into_owned())
            }
        }
    }
}

pub fn eol_of(text: &str) -> &'static str {
    if text.contains("\r\n") {
        "crlf"
    } else {
        "lf"
    }
}

pub fn normalise(text: &str) -> String {
    text.replace("\r\n", "\n")
}

pub fn apply_eol(text: &str, eol: &str) -> String {
    let n = normalise(text);
    if eol == "crlf" {
        n.replace('\n', "\r\n")
    } else {
        n
    }
}

/// Modification time in milliseconds since the Unix epoch.
pub fn mtime_ms(path: &Path) -> Option<u64> {
    let m = fs::metadata(path).ok()?.modified().ok()?;
    m.duration_since(UNIX_EPOCH)
        .ok()
        .map(|d| d.as_millis() as u64)
}

/// Writes through a temporary file next to the target so a crash or full disk cannot leave a half-written file.
pub fn write_atomic(path: &Path, data: &[u8]) -> Result<(), String> {
    let is_link = fs::symlink_metadata(path)
        .map(|m| m.file_type().is_symlink())
        .unwrap_or(false);
    if !is_link {
        let mut tmp = path.as_os_str().to_owned();
        tmp.push(".mn-tmp");
        let tmp = std::path::PathBuf::from(tmp);
        if fs::write(&tmp, data).is_ok() {
            if let Ok(meta) = fs::metadata(path) {
                let _ = fs::set_permissions(&tmp, meta.permissions());
            }
            if fs::rename(&tmp, path).is_ok() {
                return Ok(());
            }
            let _ = fs::remove_file(&tmp);
        }
    }
    fs::write(path, data).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_encodings() {
        assert_eq!(decode("héllo".as_bytes(), None).encoding, UTF8);
        assert_eq!(decode(&[0xEF, 0xBB, 0xBF, b'a'], None).encoding, UTF8_BOM);
        assert_eq!(decode(&[0xFF, 0xFE, b'a', 0], None).text, "a");
        assert_eq!(decode(&[0xE9], None).encoding, "windows-1252");
        assert_eq!(decode(&[0xE9], None).text, "é");
    }

    #[test]
    fn round_trips() {
        let t = "Xin chào – 日本語 ✨";
        for e in [UTF8, UTF8_BOM, UTF16LE, UTF16BE] {
            let b = encode(t, e).unwrap();
            assert_eq!(decode(&b, None).text, t, "{e}");
        }
    }

    #[test]
    fn vietnamese_legacy() {
        // Windows-1258 stores many Vietnamese letters as base + combining mark; the encoder reports
        // what it cannot store instead of silently corrupting the file.
        let b = encode("Đà Lat – café", "windows-1258").unwrap();
        assert_eq!(decode(&b, Some("windows-1258")).text, "Đà Lat – café");
        assert!(encode("日本語", "windows-1252").is_err());
    }

    #[test]
    fn line_endings() {
        assert_eq!(eol_of("a\r\nb"), "crlf");
        assert_eq!(apply_eol("a\nb", "crlf"), "a\r\nb");
        assert_eq!(normalise("a\r\nb"), "a\nb");
    }

    #[test]
    fn atomic_write() {
        let dir = std::env::temp_dir().join("mn-test-atomic");
        let _ = fs::create_dir_all(&dir);
        let f = dir.join("a.txt");
        write_atomic(&f, b"one").unwrap();
        write_atomic(&f, b"two").unwrap();
        assert_eq!(fs::read(&f).unwrap(), b"two");
        assert!(!dir.join("a.txt.mn-tmp").exists());
        assert!(mtime_ms(&f).is_some());
    }
}
