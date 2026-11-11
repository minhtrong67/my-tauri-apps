// Dev-only: a tiny fake Tauri backend so the UI can be rendered and screenshotted in a plain browser (see shoot.py). Not part of the app bundle.
(() => {
  const palette = [['#4cc2ff', '#6b50d6'], ['#ff8a5c', '#c239b3'], ['#00b294', '#0063b1'], ['#ffb900', '#da3b01'], ['#8764b8', '#1f1f3d'], ['#10893e', '#00b7c3']];
  const names = [
    ['Midnight Drive', 'Neon Harbor', 'City Lights'], ['Paper Planes', 'Lumen', 'Daydream'], ['Golden Hour', 'The Wanderers', 'Open Road'],
    ['Static Bloom', 'Neon Harbor', 'City Lights'], ['Slow Tides', 'Lumen', 'Daydream'], ['Velvet Sky', 'Aurora Fields', 'Northern'],
    ['Echoes', 'The Wanderers', 'Open Road'], ['Afterglow', 'Aurora Fields', 'Northern'], ['Low Fidelity', 'Kite & Co', 'Sunday'],
    ['Sunroom', 'Kite & Co', 'Sunday'], ['Harbor Lights', 'Neon Harbor', 'City Lights'], ['Weightless', 'Lumen', 'Daydream'],
  ];
  const tracks = names.map(([title, artist, album], i) => ({
    id: 't' + i, path: `C:\\Music\\${artist}\\${title}.flac`, title, artist, album, albumArtist: artist, genre: 'Indie', year: 2020 + (i % 5), trackNo: (i % 4) + 1,
    duration: 170 + i * 13, bitrate: 900, sampleRate: 44100, format: 'FLAC', size: 30e6, addedAt: Date.now() - i * 864e5, folder: 'C:\\Music', hasCover: true, cover: 'cover:' + (i % 6), modified: 1,
  }));
  const settings = Object.assign({}, JSON.parse(localStorage.getItem('__mock_settings') || '{}'));
  const user = {
    v: 2, playlists: [{ id: 'p1', name: 'Focus', trackIds: ['t0', 't1', 't2', 't5'] }, { id: 'p2', name: 'Road trip', trackIds: ['t3', 't4'] }], liked: { t0: 1, t2: 1, t5: 1 },
    history: tracks.slice(0, 6).map((t, i) => ({ id: t.id, at: Date.now() - i * 36e5 })), plays: { t0: 9, t2: 5, t5: 3, t1: 2 }, listens: [], lyricOffsets: {}, smartLists: [],
    settings, session: { queue: tracks.map((t) => t.id), baseQueue: tracks.map((t) => t.id), index: 2, position: 61, shuffle: false, repeat: 'off' }, navCollapsed: false, viewModes: {},
  };
  const calls = (window.__calls = []);
  let cbId = 1;
  const handlers = {
    load_state: (a) => ({ data: a.name === 'library' ? JSON.stringify({ v: 1, tracks }) : JSON.stringify(user), recovered: false }),
    get_music_dir: () => null, get_launch_args: () => [], scan_paths: () => ({ tracks: [], found: [] }), find_removed: () => [], get_backup_dir: () => null,
    get_cover: () => null, read_lyrics: () => null, backdrop_support: () => ({ build: 22631, mica: true, micaAlt: true, acrylic: true }),
    set_backdrop: (a) => a.kind, online_ytdlp_status: () => ({ installed: false, path: '', version: '', managed: false, runtime: '' }),
    'plugin:window|is_maximized': () => false, 'plugin:event|listen': () => cbId++, 'plugin:event|unlisten': () => null,
  };
  window.__TAURI_INTERNALS__ = {
    metadata: { currentWindow: { label: 'main' }, currentWebview: { windowLabel: 'main', label: 'main' }, windows: [{ label: 'main' }], webviews: [{ windowLabel: 'main', label: 'main' }] },
    transformCallback: (cb) => { const id = cbId++; window['_' + id] = cb; return id; },
    unregisterCallback: () => undefined,
    convertFileSrc: (p) => {
      const m = /cover:(\d)/.exec(p);
      if (!m) return p;
      const [a, b] = palette[+m[1]];
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='300' height='300' fill='url(#g)'/><circle cx='210' cy='90' r='60' fill='white' fill-opacity='.18'/><path d='M60 240 L150 120 L240 240Z' fill='white' fill-opacity='.14'/></svg>`;
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    },
    invoke: async (cmd, args) => { calls.push(cmd); const h = handlers[cmd]; return h ? h(args || {}) : null; },
  };
})();
