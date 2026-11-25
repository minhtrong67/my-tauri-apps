import { memo, useEffect, useState } from "react";
import { invoke } from "../tauri.js";
import { hueOf } from "../sites.js";

// Ảnh tải một lần cho mỗi profile, dùng blob URL thay vì base64
const cache = new Map();
const load = (browser, dir) => {
  const key = `${browser}:${dir}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      invoke("profile_avatar", { browser, dir })
        .then((buf) => URL.createObjectURL(new Blob([buf], { type: "image/png" })))
        .catch(() => null)
    );
  }
  return cache.get(key);
};

const initial = (name) =>
  (name.replace(/^[\d\s\-–.]+/, "") || name).charAt(0).toUpperCase();

export default memo(function Avatar({ browser, p }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let live = true;
    setSrc(null);
    if (p.hasAvatar) load(browser, p.dir).then((u) => live && setSrc(u));
    return () => {
      live = false;
    };
  }, [browser, p.dir, p.hasAvatar]);

  return (
    <span className={`av t${hueOf(p.name) % 3}`}>
      {initial(p.name)}
      {src && <img src={src} alt="" decoding="async" />}
    </span>
  );
});
