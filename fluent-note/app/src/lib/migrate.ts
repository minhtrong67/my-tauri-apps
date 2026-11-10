/* Copies data saved under the old "material-note.*" keys to the new "fluent-note.*" keys, once.
 * Imported first in main.tsx so it runs before any store reads localStorage. */
try {
  for (const k of ["settings", "recent", "session"]) {
    const next = "fluent-note." + k;
    const prev = localStorage.getItem("material-note." + k);
    if (prev !== null && localStorage.getItem(next) === null) localStorage.setItem(next, prev);
  }
} catch {
  /* storage unavailable: nothing to migrate */
}

export {};
