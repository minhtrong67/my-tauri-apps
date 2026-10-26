const $ = (id) => document.getElementById(id);
const clock = (ms) => new Date(ms).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit", hour12: false });
const ago = (ms) => {
  if (!ms) return "—";
  const s = Math.floor((Date.now() - ms) / 1000);
  return s < 60 ? t("justNow") : s < 3600 ? t("minAgo", { n: Math.floor(s / 60) }) : t("hrAgo", { n: Math.floor(s / 3600) });
};

async function render() {
  const { info = {}, token } = await chrome.storage.local.get(["info", "token"]);
  const active = info.limited && info.resetsAt && Date.parse(info.resetsAt) > Date.now();

  if (active) {
    $("state").innerHTML = `<div class="muted small">${t("limited")}</div><div class="time">${clock(Date.parse(info.resetsAt))}</div>`;
  } else if (info.limited === false) {
    $("state").innerHTML = `<div class="muted small">${t("status")}</div><div class="big ok">${t("usable")}</div>`;
  } else {
    $("state").innerHTML = `<div class="muted small">${t("status")}</div><div class="big">${t("unknown")}</div><div class="hint">${t("openClaude")}</div>`;
  }

  let pill = ["idle", t("notConfigured")];
  if (token) pill = info.appOk ? ["ok", t("connected")] : info.appOk === false ? ["bad", t("disconnected")] : ["warn", t("waitingSync")];
  if (info.claudeError) pill = ["warn", t("notLoggedIn")];

  $("info").innerHTML = `
    <dt>${t("connection")}</dt><dd><span class="pill ${pill[0]}">${pill[1]}</span></dd>
    <dt>${t("account")}</dt><dd>${info.email || "—"}</dd>
    <dt>${t("chromeProfile")}</dt><dd>${info.chromeEmail || t("noChrome")}</dd>
    <dt>${t("lastSync")}</dt><dd>${ago(info.lastSync)}</dd>`;
  $("status").textContent = info.claudeError ? (info.claudeError === "not_logged_in" ? t("notLoggedIn") : info.claudeError) : token ? statusText(info.status) : t("enterToken");
}

$("sync").onclick = async () => {
  $("sync").disabled = true; $("sync").textContent = t("syncing");
  await chrome.runtime.sendMessage("collect-now");
  $("sync").disabled = false; $("sync").textContent = t("sync");
  render();
};
$("opts").onclick = () => chrome.runtime.openOptionsPage();
chrome.storage.onChanged.addListener(render);
initLang().then(() => { applyI18n(); render(); });
