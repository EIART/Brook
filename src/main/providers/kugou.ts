// src/main/providers/kugou.ts
import { parseLrc } from './lrc-parser'
import type { LyricsProvider, LyricsSearchRequest } from './types'
import type { LyricsLine } from '../../shared/types'

const SEARCH_URL = 'http://lyrics.kugou.com/search'
const LYRIC_URL  = 'http://lyrics.kugou.com/download'

interface Candidate { id: string; accesskey: string; song: string; singer: string }
interface SearchResponse { candidates?: Candidate[] }
interface LyricResponse { content?: string; status?: number }

export const kugouProvider: LyricsProvider = {
  name: 'kugou',

  async search(req: LyricsSearchRequest): Promise<LyricsLine[]> {
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

    const best = candidates[0]
    const lyricParams = new URLSearchParams({
      id: best.id,
      accesskey: best.accesskey,
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
}
