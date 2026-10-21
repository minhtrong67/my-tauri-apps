import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppData, Settings } from "./types";
import type { AccountView } from "./lib";

async function copyText(t: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    if (ok) return true;
  } catch {}
  try {
    await invoke("copy_text", { text: t });
    return true;
  } catch {
    return false;
  }
}

function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  const click = async () => {
    setState((await copyText(text)) ? "ok" : "fail");
    setTimeout(() => setState("idle"), 1800);
  };
  return (
    <button className="ghost" onClick={click}>
      {state === "ok" ? "Đã sao chép ✓" : state === "fail" ? "Không sao chép được" : "Sao chép"}
    </button>
  );
}

export function SettingsView({
  data,
  views,
  onSettings,
}: {
  data: AppData;
  views: AccountView[];
  onSettings: (s: Settings) => void;
}) {
  const s = data.settings;
  return (
    <div className="settings">
      <section className="panel">
        <h2>Kết nối extension</h2>
        <ol className="steps">
          <li>
            Mở <code>chrome://extensions</code> trong từng Chrome Profile, bật <b>Developer mode</b>, chọn{" "}
            <b>Load unpacked</b> và trỏ vào thư mục <code>extension</code> của dự án.
          </li>
          <li>Bấm biểu tượng extension → <b>Cài đặt</b>, nhập cổng và token bên dưới rồi bấm <b>Lưu &amp; kết nối</b>.</li>
          <li>Profile cần đăng nhập claude.ai và đăng nhập Chrome (tài khoản Google) để app tự gán đúng Chrome Profile.</li>
        </ol>
        <div className="kv">
          <span className="muted">Cổng</span>
          <code>{data.port}</code>
          <span className="muted">Token</span>
          <span className="token">
            <code>{data.token}</code>
            <CopyButton text={data.token} />
          </span>
        </div>
      </section>

      <section className="panel">
        <h2>Thông báo</h2>
        <label className="row">
          <input
            type="checkbox"
            checked={s.notify_enabled}
            onChange={(e) => onSettings({ ...s, notify_enabled: e.target.checked })}
          />
          Gửi thông báo Windows khi tới giờ dự kiến reset
        </label>
        <label className="row">
          Chỉ thông báo khi mức dùng ≥
          <input
            type="number"
            min={1}
            max={100}
            value={s.notify_threshold}
            onChange={(e) => onSettings({ ...s, notify_threshold: Number(e.target.value) || 100 })}
          />
          %
        </label>
        <p className="muted small">
          Thông báo chỉ là <b>dự kiến</b>. Tài khoản chỉ được coi là đã hồi khi extension gửi dữ liệu mới sau mốc reset.
          Đóng cửa sổ sẽ thu app xuống khay hệ thống; chọn “Thoát” ở khay để tắt hẳn.
        </p>
        <button className="primary" onClick={() => invoke("test_notification")}>
          Gửi thử thông báo
        </button>
      </section>

      <section className="panel wide">
        <h2>Chẩn đoán dữ liệu thô</h2>
        <p className="muted small">
          Endpoint nội bộ của Claude Web có thể đổi. Nếu thanh usage trống, xem phản hồi gốc ở đây để chỉnh parser.
        </p>
        {views.length === 0 && <div className="muted small">Chưa có tài khoản.</div>}
        {views.map((v) => (
          <details key={v.account.id}>
            <summary>{v.account.label}</summary>
            <pre>{JSON.stringify(v.account.last_raw ?? null, null, 2)}</pre>
          </details>
        ))}
      </section>
    </div>
  );
}
