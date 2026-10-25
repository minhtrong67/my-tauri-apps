import { Bot, Code2, Heart, Scale, ShieldCheck, User } from "lucide-react";
import { ShapeBadge } from "../components/ui";
import { useT } from "../lib/hooks";

const STACK = ["Tauri 2", "Rust", "React 19", "TypeScript", "Vite", "Tailwind CSS", "Lucide", "yt-dlp"];

export function AboutPage() {
  const { t } = useT();
  return (
    <div className="anim-page h-full overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex size-44 items-center justify-center"><span className="shape-sunny anim-spin-slow absolute inset-0 bg-primary-container" /><img src="/app-icon.png" alt="" className="anim-pop relative size-28 drop-shadow-xl" draggable={false} /></div>
          <h1 className="mt-5 text-[2.5rem] leading-tight font-semibold tracking-tight text-on-surface">{t("appName")}</h1>
          <p className="mt-1.5 text-on-surface-variant">{t("aboutTagline")}</p>
          <span className="mt-3 rounded-full bg-tertiary-container px-4 py-1.5 text-xs font-bold text-on-tertiary-container">{t("aboutVersion", { v: "1.0.0" })}</span>
        </div>

        <div className="seg-list w-full">
          <Info icon={<User size={20} />} title={t("aboutAuthor")} body="minhtrong67" />
          <Info icon={<Bot size={20} />} title="Claude" body={t("aboutAi")} />
          <Info icon={<Scale size={20} />} title={t("aboutLicense")} body={t("aboutLicenseBody")} />
          <Info icon={<ShieldCheck size={20} />} title="Fair use" body={t("aboutRespect")} />
        </div>

        <div className="w-full rounded-[32px] bg-surface-low p-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-on-surface-variant">
            <Code2 size={16} /> {t("aboutStack")}
          </p>
          <div className="flex flex-wrap gap-2">
            {STACK.map((s) => (
              <span key={s} className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-on-surface">{s}</span>
            ))}
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-on-surface-variant">
          Made with <Heart size={13} className="fill-error text-error" /> by minhtrong67
        </p>
      </div>
    </div>
  );
}

function Info({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-4 bg-surface-low p-5">
      <ShapeBadge shape="cookie" size={48}>{icon}</ShapeBadge>
      <div className="min-w-0">
        <p className="text-base font-semibold text-on-surface">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-on-surface-variant" data-selectable>{body}</p>
      </div>
    </div>
  );
}
