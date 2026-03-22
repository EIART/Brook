// src/main/providers/netease.ts
import { parseLrc } from './lrc-parser'
import type { LyricsProvider, LyricsSearchRequest } from './types'
import type { LyricsLine } from '../../shared/types'

const SEARCH_URL = 'http://music.163.com/api/search/pc'
const LYRIC_URL  = 'http://music.163.com/api/song/lyric'

interface SearchResult { id: number; name: string; artists: { name: string }[] }
interface SearchResponse { result?: { songs?: SearchResult[] } }
interface LyricResponse { lrc?: { lyric?: string }; tlyric?: { lyric?: string } }

export const neteaseProvider: LyricsProvider = {
  name: 'netease',

  async search(req: LyricsSearchRequest): Promise<LyricsLine[]> {
    const params = new URLSearchParams({
      s: `${req.title} ${req.artist}`,
      type: '1',
      offset: '0',
      limit: '5',
    })

    const searchRes = await fetch(`${SEARCH_URL}?${params}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const searchData: SearchResponse = await searchRes.json()
    const songs = searchData.result?.songs ?? []
    if (songs.length === 0) throw new Error('netease: no results')

    const best = pickBest(songs, req)
    const lyricRes = await fetch(
      `${LYRIC_URL}?id=${best.id}&lv=1&kv=1&tv=-1`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const lyricData: LyricResponse = await lyricRes.json()

    const lrc = lyricData.lrc?.lyric
    if (!lrc) throw new Error('netease: no lyric data')

    return parseLrc(lrc, lyricData.tlyric?.lyric)
  },
}

function pickBest(songs: SearchResult[], req: LyricsSearchRequest): SearchResult {
  // Prefer exact title match
  const exact = songs.find(s => s.name.toLowerCase() === req.title.toLowerCase())
  return exact ?? songs[0]
}
