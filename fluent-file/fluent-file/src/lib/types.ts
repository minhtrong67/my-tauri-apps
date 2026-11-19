export interface Entry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modified: number | null;
  created: number | null;
  hidden: boolean;
  readonly: boolean;
}
export interface Place { id: string; path: string }
export interface Drive { name: string; path: string; total: number; free: number; fs: string }
export interface Props {
  name: string; path: string; isDir: boolean; size: number; files: number; folders: number;
  created: number | null; modified: number | null; accessed: number | null; readonly: boolean; hidden: boolean;
}
export interface Tools { winrar: boolean; sevenzip: boolean; code: boolean; terminal: boolean }
export interface DupGroup { size: number; paths: string[] }
export interface SizeItem { name: string; path: string; isDir: boolean; size: number }
export interface SearchOpts {
  id: number; regex: boolean; exts: string[]; minSize?: number; maxSize?: number; after?: number; before?: number;
}
export type PaneId = 'a' | 'b';
export type Kind = 'all' | 'folders' | 'docs' | 'images' | 'video' | 'audio' | 'archives' | 'code' | 'tagged' | `tag-${TagId}`;
export type ViewMode = 'details' | 'large' | 'grid' | 'small';
export type SortKey = 'name' | 'modified' | 'created' | 'type' | 'size';
export type GroupBy = 'none' | 'name' | 'type' | 'modified' | 'size';
export type TagId = 'star' | 'red' | 'orange' | 'green' | 'blue' | 'purple';
