const $ = (id) => document.getElementById(id);
const fields = ["port", "token", "intervalMin"];

async function load() {
  const s = await chrome.storage.local.get([...fields, "info"]);
  $("port").value = s.port ?? 47821;
  $("token").value = s.token ?? "";
  $("intervalMin").value = s.intervalMin ?? 5;
  const i = s.info || {};
  $("info").innerHTML = `
    <dt>Email Claude</dt><dd>${i.email || "—"}</dd>
    <dt>Tổ chức</dt><dd>${i.org || "—"}</dd>
    <dt>Gói</dt><dd>${i.plan || "—"}</dd>
    <dt>Email Chrome</dt><dd>${i.chromeEmail || "Chưa đăng nhập Chrome — app sẽ không tự gán được Chrome Profile"}</dd>
    <dt>Đồng bộ gần nhất</dt><dd>${i.lastSync ? new Date(i.lastSync).toLocaleString("vi-VN") : "—"}</dd>`;
}

function conn(kind, text) {
  $("conn").innerHTML = `<span class="pill ${kind}">${text}</span>`;
}

async function save() {
  await chrome.storage.local.set({
    port: Number($("port").value) || 47821,
    token: $("token").value.trim(),
    intervalMin: Number($("intervalMin").value) || 5,
  });
}

async function test() {
  const port = Number($("port").value) || 47821;
  try {
    const r = await fetch(`http://127.0.0.1:${port}/ping`, { headers: { "x-tracker-token": $("token").value.trim() } });
    if (r.ok) conn("ok", "Kết nối thành công");
    else if (r.status === 401) conn("bad", "Token không đúng");
    else conn("warn", `App phản hồi HTTP ${r.status}`);
    return r.ok;
  } catch (_) {
    conn("bad", "Không kết nối được — app đã chạy chưa?");
    return false;
  }
}

$("eye").onclick = () => {
  const t = $("token"); const show = t.type === "password";
  t.type = show ? "text" : "password"; $("eye").textContent = show ? "Ẩn" : "Hiện";
};
$("test").onclick = test;
$("save").onclick = async () => {
  await save();
  conn("idle", "Đang kết nối…");
  if (await test()) await chrome.runtime.sendMessage("collect-now");
  load();
};
chrome.storage.onChanged.addListener(load);
load();

// ---- Dò endpoint ----
const RE = /reset|limit|remain|quota|utiliz|usage|window/i;
function walk(v, path, hits, depth = 0) {
  if (hits.length > 60 || depth > 6 || v === null || v === undefined || typeof v !== "object") return;
  for (const [k, x] of Object.entries(v)) {
    const p = path ? `${path}.${k}` : k;
    if (typeof x !== "object" && (RE.test(k) || (typeof x === "string" && RE.test(x) && x.length < 80)))
      hits.push(`${p} = ${JSON.stringify(x)}`);
    else walk(x, p, hits, depth + 1);
  }
}
async function getJ(p) {
  const r = await fetch("https://claude.ai" + p, { credentials: "include", headers: { accept: "application/json" } });
  const t = await r.text();
  try { return { status: r.status, json: JSON.parse(t) }; } catch { return { status: r.status, json: null }; }
}
$("probe").onclick = async () => {
  const out = $("out"); out.style.display = "block"; out.textContent = "Đang dò…";
  const orgs = await getJ("/api/organizations");
  const uuid = Array.isArray(orgs.json) && orgs.json[0] ? orgs.json[0].uuid : null;
  const paths = ["/api/organizations", "/api/bootstrap", ...(uuid ? [`/api/organizations/${uuid}`, `/api/organizations/${uuid}/usage`] : [])];
  let text = "";
  for (const p of paths) {
    const r = p === "/api/organizations" ? orgs : await getJ(p).catch((e) => ({ status: String(e), json: null }));
    const hits = []; walk(r.json, "", hits);
    text += `\n## ${p.replace(uuid || "@@", "{org}")}  [HTTP ${r.status}]\n` + (hits.join("\n") || "(không có khóa liên quan)") + "\n";
  }
  out.textContent = text;
};
