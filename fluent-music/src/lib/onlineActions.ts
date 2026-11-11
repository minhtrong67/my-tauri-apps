import { useStore } from './store';

/** Opens Settings at the online music section */
export function openOnlineSettings() {
  useStore.getState().nav({ name: 'settings' });
  window.setTimeout(() => document.getElementById('set-music-online')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
}
