import { createRoot } from 'react-dom/client';
import './styles/app.css';
import { initAppearance } from './lib/appearance';
import App from './App';

initAppearance();
createRoot(document.getElementById('root') as HTMLElement).render(<App />);
