// src/main/providers/types.ts
import type { LyricsLine } from '../../shared/types'

export interface LyricsSearchRequest {
  title: string
  artist: string
  duration: number  // seconds
}

export interface LyricsProvider {
  name: string
  search(req: LyricsSearchRequest): Promise<LyricsLine[]>
}
