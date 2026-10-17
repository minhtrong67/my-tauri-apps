import { memo, useEffect, useState } from "react";
import { invoke } from "../tauri.js";
import { hueOf } from "../sites.js";

// Ảnh tải một lần cho mỗi profile, dùng blob URL thay vì base64
const cache = new Map();
const load = (dir) => {
  if (!cache.has(dir)) {
    cache.set(
      dir,
      invoke("profile_avatar", { dir })
        .then((buf) => URL.createObjectURL(new Blob([buf], { type: "image/png" })))
        .catch(() => null)
    );
  }
  return cache.get(dir);
};

const initial = (name) =>
  (name.replace(/^[\d\s\-–.]+/, "") || name).charAt(0).toUpperCase();

export default memo(function Avatar({ p }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let live = true;
    if (p.hasAvatar) load(p.dir).then((u) => live && setSrc(u));
    return () => {
      live = false;
    };
  }, [p.dir, p.hasAvatar]);

  return (
    <span className={`av t${hueOf(p.name) % 3}`}>
      {initial(p.name)}
      {src && <img src={src} alt="" decoding="async" />}
    </span>
  );
});
