import { describe, it, expect } from 'vitest'
import { parseNeteaseOutput } from '../src/players/netease.js'

describe('parseNeteaseOutput', () => {
  it('returns playing state when playbackRate is 1', () => {
    const status = parseNeteaseOutput('山丘', '李宗盛', '李宗盛作品全集', '330', '42.5', '1')
    expect(status.state).toBe('playing')
    expect(status.position).toBeCloseTo(42.5)
    expect(status.track?.title).toBe('山丘')
    expect(status.track?.artist).toBe('李宗盛')
    expect(status.track?.duration).toBeCloseTo(330)
  })

  it('returns paused state when playbackRate is 0', () => {
    const status = parseNeteaseOutput('山丘', '李宗盛', '李宗盛作品全集', '330', '60', '0')
    expect(status.state).toBe('paused')
  })

  it('returns stopped with null track when title is empty', () => {
    const status = parseNeteaseOutput('', '', '', '0', '0', '0')
    expect(status.state).toBe('stopped')
    expect(status.track).toBeNull()
  })

  it('returns stopped with null track when title is "null"', () => {
    const status = parseNeteaseOutput('null', '', '', '0', '0', '0')
    expect(status.state).toBe('stopped')
    expect(status.track).toBeNull()
  })

  it('never returns artworkUrl', () => {
    const status = parseNeteaseOutput('Track', 'Artist', 'Album', '200', '10', '1')
    expect(status.track?.artworkUrl).toBeUndefined()
  })
})
