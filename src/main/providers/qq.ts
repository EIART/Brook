// src/main/providers/qq.ts
import { parseLrc } from './lrc-parser'
import type { LyricsProvider, LyricsSearchRequest } from './types'
import type { LyricsLine } from '../../shared/types'

const SEARCH_URL = 'https://c.y.qq.com/soso/fcgi-bin/client_search_cp'
const LYRIC_URL  = 'https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg'

interface QQSong { songmid: string; songname: string; singer: { name: string }[] }
interface SearchResponse { data?: { song?: { list?: QQSong[] } } }
interface LyricResponse { lyric?: string; trans?: string }

export const qqProvider: LyricsProvider = {
  name: 'qq',

  async search(req: LyricsSearchRequest): Promise<LyricsLine[]> {
    const params = new URLSearchParams({
      w: `${req.title} ${req.artist}`,
      format: 'json',
      inCharset: 'utf8',
      outCharset: 'utf8',
      notice: '0',
      platform: 'yqq',
      needNewCode: '0',
      p: '1',
      n: '5',
      cr: '1',
    })

    const searchRes = await fetch(`${SEARCH_URL}?${params}`, {
      headers: { Referer: 'https://y.qq.com' },
    })
    const searchData: SearchResponse = await searchRes.json()
    const songs = searchData.data?.song?.list ?? []
    if (songs.length === 0) throw new Error('qq: no results')

    const mid = songs[0].songmid
    const lyricParams = new URLSearchParams({
      songmid: mid,
      format: 'json',
      inCharset: 'utf8',
      outCharset: 'utf8',
      notice: '0',
      platform: 'yqq',
      needNewCode: '0',
    })

    const lyricRes = await fetch(`${LYRIC_URL}?${lyricParams}`, {
      headers: { Referer: 'https://y.qq.com' },
    })
    const lyricData: LyricResponse = await lyricRes.json()

    if (!lyricData.lyric) throw new Error('qq: no lyric data')

    const lrc = Buffer.from(lyricData.lyric, 'base64').toString('utf-8')
    const trans = lyricData.trans
      ? Buffer.from(lyricData.trans, 'base64').toString('utf-8')
      : undefined

    return parseLrc(lrc, trans)
  },
}
