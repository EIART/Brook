import type { LyricsLine, LyricsCandidate } from '../shared/types'
import type { LyricsProvider, LyricsSearchRequest } from './providers/types'

export class LyricsService {
  constructor(private readonly providers: LyricsProvider[]) {}

  async fetch(req: LyricsSearchRequest): Promise<LyricsLine[]> {
    return Promise.any(this.providers.map(p => p.search(req)))
  }

  async fetchAllCandidates(req: LyricsSearchRequest): Promise<LyricsCandidate[]> {
    const results = await Promise.allSettled(
      this.providers.map(p => p.searchCandidates(req))
    )
    return results
      .filter((r): r is PromiseFulfilledResult<LyricsCandidate[]> => r.status === 'fulfilled')
      .flatMap(r => r.value)
  }

  async fetchForCandidate(candidate: LyricsCandidate): Promise<LyricsLine[]> {
    const provider = this.providers.find(p => p.name === candidate.provider)
    if (!provider) throw new Error(`Unknown provider: ${candidate.provider}`)
    return provider.fetchLyrics(candidate)
  }
}
