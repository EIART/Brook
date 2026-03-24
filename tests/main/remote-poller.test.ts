import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'
import WebSocket from 'ws'
import { RemotePoller } from '../../src/main/remote-poller'

const TEST_PORT = 19898

function makeMessage(
  state: 'playing' | 'paused' | 'stopped',
  title = 'Test Song',
  artist = 'Test Artist',
  album = 'Test Album',
  duration = 200,
  position = 10,
) {
  return JSON.stringify({
    type: 'playback:update',
    payload: {
      state,
      position,
      track: title ? { title, artist, album, duration } : null,
    },
  })
}

async function waitFor(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('RemotePoller', () => {
  let poller: RemotePoller

  beforeEach(async () => {
    poller = new RemotePoller(TEST_PORT)
    poller.start()
    // Give the server a moment to start listening
    await waitFor(30)
  })

  afterEach(() => {
    poller.stop()
  })

  it('is an EventEmitter', () => {
    expect(poller).toBeInstanceOf(EventEmitter)
  })

  it('emits playback:update when a probe message arrives', async () => {
    const handler = vi.fn()
    poller.on('playback:update', handler)

    const client = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`)
    await new Promise<void>((resolve) => client.on('open', resolve))

    client.send(makeMessage('playing'))
    await waitFor(30)

    expect(handler).toHaveBeenCalledOnce()
    expect(handler.mock.calls[0][0].state).toBe('playing')
    expect(handler.mock.calls[0][0].track.title).toBe('Test Song')

    client.close()
  })

  it('emits track:changed when track title changes', async () => {
    const handler = vi.fn()
    poller.on('track:changed', handler)

    const client = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`)
    await new Promise<void>((resolve) => client.on('open', resolve))

    client.send(makeMessage('playing', 'Song A'))
    await waitFor(30)
    client.send(makeMessage('playing', 'Song B'))
    await waitFor(30)

    expect(handler).toHaveBeenCalledTimes(2)
    expect(handler.mock.calls[0][0].title).toBe('Song A')
    expect(handler.mock.calls[1][0].title).toBe('Song B')

    client.close()
  })

  it('does not emit track:changed when same track continues', async () => {
    const handler = vi.fn()
    poller.on('track:changed', handler)

    const client = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`)
    await new Promise<void>((resolve) => client.on('open', resolve))

    client.send(makeMessage('playing', 'Song A'))
    await waitFor(30)
    client.send(makeMessage('playing', 'Song A'))
    await waitFor(30)

    expect(handler).toHaveBeenCalledOnce()

    client.close()
  })

  it('ignores malformed JSON messages', async () => {
    const updateHandler = vi.fn()
    const changeHandler = vi.fn()
    poller.on('playback:update', updateHandler)
    poller.on('track:changed', changeHandler)

    const client = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`)
    await new Promise<void>((resolve) => client.on('open', resolve))

    client.send('not valid json')
    client.send('{"type":"unknown","payload":{}}')
    await waitFor(30)

    expect(updateHandler).not.toHaveBeenCalled()
    expect(changeHandler).not.toHaveBeenCalled()

    client.close()
  })
})
