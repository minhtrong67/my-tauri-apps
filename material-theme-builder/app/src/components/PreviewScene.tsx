import { useState, type CSSProperties } from "react";
import {
  Bell,
  Bookmark,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  Share,
  Pencil,
  Camera,
  Image as ImageIcon,
  X,
  Check as CheckIcon,
  Compass,
  EllipsisVertical,
  Heart,
  House,
  Menu,
  Plus,
  Search,
  Share2,
  Star,
  User,
} from "lucide-react";
import { THEME_TRANSITION, themeVars, type CustomRoles, type Roles } from "../lib/theme";
import { cn } from "../lib/utils";
import { useSettings } from "../state/settings";
import { Button, Chip, LoadingIndicator, Range, ShapeBox, Switch, WavyProgress, type ShapeName } from "./ui";

/** Scope every `--md-*` variable to the preview container so the whole subtree re-themes. */
export function scopeStyle(roles: Roles, dark: boolean): CSSProperties {
  return { ...(themeVars(roles) as CSSProperties), transition: THEME_TRANSITION, colorScheme: dark ? "dark" : "light" };
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label="checkbox"
      onClick={() => onChange(!checked)}
      className={cn(
        "grid size-[18px] place-items-center rounded-[3px] border-2 transition-colors duration-200",
        checked ? "border-primary bg-primary text-on-primary" : "border-on-surface-variant",
      )}
    >
      {checked && <CheckIcon className="anim-pop size-3.5" strokeWidth={3.5} />}
    </button>
  );
}

function Radio({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label="radio"
      onClick={onClick}
      className={cn("grid size-5 place-items-center rounded-full border-2 transition-colors duration-200", checked ? "border-primary" : "border-on-surface-variant")}
    >
      <span className={cn("size-2.5 rounded-full bg-primary transition-transform duration-200", checked ? "scale-100" : "scale-0")} />
    </button>
  );
}

function ExploreScreen() {
  const { t } = useSettings();
  const bars = [38, 62, 48, 80, 56, 92, 70];
  const tiles = [
    { c: "bg-primary text-on-primary", n: "2.4k", l: t("preview.statA") },
    { c: "bg-secondary-container text-on-secondary-container", n: "87%", l: t("preview.statB") },
    { c: "bg-tertiary-container text-on-tertiary-container", n: "312", l: t("preview.statC") },
    { c: "bg-surface-container-high text-on-surface", n: "+18", l: t("preview.statD") },
  ];
  return (
    <div key="explore" className="anim-fade-up flex-1 space-y-3 overflow-hidden px-4 pb-2">
      <h4 className="pt-1 text-xl font-medium">{t("preview.exploreTitle")}</h4>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((x, i) => (
          <div key={i} className={cn("rounded-3xl p-3", x.c)}>
            <div className="text-2xl font-semibold leading-none">{x.n}</div>
            <div className="mt-1 text-[11px] opacity-80">{x.l}</div>
          </div>
        ))}
      </div>
      <div className="rounded-3xl bg-surface-container p-3">
        <div className="mb-2 text-xs text-on-surface-variant">{t("preview.statTrend")}</div>
        <div className="flex h-24 items-end gap-1.5">
          {bars.map((h, i) => (
            <span key={i} className={cn("flex-1 rounded-t-lg", i === 5 ? "bg-primary" : "bg-primary-container")} style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <WavyProgress value={64} />
    </div>
  );
}

function SavedScreen() {
  const { t } = useSettings();
  const tones = ["bg-primary-container", "bg-secondary-container", "bg-tertiary-container", "bg-surface-container-highest", "bg-error-container", "bg-primary-container"];
  const shapes: ShapeName[] = ["cookie", "sunny", "clover", "flower", "gem", "burst"];
  return (
    <div key="saved" className="anim-fade-up flex-1 space-y-3 overflow-hidden px-4 pb-2">
      <h4 className="pt-1 text-xl font-medium">{t("preview.savedTitle")}</h4>
      <div className="grid grid-cols-2 gap-2">
        {tones.map((c, i) => (
          <div key={i} className="rounded-3xl bg-surface-container-low p-2">
            <div className={cn("grid h-20 place-items-center rounded-2xl", c)}>
              <ShapeBox shape={shapes[i]} className="size-10 bg-primary" />
            </div>
            <div className="px-1 pb-1 pt-2 text-xs font-medium">{t("preview.savedItem", { n: i + 1 })}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileScreen() {
  const { t } = useSettings();
  const [remember, setRemember] = useState(true);
  const field = (label: string, value: string, active?: boolean) => (
    <div className={cn("relative h-12 rounded-xl border px-3 pt-4 text-sm", active ? "border-2 border-primary" : "border-outline")}>
      <span className={cn("absolute -top-2 left-2 bg-surface px-1 text-[11px]", active ? "text-primary" : "text-on-surface-variant")}>{label}</span>
      {value}
    </div>
  );
  return (
    <div key="profile" className="anim-fade-up flex flex-1 flex-col gap-3 overflow-hidden px-4 pb-2">
      <div className="flex flex-col items-center gap-2 pt-2">
        <ShapeBox shape="cookie" className="size-20 bg-tertiary-container text-2xl font-semibold text-on-tertiary-container">M</ShapeBox>
        <h4 className="text-xl font-medium">{t("preview.signIn")}</h4>
      </div>
      {field(t("preview.email"), "minh@example.com", true)}
      {field(t("preview.password"), "••••••••")}
      <label className="flex items-center justify-between text-sm">
        {t("preview.remember")}
        <Switch checked={remember} onChange={setRemember} />
      </label>
      <Button size="md" className="w-full">{t("preview.signIn")}</Button>
      <Button variant="text" className="w-full">{t("preview.create")}</Button>
    </div>
  );
}

function PhoneScreen() {
  const { t } = useSettings();
  const [nav, setNav] = useState(0);
  const [liked, setLiked] = useState(false);
  const navItems = [
    { icon: House, label: t("preview.nav.home") },
    { icon: Compass, label: t("preview.nav.explore") },
    { icon: Bookmark, label: t("preview.nav.saved") },
    { icon: User, label: t("preview.nav.profile") },
  ];
  const list = [
    { c: "bg-primary-container text-on-primary-container", a: "A", title: t("preview.list1"), sub: t("preview.list1sub") },
    { c: "bg-secondary-container text-on-secondary-container", a: "B", title: t("preview.list2"), sub: t("preview.list2sub") },
    { c: "bg-tertiary-container text-on-tertiary-container", a: "C", title: t("preview.list3"), sub: t("preview.list3sub") },
  ];
  return (
    <div className="relative flex h-[600px] w-[300px] shrink-0 flex-col overflow-hidden rounded-[36px] border-[6px] border-outline-variant bg-surface text-on-surface shadow-elev-2">
      <div className="mx-auto mt-1.5 h-1.5 w-16 rounded-full bg-outline-variant" />
      <div className="flex items-center gap-2 px-4 pb-2 pt-3">
        <Menu className="size-5 text-on-surface-variant" />
        <div className="flex h-10 flex-1 items-center gap-2 rounded-full bg-surface-container-high px-3 text-sm text-on-surface-variant">
          <Search className="size-4" />
          {t("preview.search")}
        </div>
        <span className="grid size-8 place-items-center rounded-full bg-tertiary-container text-xs font-semibold text-on-tertiary-container">M</span>
      </div>
      {nav === 0 && (
        <div key="home" className="anim-fade-up flex-1 space-y-3 overflow-hidden px-4 pb-2">
          <div className="rounded-3xl bg-primary-container p-4 text-on-primary-container">
            <div className="mb-1 flex items-center justify-between">
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-on-primary">{t("preview.badge")}</span>
              <EllipsisVertical className="size-4" />
            </div>
            <h4 className="text-lg font-medium leading-snug">{t("preview.heroTitle")}</h4>
            <p className="mt-1 text-xs opacity-80">{t("preview.heroBody")}</p>
            <div className="mt-3 flex items-center gap-2">
              <Button size="xs">{t("preview.read")}</Button>
              <button
                type="button"
                aria-label="like"
                data-ripple
                onClick={() => setLiked((l) => !l)}
                className="grid size-8 place-items-center rounded-full text-on-primary-container"
              >
                <Heart className={cn("size-4 transition-transform duration-300", liked && "scale-125 fill-current")} />
              </button>
              <Share2 className="size-4" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip selected>{t("preview.chip1")}</Chip>
            <Chip>{t("preview.chip2")}</Chip>
            <Chip>{t("preview.chip3")}</Chip>
          </div>
          <ul className="space-y-1">
            {list.map((i) => (
              <li key={i.a} className="flex items-center gap-3 rounded-2xl px-1 py-1.5">
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold", i.c)}>{i.a}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{i.title}</span>
                  <span className="block truncate text-xs text-on-surface-variant">{i.sub}</span>
                </span>
                <Star className="size-4 text-on-surface-variant" />
              </li>
            ))}
          </ul>
        </div>
      )}
      {nav === 1 && <ExploreScreen />}
      {nav === 2 && <SavedScreen />}
      {nav === 3 && <ProfileScreen />}
      {nav === 0 && <button
        type="button"
        aria-label="add"
        data-ripple
        className="absolute bottom-[88px] right-4 grid size-14 place-items-center rounded-2xl bg-tertiary-container text-on-tertiary-container shadow-elev-3 transition-transform active:scale-90"
      >
        <Plus className="size-6" />
      </button>}
      <nav className="flex items-center justify-around bg-surface-container px-2 pb-3 pt-2">
        {navItems.map((n, i) => (
          <button key={i} type="button" onClick={() => setNav(i)} className="flex w-16 flex-col items-center gap-1 text-[11px]">
            <span className={cn("grid h-8 w-14 place-items-center rounded-full transition-colors duration-300", nav === i ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant")}>
              <n.icon className="size-5" />
            </span>
            <span className={nav === i ? "font-semibold text-on-surface" : "text-on-surface-variant"}>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

const SHAPES: ShapeName[] = ["cookie", "sunny", "clover", "flower", "gem", "burst"];

/** Material 3 Expressive components, themed by the scene variables. */
function ExpressivePanel({ panel, title }: { panel: string; title: string }) {
  const { t } = useSettings();
  const [group, setGroup] = useState(1);
  const [fab, setFab] = useState(false);
  const [fmt, setFmt] = useState<Record<string, boolean>>({ b: true });
  const [shape, setShape] = useState(0);
  const labels = [t("preview.day"), t("preview.week"), t("preview.month")];
  return (
    <div className={panel}>
      <h4 className={title}>{t("preview.expressive")}</h4>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        {/* connected button group */}
        <div className="cbg" style={{ ["--bh" as string]: "40px" }}>
          {labels.map((l, i) => (
            <button
              key={l}
              type="button"
              data-ripple
              aria-pressed={group === i}
              aria-selected={group === i}
              onClick={() => setGroup(i)}
              className={cn("px-4 text-sm font-medium", group === i ? "bg-secondary text-on-secondary" : "bg-secondary-container text-on-secondary-container")}
            >
              {l}
            </button>
          ))}
        </div>

        {/* split button */}
        <div className="flex gap-0.5">
          <button type="button" data-ripple className="h-10 rounded-l-full rounded-r-md bg-primary pl-5 pr-4 text-sm font-medium text-on-primary">
            {t("preview.share")}
          </button>
          <button type="button" aria-label="more" data-ripple className="grid h-10 w-11 place-items-center rounded-l-md rounded-r-full bg-primary text-on-primary">
            <ChevronDown className="size-4" />
          </button>
        </div>

        {/* loading indicators */}
        <div className="flex items-center gap-3">
          <LoadingIndicator size={44} />
          <LoadingIndicator size={52} contained />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4">
        {/* shape swatches that morph on hover and click */}
        <div className="flex items-center gap-2">
          {SHAPES.map((sh, i) => (
            <button
              key={sh}
              type="button"
              aria-label={sh}
              onClick={() => setShape(i)}
              className="group grid size-10 place-items-center rounded-full"
            >
              <ShapeBox
                shape={shape === i ? "circle" : sh}
                className={cn(
                  "size-9 transition-transform duration-(--spring-spatial-fast-d) ease-emphasized group-hover:scale-110 group-active:scale-90",
                  ["bg-primary", "bg-secondary", "bg-tertiary", "bg-primary-container", "bg-tertiary-container", "bg-secondary-container"][i],
                )}
              >
                {shape === i && <CheckIcon className="anim-pop size-4 text-on-primary" strokeWidth={3} />}
              </ShapeBox>
            </button>
          ))}
        </div>

        {/* floating toolbar */}
        <div className="flex items-center gap-1 rounded-full bg-primary-container p-1.5 text-on-primary-container shadow-elev-2">
          {[
            ["b", Bold],
            ["i", Italic],
            ["u", Underline],
          ].map(([k, Ico]) => {
            const I = Ico as typeof Bold;
            const on = !!fmt[k as string];
            return (
              <button
                key={k as string}
                type="button"
                data-ripple
                aria-label={k as string}
                aria-pressed={on}
                onClick={() => setFmt((f) => ({ ...f, [k as string]: !f[k as string] }))}
                className={cn("m3e-icon-btn grid size-10 place-items-center", on ? "bg-primary text-on-primary" : "")}
              >
                <I className="size-5" />
              </button>
            );
          })}
          <span className="mx-1 h-6 w-px bg-on-primary-container/25" />
          <button type="button" data-ripple aria-label="share" className="m3e-icon-btn grid size-10 place-items-center">
            <Share className="size-5" />
          </button>
        </div>

        {/* FAB menu */}
        <div className="relative ml-auto flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-2 transition-[opacity,transform] duration-(--spring-spatial-d) ease-emphasized",
              fab ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-4 opacity-0",
            )}
          >
            {[
              [Pencil, t("preview.fabNote")],
              [Camera, t("preview.fabPhoto")],
              [ImageIcon, t("preview.fabImage")],
            ].map(([Ico, label], i) => {
              const I = Ico as typeof Pencil;
              return (
                <button
                  key={label as string}
                  type="button"
                  data-ripple
                  aria-label={label as string}
                  style={{ transitionDelay: fab ? `${i * 40}ms` : "0ms" }}
                  className="m3e-btn flex items-center gap-2 bg-primary-container px-4 text-sm font-medium text-on-primary-container"
                >
                  <I className="size-4" />
                  {label as string}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            data-ripple
            aria-label="menu"
            aria-expanded={fab}
            onClick={() => setFab((f) => !f)}
            className={cn(
              "m3e-btn grid w-14 place-items-center shadow-elev-2",
              fab ? "bg-primary text-on-primary" : "bg-tertiary-container text-on-tertiary-container",
            )}
            style={{ ["--bh" as string]: "56px" }}
          >
            {fab ? <X key="x" className="anim-pop size-6" /> : <Plus key="p" className="anim-pop size-6" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function Board({ custom, dark }: { custom: CustomRoles[]; dark: boolean }) {
  const { t } = useSettings();
  const [sw, setSw] = useState(true);
  const [cb, setCb] = useState(true);
  const [radio, setRadio] = useState(0);
  const [slider, setSlider] = useState(62);
  const [tab, setTab] = useState(0);
  const tabs = [t("preview.tab1"), t("preview.tab2"), t("preview.tab3")];
  const panel = "rounded-3xl bg-surface-container p-4";
  const title = "mb-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant";

  return (
    <div className="@container grid min-w-0 flex-1 basis-[21rem] grid-cols-[minmax(0,1fr)] content-start gap-3">
      <div className={panel}>
        <h4 className={title}>{t("preview.buttons")}</h4>
        <div className="flex flex-wrap gap-2">
          <Button>{t("preview.filled")}</Button>
          <Button variant="tonal">{t("preview.tonal")}</Button>
          <Button variant="outlined">{t("preview.outlined")}</Button>
          <Button variant="elevated">{t("preview.elevated")}</Button>
          <Button variant="text">{t("preview.text")}</Button>
          <Button variant="danger">{t("preview.error")}</Button>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 @min-[34rem]:grid-cols-2">
        <div className={panel}>
          <h4 className={title}>{t("preview.controls")}</h4>
          <div className="space-y-3">
            <label className="flex items-center justify-between text-sm">
              {t("preview.notifications")}
              <Switch checked={sw} onChange={setSw} label={t("preview.notifications")} />
            </label>
            <label className="flex items-center justify-between text-sm">
              {t("preview.remember")}
              <Checkbox checked={cb} onChange={setCb} />
            </label>
            <div className="flex items-center gap-4 text-sm">
              {[0, 1, 2].map((i) => (
                <label key={i} className="flex items-center gap-2">
                  <Radio checked={radio === i} onClick={() => setRadio(i)} />
                  {["S", "M", "L"][i]}
                </label>
              ))}
            </div>
            <Range label="slider" halo="var(--md-surface-container)" min={0} max={100} value={slider} onChange={setSlider} />
          </div>
        </div>

        <div className={panel}>
          <h4 className={title}>{t("preview.inputs")}</h4>
          <label className="relative mb-4 block">
            <span className="absolute -top-2 left-3 bg-surface-container px-1 text-xs text-primary">{t("preview.label")}</span>
            <input defaultValue="Material 3" className="h-12 w-full rounded-xl border-2 border-primary bg-transparent px-4 text-sm outline-none" />
          </label>
          <div className="mb-3 flex flex-wrap gap-2">
            <Chip selected>{t("preview.chip1")}</Chip>
            <Chip icon={<Bell className="size-4" />}>{t("preview.assist")}</Chip>
            <Chip>{t("preview.chip3")}</Chip>
          </div>
          <WavyProgress value={slider} label="progress" />
        </div>
      </div>

      <ExpressivePanel panel={panel} title={title} />

      <div className={panel}>
        <div className="relative mb-4 grid auto-cols-fr grid-flow-col border-b border-outline-variant">
          {tabs.map((label, i) => (
            <button key={i} type="button" data-ripple onClick={() => setTab(i)} className={cn("h-12 text-sm font-medium transition-colors", tab === i ? "text-primary" : "text-on-surface-variant")}>
              {label}
            </button>
          ))}
          <span
            className="absolute bottom-0 h-[3px] rounded-t-full bg-primary transition-transform duration-(--spring-spatial-d) ease-emphasized"
            style={{ width: `${100 / tabs.length}%`, transform: `translateX(${tab * 100}%)` }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[200px] flex-1 rounded-2xl bg-error-container p-3 text-sm text-on-error-container">{t("preview.errorBanner")}</div>
          <div className="flex items-center gap-3 rounded-lg bg-inverse-surface py-2.5 pl-4 pr-2 text-sm text-inverse-on-surface">
            {t("preview.snackbar")}
            <span className="rounded-full px-3 py-1 font-medium text-inverse-primary">{t("preview.undo")}</span>
          </div>
        </div>
      </div>

      {custom.length > 0 && (
        <div className={panel}>
          <h4 className={title}>{t("preview.customColors")}</h4>
          <div className="flex flex-wrap gap-2">
            {custom.map((c) => {
              const s = dark ? c.dark : c.light;
              return (
                <div key={c.id} className="flex overflow-hidden rounded-full text-sm font-medium">
                  <span className="px-3 py-1.5" style={{ background: s.color, color: s.onColor }}>
                    {c.name}
                  </span>
                  <span className="px-3 py-1.5" style={{ background: s.colorContainer, color: s.onColorContainer }}>
                    {c.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function PreviewScene({ roles, custom, dark }: { roles: Roles; custom: CustomRoles[]; dark: boolean }) {
  return (
    <div style={scopeStyle(roles, dark)} className="flex flex-wrap items-start justify-center gap-4 rounded-[28px] border border-outline-variant bg-background p-4 text-on-background">
      <PhoneScreen />
      <Board custom={custom} dark={dark} />
    </div>
  );
}
