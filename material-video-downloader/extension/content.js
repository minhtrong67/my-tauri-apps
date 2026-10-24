// Floating "Download" button over <video> elements (like IDM / Cốc Cốc).
(() => {
  if (window.top !== window) return;
  const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>';
  const LABEL = (navigator.language || "en").toLowerCase().startsWith("vi") ? "Tải video" : "Download";
  let enabled = true;
  let current = null;
  let hideTimer = 0;

  chrome.storage.local.get("prefs").then((r) => (enabled = r.prefs?.floatBtn !== false));
  chrome.storage.onChanged.addListener((c) => c.prefs && (enabled = c.prefs.newValue?.floatBtn !== false));

  const btn = document.createElement("button");
  btn.className = "mvd-btn";
  btn.type = "button";
  btn.innerHTML = SVG + `<span>${LABEL}</span>`;
  document.documentElement.appendChild(btn);

  function place(video) {
    const r = video.getBoundingClientRect();
    if (r.width < 220 || r.height < 120 || r.bottom < 0 || r.top > innerHeight) return hide();
    btn.style.top = Math.max(8, r.top + 10) + "px";
    btn.style.left = Math.max(8, Math.min(innerWidth - 140, r.right - 128)) + "px";
    btn.classList.add("show");
  }
  const hide = () => btn.classList.remove("show");

  document.addEventListener(
    "mouseover",
    (e) => {
      if (!enabled) return;
      const v = e.target instanceof Element ? e.target.closest("video") : null;
      if (v) {
        clearTimeout(hideTimer);
        current = v;
        place(v);
      } else if (e.target !== btn && !btn.contains(e.target)) {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(hide, 600);
      }
    },
    { passive: true },
  );
  addEventListener("scroll", () => current && btn.classList.contains("show") && place(current), { passive: true });

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!current) return;
    const src = current.currentSrc || current.src || "";
    // blob:/MSE players cannot be fetched directly: hand the page URL to yt-dlp instead.
    const url = /^https?:/i.test(src) ? src : location.href;
    const res = await chrome.runtime.sendMessage({ type: "send", url, title: document.title, pageUrl: location.href, fallback: true });
    btn.classList.add(res?.ok || res?.fallback ? "ok" : "err");
    setTimeout(() => btn.classList.remove("ok", "err"), 1800);
  });
})();
