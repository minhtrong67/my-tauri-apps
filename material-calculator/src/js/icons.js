// Inline SVG icon set (24x24). Stroke icons use currentColor; the settings gear is the classic filled cog.
const S = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>`;
const F = (p) => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${p}</svg>`;

export const icons = {
  // The real gear / cog
  settings: F('<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>'),
  standard: S('<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 7.5h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>'),
  scientific: S('<path d="M3 13h3l3 7L14 4h7"/>'),
  programmer: S('<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14"/>'),
  converter: S('<path d="M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4"/>'),
  date: S('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14.5h.01M12 14.5h.01M16 14.5h.01"/>'),
  history: S('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7.5V12l3 2"/>'),
  backspace: S('<path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="M17 9.5l-5 5M12 9.5l5 5"/>'),
  copy: S('<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/>'),
  paste: S('<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4.5V3h6v1.5M9 11h6M9 15h4"/>'),
  trash: S('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'),
  close: S('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: S('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  minus: S('<path d="M5 12h14"/>'),
  swap: S('<path d="M8 4v16M4 16l4 4 4-4M16 20V4M12 8l4-4 4 4"/>'),
  chevronDown: S('<path d="M6 9l6 6 6-6"/>'),
  chevronUp: S('<path d="M6 15l6-6 6 6"/>'),
  sun: S('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
  moon: S('<path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.8 6.8 0 0 0 9.7 9.7z"/>'),
  auto: S('<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>'),
  palette: S('<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-1.8 0-.9-.6-1.3-.6-2.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.7 17 3 12 3z"/><path d="M7.5 11.5h.01M10 7.5h.01M14.5 7.5h.01"/>'),
  language: S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>'),
  window: S('<rect x="3" y="4.5" width="18" height="15" rx="3"/><path d="M3 9h18"/>'),
  pin: S('<path d="M9 4h6l-1 6 3 3H7l3-3-1-6zM12 13v7"/>'),
  info: S('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>'),
  heart: F('<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.3 5c1.9 0 3.5 1 4.5 2.5h2.4C14.2 6 15.8 5 17.7 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" transform="translate(0 -.5)"/>'),
  sparkle: F('<path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zM19 15l.9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15z"/>'),
  code: S('<path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/>'),
  calendar: S('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  bits: S('<path d="M5 6h4v4H5zM15 6h4v4h-4zM5 14h4v4H5zM15 14h4v4h-4z"/>'),
  memory: S('<rect x="4" y="6" width="16" height="12" rx="2.5"/><path d="M8 6V3.5M12 6V3.5M16 6V3.5M8 18v2.5M12 18v2.5M16 18v2.5"/>'),
  enter: S('<path d="M20 5v7a3 3 0 0 1-3 3H5M9 10.5L4.5 15 9 19.5"/>'),
};

export function icon(name, cls = '') {
  return `<span class="icon ${cls}">${icons[name] || ''}</span>`;
}
