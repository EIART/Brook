import WebSocket from 'ws'
import { spotifyDetector } from './players/spotify.js'
import { neteaseDetector } from './players/netease.js'
import type { PlayerDetector } from './players/types.js'
import type { PlaybackStatus, ProbeMessage } from './types.js'

// --- CLI args ---
const args = process.argv.slice(2)
function getArg(flag: string, fallback: string): string {
  const idx = args.indexOf(flag)
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback
}

const HOST = getArg('--host', '127.0.0.1')
const PORT = parseInt(getArg('--port', '9898'))
const WS_URL = `ws://${HOST}:${PORT}`

// Priority order: Spotify first, then NeteaseMusic
const DETECTORS: PlayerDetector[] = [spotifyDetector, neteaseDetector]

// --- State ---
let ws: WebSocket | null = null
let pollTimer: NodeJS.Timeout | null = null
let reconnectTimer: NodeJS.Timeout | null = null
let reconnectDelay = 3000

// --- WebSocket ---
function connect(): void {
  console.log(`[probe] Connecting to ${WS_URL} ...`)
  ws = new WebSocket(WS_URL)

  ws.on('open', () => {
    console.log(`[probe] Connected to ${WS_URL}`)
    reconnectDelay = 3000
    schedulePoll('playing') // start with fast interval to get first state quickly
  })

  ws.on('close', () => {
    console.log(`[probe] Disconnected. Reconnecting in ${reconnectDelay / 1000}s ...`)
    stopPoll()
    scheduleReconnect()
  })

  ws.on('error', (err: Error) => {
    console.error(`[probe] WebSocket error: ${err.message}`)
    // 'close' event fires after error, so reconnect is handled there
  })
}

function scheduleReconnect(): void {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    reconnectDelay = Math.min(reconnectDelay * 2, 30_000)
    connect()
  }, reconnectDelay)
}

function send(status: PlaybackStatus): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  const msg: ProbeMessage = { type: 'playback:update', payload: status }
  ws.send(JSON.stringify(msg))
}

// --- Polling ---
function schedulePoll(state: PlaybackStatus['state']): void {
  stopPoll()
  const interval = state === 'playing' ? 1000 : 5000
  pollTimer = setTimeout(() => poll(), interval)
}

function stopPoll(): void {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

async function poll(): Promise<void> {
  try {
    const status = await detectStatus()

    const label = status.track
      ? `${status.track.title} — ${status.track.artist} (${status.state})`
      : status.state
    process.stdout.write(`\r[probe] ${label.padEnd(80)}`)

    send(status)
    schedulePoll(status.state)
  } catch (err) {
    process.stderr.write(`\n[probe] Poll error: ${err}\n`)
    schedulePoll('stopped')
  }
}

async function detectStatus(): Promise<PlaybackStatus> {
  const results: { detector: PlayerDetector; status: PlaybackStatus }[] = []

  for (const detector of DETECTORS) {
    const running = await detector.isRunning()
    if (running) {
      const status = await detector.poll()
      results.push({ detector, status })
    }
  }

  // Priority 1: a player that is actively playing
  const playing = results.find((r) => r.status.state === 'playing')
  if (playing) return playing.status

  // Priority 2: a player that is paused (has a track loaded)
  const paused = results.find((r) => r.status.state === 'paused')
  if (paused) return paused.status

  // Priority 3: any running player (stopped state)
  if (results.length > 0) return results[0].status

  return { state: 'stopped', position: 0, track: null }
}

// --- Entry point ---
console.log(`[probe] Starting lyrics probe`)
console.log(`[probe] Target: ${WS_URL}`)
console.log(`[probe] Players: ${DETECTORS.map((d) => d.name).join(', ')}`)
console.log(`[probe] Press Ctrl+C to stop\n`)

connect()

process.on('SIGINT', () => {
  console.log('\n[probe] Stopping ...')
  stopPoll()
  if (reconnectTimer) clearTimeout(reconnectTimer)
  ws?.close()
  process.exit(0)
})
