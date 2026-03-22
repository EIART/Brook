import { describe, it, expect } from 'vitest'
import { parseLrc } from '../../src/main/providers/lrc-parser'

describe('parseLrc', () => {
  it('parses basic LRC lines', () => {
    const lrc = '[00:04.20]Only for a moment\n[00:08.50]And the moment\'s gone'
    const result = parseLrc(lrc)
    expect(result).toEqual([
      { time: 4.2, text: 'Only for a moment' },
      { time: 8.5, text: "And the moment's gone" },
    ])
  })

  it('returns empty array for empty input', () => {
    expect(parseLrc('')).toEqual([])
  })

  it('skips metadata tags like [ar:] [ti:]', () => {
    const lrc = '[ar:Kansas]\n[ti:Dust in the Wind]\n[00:01.00]I close my eyes'
    expect(parseLrc(lrc)).toEqual([{ time: 1.0, text: 'I close my eyes' }])
  })

  it('handles minutes correctly', () => {
    const lrc = '[02:30.00]Some lyric'
    expect(parseLrc(lrc)[0].time).toBeCloseTo(150.0)
  })

  it('merges translation lines from two-LRC format', () => {
    const original = '[00:04.20]Only for a moment'
    const translation = '[00:04.20]只为了一瞬间'
    const result = parseLrc(original, translation)
    expect(result[0].translation).toBe('只为了一瞬间')
  })

  it('trims whitespace from lyrics text', () => {
    const lrc = '[00:01.00]  hello world  '
    expect(parseLrc(lrc)[0].text).toBe('hello world')
  })
})
