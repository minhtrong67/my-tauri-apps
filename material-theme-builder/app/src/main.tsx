import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Bundled fonts (Latin + Vietnamese subsets only, to keep the installer small).
import "@fontsource/roboto/latin-400.css";
import "@fontsource/roboto/latin-500.css";
import "@fontsource/roboto/latin-700.css";
import "@fontsource/roboto/vietnamese-400.css";
import "@fontsource/roboto/vietnamese-500.css";
import "@fontsource/roboto/vietnamese-700.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/vietnamese-400.css";
import "@fontsource/inter/vietnamese-500.css";
import "@fontsource/inter/vietnamese-600.css";
import "@fontsource/nunito/latin-400.css";
import "@fontsource/nunito/latin-600.css";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/vietnamese-400.css";
import "@fontsource/nunito/vietnamese-600.css";
import "@fontsource/nunito/vietnamese-700.css";
import "@fontsource/be-vietnam-pro/latin-400.css";
import "@fontsource/be-vietnam-pro/latin-500.css";
import "@fontsource/be-vietnam-pro/latin-600.css";
import "@fontsource/be-vietnam-pro/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/vietnamese-500.css";
import "@fontsource/be-vietnam-pro/vietnamese-600.css";

import "./index.css";
import App from "./App";
import { registerThemeProps } from "./lib/theme";
import { installRipple } from "./lib/ripple";
import { BuilderProvider } from "./state/builder";
import { SettingsProvider } from "./state/settings";
import { ToastProvider } from "./state/toast";

registerThemeProps();
installRipple();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SettingsProvider>
      <ToastProvider>
        <BuilderProvider>
          <App />
        </BuilderProvider>
      </ToastProvider>
    </SettingsProvider>
  </StrictMode>,
);
