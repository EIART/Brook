import { exec } from 'node:child_process'
import type { PlayerDetector } from './types.js'
import type { PlaybackStatus, PlaybackState } from '../types.js'

// NeteaseMusic does not support AppleScript.
// We detect the process via System Events, and read playback info
// from the macOS Now Playing API via nowplaying-cli.
// Install: brew install nowplaying-cli

function run(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout) => {
      if (err) reject(err)
      else resolve(stdout.trim())
    })
  })
}

export function parseNeteaseOutput(title: string, artist: string, album: string, duration: string, elapsed: string, rate: string): PlaybackStatus {
  const playRate = parseFloat(rate) || 0
  const state: PlaybackState = playRate > 0 ? 'playing' : 'paused'

  const track = title && title !== 'null'
    ? {
        title,
        artist: artist || '',
        album: album || '',
        duration: parseFloat(duration) || 0,
        artworkUrl: undefined,
      }
    : null

  return {
    state: track ? state : 'stopped',
    position: parseFloat(elapsed) || 0,
    track,
  }
}

export const neteaseDetector: PlayerDetector = {
  name: 'NeteaseMusic',

  async isRunning(): Promise<boolean> {
    try {
      const result = await run(
        `osascript -e 'tell application "System Events" to (name of processes) contains "NeteaseMusic"'`
      )
      return result === 'true'
    } catch {
      return false
    }
  },

  async poll(): Promise<PlaybackStatus> {
    // NeteaseMusic doesn't set bundleIdentifier in Now Playing API,
    // so we skip that check. If Spotify is also playing, the priority
    // logic in index.ts ensures Spotify wins (it's first in the list).
    const [title, artist, album, duration, elapsed, rate] = await Promise.all([
      run('nowplaying-cli get title').catch(() => ''),
      run('nowplaying-cli get artist').catch(() => ''),
      run('nowplaying-cli get album').catch(() => ''),
      run('nowplaying-cli get duration').catch(() => '0'),
      run('nowplaying-cli get elapsedTime').catch(() => '0'),
      run('nowplaying-cli get playbackRate').catch(() => '0'),
    ])

    return parseNeteaseOutput(title, artist, album, duration, elapsed, rate)
  },
}
