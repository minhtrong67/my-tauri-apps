import { Bot, Code2, Heart, Scale, ShieldCheck, User } from "lucide-react";
import { useT } from "../lib/hooks";

const STACK = ["Tauri 2", "Rust", "React 19", "TypeScript", "Vite", "Tailwind CSS", "Lucide", "yt-dlp"];

export function AboutPage() {
  const { t } = useT();
  return (
    <div className="anim-page h-full overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-col items-center text-center">
          <img src="/app-icon.png" alt="" className="anim-pop size-28 drop-shadow-xl" draggable={false} />
          <h1 className="mt-5 text-3xl font-normal text-on-surface">{t("appName")}</h1>
          <p className="mt-1.5 text-on-surface-variant">{t("aboutTagline")}</p>
          <span className="mt-3 rounded-full bg-secondary-container px-3 py-1 text-xs font-medium text-on-secondary-container">{t("aboutVersion", { v: "1.0.0" })}</span>
        </div>

        <div className="grid w-full gap-3">
          <Info icon={<User size={20} />} title={t("aboutAuthor")} body="minhtrong67" />
          <Info icon={<Bot size={20} />} title="Claude" body={t("aboutAi")} />
          <Info icon={<Scale size={20} />} title={t("aboutLicense")} body={t("aboutLicenseBody")} />
          <Info icon={<ShieldCheck size={20} />} title="Fair use" body={t("aboutRespect")} />
        </div>

        <div className="w-full rounded-3xl bg-surface-low p-5">
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
    <div className="flex items-start gap-4 rounded-2xl bg-surface-low p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">{icon}</span>
      <div className="min-w-0">
        <p className="text-[0.95rem] font-medium text-on-surface">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-on-surface-variant" data-selectable>{body}</p>
      </div>
    </div>
  );
}
