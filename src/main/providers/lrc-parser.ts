import type { LyricsLine } from '../../shared/types'

const TIME_TAG = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/

export function parseLrc(lrc: string, translationLrc?: string): LyricsLine[] {
  const lines = parseRaw(lrc)
  if (!translationLrc) return lines

  const translations = parseRaw(translationLrc)
  const translationMap = new Map(translations.map(l => [l.time, l.text]))

  return lines.map(line => ({
    ...line,
    translation: translationMap.get(line.time),
  }))
}

function parseRaw(lrc: string): LyricsLine[] {
  return lrc
    .split('\n')
    .map(line => line.trim())
    .map(line => {
      const match = TIME_TAG.exec(line)
      if (!match) return null
      const [, mm, ss, cs, text] = match
      const time = parseInt(mm) * 60 + parseInt(ss) + parseInt(cs) / (cs.length === 3 ? 1000 : 100)
      return { time, text: text.trim() }
    })
    .filter((l): l is LyricsLine => l !== null && l.text.length > 0)
    .sort((a, b) => a.time - b.time)
}
