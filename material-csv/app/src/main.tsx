import { createRoot } from 'react-dom/client';
import '@fontsource/roboto/latin-400.css'; import '@fontsource/roboto/latin-500.css'; import '@fontsource/roboto/latin-700.css';
import '@fontsource/roboto/vietnamese-400.css'; import '@fontsource/roboto/vietnamese-500.css'; import '@fontsource/roboto/vietnamese-700.css';
import '@fontsource-variable/google-sans-flex/wght.css';
import '@fontsource-variable/roboto-flex/wght.css';
import '@fontsource/be-vietnam-pro/latin-400.css'; import '@fontsource/be-vietnam-pro/latin-500.css'; import '@fontsource/be-vietnam-pro/latin-700.css';
import '@fontsource/be-vietnam-pro/vietnamese-400.css'; import '@fontsource/be-vietnam-pro/vietnamese-500.css'; import '@fontsource/be-vietnam-pro/vietnamese-700.css';
import '@fontsource/inter/latin-400.css'; import '@fontsource/inter/latin-500.css'; import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/vietnamese-400.css'; import '@fontsource/inter/vietnamese-500.css'; import '@fontsource/inter/vietnamese-600.css';
import './index.css';
import { loadSettings } from './lib/store';
import { setLang } from './lib/i18n';
import { app } from './lib/store';
import { applyAppearance } from './lib/theme';
import { App } from './App';

loadSettings();
setLang(app.settings.lang);
applyAppearance();

createRoot(document.getElementById('root')!).render(<App />);
