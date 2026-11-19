//! Small helpers for reading EXIF data and keeping it when a JPEG is re-encoded.
use image::DynamicImage;
use serde::Serialize;
use std::path::Path;

/// EXIF orientation (1-8) of a picture, 1 when missing.
pub fn orientation(path: &Path) -> u32 {
    std::fs::File::open(path)
        .ok()
        .and_then(|f| exif::Reader::new().read_from_container(&mut std::io::BufReader::new(f)).ok())
        .and_then(|e| e.get_field(exif::Tag::Orientation, exif::In::PRIMARY).and_then(|f| f.value.get_uint(0)))
        .unwrap_or(1)
}

/// Rotates / flips the pixels so the picture looks upright.
pub fn apply_orientation(img: DynamicImage, o: u32) -> DynamicImage {
    match o {
        2 => img.fliph(),
        3 => img.rotate180(),
        4 => img.flipv(),
        5 => img.rotate90().fliph(),
        6 => img.rotate90(),
        7 => img.rotate270().fliph(),
        8 => img.rotate270(),
        _ => img,
    }
}

#[derive(Serialize, Default)]
pub struct ExifInfo {
    pub make: Option<String>,
    pub model: Option<String>,
    pub lens: Option<String>,
    pub iso: Option<String>,
    pub f_number: Option<String>,
    pub exposure: Option<String>,
    pub focal: Option<String>,
    pub date: Option<String>,
    pub software: Option<String>,
    pub width: Option<String>,
    pub height: Option<String>,
    pub lat: Option<f64>,
    pub lon: Option<f64>,
}

fn text(e: &exif::Exif, tag: exif::Tag) -> Option<String> {
    let f = e.get_field(tag, exif::In::PRIMARY)?;
    let s = f.display_value().with_unit(e).to_string();
    let s = s.trim().trim_matches('"').trim().to_string();
    if s.is_empty() || s == "0" { None } else { Some(s) }
}

fn gps(e: &exif::Exif, tag: exif::Tag, ref_tag: exif::Tag) -> Option<f64> {
    let f = e.get_field(tag, exif::In::PRIMARY)?;
    if let exif::Value::Rational(v) = &f.value {
        if v.len() >= 3 {
            let d = v[0].to_f64() + v[1].to_f64() / 60.0 + v[2].to_f64() / 3600.0;
            let r = e.get_field(ref_tag, exif::In::PRIMARY).map(|x| x.display_value().to_string()).unwrap_or_default();
            return Some(if r.contains('S') || r.contains('W') { -d } else { d });
        }
    }
    None
}

pub fn read_info(path: &Path) -> ExifInfo {
    let Ok(f) = std::fs::File::open(path) else { return ExifInfo::default() };
    let Ok(e) = exif::Reader::new().read_from_container(&mut std::io::BufReader::new(f)) else { return ExifInfo::default() };
    ExifInfo {
        make: text(&e, exif::Tag::Make),
        model: text(&e, exif::Tag::Model),
        lens: text(&e, exif::Tag::LensModel),
        iso: text(&e, exif::Tag::PhotographicSensitivity),
        f_number: text(&e, exif::Tag::FNumber),
        exposure: text(&e, exif::Tag::ExposureTime),
        focal: text(&e, exif::Tag::FocalLength),
        date: text(&e, exif::Tag::DateTimeOriginal).or_else(|| text(&e, exif::Tag::DateTime)),
        software: text(&e, exif::Tag::Software),
        width: text(&e, exif::Tag::PixelXDimension),
        height: text(&e, exif::Tag::PixelYDimension),
        lat: gps(&e, exif::Tag::GPSLatitude, exif::Tag::GPSLatitudeRef),
        lon: gps(&e, exif::Tag::GPSLongitude, exif::Tag::GPSLongitudeRef),
    }
}

/// Finds the APP1 "Exif" segment (marker included) in a JPEG file.
pub fn exif_segment(src: &[u8]) -> Option<Vec<u8>> {
    if src.len() < 4 || src[0] != 0xFF || src[1] != 0xD8 {
        return None;
    }
    let mut i = 2;
    while i + 4 <= src.len() {
        if src[i] != 0xFF {
            break;
        }
        let m = src[i + 1];
        if m == 0xDA || m == 0xD9 {
            break;
        }
        if (0xD0..=0xD7).contains(&m) || m == 0x01 {
            i += 2;
            continue;
        }
        let len = ((src[i + 2] as usize) << 8) | src[i + 3] as usize;
        if len < 2 || i + 2 + len > src.len() {
            break;
        }
        if m == 0xE1 && src[i + 4..].starts_with(b"Exif\0\0") {
            return Some(src[i..i + 2 + len].to_vec());
        }
        i += 2 + len;
    }
    None
}

/// Sets the orientation tag to 1 (the pixels are already upright after editing).
pub fn reset_orientation(seg: &mut [u8]) {
    if seg.len() < 20 {
        return;
    }
    let t = 10;
    let le = &seg[t..t + 2] == b"II";
    let rd16 = |b: &[u8]| -> u16 { if le { u16::from_le_bytes([b[0], b[1]]) } else { u16::from_be_bytes([b[0], b[1]]) } };
    let rd32 = |b: &[u8]| -> u32 {
        if le { u32::from_le_bytes([b[0], b[1], b[2], b[3]]) } else { u32::from_be_bytes([b[0], b[1], b[2], b[3]]) }
    };
    let mut pos: Option<usize> = None;
    {
        let tiff = &seg[t..];
        if tiff.len() >= 8 {
            let ifd = rd32(&tiff[4..8]) as usize;
            if ifd + 2 <= tiff.len() {
                let n = rd16(&tiff[ifd..]) as usize;
                for k in 0..n {
                    let e = ifd + 2 + k * 12;
                    if e + 12 > tiff.len() {
                        break;
                    }
                    if rd16(&tiff[e..]) == 0x0112 {
                        pos = Some(t + e + 8);
                        break;
                    }
                }
            }
        }
    }
    if let Some(p) = pos {
        let v = if le { 1u16.to_le_bytes() } else { 1u16.to_be_bytes() };
        seg[p] = v[0];
        seg[p + 1] = v[1];
    }
}

/// Copies the EXIF block of `original` into the freshly encoded JPEG `new`.
pub fn carry_exif(original: &[u8], new: Vec<u8>) -> Vec<u8> {
    if new.len() < 4 || new[0] != 0xFF || new[1] != 0xD8 || exif_segment(&new).is_some() {
        return new;
    }
    let Some(mut seg) = exif_segment(original) else { return new };
    reset_orientation(&mut seg);
    // Keep the JFIF APP0 segment first when there is one.
    let mut at = 2;
    if new[2] == 0xFF && new[3] == 0xE0 {
        let l = ((new[4] as usize) << 8) | new[5] as usize;
        at = 4 + l;
        if at > new.len() {
            at = 2;
        }
    }
    let mut out = Vec::with_capacity(new.len() + seg.len());
    out.extend_from_slice(&new[..at]);
    out.extend_from_slice(&seg);
    out.extend_from_slice(&new[at..]);
    out
}
