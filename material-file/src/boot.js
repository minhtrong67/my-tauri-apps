/* Runs in <head> before the first paint: applies the saved theme and font immediately so the
   window never flashes the wrong colors, and suppresses transitions during start-up. */
(function () {
  var s = {};
  try { s = JSON.parse(localStorage.getItem('material-file.settings')) || {}; } catch (e) {}
  Theme.apply({ theme: s.theme || 'system', seed: s.seed || Theme.DEFAULT_SEED, font: s.font || 'system' }, null);
  document.documentElement.classList.add('booting');
})();
