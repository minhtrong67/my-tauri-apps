import type { CSSProperties } from "react";
import { readableOn } from "../../lib/color";
import { TONES, type GeneratedTheme } from "../../lib/theme";
import { useSettings } from "../../state/settings";
import { useToast } from "../../state/toast";

export function PalettesTab({ theme }: { theme: GeneratedTheme }) {
  const { t } = useSettings();
  const toast = useToast();
  return (
    <div className="space-y-4">
      <p className="text-sm text-on-surface-variant">{t("palettes.hint")}</p>
      {theme.palettes.map((p, row) => {
        const label = p.name ?? t(`core.${p.id}` as never);
        return (
          <section key={p.id} className="anim-fade-up rounded-3xl bg-surface-container-low p-4" style={{ "--d": `${row * 50}ms` } as CSSProperties}>
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h3 className="text-base font-medium">{label}</h3>
              <span className="font-mono text-xs text-on-surface-variant">
                H {Math.round(p.hue)} · C {Math.round(p.chroma)}
              </span>
            </div>
            <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fit,minmax(62px,1fr))]">
              {TONES.map((tone, i) => {
                const hex = p.tones[tone];
                return (
                  <button
                    key={tone}
                    type="button"
                    data-ripple
                    data-tip={`${label} ${tone} · ${hex}`}
                    onClick={() => toast.copy(hex, hex)}
                    style={{ background: hex, color: readableOn(hex), "--d": `${row * 50 + i * 18}ms` } as CSSProperties}
                    className="anim-pop flex h-16 flex-col justify-between rounded-xl p-2 text-left ring-1 ring-inset ring-black/5 transition-[background-color,transform] duration-300 hover:scale-105"
                  >
                    <span className="text-xs font-semibold">{tone}</span>
                    <span className="font-mono text-[10px] opacity-80">{hex}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
