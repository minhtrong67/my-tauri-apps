import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./fonts.css";
import "./styles.css";

// Material ripple via event delegation: any element with .ripple gets the effect.
document.addEventListener("pointerdown", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>(".ripple");
  if (!el || (el as HTMLButtonElement).disabled || document.documentElement.dataset.anim === "off") return;
  const r = el.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2;
  const s = document.createElement("span");
  s.className = "ripple-wave";
  s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
  el.appendChild(s);
  s.addEventListener("animationend", () => s.remove());
}, { passive: true });

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
