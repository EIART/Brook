import type { LyricsLine } from '../../shared/types'
import type { LyricsProvider, LyricsSearchRequest } from './providers/types'

export class LyricsService {
  constructor(private readonly providers: LyricsProvider[]) {}

  async fetch(req: LyricsSearchRequest): Promise<LyricsLine[]> {
    return Promise.any(this.providers.map(p => p.search(req)))
  }
}
