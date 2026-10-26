const DEFAULTS = { port: 47821, token: "", intervalMin: 5 };
const cfg = async () => ({ ...DEFAULTS, ...(await chrome.storage.local.get(Object.keys(DEFAULTS))) });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let idCache = null;   // email/org của tài khoản (cache 10 phút để đồng bộ nhanh)
let waiter = null;    // đang chờ content script báo kết quả
let syncing = null;   // chống chạy đồng bộ chồng nhau
let polling = false;
let latestBanner = null; // banner mới nhất content script báo trong lúc đồng bộ
let availHits = 0;       // số lần liên tiếp báo "dùng được" (cần 2 để chắc, tránh báo sớm khi banner chưa kịp hiện)

async function setInfo(patch) {
  const { info = {} } = await chrome.storage.local.get("info");
  const next = { ...info, ...patch };
  await chrome.storage.local.set({ info: next });
  // Huy hiệu trên icon: đỏ "!" = đang bị giới hạn, xám "×" = chưa kết nối app
  let text = "", color = "#2e9e6b";
  const active = next.limited && next.resetsAt && Date.parse(next.resetsAt) > Date.now();
  if (next.appOk === false) { text = "×"; color = "#888888"; }
  else if (active) { text = "!"; color = "#d64545"; }
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

const profileEmail = () =>
  new Promise((res) => {
    try { chrome.identity.getProfileUserInfo({ accountStatus: "ANY" }, (u) => res((u && u.email) || "")); }
    catch (_) { res(""); }
  });

async function getJson(path) {
  const r = await fetch("https://claude.ai" + path, { credentials: "include", headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status}`);
  return r.json();
}

async function identity() {
  if (idCache && Date.now() - idCache.at < 600000) return idCache;
  const orgs = await getJson("/api/organizations");
  const list = Array.isArray(orgs) ? orgs : [];
  const org = list.find((o) => (o.capabilities || []).includes("chat")) || list[0];
  if (!org) throw new Error("not_logged_in");
  let account = {};
  try {
    const me = await getJson("/api/account");
    account = { email: me.email_address || me.email, name: me.full_name };
  } catch (_) {}
  idCache = { at: Date.now(), org, account };
  return idCache;
}

// light = true: bỏ qua gọi /usage (gói Free luôn trả rỗng) để gửi banner nhanh hơn
async function collect(banner, light = false) {
  const c = await cfg();
  if (!c.token) return setInfo({ appOk: null, status: "no_token" });
  const chromeEmail = await profileEmail();
  let payload;
  try {
    const id = await identity();
    const usage = light ? null : await getJson(`/api/organizations/${id.org.uuid}/usage`).catch(() => null);
    const plan = (id.org.capabilities || []).find((x) => /max|pro|team|enterprise|free/i.test(x));
    payload = {
      account: { ...id.account, org_uuid: id.org.uuid, org_name: id.org.name, plan },
      usage, chrome_email: chromeEmail, banner,
    };
  } catch (e) {
    idCache = null;
    return setInfo({ claudeError: String(e.message || e), chromeEmail, lastSync: Date.now() });
  }

  try {
    const r = await fetch(`http://127.0.0.1:${c.port}/ingest`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-tracker-token": c.token },
      body: JSON.stringify(payload),
    });
    await setInfo({
      appOk: r.ok,
      status: r.ok ? "synced" : r.status === 401 ? "bad_token" : `http:${r.status}`,
      claudeError: null,
      email: payload.account.email || null,
      org: payload.account.org_name || null,
      plan: payload.account.plan || null,
      chromeEmail,
      lastSync: Date.now(),
      ...(banner ? { limited: banner.limited, resetsAt: banner.resets_at } : {}),
    });
  } catch (_) {
    await setInfo({ appOk: false, status: "offline", chromeEmail });
  }
}

const claudeTabs = () => chrome.tabs.query({ url: "https://claude.ai/*" }).catch(() => []);

// Extension nạp thủ công / vừa reload KHÔNG tự có content script trong các tab claude.ai đang mở
// (phải F5 mới có). Ping thử; không trả lời thì chèn content.js vào ngay, không cần người dùng F5.
async function ensureContent(tab) {
  try {
    const r = await chrome.tabs.sendMessage(tab.id, { type: "ping" });
    if (r && r.ok) return true;
  } catch (_) {}
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    return true;
  } catch (_) { return false; }
}

// Đồng bộ ngay: chèn/nhắc content script ở các tab claude.ai quét banner, rồi gom danh tính + usage + banner
// gửi về app trong MỘT lần. Chưa có tab nào mà Chrome đang mở thì mở một tab ẩn, đọc xong tự đóng.
function syncNow() {
  if (!syncing) syncing = doSync().finally(() => (syncing = null));
  return syncing;
}
async function doSync() {
  let tabs = await claudeTabs();
  let created = null;
  if (!tabs.length) {
    const wins = await chrome.windows.getAll().catch(() => []);
    if (wins.length) {
      created = await chrome.tabs.create({ url: "https://claude.ai/new", active: false });
      tabs = [created];
    }
  }
  if (!tabs.length) { await collect(); return; }

  latestBanner = null; availHits = 0;
  const deadline = Date.now() + (created ? 15000 : 8000);
  const done = new Promise((res) => { waiter = res; });
  const pump = (async () => {
    while (waiter && Date.now() < deadline) {
      for (const t of tabs) {
        if (await ensureContent(t)) { try { await chrome.tabs.sendMessage(t.id, { type: "rescan" }); } catch (_) {} }
      }
      await sleep(900);
    }
  })();
  await Promise.race([done, sleep(Math.max(0, deadline - Date.now()))]);
  waiter = null;
  await pump;
  // Luôn lấy đủ usage (gói trả phí) + banner (gói Free) trong cùng một lần gửi
  await collect(latestBanner, false);
  if (created) chrome.tabs.remove(created.id).catch(() => {});
}

// App có nút "Làm mới": app tăng số thứ tự, /wait trả về ngay và extension đồng bộ trong ~1 giây
async function longPoll() {
  if (polling) return;
  polling = true;
  try {
    for (;;) {
      const c = await cfg();
      if (!c.token) break;
      const { seenRefresh } = await chrome.storage.local.get("seenRefresh");
      let j;
      try {
        const r = await fetch(`http://127.0.0.1:${c.port}/wait?seen=${seenRefresh ?? ""}`, {
          headers: { "x-tracker-token": c.token },
        });
        if (!r.ok) throw new Error(String(r.status));
        j = await r.json();
      } catch (_) { await sleep(5000); continue; }
      if (j.refresh !== seenRefresh) {
        await chrome.storage.local.set({ seenRefresh: j.refresh });
        if (seenRefresh !== undefined) await syncNow();
      }
    }
  } finally { polling = false; }
}

async function schedule() {
  const c = await cfg();
  await chrome.alarms.clear("collect");
  chrome.alarms.create("collect", { delayInMinutes: 0.1, periodInMinutes: Math.max(1, Number(c.intervalMin) || 5) });
  chrome.alarms.create("poll", { delayInMinutes: 0.2, periodInMinutes: 0.5 }); // dựng lại long-poll nếu service worker bị tắt
}

async function injectAll() {
  for (const t of await claudeTabs()) await ensureContent(t);
}

chrome.runtime.onInstalled.addListener(async () => {
  // Xoá trạng thái giới hạn có thể do phiên bản cũ ghi sai
  await chrome.storage.local.remove(["lastBanner", "seenRefresh"]);
  await setInfo({ limited: null, resetsAt: null });
  await schedule();
  longPoll();
  await injectAll();   // các tab claude.ai đang mở có content script ngay, không cần F5
  if ((await cfg()).token) syncNow();
});
chrome.runtime.onStartup.addListener(() => { schedule(); longPoll(); injectAll(); });
chrome.alarms.onAlarm.addListener((a) => (a.name === "collect" ? collect() : a.name === "poll" ? longPoll() : null));

// Nhập / đổi token hoặc cổng -> chạy ngay: dựng lại long-poll và đồng bộ, không phải chờ chu kỳ
chrome.storage.onChanged.addListener((ch, area) => {
  if (area === "local" && (ch.token || ch.port)) {
    schedule().then(() => { longPoll(); return injectAll(); }).then(() => syncNow());
  }
});

chrome.runtime.onMessage.addListener((msg, _s, send) => {
  if (msg && msg.type === "banner") {
    const b = { limited: !!msg.limited, resets_at: msg.resets_at || null };
    if (syncing) {
      // Đang đồng bộ: chỉ ghi nhận, doSync sẽ gửi một lần cùng usage
      latestBanner = b;
      availHits = b.limited ? 0 : availHits + 1;
      if (waiter && (b.limited || availHits >= 2)) { const w = waiter; waiter = null; w(); }
      return;
    }
    collect(b, true);   // banner tự đổi trạng thái ngoài lúc đồng bộ: gửi nhanh
    return;
  }
  if (msg === "collect-now") {
    schedule().then(() => { longPoll(); return syncNow(); }).then(() => send(true));
    return true;
  }
});
longPoll();
