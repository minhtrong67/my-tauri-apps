import type { Entry, Kind } from './types';
import { extOf } from './paths';

export type Cat = 'image' | 'video' | 'audio' | 'archive' | 'doc' | 'sheet' | 'slide' | 'code' | 'exe' | 'text';
const CATS: Record<Cat, string> = {
  image: 'png jpg jpeg gif webp bmp svg ico avif tif tiff heic',
  video: 'mp4 mkv avi mov wmv webm flv m4v mpg mpeg',
  audio: 'mp3 wav flac aac ogg m4a wma opus',
  archive: 'zip rar 7z tar gz bz2 xz iso cab',
  doc: 'doc docx pdf odt rtf',
  sheet: 'xls xlsx csv ods tsv',
  slide: 'ppt pptx odp',
  code: 'js ts jsx tsx html htm css json xml py rs go java c cpp h hpp cs php rb sh bat cmd ps1 yml yaml toml md ini sql vue lua kt swift',
  exe: 'exe msi apk dll com',
  text: 'txt log'
};
const EXT2CAT: Record<string, Cat> = {};
(Object.keys(CATS) as Cat[]).forEach((c) => CATS[c].split(' ').forEach((e) => { EXT2CAT[e] = c; }));

export const ARCHIVE_EXT = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz', 'iso', 'cab']);
export const catOfExt = (ext: string): Cat | undefined => EXT2CAT[ext];
export const catOf = (e: Pick<Entry, 'name' | 'isDir'>): Cat | 'folder' | 'file' => (e.isDir ? 'folder' : EXT2CAT[extOf(e.name)] || 'file');
export const isArchive = (e: Pick<Entry, 'name' | 'isDir'>) => !e.isDir && ARCHIVE_EXT.has(extOf(e.name));
export const THUMB_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico']);
export const isRaster = (e: Entry) => !e.isDir && THUMB_EXT.has(extOf(e.name));
export const isSvg = (e: Entry) => !e.isDir && extOf(e.name) === 'svg';

export const KIND_CATS: Record<string, string[]> = {
  docs: ['doc', 'sheet', 'slide', 'text'], images: ['image'], video: ['video'], audio: ['audio'], archives: ['archive'], code: ['code', 'exe']
};
/** Extensions used by the advanced search for each kind filter. */
export function extsForKind(kind: Kind): string[] {
  const cats = KIND_CATS[kind];
  return cats ? cats.flatMap((c) => CATS[c as Cat].split(' ')) : [];
}
