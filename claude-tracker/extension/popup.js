const $ = (id) => document.getElementById(id);
const clock = (ms) => new Date(ms).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
const ago = (ms) => {
  if (!ms) return "—";
  const s = Math.floor((Date.now() - ms) / 1000);
  return s < 60 ? "vừa xong" : s < 3600 ? `${Math.floor(s / 60)} phút trước` : `${Math.floor(s / 3600)} giờ trước`;
};

async function render() {
  const { info = {}, token } = await chrome.storage.local.get(["info", "token"]);
  const active = info.limited && info.resetsAt && Date.parse(info.resetsAt) > Date.now();

  if (active) {
    $("state").innerHTML = `<div class="muted small">Đang bị giới hạn · reset xong lúc</div><div class="time">${clock(Date.parse(info.resetsAt))}</div>`;
  } else if (info.limited === false) {
    $("state").innerHTML = `<div class="muted small">Trạng thái</div><div class="big ok">Dùng được</div>`;
  } else {
    $("state").innerHTML = `<div class="muted small">Trạng thái</div><div class="big">Chưa xác định</div><div class="hint">Mở claude.ai/new để xác nhận</div>`;
  }

  let pill = ["idle", "Chưa cấu hình"];
  if (token) pill = info.appOk ? ["ok", "Đã kết nối app"] : info.appOk === false ? ["bad", "Mất kết nối app"] : ["warn", "Đang chờ đồng bộ"];
  if (info.claudeError) pill = ["warn", "Chưa đăng nhập claude.ai"];

  $("info").innerHTML = `
    <dt>Kết nối</dt><dd><span class="pill ${pill[0]}">${pill[1]}</span></dd>
    <dt>Tài khoản</dt><dd>${info.email || "—"}</dd>
    <dt>Chrome profile</dt><dd>${info.chromeEmail || "Chưa đăng nhập Chrome"}</dd>
    <dt>Đồng bộ</dt><dd>${ago(info.lastSync)}</dd>`;
  $("status").textContent = info.claudeError || (token ? info.status || "" : "Mở Cài đặt để nhập token từ app.");
}

$("sync").onclick = async () => {
  $("sync").disabled = true; $("sync").textContent = "Đang đồng bộ…";
  await chrome.runtime.sendMessage("collect-now");
  $("sync").disabled = false; $("sync").textContent = "Đồng bộ ngay";
  render();
};
$("opts").onclick = () => chrome.runtime.openOptionsPage();
chrome.storage.onChanged.addListener(render);
render();
