const $ = (id) => document.getElementById(id);
const fields = ["port", "token", "intervalMin", "lang"];

async function load() {
  const s = await chrome.storage.local.get([...fields, "info"]);
  $("lang").value = s.lang ?? "auto";
  $("port").value = s.port ?? 47821;
  $("token").value = s.token ?? "";
  $("intervalMin").value = s.intervalMin ?? 5;
  const i = s.info || {};
  $("info").innerHTML = `
    <dt>${t("claudeEmail")}</dt><dd>${i.email || "—"}</dd>
    <dt>${t("org")}</dt><dd>${i.org || "—"}</dd>
    <dt>${t("plan")}</dt><dd>${i.plan || "—"}</dd>
    <dt>${t("chromeEmail")}</dt><dd>${i.chromeEmail || t("noChromeLong")}</dd>
    <dt>${t("lastSync")}</dt><dd>${i.lastSync ? new Date(i.lastSync).toLocaleString(locale()) : "—"}</dd>`;
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
    if (r.ok) conn("ok", t("ok"));
    else if (r.status === 401) conn("bad", t("badToken"));
    else conn("warn", t("httpErr", { n: r.status }));
    return r.ok;
  } catch (_) {
    conn("bad", t("noApp"));
    return false;
  }
}

$("eye").onclick = () => {
  const t = $("token"); const show = t.type === "password";
  t.type = show ? "text" : "password"; $("eye").textContent = show ? t("hide") : t("show");
};
$("test").onclick = test;
$("lang").onchange = async () => {
  await chrome.storage.local.set({ lang: $("lang").value });
  await initLang();
  applyI18n();
  load();
};
$("save").onclick = async () => {
  await save();
  conn("idle", t("connecting"));
  if (await test()) await chrome.runtime.sendMessage("collect-now");
  load();
};
chrome.storage.onChanged.addListener(load);
initLang().then(() => { applyI18n(); document.title = t("optTitle"); load(); });

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
  const out = $("out"); out.style.display = "block"; out.textContent = t("probing");
  const orgs = await getJ("/api/organizations");
  const uuid = Array.isArray(orgs.json) && orgs.json[0] ? orgs.json[0].uuid : null;
  const paths = ["/api/organizations", "/api/bootstrap", ...(uuid ? [`/api/organizations/${uuid}`, `/api/organizations/${uuid}/usage`] : [])];
  let text = "";
  for (const p of paths) {
    const r = p === "/api/organizations" ? orgs : await getJ(p).catch((e) => ({ status: String(e), json: null }));
    const hits = []; walk(r.json, "", hits);
    text += `\n## ${p.replace(uuid || "@@", "{org}")}  [HTTP ${r.status}]\n` + (hits.join("\n") || t("noKeys")) + "\n";
  }
  out.textContent = text;
};
