// Loaded on demand (dynamic import) so the ~1,500 outline icons and react-dom/server
// stay out of the startup bundle and out of memory until the user opens that collection.
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { icons } from "lucide-react";

export const lucideNames: string[] = Object.keys(icons);
export const lucideMap = icons as unknown as Record<string, ComponentType<{ size?: number }>>;

export function lucideSvgSrc(name: string, color: string, stroke: number): string | null {
  const Cmp = (icons as Record<string, unknown>)[name] as ComponentType<Record<string, unknown>> | undefined;
  if (!Cmp) return null;
  const svg = renderToStaticMarkup(createElement(Cmp, { size: 512, color, strokeWidth: stroke }));
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
