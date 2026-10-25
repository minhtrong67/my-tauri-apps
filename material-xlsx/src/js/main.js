import { init } from "./app.js";
init().catch((e) => {
  console.error(e);
  const pre = document.createElement("pre");
  pre.style.cssText = "position:fixed;inset:20px;color:#b00;background:#fff;padding:16px;z-index:999;user-select:text;overflow:auto";
  pre.textContent = String((e && e.stack) || e);
  document.body.appendChild(pre);
});
