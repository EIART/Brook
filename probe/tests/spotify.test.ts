import { describe, it, expect } from 'vitest'
import { parseSpotifyOutput } from '../src/players/spotify.js'

describe('parseSpotifyOutput', () => {
  it('parses a playing track correctly', () => {
    const output = 'playing\nBohemian Rhapsody\nQueen\nA Night at the Opera\n354000\n42.5\nhttps://art.example.com/img.jpg'
    const status = parseSpotifyOutput(output)

    expect(status.state).toBe('playing')
    expect(status.position).toBeCloseTo(42.5)
    expect(status.track).not.toBeNull()
    expect(status.track?.title).toBe('Bohemian Rhapsody')
    expect(status.track?.artist).toBe('Queen')
    expect(status.track?.album).toBe('A Night at the Opera')
    expect(status.track?.duration).toBeCloseTo(354)
    expect(status.track?.artworkUrl).toBe('https://art.example.com/img.jpg')
  })

  it('parses a paused state', () => {
    const output = 'paused\nStairway to Heaven\nLed Zeppelin\nLed Zeppelin IV\n482000\n120\n'
    const status = parseSpotifyOutput(output)

    expect(status.state).toBe('paused')
    expect(status.track?.artworkUrl).toBeUndefined()
  })

  it('maps unknown state to stopped', () => {
    const output = 'stopped\n\n\n\n0\n0\n'
    const status = parseSpotifyOutput(output)

    expect(status.state).toBe('stopped')
    expect(status.track).toBeNull()
  })

  it('returns null track when title is empty', () => {
    const output = 'stopped\n\n\n\n0\n0\n'
    const status = parseSpotifyOutput(output)
    expect(status.track).toBeNull()
  })

  it('omits artworkUrl when empty string', () => {
    const output = 'playing\nSong\nArtist\nAlbum\n200000\n10\n'
    const status = parseSpotifyOutput(output)
    expect(status.track?.artworkUrl).toBeUndefined()
  })
})
