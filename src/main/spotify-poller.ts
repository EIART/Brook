import { exec } from 'node:child_process'
import { EventEmitter } from 'node:events'
import type { TrackInfo, PlaybackState, PlaybackStatus } from '../shared/types'

const APPLESCRIPT = `
tell application "Spotify"
  set s to (get player state) as string
  set t to (get name of current track) as string
  set ar to (get artist of current track) as string
  set al to (get album of current track) as string
  set d to (get duration of current track) as number
  set p to (get player position) as number
  set art to ""
  try
    set art to (get artwork url of current track) as string
  end try
  return s & "\n" & t & "\n" & ar & "\n" & al & "\n" & d & "\n" & p & "\n" & art
end tell
`

export class SpotifyPoller extends EventEmitter {
  private timer: NodeJS.Timeout | null = null
  private lastTrackTitle: string | null = null

  start(): void {
    this._scheduleNext('playing')
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  _scheduleNext(state: PlaybackState): void {
    const interval = state === 'playing' ? 1000 : 5000
    this.timer = setTimeout(() => this._poll(), interval)
  }

  async _poll(): Promise<void> {
    try {
      const output = await this._runScript()
      const status = this._parse(output)
      this.emit('playback:update', status)

      if (status.track && status.track.title !== this.lastTrackTitle) {
        this.lastTrackTitle = status.track.title
        this.emit('track:changed', status.track)
      }

      this._scheduleNext(status.state)
    } catch {
      // Spotify not running — retry slowly
      this._scheduleNext('paused')
    }
  }

  private _runScript(): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(`osascript -e '${APPLESCRIPT.replace(/'/g, "'\\''")}'`, (err, stdout) => {
        if (err) reject(err)
        else resolve(stdout.trim())
      })
    })
  }

  private _parse(output: string): PlaybackStatus {
    const [stateRaw, title, artist, album, durationMs, positionSec, artworkUrl] = output
      .split('\n')
      .map((s) => s.trim())

    const state: PlaybackState =
      stateRaw === 'playing' ? 'playing' : stateRaw === 'paused' ? 'paused' : 'stopped'

    const track: TrackInfo | null = title
      ? {
          title,
          artist,
          album,
          duration: parseInt(durationMs) / 1000,
          artworkUrl: artworkUrl || undefined,
        }
      : null

    return { state, position: parseFloat(positionSec), track }
  }
}
