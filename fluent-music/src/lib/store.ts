// The state now lives in ./store/ (slices). This file only re-exports it, so an old `store.ts` left over from
// an earlier version of the project (when a new zip is extracted over the folder) is replaced instead of shadowing ./store/.
export * from './store/index';
