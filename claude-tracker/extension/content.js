// Đọc banner giới hạn của gói Free trên claude.ai (mọi trang: /new, /chat/..., ...).
// Chỉ nhận các câu banner đã biết, đứng ở ĐẦU một phần tử, và bỏ qua nội dung hội thoại / ô nhập,
// để không nhầm với đoạn chat có nhắc tới giờ reset.
(() => {
  // Mỗi lần nạp là một "phiên bản": bản mới thay bản cũ (extension vừa reload / được chèn lại bằng scripting),
  // bản cũ tự dừng thay vì chặn bản mới như trước.
  const ME = Math.random().toString(36).slice(2);
  window.__cmptInstance = ME;
  const alive = () => {
    try { return window.__cmptInstance === ME && !!chrome.runtime.id; } catch (_) { return false; }
  };

  const TIME = "(\\d{1,2}):(\\d{2})\\s*([AaPp]\\.?[Mm]\\.?)?";
  const SRC = [
    "tin nhắn miễn phí của bạn sẽ (?:có lại|được khôi phục|trở lại)",
    "hạn mức sử dụng miễn phí của bạn sẽ được khôi phục",
    "bạn đã hết tin nhắn miễn phí cho đến",
    "(?:bạn đã đạt giới hạn tin nhắn[^.\\n]{0,24}\\.\\s*)?giới hạn sẽ được đặt lại",
    "your free messages (?:will )?(?:return|reset)",
    "your (?:free )?usage limit will (?:be restored|reset)",
    "your free (?:usage|messages?)(?: limit)? (?:will )?(?:returns?|resets?|(?:be )?restored)",
    "you(?:\\s+are|['’]re) out of(?: your)? free messages(?: until)?",
    "you(?:['’]ve| have) (?:reached|hit|used)[^.\\n]{0,60}?(?:until|reset|return)",
  ];
  const PREFIX = "^(?:(?:đã tạm dừng|paused)\\s*[:：]?\\s*)?";
  const PATTERNS = SRC.map(
    (s) => new RegExp(PREFIX + s + "\\s*(?:lúc|vào|at|until|cho đến|đến)?\\s*" + TIME, "i")
  );
  const SKIP =
    'nav, pre, code, blockquote, textarea, [contenteditable="true"], [data-testid="user-message"], ' +
    ".font-claude-response, .font-claude-message, [data-is-streaming]";

  const onNew = () => location.pathname === "/new" || location.pathname === "/";
  // Ô nhập tin nhắn: phần tử nhập liệu nằm thấp nhất trên màn hình
  const composerEl = () => {
    let best = null, top = -1;
    for (const el of document.querySelectorAll('[contenteditable="true"], textarea')) {
      const r = el.getBoundingClientRect();
      if (r.width < 100 || r.height === 0) continue;
      if (r.top > top) { top = r.top; best = el; }
    }
    return best;
  };
  const hasComposer = () => !!composerEl();

  function scanStrict() {
    for (const el of document.querySelectorAll("div, p, span, h1, h2, h3")) {
      if (el.childElementCount > 4) continue;
      const t = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (t.length < 15 || t.length > 220) continue;
      for (const re of PATTERNS) {
        const m = t.match(re);
        if (m && !el.closest(SKIP)) return m;
      }
    }
    return null;
  }

  // Dự phòng cho câu banner chưa biết: phần tử ngắn nằm ngay phía trên ô nhập, có từ khoá và một giờ hh:mm.
  // (Claude vẫn hiện ô nhập khi đã hết lượt, nên không thể coi "có ô nhập" là "dùng được".)
  const KW = /messages?|usage|limit|until|resets?|returns?|restored|tin nhắn|hạn mức|giới hạn|đến|lúc|hết/i;
  function scanZone() {
    const c = composerEl();
    if (!c) return null;
    const top = c.getBoundingClientRect().top;
    const re = new RegExp(TIME);
    for (const el of document.querySelectorAll("div, p, span")) {
      if (el.childElementCount > 4) continue;
      const t = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (t.length < 10 || t.length > 120 || !KW.test(t)) continue;
      const m = t.match(re);
      if (!m) continue;
      const r = el.getBoundingClientRect();
      if (r.height === 0 || r.bottom > top + 8 || r.bottom < top - 200) continue;
      if (el.closest(SKIP)) continue;
      return m;
    }
    return null;
  }
  const scan = () => scanStrict() || scanZone();

  // Giờ trên banner là giờ trong ngày. Cửa sổ Free ngắn (≈5 giờ), nên:
  //  - giờ còn ở phía trước hôm nay -> dùng luôn
  //  - giờ đã qua nhưng sang ngày mai nằm trong 6 giờ tới (qua nửa đêm) -> dùng ngày mai
  //  - ngược lại là banner cũ chưa kịp biến mất -> bỏ qua (không báo giới hạn giả)
  function toIso(h, m, ap) {
    h = Number(h); m = Number(m);
    if (ap) {
      ap = ap.replace(/\./g, "").toUpperCase();
      if (ap === "PM" && h < 12) h += 12;
      if (ap === "AM" && h === 12) h = 0;
    }
    const now = Date.now();
    const d = new Date(); d.setHours(h, m, 0, 0);
    let t = d.getTime();
    if (t <= now) {
      const next = t + 86400000;
      if (next - now <= 6 * 3600000) t = next; else return null;
    }
    return new Date(t).toISOString();
  }

  let cache = null, lastSig = "", lastSent = 0, clearSince = 0, force = false;

  function send(limited, iso) {
    const sig = limited ? "L" + iso : "A";
    const now = Date.now();
    if (!force && sig === lastSig && now - lastSent < 5 * 60 * 1000) return;
    lastSig = sig; lastSent = now;
    try { chrome.runtime.sendMessage({ type: "banner", limited, resets_at: iso || null }); } catch (_) {}
  }

  function tick() {
    if (!alive()) return;
    const m = scan();
    if (m) {
      clearSince = 0;
      const sig = m[1] + ":" + m[2] + (m[3] || "");
      if (!cache || cache.sig !== sig) cache = { sig, iso: toIso(m[1], m[2], m[3]) };
      if (cache.iso && Date.parse(cache.iso) > Date.now()) send(true, cache.iso);
      return;
    }
    cache = null;
    // "Dùng được": trang tải xong, có ô nhập và không thấy banner liên tục ≥ 3 giây
    // (quét cưỡng bức do người dùng bấm đồng bộ thì báo ngay). Cũng là đường tự chữa trạng thái sai.
    if (hasComposer() && document.readyState === "complete") {
      clearSince = clearSince || Date.now();
      if (force || Date.now() - clearSince >= 3000) send(false, null);
    } else clearSince = 0;
  }

  // Quét dày trong 20 giây đầu sau khi tải trang (F5 / mở tab mới), sau đó thưa hơn
  function loop() {
    if (!alive()) return;
    tick();
    setTimeout(loop, performance.now() < 20000 ? 2000 : 6000);
  }
  setTimeout(loop, 1200);

  let lastObs = 0;
  const obs = new MutationObserver(() => {
    if (!alive()) return obs.disconnect();
    const n = Date.now();
    if (n - lastObs > 2000) { lastObs = n; setTimeout(tick, 600); }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  document.addEventListener("visibilitychange", () => !document.hidden && tick());

  try {
    chrome.runtime.onMessage.addListener((m, _s, reply) => {
      if (!alive()) return;
      if (m && m.type === "ping") { reply({ ok: true }); return; }
      if (m && m.type === "rescan") {
        force = true; lastSig = ""; lastSent = 0;
        try { tick(); } finally { force = false; }
      }
    });
  } catch (_) {}
})();
