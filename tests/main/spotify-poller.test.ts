import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Must mock BEFORE importing the module that uses it
vi.mock('node:child_process')

import { exec } from 'node:child_process'
import { SpotifyPoller } from '../../src/main/spotify-poller'

const mockExec = vi.mocked(exec)

function mockSpotifyOutput(
  state: string,
  title: string,
  artist: string,
  album: string,
  duration: number,
  position: number,
  artworkUrl = ''
) {
  mockExec.mockImplementation((_cmd: string, cb: any) => {
    // Use process.nextTick to avoid blocking but allow the promise chain to work
    process.nextTick(() => {
      cb(null, `${state}\n${title}\n${artist}\n${album}\n${duration}\n${position}\n${artworkUrl}`, '')
    })
    return {} as any
  })
}

describe('SpotifyPoller', () => {
  beforeEach(() => {
    mockExec.mockReset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('emits track:changed when track title changes', async () => {
    const poller = new SpotifyPoller()
    const handler = vi.fn()
    poller.on('track:changed', handler)

    // First poll with Song A - initializes lastTrackTitle
    mockSpotifyOutput('playing', 'Song A', 'Artist', 'Album', 240000, 100)
    await poller._poll()
    await vi.advanceTimersToNextTimerAsync()

    // Reset handler to ignore the first Song A emit
    handler.mockReset()

    // Change to Song B - should emit track:changed
    mockExec.mockImplementation((_cmd: string, cb: any) => {
      process.nextTick(() => {
        cb(null, 'playing\nSong B\nArtist\nAlbum\n200000\n50\n', '')
      })
      return {} as any
    })
    await poller._poll()
    await vi.advanceTimersToNextTimerAsync()

    expect(handler).toHaveBeenCalledOnce()
    expect(handler.mock.calls[0][0].title).toBe('Song B')
  })

  it('emits playback:update on every poll', async () => {
    const poller = new SpotifyPoller()
    const handler = vi.fn()
    poller.on('playback:update', handler)

    mockSpotifyOutput('playing', 'Song', 'Artist', 'Album', 200000, 1)
    await poller._poll()
    await vi.advanceTimersToNextTimerAsync()

    expect(handler).toHaveBeenCalledOnce()
    expect(handler.mock.calls[0][0].state).toBe('playing')
    expect(handler.mock.calls[0][0].position).toBeCloseTo(1.0)
  })

  it('does not emit track:changed if same track continues', async () => {
    const poller = new SpotifyPoller()
    const handler = vi.fn()
    poller.on('track:changed', handler)

    mockSpotifyOutput('playing', 'Song A', 'Artist', 'Album', 240000, 100)
    await poller._poll()
    await vi.advanceTimersToNextTimerAsync()

    // Second poll with same song - should not emit track:changed
    await poller._poll()
    await vi.advanceTimersToNextTimerAsync()

    expect(handler).toHaveBeenCalledOnce()
  })
})
