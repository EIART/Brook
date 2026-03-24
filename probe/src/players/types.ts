import type { PlaybackStatus } from '../types.js'

export interface PlayerDetector {
  name: string
  isRunning(): Promise<boolean>
  poll(): Promise<PlaybackStatus>
}
