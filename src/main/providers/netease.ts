// src/main/providers/netease.ts
import { parseLrc } from './lrc-parser'
import type { LyricsProvider, LyricsSearchRequest } from './types'
import type { LyricsLine, LyricsCandidate } from '../../shared/types'

const SEARCH_URL = 'http://music.163.com/api/search/pc'
const LYRIC_URL  = 'http://music.163.com/api/song/lyric'

interface SearchResult { id: number; name: string; artists: { name: string }[]; album?: { name: string } }
interface SearchResponse { result?: { songs?: SearchResult[] } }
interface LyricResponse { lrc?: { lyric?: string }; tlyric?: { lyric?: string } }

export const neteaseProvider: LyricsProvider = {
  name: 'netease',

  async searchCandidates(req: LyricsSearchRequest): Promise<LyricsCandidate[]> {
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

    return songs.map(s => ({
      id: `netease:${s.id}`,
      provider: 'netease',
      title: s.name,
      artist: s.artists.map(a => a.name).join(', '),
      album: s.album?.name,
    }))
  },

  async fetchLyrics(candidate: LyricsCandidate): Promise<LyricsLine[]> {
    const songId = candidate.id.replace('netease:', '')
    const lyricRes = await fetch(
      `${LYRIC_URL}?id=${songId}&lv=1&kv=1&tv=-1`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const lyricData: LyricResponse = await lyricRes.json()

    const lrc = lyricData.lrc?.lyric
    if (!lrc) throw new Error('netease: no lyric data')

    return parseLrc(lrc, lyricData.tlyric?.lyric)
  },

  async search(req: LyricsSearchRequest): Promise<LyricsLine[]> {
    const candidates = await neteaseProvider.searchCandidates(req)
    const best = pickBest(candidates, req)
    return neteaseProvider.fetchLyrics(best)
  },
}

function pickBest(candidates: LyricsCandidate[], req: LyricsSearchRequest): LyricsCandidate {
  // Prefer exact title match
  const exact = candidates.find(c => c.title.toLowerCase() === req.title.toLowerCase())
  return exact ?? candidates[0]
}
