import { describe, it, expect } from 'vitest'
import { parseNeteaseOutput } from '../src/players/netease.js'

describe('parseNeteaseOutput', () => {
  it('maps integer state 1 → playing', () => {
    const output = '1\n晴天\n周杰伦\n叶惠美\n269.0\n30.5'
    const status = parseNeteaseOutput(output)

    expect(status.state).toBe('playing')
    expect(status.position).toBeCloseTo(30.5)
    expect(status.track?.title).toBe('晴天')
    expect(status.track?.artist).toBe('周杰伦')
    expect(status.track?.duration).toBeCloseTo(269)
  })

  it('maps integer state 2 → paused', () => {
    const output = '2\n稻香\n周杰伦\n魔杰座\n223.0\n60'
    const status = parseNeteaseOutput(output)
    expect(status.state).toBe('paused')
  })

  it('maps integer state 0 → stopped', () => {
    const output = '0\n\n\n\n0\n0'
    const status = parseNeteaseOutput(output)
    expect(status.state).toBe('stopped')
    expect(status.track).toBeNull()
  })

  it('maps any unknown state to stopped', () => {
    const output = '99\n\n\n\n0\n0'
    const status = parseNeteaseOutput(output)
    expect(status.state).toBe('stopped')
  })

  it('never returns artworkUrl (not supported by NeteaseMusic AppleScript)', () => {
    const output = '1\nTrack\nArtist\nAlbum\n200\n10'
    const status = parseNeteaseOutput(output)
    expect(status.track?.artworkUrl).toBeUndefined()
  })
})
