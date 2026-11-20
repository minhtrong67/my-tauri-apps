export type FolderStyle = "win11" | "win10" | "classic" | "flat" | "minimal" | "outline" | "glass" | "neon";
export type FillMode = "solid" | "linear" | "radial";
export type PatternId =
  | "none" | "stripes" | "dots" | "checker" | "zigzag" | "waves" | "crosses" | "diamonds";
export type IconKind = "mdi" | "fa" | "lucide" | "brand" | "emoji" | "image";
export type Blend = "source-over" | "multiply" | "screen" | "overlay";
export type Badge = "none" | "circle" | "square";

export interface TextLayer {
  enabled: boolean;
  value: string;
  color: string;
  font: string;
  size: number;
  spacing: number;
  lineHeight: number;
  opacity: number;
  bold: boolean;
  outline: boolean;
  outlineColor: string;
  outlineWidth: number;
  shadow: boolean;
  y: number;
}

export interface IconLayer {
  enabled: boolean;
  kind: IconKind;
  name: string;
  image: string;
  color: string;
  useBrand: boolean;
  badge: Badge;
  badgeColor: string;
  size: number;
  stroke: number;
  x: number;
  y: number;
  opacity: number;
  shadow: boolean;
  blend: Blend;
}

export interface Design {
  style: FolderStyle;
  fill: FillMode;
  color: string;
  color2: string;
  angle: number;
  pattern: PatternId;
  patternSize: number;
  patternIntensity: number;
  patternColor: string;
  text: TextLayer;
  icon: IconLayer;
}

export interface Preset {
  id: string;
  name: string;
  design: Design;
}

/** Windows 11 default folder look. */
export const defaultDesign: Design = {
  style: "win11",
  fill: "linear",
  color: "#FFE9A6",
  color2: "#FFC83D",
  angle: 45,
  pattern: "none",
  patternSize: 16,
  patternIntensity: 0.25,
  patternColor: "#ffffff",
  text: {
    enabled: false,
    value: "",
    color: "#ffffff",
    font: '"Segoe UI", sans-serif',
    size: 44,
    spacing: 0,
    lineHeight: 1.1,
    opacity: 1,
    bold: true,
    outline: false,
    outlineColor: "#000000",
    outlineWidth: 3,
    shadow: true,
    y: 0,
  },
  icon: {
    enabled: false,
    kind: "mdi",
    name: "mdiStar",
    image: "",
    color: "#ffffff",
    useBrand: true,
    badge: "none",
    badgeColor: "#ffffff",
    size: 100,
    stroke: 2,
    x: 0,
    y: 0,
    opacity: 1,
    shadow: true,
    blend: "source-over",
  },
};
