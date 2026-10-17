import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import css from "./styles.js";
import themeCss from "./theme.js";
import { initRipple } from "./ripple.js";

const style = document.createElement("style");
style.textContent = `${themeCss()}\n${css}`;
document.head.appendChild(style);
initRipple();

// Bản build: tắt menu chuột phải (trừ ô nhập liệu)
if (!import.meta.env.DEV) {
  addEventListener("contextmenu", (e) => {
    if (!e.target.closest?.("input")) e.preventDefault();
  });
}

createRoot(document.getElementById("root")).render(<App />);
