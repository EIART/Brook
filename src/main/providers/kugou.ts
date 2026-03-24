// src/main/providers/kugou.ts
import { parseLrc } from './lrc-parser'
import type { LyricsProvider, LyricsSearchRequest } from './types'
import type { LyricsLine, LyricsCandidate } from '../../shared/types'

const SEARCH_URL = 'http://lyrics.kugou.com/search'
const LYRIC_URL  = 'http://lyrics.kugou.com/download'

interface KugouCandidate { id: string; accesskey: string; song: string; singer: string }
interface SearchResponse { candidates?: KugouCandidate[] }
interface LyricResponse { content?: string; status?: number }

export const kugouProvider: LyricsProvider = {
  name: 'kugou',

  async searchCandidates(req: LyricsSearchRequest): Promise<LyricsCandidate[]> {
    const params = new URLSearchParams({
      keyword: `${req.title} ${req.artist}`,
      duration: String(Math.round(req.duration * 1000)),
      client: 'pc',
      ver: '1',
      man: 'yes',
    })

    const searchRes = await fetch(`${SEARCH_URL}?${params}`)
    const searchData: SearchResponse = await searchRes.json()
    const candidates = searchData.candidates ?? []
    if (candidates.length === 0) throw new Error('kugou: no results')

    return candidates.map(c => ({
      id: `kugou:${c.id}:${c.accesskey}`,
      provider: 'kugou',
      title: c.song,
      artist: c.singer,
    }))
  },

  async fetchLyrics(candidate: LyricsCandidate): Promise<LyricsLine[]> {
    const parts = candidate.id.split(':')
    // id format: kugou:<id>:<accesskey>
    const id = parts[1]
    const accesskey = parts.slice(2).join(':')
    const lyricParams = new URLSearchParams({
      id,
      accesskey,
      fmt: 'lrc',
      charset: 'utf8',
      client: 'pc',
      ver: '1',
    })

    const lyricRes = await fetch(`${LYRIC_URL}?${lyricParams}`)
    const lyricData: LyricResponse = await lyricRes.json()

    if (!lyricData.content) throw new Error('kugou: empty lyric content')

    const decoded = Buffer.from(lyricData.content, 'base64').toString('utf-8')
    return parseLrc(decoded)
  },

  async search(req: LyricsSearchRequest): Promise<LyricsLine[]> {
    const candidates = await kugouProvider.searchCandidates(req)
    return kugouProvider.fetchLyrics(candidates[0])
  },
}
