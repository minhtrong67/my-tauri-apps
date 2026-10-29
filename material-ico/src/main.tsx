import './fonts';
import './index.css';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SettingsProvider, bootTheme, loadSettings } from './lib/store';
import { ToastProvider } from './components/Toast';
import { initRipple } from './lib/ripple';
import { initWindow } from './lib/windowState';

bootTheme();
initRipple();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SettingsProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </SettingsProvider>,
);

requestAnimationFrame(() => void initWindow(loadSettings().windowMode));
