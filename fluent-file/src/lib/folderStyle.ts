import { Archive, Book, Briefcase, Camera, Cloud, Code2, Download, FileText, Gamepad2, Globe, Heart, House, ImageIcon, Lock, Music, Package, Palette, Star, Video, Wrench, type LucideIcon } from 'lucide-react';

/** Glyphs that can be stamped on a folder icon. */
export const FOLDER_GLYPHS: Record<string, LucideIcon> = {
  star: Star, heart: Heart, home: House, briefcase: Briefcase, docs: FileText, book: Book, image: ImageIcon, camera: Camera, music: Music, video: Video,
  code: Code2, game: Gamepad2, download: Download, cloud: Cloud, lock: Lock, archive: Archive, package: Package, tools: Wrench, globe: Globe, art: Palette
};
export const GLYPH_IDS = Object.keys(FOLDER_GLYPHS);

/** Folder colours: the Windows yellow first (null = default), then the Fluent accent family. */
export const FOLDER_COLORS = ['#F9B72E', '#F7630C', '#D13438', '#E3008C', '#B146C2', '#744DA9', '#6B69D6', '#0078D4', '#00B7C3', '#038387', '#10893E', '#498205', '#7A7574', '#515C6B'];

export function onColor(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const l = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return l > 0.62 ? 'rgba(40,28,0,.78)' : 'rgba(255,255,255,.95)';
}
