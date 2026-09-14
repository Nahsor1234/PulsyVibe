import type { Track } from '@/types/track';
import type { PlaybackSource } from '@/types/playback';

/**
 * Development-safe source implementation used until a legitimate direct
 * media source is configured.
 *
 * A YouTube videoId identifies a media entity; it is not itself a directly
 * playable HTMLAudioElement source URL. Keeping this failure explicit avoids
 * accidentally coupling the player to an invalid URL construction.
 */
export class UnconfiguredPlaybackSource implements PlaybackSource {
  async getSource(_track: Track): Promise<string> {
    throw new Error('No direct playback source is configured.');
  }
}

export function createUnconfiguredPlaybackSource(): PlaybackSource {
  return new UnconfiguredPlaybackSource();
}
