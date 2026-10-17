// Material ripple on pressable controls.
const SEL = '.btn, .rb-btn, .tab, .bs-item, .bs-doc, .bs-action, .tpl, .start-card, .mi, button.filled, button.tonal, button.text, .chip';
document.addEventListener('pointerdown', (e) => {
  const host = e.target.closest && e.target.closest(SEL);
  if (!host || host.disabled || host.closest('#editor')) return;
  const r = host.getBoundingClientRect();
  const d = Math.max(r.width, r.height) * 2;
  const s = document.createElement('span');
  s.className = 'ripple';
  s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  host.style.overflow = host.style.overflow || 'hidden';
  host.append(s);
  s.addEventListener('animationend', () => s.remove(), { once: true });
}, { passive: true });
