// Shared types (mirrored from src/shared/types.ts)

export interface TrackInfo {
  title: string
  artist: string
  album: string
  duration: number      // seconds
  artworkUrl?: string
}

export type PlaybackState = 'playing' | 'paused' | 'stopped'

export interface PlaybackStatus {
  state: PlaybackState
  position: number      // seconds
  track: TrackInfo | null
}

// Wire protocol envelope sent from probe → Electron app
export interface ProbeMessage {
  type: 'playback:update'
  payload: PlaybackStatus
}
