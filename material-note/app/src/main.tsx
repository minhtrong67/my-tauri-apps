import { createRoot } from "react-dom/client";
import "./index.css";
import { initAppearance } from "./lib/appearance";
import App from "./App";

// Colours, fonts and text size are applied before the first render, so nothing flashes.
initAppearance();

createRoot(document.getElementById("root") as HTMLElement).render(<App />);

// Development helper (stripped from production builds): lets scripts seed demo tabs, e.g. for screenshots.
if (import.meta.env.DEV) {
  void Promise.all([import("./store/docs"), import("./lib/actions")]).then(([docs, actions]) => {
    (window as unknown as { __mn: unknown }).__mn = { ...docs, ...actions };
  });
}
