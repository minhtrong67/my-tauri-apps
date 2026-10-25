import { create } from 'zustand';
import { createCore } from './core';
import { createAppSlice } from './app';
import { createLibrarySlice } from './library';
import { createPlayerSlice } from './player';
import { createPlaylistSlice } from './playlists';
import { createUiSlice } from './ui';
import type { State } from './types';

export const useStore = create<State>((set, get, api) => {
  const core = createCore(set, get, api.subscribe);
  return {
    ...createUiSlice(set, get, core),
    ...createLibrarySlice(set, get, core),
    ...createPlayerSlice(set, get, core),
    ...createPlaylistSlice(set, get, core),
    ...createAppSlice(set, get, core),
  };
});

export type { State } from './types';
export { albumKey, sortTracksNatural } from './helpers';
export { derive, useDerived, useCurrent, useTrackList, searchLibrary, useViewMode } from './derived';
