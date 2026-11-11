import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// Phông chữ đóng gói sẵn (chỉ nạp các tập con latin + latin-ext + vietnamese)
import "@fontsource/roboto/latin-400.css";
import "@fontsource/roboto/latin-500.css";
import "@fontsource/roboto/latin-700.css";
import "@fontsource/roboto/latin-ext-400.css";
import "@fontsource/roboto/latin-ext-500.css";
import "@fontsource/roboto/latin-ext-700.css";
import "@fontsource/roboto/vietnamese-400.css";
import "@fontsource/roboto/vietnamese-500.css";
import "@fontsource/roboto/vietnamese-700.css";
import "@fontsource/be-vietnam-pro/latin-400.css";
import "@fontsource/be-vietnam-pro/latin-500.css";
import "@fontsource/be-vietnam-pro/latin-700.css";
import "@fontsource/be-vietnam-pro/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/vietnamese-500.css";
import "@fontsource/be-vietnam-pro/vietnamese-700.css";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/noto-sans/wght.css";
import "@fontsource-variable/open-sans/wght.css";
import "./styles.css";

// `npm run dev:mock`: mô phỏng hình nền Windows phía sau cửa sổ để xem Mica/Acrylic trong trình duyệt
if (import.meta.env.MODE === "mock") document.documentElement.dataset.mock = "1";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
