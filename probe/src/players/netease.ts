import { exec } from 'node:child_process'
import type { PlayerDetector } from './types.js'
import type { PlaybackStatus, PlaybackState } from '../types.js'

// NeteaseMusic exposes player state as integers: 0=stopped, 1=playing, 2=paused
// Artwork URL is not available via AppleScript for NeteaseMusic
const APPLESCRIPT = `
if application "NeteaseMusic" is not running then
  return "0\\n\\n\\n\\n0\\n0"
end if
tell application "NeteaseMusic"
  set s to (get player state) as string
  set t to (get name of current track) as string
  set ar to (get artist of current track) as string
  set al to (get album of current track) as string
  set d to (get duration of current track) as number
  set p to (get player position) as number
  return s & "\\n" & t & "\\n" & ar & "\\n" & al & "\\n" & d & "\\n" & p
end tell
`

function runScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, (err, stdout) => {
      if (err) reject(err)
      else resolve(stdout.trim())
    })
  })
}

export function parseNeteaseOutput(output: string): PlaybackStatus {
  const [stateRaw, title, artist, album, durationSec, positionSec] = output
    .split('\n')
    .map((s) => s.trim())

  // NeteaseMusic returns integer state: 0=stopped, 1=playing, 2=paused
  const stateNum = parseInt(stateRaw)
  const state: PlaybackState =
    stateNum === 1 ? 'playing' : stateNum === 2 ? 'paused' : 'stopped'

  const track = title
    ? {
        title,
        artist,
        album,
        duration: parseFloat(durationSec) || 0,
        // NeteaseMusic does not expose artwork URL via AppleScript
        artworkUrl: undefined,
      }
    : null

  return { state, position: parseFloat(positionSec) || 0, track }
}

export const neteaseDetector: PlayerDetector = {
  name: 'NeteaseMusic',

  async isRunning(): Promise<boolean> {
    try {
      const result = await runScript(`application "NeteaseMusic" is running`)
      return result.trim() === 'true'
    } catch {
      return false
    }
  },

  async poll(): Promise<PlaybackStatus> {
    const output = await runScript(APPLESCRIPT)
    return parseNeteaseOutput(output)
  },
}
