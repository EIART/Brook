import { describe, it, expect, vi } from 'vitest'
import { LyricsService } from '../../src/main/lyrics-service'
import type { LyricsProvider } from '../../src/main/providers/types'

const makeLine = (time: number, text: string) => ({ time, text })

describe('LyricsService', () => {
  it('returns lyrics from first provider that succeeds', async () => {
    const p1: LyricsProvider = { name: 'p1', search: vi.fn().mockResolvedValue([makeLine(1, 'hello')]) }
    const p2: LyricsProvider = { name: 'p2', search: vi.fn().mockResolvedValue([makeLine(1, 'other')]) }
    const svc = new LyricsService([p1, p2])
    const result = await svc.fetch({ title: 'x', artist: 'y', duration: 200 })
    expect(result[0].text).toBe('hello')
  })

  it('falls back to second provider if first fails', async () => {
    const p1: LyricsProvider = { name: 'p1', search: vi.fn().mockRejectedValue(new Error('fail')) }
    const p2: LyricsProvider = { name: 'p2', search: vi.fn().mockResolvedValue([makeLine(1, 'fallback')]) }
    const svc = new LyricsService([p1, p2])
    const result = await svc.fetch({ title: 'x', artist: 'y', duration: 200 })
    expect(result[0].text).toBe('fallback')
  })

  it('throws if all providers fail', async () => {
    const p1: LyricsProvider = { name: 'p1', search: vi.fn().mockRejectedValue(new Error('fail')) }
    const p2: LyricsProvider = { name: 'p2', search: vi.fn().mockRejectedValue(new Error('fail')) }
    const svc = new LyricsService([p1, p2])
    await expect(svc.fetch({ title: 'x', artist: 'y', duration: 200 })).rejects.toThrow()
  })

  it('returns hasTranslation=true when any line has translation', async () => {
    const lines = [{ time: 1, text: 'hello', translation: '你好' }]
    const p1: LyricsProvider = { name: 'p1', search: vi.fn().mockResolvedValue(lines) }
    const svc = new LyricsService([p1])
    const result = await svc.fetch({ title: 'x', artist: 'y', duration: 200 })
    expect(result.some(l => l.translation)).toBe(true)
  })
})
