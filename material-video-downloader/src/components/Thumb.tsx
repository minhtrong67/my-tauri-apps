import { FileAudio, Film, Radio, Globe } from "lucide-react";
import { hashString } from "../lib/format";
import type { Kind } from "../lib/types";

const HUES = [265, 210, 175, 330, 25, 145, 300, 45];

/** Thumbnail with a tonal gradient fallback so every row has a recognizable face. */
export function Thumb({
  src,
  seed,
  kind,
  audio,
  className = "h-[72px] w-32",
}: {
  src: string | null;
  seed: string;
  kind: Kind;
  audio?: boolean;
  className?: string;
}) {
  const hue = HUES[hashString(seed) % HUES.length];
  const Icon = audio ? FileAudio : kind === "hls" ? Radio : kind === "ytdlp" ? Film : Globe;
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-[22px] transition-[border-radius] duration-500 ease-spring group-hover:rounded-[34px] ${className}`}
      style={{ background: `linear-gradient(135deg, oklch(0.78 0.09 ${hue}), oklch(0.6 0.12 ${hue + 40}))` }}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
      ) : null}
      <div className="absolute inset-0 flex items-center justify-center text-white/90 mix-blend-overlay">
        <Icon size={26} strokeWidth={1.75} />
      </div>
    </div>
  );
}
