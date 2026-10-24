import { tr } from '../i18n';
import { basename, natural } from '../utils';
import type { Track } from '../types';

export const normalize = (t: Track): Track => ({
  ...t,
  artist: t.artist || tr('unknownArtist'),
  album: t.album || basename(t.folder) || tr('unknownAlbum'),
});

export const pathKey = (p: string) => p.replace(/\//g, '\\').toLowerCase();

export const albumKey = (t: Track) => `${t.albumArtist || ''}\u0001${t.album}`;

export function sortTracksNatural(tracks: Track[]): Track[] {
  return [...tracks].sort((a, b) => {
    if (a.folder !== b.folder) return natural(a.folder, b.folder);
    if (a.trackNo > 0 && b.trackNo > 0 && a.trackNo !== b.trackNo) return a.trackNo - b.trackNo;
    return natural(a.path, b.path);
  });
}

/** ReplayGain to apply (dB) for a song; limited so the peak never clips */
export function replayGainDb(t: Track, mode: 'off' | 'track' | 'album'): number {
  if (mode === 'off') return 0;
  const gain = mode === 'album' ? t.rgAlbum ?? t.rgTrack : t.rgTrack ?? t.rgAlbum;
  if (gain == null) return 0;
  const peak = mode === 'album' ? t.rgAlbumPeak ?? t.rgTrackPeak : t.rgTrackPeak ?? t.rgAlbumPeak;
  let db = gain;
  if (peak && peak > 0) db = Math.min(db, -20 * Math.log10(peak));
  return Math.max(-24, Math.min(12, db));
}
