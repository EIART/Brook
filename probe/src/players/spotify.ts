import { exec } from 'node:child_process'
import type { PlayerDetector } from './types.js'
import type { PlaybackStatus, PlaybackState } from '../types.js'

const APPLESCRIPT = `
if application "Spotify" is not running then
  return "stopped\n\n\n\n0\n0\n"
end if
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
  return s & "\\n" & t & "\\n" & ar & "\\n" & al & "\\n" & d & "\\n" & p & "\\n" & art
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

export function parseSpotifyOutput(output: string): PlaybackStatus {
  const [stateRaw, title, artist, album, durationMs, positionSec, artworkUrl] = output
    .split('\n')
    .map((s) => s.trim())

  const state: PlaybackState =
    stateRaw === 'playing' ? 'playing' : stateRaw === 'paused' ? 'paused' : 'stopped'

  const track = title
    ? {
        title,
        artist,
        album,
        duration: parseInt(durationMs) / 1000,
        artworkUrl: artworkUrl || undefined,
      }
    : null

  return { state, position: parseFloat(positionSec) || 0, track }
}

export const spotifyDetector: PlayerDetector = {
  name: 'Spotify',

  async isRunning(): Promise<boolean> {
    try {
      const result = await runScript(`application "Spotify" is running`)
      return result.trim() === 'true'
    } catch {
      return false
    }
  },

  async poll(): Promise<PlaybackStatus> {
    const output = await runScript(APPLESCRIPT)
    return parseSpotifyOutput(output)
  },
}
