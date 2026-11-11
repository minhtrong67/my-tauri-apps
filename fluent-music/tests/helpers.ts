import type { Track } from '../src/lib/types';

let n = 0;
/** A complete Track with sensible defaults, so each test only states what it cares about */
export function track(p: Partial<Track> = {}): Track {
  n += 1;
  return {
    id: `t${n}`, path: `C:\\Music\\song${n}.mp3`, title: `Song ${n}`, artist: 'Artist', album: 'Album', albumArtist: 'Artist', genre: '',
    year: 0, trackNo: 0, duration: 200, bitrate: 320, sampleRate: 44100, format: 'mp3', size: 8_000_000, addedAt: 1_000, folder: 'C:\\Music', hasCover: false,
    ...p,
  };
}
