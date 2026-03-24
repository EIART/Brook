// src/shared/types.ts

export interface LyricsLine {
  time: number          // seconds from start
  text: string
  translation?: string  // optional translated line
}

export interface TrackInfo {
  title: string
  artist: string
  album: string
  duration: number      // seconds
  artworkUrl?: string   // may be undefined for local files
}

export type PlaybackState = 'playing' | 'paused' | 'stopped'

export interface PlaybackStatus {
  state: PlaybackState
  position: number      // seconds
  track: TrackInfo | null
}

// Typed IPC channel definitions
export interface IpcChannels {
  // main → renderer (send)
  'lyrics:loaded':    { lines: LyricsLine[]; hasTranslation: boolean }
  'lyrics:not-found': { track: TrackInfo }
  'playback:update':  PlaybackStatus
  'theme:list':       { themes: ThemeMeta[] }
  'theme:changed':    { theme: ThemeConfig }

  // renderer → main (invoke, returns value)
  'theme:get-all':    { result: ThemeMeta[] }
  'theme:activate':   { id: string }
  'theme:import':     { result: 'ok' | 'invalid' }
  'theme:export':     { id: string }
  'theme:delete':     { id: string }
  'theme:rename':     { id: string; name: string }
  'config:get':       { result: AppConfig }
  'config:set':       { patch: Partial<AppConfig> }
  'position:get':     { result: number }  // current playback position in seconds
}

export interface AppConfig {
  activeTheme: string
  translationEnabled: boolean
  pollerSource: 'local' | 'remote'
  remotePort: number
}

export interface ThemeMeta {
  id: string            // filename without .json
  name: string
  thumbnail: string     // "color1,color2" string from JSON
  isBuiltIn: boolean
}

// ThemeConfig mirrors the JSON schema from the spec
export interface ThemeConfig {
  name: string
  version: string
  background: ThemeBackground
  currentLine: ThemeLine
  contextLine: ThemeContextLine
  translation: ThemeTranslation
  transition: ThemeTransition
  thumbnail: string
  container?: ThemeContainer
  border?: ThemeBorder
  effect?: ThemeEffect
}

export type ThemeBackground =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; colors: string[]; angle: number }
  | { type: 'album-art'; fallbackColor: string; blur: number; darken: number }

export interface ThemeLine {
  color: string
  fontSize: number
  fontWeight: number
  glow?: { color: string; blur: number; spread: number }
}

export interface ThemeContextLine {
  color: string
  fontSize: number
  fontWeight: number
}

export interface ThemeTranslation {
  color: string
  fontSize: number
  fontWeight: number
  fontStyle: 'normal' | 'italic'
}

export interface ThemeTransition {
  duration: number      // ms
  easing: string
}

export interface ThemeContainer {
  background: string
  backdropBlur: number
  border: string
  borderRadius: number
  padding: string
}

export type ThemeBorder =
  | { type: 'none' }
  | { type: 'solid'; color: string; width: number }
  | { type: 'rgb-cycle'; width: number; animationDuration: number }

export type ThemeEffect =
  | { type: 'none' }
  | { type: 'crt-scanlines'; opacity: number; lineHeight: number }
