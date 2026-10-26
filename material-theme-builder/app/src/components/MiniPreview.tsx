import type { Roles } from "../lib/theme";

export function MiniPreview({ light, dark }: { light: Roles; dark: Roles }) {
  const half = (r: Roles) => (
    <div className="flex flex-1 flex-col gap-1.5 p-2.5 transition-colors duration-300" style={{ background: r.surface }}>
      <div className="h-3 w-2/3 rounded-full" style={{ background: r.primary }} />
      <div className="flex gap-1.5">
        <div className="h-6 flex-1 rounded-lg" style={{ background: r.primaryContainer }} />
        <div className="h-6 flex-1 rounded-lg" style={{ background: r.secondaryContainer }} />
        <div className="h-6 flex-1 rounded-lg" style={{ background: r.tertiaryContainer }} />
      </div>
      <div className="h-2 w-full rounded-full" style={{ background: r.surfaceContainerHighest }} />
    </div>
  );
  return (
    <div className="flex overflow-hidden rounded-2xl ring-1 ring-inset ring-outline-variant">
      {half(light)}
      {half(dark)}
    </div>
  );
}
