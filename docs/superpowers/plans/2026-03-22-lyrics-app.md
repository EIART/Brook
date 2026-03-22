# Lyrics App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-screen ambient lyrics display app for macOS that detects Spotify playback and syncs lyrics from multiple providers with a swappable JSON theme system.

**Architecture:** Electron main process handles Spotify polling (osascript), lyrics fetching (3 providers via `Promise.any`), theme file management, and IPC. React renderer handles display, theme CSS application, hover controls, and keyboard shortcuts. All state flows one-way: main → renderer via IPC.

**Tech Stack:** Electron 33, React 18, TypeScript 5, Vite (via electron-vite), Vitest + @testing-library/react, Tailwind CSS

---

## File Map

```
lyrics-app/
├── electron.vite.config.ts          # electron-vite build config
├── package.json
├── tsconfig.json                    # base TS config
├── tsconfig.node.json               # main process TS config
├── tsconfig.web.json                # renderer TS config
│
├── src/
│   ├── main/
│   │   ├── index.ts                 # BrowserWindow setup, fullscreen on secondary display
│   │   ├── spotify-poller.ts        # osascript polling, adaptive intervals, EventEmitter
│   │   ├── lyrics-service.ts        # Promise.any across providers → LyricsLine[]
│   │   ├── providers/
│   │   │   ├── types.ts             # LyricsProvider interface, LyricsSearchRequest type
│   │   │   ├── lrc-parser.ts        # Parse LRC text → LyricsLine[]
│   │   │   ├── netease.ts           # NetEase search + fetch
│   │   │   ├── kugou.ts             # Kugou search + fetch
│   │   │   └── qq.ts                # QQ Music search + fetch
│   │   ├── theme-manager.ts         # Load/copy/delete/validate theme JSON files
│   │   ├── config.ts                # Read/write ~/Library/.../config.json
│   │   └── ipc-bridge.ts            # Register all ipcMain handlers, typed channels
│   │
│   ├── preload/
│   │   └── index.ts                 # contextBridge: exposes ipcRenderer to renderer
│   │
│   ├── renderer/
│   │   ├── main.tsx                 # React root mount
│   │   ├── App.tsx                  # Top-level state, IPC subscriptions, view routing
│   │   ├── index.css                # CSS variable declarations + base reset
│   │   ├── components/
│   │   │   ├── LyricsDisplay.tsx    # 3-line focus view + translation line
│   │   │   ├── ControlBar.tsx       # Hover overlay with 主题/译文/设置 buttons
│   │   │   ├── ThemePicker.tsx      # Bottom slide-up thumbnail grid
│   │   │   └── SettingsPage.tsx     # Theme import/export/delete/rename
│   │   ├── hooks/
│   │   │   ├── useHover.ts          # Mouse enter/leave with 2s fade-out delay
│   │   │   └── useKeyboard.ts       # T / L / , shortcuts (suppressed in inputs)
│   │   └── theme/
│   │       ├── types.ts             # ThemeConfig TypeScript type (mirrors JSON schema)
│   │       └── apply-theme.ts       # ThemeConfig → CSS custom properties on :root
│   │
│   └── shared/
│       └── types.ts                 # LyricsLine, TrackInfo, PlaybackState, IPC channel map
│
├── themes/                          # Built-in JSON theme files (bundled as assets)
│   ├── album-color.json
│   ├── neon.json
│   ├── dark-minimal.json
│   ├── frosted.json
│   ├── rgb-border.json
│   └── crt-amber.json
│
└── tests/
    ├── main/
    │   ├── lrc-parser.test.ts
    │   ├── spotify-poller.test.ts
    │   ├── lyrics-service.test.ts
    │   └── theme-manager.test.ts
    └── renderer/
        ├── apply-theme.test.ts
        ├── LyricsDisplay.test.tsx
        └── useKeyboard.test.ts
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `electron.vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`
- Create: `src/main/index.ts` (stub)
- Create: `src/preload/index.ts` (stub)
- Create: `src/renderer/main.tsx` (stub)

- [ ] **Step 1: Scaffold with electron-vite**

```bash
cd /Users/liuzhengyanshuo/workspace
npx create-electron-app@latest lyrics-app --template=vite-ts
# If prompted, choose: React renderer
```

If `create-electron-app` doesn't support vite-ts directly, use electron-vite instead:
```bash
cd /Users/liuzhengyanshuo/workspace
npm create electron-vite@latest lyrics-app -- --template react-ts
cd lyrics-app
npm install
```

- [ ] **Step 2: Add dependencies**

```bash
npm install tailwindcss @tailwindcss/vite
npm install -D vitest @vitest/ui @testing-library/react @testing-library/user-event jsdom
```

- [ ] **Step 3: Configure Tailwind**

Add to `electron.vite.config.ts` renderer plugins:
```ts
import tailwindcss from '@tailwindcss/vite'
// in renderer viteConfig.plugins: [tailwindcss()]
```

Create `src/renderer/index.css`:
```css
@import "tailwindcss";

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { width: 100%; height: 100%; overflow: hidden; }
```

- [ ] **Step 4: Add test config to `electron.vite.config.ts`**

```ts
// In the config, add a test block:
test: {
  environment: 'jsdom',
  globals: true,
  include: ['tests/**/*.test.{ts,tsx}'],
}
```

- [ ] **Step 5: Verify scaffold runs**

```bash
npm run dev
```
Expected: Electron window opens with default Vite/React template content.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold electron-vite react-ts project"
```

---

## Task 2: Shared Types

**Files:**
- Create: `src/shared/types.ts`

These types are imported by both main and renderer — define them once here.

- [ ] **Step 1: Write `src/shared/types.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add shared types"
```

---

## Task 3: LRC Parser

**Files:**
- Create: `src/main/providers/lrc-parser.ts`
- Create: `tests/main/lrc-parser.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/main/lrc-parser.test.ts
import { describe, it, expect } from 'vitest'
import { parseLrc } from '../../src/main/providers/lrc-parser'

describe('parseLrc', () => {
  it('parses basic LRC lines', () => {
    const lrc = '[00:04.20]Only for a moment\n[00:08.50]And the moment\'s gone'
    const result = parseLrc(lrc)
    expect(result).toEqual([
      { time: 4.2, text: 'Only for a moment' },
      { time: 8.5, text: "And the moment's gone" },
    ])
  })

  it('returns empty array for empty input', () => {
    expect(parseLrc('')).toEqual([])
  })

  it('skips metadata tags like [ar:] [ti:]', () => {
    const lrc = '[ar:Kansas]\n[ti:Dust in the Wind]\n[00:01.00]I close my eyes'
    expect(parseLrc(lrc)).toEqual([{ time: 1.0, text: 'I close my eyes' }])
  })

  it('handles minutes correctly', () => {
    const lrc = '[02:30.00]Some lyric'
    expect(parseLrc(lrc)[0].time).toBeCloseTo(150.0)
  })

  it('merges translation lines from two-LRC format', () => {
    const original = '[00:04.20]Only for a moment'
    const translation = '[00:04.20]只为了一瞬间'
    const result = parseLrc(original, translation)
    expect(result[0].translation).toBe('只为了一瞬间')
  })

  it('trims whitespace from lyrics text', () => {
    const lrc = '[00:01.00]  hello world  '
    expect(parseLrc(lrc)[0].text).toBe('hello world')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/main/lrc-parser.test.ts
```
Expected: FAIL — `parseLrc` not found.

- [ ] **Step 3: Implement `src/main/providers/lrc-parser.ts`**

```typescript
// src/main/providers/lrc-parser.ts
import type { LyricsLine } from '../../shared/types'

const TIME_TAG = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/

export function parseLrc(lrc: string, translationLrc?: string): LyricsLine[] {
  const lines = parseRaw(lrc)
  if (!translationLrc) return lines

  const translations = parseRaw(translationLrc)
  const translationMap = new Map(translations.map(l => [l.time, l.text]))

  return lines.map(line => ({
    ...line,
    translation: translationMap.get(line.time),
  }))
}

function parseRaw(lrc: string): LyricsLine[] {
  return lrc
    .split('\n')
    .map(line => line.trim())
    .map(line => {
      const match = TIME_TAG.exec(line)
      if (!match) return null
      const [, mm, ss, cs, text] = match
      const time = parseInt(mm) * 60 + parseInt(ss) + parseInt(cs) / (cs.length === 3 ? 1000 : 100)
      return { time, text: text.trim() }
    })
    .filter((l): l is LyricsLine => l !== null && l.text.length > 0)
    .sort((a, b) => a.time - b.time)
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/main/lrc-parser.test.ts
```
Expected: All 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/main/providers/lrc-parser.ts tests/main/lrc-parser.test.ts
git commit -m "feat: add LRC parser with translation support"
```

---

## Task 4: Provider Interface + NetEase Provider

**Files:**
- Create: `src/main/providers/types.ts`
- Create: `src/main/providers/netease.ts`

- [ ] **Step 1: Write `src/main/providers/types.ts`**

```typescript
// src/main/providers/types.ts
import type { LyricsLine } from '../../../shared/types'

export interface LyricsSearchRequest {
  title: string
  artist: string
  duration: number  // seconds
}

export interface LyricsProvider {
  name: string
  search(req: LyricsSearchRequest): Promise<LyricsLine[]>
}
```

- [ ] **Step 2: Implement `src/main/providers/netease.ts`**

```typescript
// src/main/providers/netease.ts
import { parseLrc } from './lrc-parser'
import type { LyricsProvider, LyricsSearchRequest } from './types'
import type { LyricsLine } from '../../../shared/types'

const SEARCH_URL = 'http://music.163.com/api/search/pc'
const LYRIC_URL  = 'http://music.163.com/api/song/lyric'

interface SearchResult { id: number; name: string; artists: { name: string }[] }
interface SearchResponse { result?: { songs?: SearchResult[] } }
interface LyricResponse { lrc?: { lyric?: string }; tlyric?: { lyric?: string } }

export const neteaseProvider: LyricsProvider = {
  name: 'netease',

  async search(req: LyricsSearchRequest): Promise<LyricsLine[]> {
    const params = new URLSearchParams({
      s: `${req.title} ${req.artist}`,
      type: '1',
      offset: '0',
      limit: '5',
    })

    const searchRes = await fetch(`${SEARCH_URL}?${params}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const searchData: SearchResponse = await searchRes.json()
    const songs = searchData.result?.songs ?? []
    if (songs.length === 0) throw new Error('netease: no results')

    const best = pickBest(songs, req)
    const lyricRes = await fetch(
      `${LYRIC_URL}?id=${best.id}&lv=1&kv=1&tv=-1`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const lyricData: LyricResponse = await lyricRes.json()

    const lrc = lyricData.lrc?.lyric
    if (!lrc) throw new Error('netease: no lyric data')

    return parseLrc(lrc, lyricData.tlyric?.lyric)
  },
}

function pickBest(songs: SearchResult[], req: LyricsSearchRequest): SearchResult {
  // Prefer exact title match
  const exact = songs.find(s => s.name.toLowerCase() === req.title.toLowerCase())
  return exact ?? songs[0]
}
```

- [ ] **Step 3: Commit**

```bash
git add src/main/providers/types.ts src/main/providers/netease.ts
git commit -m "feat: add provider interface and NetEase lyrics provider"
```

---

## Task 5: Kugou + QQ Music Providers

**Files:**
- Create: `src/main/providers/kugou.ts`
- Create: `src/main/providers/qq.ts`

- [ ] **Step 1: Implement `src/main/providers/kugou.ts`**

```typescript
// src/main/providers/kugou.ts
import { parseLrc } from './lrc-parser'
import type { LyricsProvider, LyricsSearchRequest } from './types'
import type { LyricsLine } from '../../../shared/types'

const SEARCH_URL = 'http://lyrics.kugou.com/search'
const LYRIC_URL  = 'http://lyrics.kugou.com/download'

interface Candidate { id: string; accesskey: string; song: string; singer: string }
interface SearchResponse { candidates?: Candidate[] }
interface LyricResponse { content?: string; status?: number }

export const kugouProvider: LyricsProvider = {
  name: 'kugou',

  async search(req: LyricsSearchRequest): Promise<LyricsLine[]> {
    const params = new URLSearchParams({
      keyword: `${req.title} ${req.artist}`,
      duration: String(Math.round(req.duration * 1000)),
      client: 'pc',
      ver: '1',
      man: 'yes',
    })

    const searchRes = await fetch(`${SEARCH_URL}?${params}`)
    const searchData: SearchResponse = await searchRes.json()
    const candidates = searchData.candidates ?? []
    if (candidates.length === 0) throw new Error('kugou: no results')

    const best = candidates[0]
    const lyricParams = new URLSearchParams({
      id: best.id,
      accesskey: best.accesskey,
      fmt: 'lrc',
      charset: 'utf8',
      client: 'pc',
      ver: '1',
    })

    const lyricRes = await fetch(`${LYRIC_URL}?${lyricParams}`)
    const lyricData: LyricResponse = await lyricRes.json()

    if (!lyricData.content) throw new Error('kugou: empty lyric content')

    const decoded = Buffer.from(lyricData.content, 'base64').toString('utf-8')
    return parseLrc(decoded)
  },
}
```

- [ ] **Step 2: Implement `src/main/providers/qq.ts`**

```typescript
// src/main/providers/qq.ts
import { parseLrc } from './lrc-parser'
import type { LyricsProvider, LyricsSearchRequest } from './types'
import type { LyricsLine } from '../../../shared/types'

const SEARCH_URL = 'https://c.y.qq.com/soso/fcgi-bin/client_search_cp'
const LYRIC_URL  = 'https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg'

interface QQSong { songmid: string; songname: string; singer: { name: string }[] }
interface SearchResponse { data?: { song?: { list?: QQSong[] } } }
interface LyricResponse { lyric?: string; trans?: string }

export const qqProvider: LyricsProvider = {
  name: 'qq',

  async search(req: LyricsSearchRequest): Promise<LyricsLine[]> {
    const params = new URLSearchParams({
      w: `${req.title} ${req.artist}`,
      format: 'json',
      inCharset: 'utf8',
      outCharset: 'utf8',
      notice: '0',
      platform: 'yqq',
      needNewCode: '0',
      p: '1',
      n: '5',
      cr: '1',
    })

    const searchRes = await fetch(`${SEARCH_URL}?${params}`, {
      headers: { Referer: 'https://y.qq.com' },
    })
    const searchData: SearchResponse = await searchRes.json()
    const songs = searchData.data?.song?.list ?? []
    if (songs.length === 0) throw new Error('qq: no results')

    const mid = songs[0].songmid
    const lyricParams = new URLSearchParams({
      songmid: mid,
      format: 'json',
      inCharset: 'utf8',
      outCharset: 'utf8',
      notice: '0',
      platform: 'yqq',
      needNewCode: '0',
    })

    const lyricRes = await fetch(`${LYRIC_URL}?${lyricParams}`, {
      headers: { Referer: 'https://y.qq.com' },
    })
    const lyricData: LyricResponse = await lyricRes.json()

    if (!lyricData.lyric) throw new Error('qq: no lyric data')

    const lrc = Buffer.from(lyricData.lyric, 'base64').toString('utf-8')
    const trans = lyricData.trans
      ? Buffer.from(lyricData.trans, 'base64').toString('utf-8')
      : undefined

    return parseLrc(lrc, trans)
  },
}
```

- [ ] **Step 3: Commit**

```bash
git add src/main/providers/kugou.ts src/main/providers/qq.ts
git commit -m "feat: add Kugou and QQ Music lyrics providers"
```

---

## Task 6: LyricsService

**Files:**
- Create: `src/main/lyrics-service.ts`
- Create: `tests/main/lyrics-service.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/main/lyrics-service.test.ts
import { describe, it, expect, vi } from 'vitest'
import { LyricsService } from '../../src/main/lyrics-service'
import type { LyricsProvider } from '../../src/main/providers/types'

const makeLine = (time: number, text: string) => ({ time, text })

describe('LyricsService', () => {
  it('returns lyrics from first provider that succeeds', async () => {
    const p1: LyricsProvider = { name: 'p1', search: vi.fn().mockResolvedValue([makeLine(1, 'hello')]) }
    const p2: LyricsProvider = { name: 'p2', search: vi.fn().mockResolvedValue([makeLine(1, 'other')]) }
    const svc = new LyricsService([p1, p2])
    const result = await svc.fetch({ title: 'x', artist: 'y', duration: 200 })
    expect(result[0].text).toBe('hello')
  })

  it('falls back to second provider if first fails', async () => {
    const p1: LyricsProvider = { name: 'p1', search: vi.fn().mockRejectedValue(new Error('fail')) }
    const p2: LyricsProvider = { name: 'p2', search: vi.fn().mockResolvedValue([makeLine(1, 'fallback')]) }
    const svc = new LyricsService([p1, p2])
    const result = await svc.fetch({ title: 'x', artist: 'y', duration: 200 })
    expect(result[0].text).toBe('fallback')
  })

  it('throws if all providers fail', async () => {
    const p1: LyricsProvider = { name: 'p1', search: vi.fn().mockRejectedValue(new Error('fail')) }
    const p2: LyricsProvider = { name: 'p2', search: vi.fn().mockRejectedValue(new Error('fail')) }
    const svc = new LyricsService([p1, p2])
    await expect(svc.fetch({ title: 'x', artist: 'y', duration: 200 })).rejects.toThrow()
  })

  it('returns hasTranslation=true when any line has translation', async () => {
    const lines = [{ time: 1, text: 'hello', translation: '你好' }]
    const p1: LyricsProvider = { name: 'p1', search: vi.fn().mockResolvedValue(lines) }
    const svc = new LyricsService([p1])
    const result = await svc.fetch({ title: 'x', artist: 'y', duration: 200 })
    expect(result.some(l => l.translation)).toBe(true)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/main/lyrics-service.test.ts
```

- [ ] **Step 3: Implement `src/main/lyrics-service.ts`**

```typescript
// src/main/lyrics-service.ts
import type { LyricsLine } from '../../shared/types'
import type { LyricsProvider, LyricsSearchRequest } from './providers/types'

export class LyricsService {
  constructor(private readonly providers: LyricsProvider[]) {}

  async fetch(req: LyricsSearchRequest): Promise<LyricsLine[]> {
    return Promise.any(this.providers.map(p => p.search(req)))
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run tests/main/lyrics-service.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/main/lyrics-service.ts tests/main/lyrics-service.test.ts
git commit -m "feat: add LyricsService with Promise.any provider fallback"
```

---

## Task 7: SpotifyPoller

**Files:**
- Create: `src/main/spotify-poller.ts`
- Create: `tests/main/spotify-poller.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/main/spotify-poller.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SpotifyPoller } from '../../src/main/spotify-poller'

// Mock child_process.exec
vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}))

import { exec } from 'node:child_process'

const mockExec = vi.mocked(exec)

function mockSpotifyOutput(state: string, title: string, artist: string, album: string, duration: number, position: number, artworkUrl = '') {
  mockExec.mockImplementation((_cmd: string, cb: any) => {
    cb(null, `${state}\n${title}\n${artist}\n${album}\n${duration}\n${position}\n${artworkUrl}`, '')
    return {} as any
  })
}

describe('SpotifyPoller', () => {
  it('emits track:changed when track title changes', async () => {
    const poller = new SpotifyPoller()
    const handler = vi.fn()
    poller.on('track:changed', handler)

    mockSpotifyOutput('playing', 'Song A', 'Artist', 'Album', 240000, 1000)
    await poller._poll()

    mockSpotifyOutput('playing', 'Song B', 'Artist', 'Album', 200000, 500)
    await poller._poll()

    expect(handler).toHaveBeenCalledOnce()
    expect(handler.mock.calls[0][0].title).toBe('Song B')
  })

  it('emits playback:update on every poll', async () => {
    const poller = new SpotifyPoller()
    const handler = vi.fn()
    poller.on('playback:update', handler)

    mockSpotifyOutput('playing', 'Song', 'Artist', 'Album', 200000, 1000)
    await poller._poll()

    expect(handler).toHaveBeenCalledOnce()
    expect(handler.mock.calls[0][0].state).toBe('playing')
    expect(handler.mock.calls[0][0].position).toBeCloseTo(1.0)
  })

  it('does not emit track:changed if same track continues', async () => {
    const poller = new SpotifyPoller()
    const handler = vi.fn()
    poller.on('track:changed', handler)

    mockSpotifyOutput('playing', 'Song A', 'Artist', 'Album', 240000, 1000)
    await poller._poll()
    await poller._poll()

    expect(handler).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/main/spotify-poller.test.ts
```

- [ ] **Step 3: Implement `src/main/spotify-poller.ts`**

```typescript
// src/main/spotify-poller.ts
import { exec } from 'node:child_process'
import { EventEmitter } from 'node:events'
import type { TrackInfo, PlaybackState, PlaybackStatus } from '../../shared/types'

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
    const [stateRaw, title, artist, album, durationMs, positionSec, artworkUrl] =
      output.split('\n').map(s => s.trim())

    const state: PlaybackState =
      stateRaw === 'playing' ? 'playing' :
      stateRaw === 'paused'  ? 'paused'  : 'stopped'

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
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run tests/main/spotify-poller.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/main/spotify-poller.ts tests/main/spotify-poller.test.ts
git commit -m "feat: add SpotifyPoller with adaptive interval and track change detection"
```

---

## Task 8: ThemeManager + Config

**Files:**
- Create: `src/main/theme-manager.ts`
- Create: `src/main/config.ts`
- Create: `tests/main/theme-manager.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/main/theme-manager.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ThemeManager } from '../../src/main/theme-manager'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tmpDir: string

beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'themes-')) })
afterEach(() => { rmSync(tmpDir, { recursive: true }) })

const validTheme = {
  name: 'Test', version: '1.0',
  background: { type: 'solid', color: '#000' },
  currentLine: { color: '#fff', fontSize: 28, fontWeight: 700 },
  contextLine: { color: '#aaa', fontSize: 14, fontWeight: 400 },
  translation: { color: '#888', fontSize: 13, fontWeight: 400, fontStyle: 'italic' },
  transition: { duration: 400, easing: 'ease-in-out' },
  thumbnail: '#000,#fff',
}

describe('ThemeManager', () => {
  it('lists themes from directory', async () => {
    writeFileSync(join(tmpDir, 'test.json'), JSON.stringify(validTheme))
    const mgr = new ThemeManager(tmpDir, '')
    const themes = await mgr.listThemes()
    expect(themes.find(t => t.id === 'test')).toBeDefined()
  })

  it('loads a theme by id', async () => {
    writeFileSync(join(tmpDir, 'test.json'), JSON.stringify(validTheme))
    const mgr = new ThemeManager(tmpDir, '')
    const theme = await mgr.loadTheme('test')
    expect(theme.name).toBe('Test')
  })

  it('throws for invalid theme JSON', async () => {
    writeFileSync(join(tmpDir, 'bad.json'), '{ "name": "Bad" }')
    const mgr = new ThemeManager(tmpDir, '')
    await expect(mgr.loadTheme('bad')).rejects.toThrow()
  })

  it('copies imported theme file to user dir', async () => {
    const src = join(tmpDir, 'import-src.json')
    writeFileSync(src, JSON.stringify(validTheme))
    const destDir = mkdtempSync(join(tmpdir(), 'dest-'))
    try {
      const mgr = new ThemeManager(destDir, '')
      await mgr.importTheme(src)
      const themes = await mgr.listThemes()
      expect(themes.find(t => t.id === 'import-src')).toBeDefined()
    } finally {
      rmSync(destDir, { recursive: true })
    }
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/main/theme-manager.test.ts
```

- [ ] **Step 3: Implement `src/main/theme-manager.ts`**

```typescript
// src/main/theme-manager.ts
import { readdir, readFile, copyFile, unlink, writeFile } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'
import type { ThemeConfig, ThemeMeta } from '../../shared/types'

const REQUIRED_KEYS: (keyof ThemeConfig)[] = [
  'name', 'version', 'background', 'currentLine',
  'contextLine', 'translation', 'transition', 'thumbnail',
]

export class ThemeManager {
  constructor(
    private readonly userDir: string,
    private readonly builtInDir: string,
  ) {}

  async listThemes(): Promise<ThemeMeta[]> {
    const [userFiles, builtInFiles] = await Promise.all([
      this._listDir(this.userDir, false),
      this._listDir(this.builtInDir, true),
    ])
    return [...builtInFiles, ...userFiles]
  }

  async loadTheme(id: string): Promise<ThemeConfig> {
    const userPath = join(this.userDir, `${id}.json`)
    const builtInPath = join(this.builtInDir, `${id}.json`)
    let raw: string
    try { raw = await readFile(userPath, 'utf-8') }
    catch { raw = await readFile(builtInPath, 'utf-8') }

    const parsed = JSON.parse(raw) as ThemeConfig
    this._validate(parsed)
    return parsed
  }

  async importTheme(srcPath: string): Promise<void> {
    const raw = await readFile(srcPath, 'utf-8')
    const parsed = JSON.parse(raw) as ThemeConfig
    this._validate(parsed)
    const id = basename(srcPath, extname(srcPath))
    await copyFile(srcPath, join(this.userDir, `${id}.json`))
  }

  async deleteTheme(id: string): Promise<void> {
    await unlink(join(this.userDir, `${id}.json`))
  }

  async renameTheme(id: string, newName: string): Promise<void> {
    const path = join(this.userDir, `${id}.json`)
    const raw = await readFile(path, 'utf-8')
    const theme = JSON.parse(raw) as ThemeConfig
    await writeFile(path, JSON.stringify({ ...theme, name: newName }, null, 2))
  }

  private async _listDir(dir: string, isBuiltIn: boolean): Promise<ThemeMeta[]> {
    try {
      const files = await readdir(dir)
      const metas = await Promise.all(
        files
          .filter(f => f.endsWith('.json'))
          .map(async f => {
            try {
              const raw = await readFile(join(dir, f), 'utf-8')
              const t = JSON.parse(raw) as ThemeConfig
              return { id: basename(f, '.json'), name: t.name, thumbnail: t.thumbnail, isBuiltIn }
            } catch { return null }
          })
      )
      return metas.filter((m): m is ThemeMeta => m !== null)
    } catch { return [] }
  }

  private _validate(theme: unknown): asserts theme is ThemeConfig {
    if (typeof theme !== 'object' || theme === null)
      throw new Error('Invalid theme: not an object')
    for (const key of REQUIRED_KEYS) {
      if (!(key in theme))
        throw new Error(`Invalid theme: missing required field "${key}"`)
    }
  }
}
```

- [ ] **Step 4: Implement `src/main/config.ts`**

```typescript
// src/main/config.ts
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import type { AppConfig } from '../../shared/types'

const DEFAULTS: AppConfig = {
  activeTheme: 'album-color',
  translationEnabled: false,
}

export class Config {
  private data: AppConfig = { ...DEFAULTS }

  constructor(private readonly path: string) {}

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.path, 'utf-8')
      this.data = { ...DEFAULTS, ...JSON.parse(raw) }
    } catch {
      this.data = { ...DEFAULTS }
    }
  }

  get(): AppConfig {
    return { ...this.data }
  }

  async set(patch: Partial<AppConfig>): Promise<void> {
    this.data = { ...this.data, ...patch }
    await mkdir(dirname(this.path), { recursive: true })
    await writeFile(this.path, JSON.stringify(this.data, null, 2))
  }
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run tests/main/theme-manager.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/main/theme-manager.ts src/main/config.ts tests/main/theme-manager.test.ts
git commit -m "feat: add ThemeManager and Config"
```

---

## Task 9: IPC Bridge + Main Process Entry

**Files:**
- Create: `src/main/ipc-bridge.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`

- [ ] **Step 1: Implement `src/main/ipc-bridge.ts`**

```typescript
// src/main/ipc-bridge.ts
import { ipcMain, dialog, BrowserWindow } from 'electron'
import type { SpotifyPoller } from './spotify-poller'
import type { LyricsService } from './lyrics-service'
import type { ThemeManager } from './theme-manager'
import type { Config } from './config'

export function registerIpcHandlers(
  win: BrowserWindow,
  poller: SpotifyPoller,
  lyricsService: LyricsService,
  themeManager: ThemeManager,
  config: Config,
): void {
  // NOTE: position:get is not used — playback position is pushed to renderer
  // via 'playback:update' events from the poller. No polling needed.

  ipcMain.handle('config:get', async () => ({ result: config.get() }))
  ipcMain.handle('config:set', async (_e, { patch }) => { await config.set(patch) })

  ipcMain.handle('theme:get-all', async () => ({
    result: await themeManager.listThemes(),
  }))

  ipcMain.handle('theme:activate', async (_e, { id }) => {
    await config.set({ activeTheme: id })
    const theme = await themeManager.loadTheme(id)
    win.webContents.send('theme:changed', { theme })
  })

  ipcMain.handle('theme:import', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      filters: [{ name: 'Theme', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (canceled) return { result: 'ok' }
    try {
      await themeManager.importTheme(filePaths[0])
      return { result: 'ok' }
    } catch {
      return { result: 'invalid' }
    }
  })

  ipcMain.handle('theme:export', async (_e, { id }) => {
    const theme = await themeManager.loadTheme(id)
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      defaultPath: `${id}.json`,
      filters: [{ name: 'Theme', extensions: ['json'] }],
    })
    if (!canceled && filePath) {
      const { writeFile } = await import('node:fs/promises')
      await writeFile(filePath, JSON.stringify(theme, null, 2))
    }
  })

  ipcMain.handle('theme:delete', async (_e, { id }) => {
    await themeManager.deleteTheme(id)
  })

  ipcMain.handle('theme:rename', async (_e, { id, name }) => {
    await themeManager.renameTheme(id, name)
  })

  // Forward SpotifyPoller events to renderer
  poller.on('playback:update', (status) => {
    win.webContents.send('playback:update', status)
  })

  poller.on('track:changed', async (track) => {
    try {
      const lines = await lyricsService.fetch({
        title: track.title,
        artist: track.artist,
        duration: track.duration,
      })
      const hasTranslation = lines.some(l => l.translation !== undefined)
      win.webContents.send('lyrics:loaded', { lines, hasTranslation })
    } catch {
      win.webContents.send('lyrics:not-found', { track })
    }
  })
}
```

- [ ] **Step 2: Rewrite `src/main/index.ts`**

```typescript
// src/main/index.ts
import { app, BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import { SpotifyPoller } from './spotify-poller'
import { LyricsService } from './lyrics-service'
import { neteaseProvider } from './providers/netease'
import { kugouProvider } from './providers/kugou'
import { qqProvider } from './providers/qq'
import { ThemeManager } from './theme-manager'
import { Config } from './config'
import { registerIpcHandlers } from './ipc-bridge'

async function createWindow() {
  // Target the non-primary display if available
  const displays = screen.getAllDisplays()
  const target = displays.find(d => d.id !== screen.getPrimaryDisplay().id) ?? displays[0]
  const { x, y, width, height } = target.bounds

  const win = new BrowserWindow({
    x, y, width, height,
    fullscreen: true,
    frame: false,
    transparent: false,
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const userDataPath = app.getPath('userData')
  const config = new Config(join(userDataPath, 'config.json'))
  await config.load()

  const builtInThemesDir = join(__dirname, '../../themes')
  const userThemesDir = join(userDataPath, 'themes')
  const themeManager = new ThemeManager(userThemesDir, builtInThemesDir)

  const lyricsService = new LyricsService([neteaseProvider, kugouProvider, qqProvider])
  const poller = new SpotifyPoller()

  registerIpcHandlers(win, poller, lyricsService, themeManager, config)

  if (process.env.NODE_ENV === 'development') {
    win.loadURL(process.env.ELECTRON_RENDERER_URL!)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Load initial theme and send to renderer once ready
  win.webContents.once('did-finish-load', async () => {
    const cfg = config.get()
    const theme = await themeManager.loadTheme(cfg.activeTheme).catch(() =>
      themeManager.loadTheme('dark-minimal')
    )
    win.webContents.send('theme:changed', { theme })

    const themes = await themeManager.listThemes()
    win.webContents.send('theme:list', { themes })
  })

  poller.start()
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
```

- [ ] **Step 3: Rewrite `src/preload/index.ts`**

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  send:   (channel: string, data: unknown) => ipcRenderer.send(channel, data),
  invoke: (channel: string, data?: unknown) => ipcRenderer.invoke(channel, data),
  on:     (channel: string, cb: (data: unknown) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: unknown) => cb(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
})
```

Add the `window.api` type declaration to `src/renderer/env.d.ts` (create if absent):
```typescript
interface Window {
  api: {
    send:   (channel: string, data: unknown) => void
    invoke: (channel: string, data?: unknown) => Promise<unknown>
    on:     (channel: string, cb: (data: unknown) => void) => () => void
  }
}
```

- [ ] **Step 4: Verify app starts without errors**

```bash
npm run dev
```
Expected: Electron window opens, no console errors in main process.

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc-bridge.ts src/main/index.ts src/preload/index.ts src/renderer/env.d.ts
git commit -m "feat: add IPC bridge and wire main process"
```

---

## Task 10: Theme CSS Application (Renderer)

**Files:**
- Create: `src/renderer/theme/types.ts` (re-export from shared)
- Create: `src/renderer/theme/apply-theme.ts`
- Create: `tests/renderer/apply-theme.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/renderer/apply-theme.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { applyTheme } from '../../src/renderer/theme/apply-theme'
import type { ThemeConfig } from '../../src/shared/types'

const neonTheme: ThemeConfig = {
  name: '霓虹', version: '1.0',
  background: { type: 'solid', color: '#050505' },
  currentLine: { color: '#00ff88', fontSize: 28, fontWeight: 700, glow: { color: '#00ff88', blur: 20, spread: 5 } },
  contextLine: { color: '#00ff8855', fontSize: 14, fontWeight: 400 },
  translation: { color: '#00ff8877', fontSize: 13, fontWeight: 400, fontStyle: 'italic' },
  transition: { duration: 400, easing: 'ease-in-out' },
  thumbnail: '#050505,#00ff88',
}

describe('applyTheme', () => {
  beforeEach(() => { document.documentElement.removeAttribute('style') })

  it('sets background color CSS variable for solid type', () => {
    applyTheme(neonTheme)
    const style = document.documentElement.style
    expect(style.getPropertyValue('--theme-bg-color')).toBe('#050505')
    expect(style.getPropertyValue('--theme-bg-type')).toBe('solid')
  })

  it('sets current line color and font variables', () => {
    applyTheme(neonTheme)
    const style = document.documentElement.style
    expect(style.getPropertyValue('--theme-current-color')).toBe('#00ff88')
    expect(style.getPropertyValue('--theme-current-size')).toBe('28px')
    expect(style.getPropertyValue('--theme-current-weight')).toBe('700')
  })

  it('sets transition duration and easing', () => {
    applyTheme(neonTheme)
    const style = document.documentElement.style
    expect(style.getPropertyValue('--theme-transition-duration')).toBe('400ms')
    expect(style.getPropertyValue('--theme-transition-easing')).toBe('ease-in-out')
  })

  it('sets glow text-shadow variable when glow is defined', () => {
    applyTheme(neonTheme)
    const style = document.documentElement.style
    const glow = style.getPropertyValue('--theme-current-glow')
    expect(glow).toContain('#00ff88')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/renderer/apply-theme.test.ts
```

- [ ] **Step 3: Implement `src/renderer/theme/apply-theme.ts`**

```typescript
// src/renderer/theme/apply-theme.ts
import type { ThemeConfig } from '../../shared/types'

export function applyTheme(theme: ThemeConfig): void {
  const root = document.documentElement
  const set = (k: string, v: string) => root.style.setProperty(k, v)

  // Background
  set('--theme-bg-type', theme.background.type)
  if (theme.background.type === 'solid') {
    set('--theme-bg-color', theme.background.color)
  } else if (theme.background.type === 'gradient') {
    const { colors, angle } = theme.background
    set('--theme-bg-gradient', `linear-gradient(${angle}deg, ${colors.join(', ')})`)
  } else if (theme.background.type === 'album-art') {
    set('--theme-bg-color', theme.background.fallbackColor)
    set('--theme-bg-blur', `${theme.background.blur}px`)
    set('--theme-bg-darken', String(theme.background.darken))
  }

  // Current line
  set('--theme-current-color',  theme.currentLine.color)
  set('--theme-current-size',   `${theme.currentLine.fontSize}px`)
  set('--theme-current-weight', String(theme.currentLine.fontWeight))
  if (theme.currentLine.glow) {
    const { color, blur, spread } = theme.currentLine.glow
    set('--theme-current-glow', `0 0 ${blur}px ${color}, 0 0 ${spread}px ${color}`)
  } else {
    set('--theme-current-glow', 'none')
  }

  // Context line
  set('--theme-context-color',  theme.contextLine.color)
  set('--theme-context-size',   `${theme.contextLine.fontSize}px`)
  set('--theme-context-weight', String(theme.contextLine.fontWeight))

  // Translation
  set('--theme-trans-color',  theme.translation.color)
  set('--theme-trans-size',   `${theme.translation.fontSize}px`)
  set('--theme-trans-weight', String(theme.translation.fontWeight))
  set('--theme-trans-style',  theme.translation.fontStyle)

  // Transition
  set('--theme-transition-duration', `${theme.transition.duration}ms`)
  set('--theme-transition-easing',   theme.transition.easing)

  // Optional border
  const border = theme.border
  if (!border || border.type === 'none') {
    set('--theme-border-width', '0px')
  } else if (border.type === 'solid') {
    set('--theme-border-width', `${border.width}px`)
    set('--theme-border-color', border.color)
  } else if (border.type === 'rgb-cycle') {
    set('--theme-border-width', `${border.width}px`)
    set('--theme-border-duration', `${border.animationDuration}ms`)
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run tests/renderer/apply-theme.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/theme/ tests/renderer/apply-theme.test.ts
git commit -m "feat: add theme CSS variable application"
```

---

## Task 11: LyricsDisplay Component

**Files:**
- Create: `src/renderer/components/LyricsDisplay.tsx`
- Create: `tests/renderer/LyricsDisplay.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/renderer/LyricsDisplay.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LyricsDisplay } from '../../src/renderer/components/LyricsDisplay'
import type { LyricsLine } from '../../src/shared/types'

const lines: LyricsLine[] = [
  { time: 0, text: 'Line one' },
  { time: 4, text: 'Line two' },
  { time: 8, text: 'Line three' },
  { time: 12, text: 'Line four' },
]

describe('LyricsDisplay', () => {
  it('renders current, prev, and next lines', () => {
    render(<LyricsDisplay lines={lines} currentIndex={1} showTranslation={false} isPaused={false} />)
    expect(screen.getByTestId('line-current')).toHaveTextContent('Line two')
    expect(screen.getByTestId('line-prev')).toHaveTextContent('Line one')
    expect(screen.getByTestId('line-next')).toHaveTextContent('Line three')
  })

  it('renders empty prev slot at first line', () => {
    render(<LyricsDisplay lines={lines} currentIndex={0} showTranslation={false} isPaused={false} />)
    expect(screen.getByTestId('line-prev')).toBeEmptyDOMElement()
    expect(screen.getByTestId('line-current')).toHaveTextContent('Line one')
  })

  it('renders empty next slot at last line', () => {
    render(<LyricsDisplay lines={lines} currentIndex={3} showTranslation={false} isPaused={false} />)
    expect(screen.getByTestId('line-next')).toBeEmptyDOMElement()
  })

  it('shows translation when available and enabled', () => {
    const withTrans: LyricsLine[] = [
      { time: 0, text: 'Hello', translation: '你好' },
    ]
    render(<LyricsDisplay lines={withTrans} currentIndex={0} showTranslation={true} isPaused={false} />)
    expect(screen.getByTestId('line-translation')).toHaveTextContent('你好')
  })

  it('does not show translation when disabled', () => {
    const withTrans: LyricsLine[] = [{ time: 0, text: 'Hello', translation: '你好' }]
    render(<LyricsDisplay lines={withTrans} currentIndex={0} showTranslation={false} isPaused={false} />)
    expect(screen.queryByTestId('line-translation')).toBeNull()
  })

  it('shows not-found message when lines is empty', () => {
    render(<LyricsDisplay lines={[]} currentIndex={-1} showTranslation={false} isPaused={false} notFoundTrack={{ title: 'Song', artist: 'Artist', album: '', duration: 0 }} />)
    expect(screen.getByText('未找到歌词')).toBeDefined()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/renderer/LyricsDisplay.test.tsx
```

- [ ] **Step 3: Implement `src/renderer/components/LyricsDisplay.tsx`**

```tsx
// src/renderer/components/LyricsDisplay.tsx
import type { LyricsLine, TrackInfo } from '../../shared/types'

interface Props {
  lines: LyricsLine[]
  currentIndex: number
  showTranslation: boolean
  isPaused: boolean
  notFoundTrack?: TrackInfo | null
  container?: import('../../shared/types').ThemeContainer
}

export function LyricsDisplay({ lines, currentIndex, showTranslation, isPaused, notFoundTrack, container }: Props) {
  const containerStyle: React.CSSProperties = container
    ? {
        background: container.background,
        backdropFilter: `blur(${container.backdropBlur}px)`,
        border: container.border,
        borderRadius: container.borderRadius,
        padding: container.padding,
      }
    : {}

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p data-testid="line-current" className="text-[var(--theme-current-size)] text-[var(--theme-current-color)]" style={{ opacity: isPaused ? 0.5 : 1 }}>
          {notFoundTrack ? `${notFoundTrack.title} — ${notFoundTrack.artist}` : ''}
        </p>
        {notFoundTrack && <p className="text-[var(--theme-context-size)] text-[var(--theme-context-color)]">未找到歌词</p>}
      </div>
    )
  }

  const prev = currentIndex > 0 ? lines[currentIndex - 1] : null
  const current = lines[currentIndex] ?? null
  const next = currentIndex < lines.length - 1 ? lines[currentIndex + 1] : null
  const translation = showTranslation ? current?.translation : undefined

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4" style={{ opacity: isPaused ? 0.6 : 1, transition: 'opacity 0.3s' }}>
    <div style={containerStyle}>
      <p
        data-testid="line-prev"
        className="text-[var(--theme-context-size)] font-[var(--theme-context-weight)] text-[var(--theme-context-color)] transition-all"
        style={{ transitionDuration: 'var(--theme-transition-duration)', transitionTimingFunction: 'var(--theme-transition-easing)' }}
      >
        {prev?.text ?? ''}
      </p>

      <p
        data-testid="line-current"
        className="text-[var(--theme-current-size)] font-[var(--theme-current-weight)] text-[var(--theme-current-color)] transition-all"
        style={{
          textShadow: 'var(--theme-current-glow)',
          transitionDuration: 'var(--theme-transition-duration)',
          transitionTimingFunction: 'var(--theme-transition-easing)',
        }}
      >
        {current?.text ?? ''}
      </p>

      {translation !== undefined && (
        <p
          data-testid="line-translation"
          className="text-[var(--theme-trans-size)] font-[var(--theme-trans-weight)] text-[var(--theme-trans-color)]"
          style={{ fontStyle: 'var(--theme-trans-style)' as React.CSSProperties['fontStyle'] }}
        >
          {translation}
        </p>
      )}

      <p
        data-testid="line-next"
        className="text-[var(--theme-context-size)] font-[var(--theme-context-weight)] text-[var(--theme-context-color)] transition-all"
        style={{ transitionDuration: 'var(--theme-transition-duration)', transitionTimingFunction: 'var(--theme-transition-easing)' }}
      >
        {next?.text ?? ''}
      </p>
    </div>
    </div>
  )
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run tests/renderer/LyricsDisplay.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/LyricsDisplay.tsx tests/renderer/LyricsDisplay.test.tsx
git commit -m "feat: add LyricsDisplay component with single-line focus"
```

---

## Task 12: Hooks — useHover + useKeyboard

**Files:**
- Create: `src/renderer/hooks/useHover.ts`
- Create: `src/renderer/hooks/useKeyboard.ts`
- Create: `tests/renderer/useKeyboard.test.ts`

- [ ] **Step 1: Write failing tests for useKeyboard**

```typescript
// tests/renderer/useKeyboard.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { fireEvent } from '@testing-library/dom'
import { useKeyboard } from '../../src/renderer/hooks/useKeyboard'

describe('useKeyboard', () => {
  it('calls onTheme when T is pressed', () => {
    const handlers = { onTheme: vi.fn(), onTranslation: vi.fn(), onSettings: vi.fn() }
    renderHook(() => useKeyboard(handlers))
    fireEvent.keyDown(document, { key: 't' })
    expect(handlers.onTheme).toHaveBeenCalledOnce()
  })

  it('calls onTranslation when L is pressed', () => {
    const handlers = { onTheme: vi.fn(), onTranslation: vi.fn(), onSettings: vi.fn() }
    renderHook(() => useKeyboard(handlers))
    fireEvent.keyDown(document, { key: 'l' })
    expect(handlers.onTranslation).toHaveBeenCalledOnce()
  })

  it('calls onSettings when comma is pressed', () => {
    const handlers = { onTheme: vi.fn(), onTranslation: vi.fn(), onSettings: vi.fn() }
    renderHook(() => useKeyboard(handlers))
    fireEvent.keyDown(document, { key: ',' })
    expect(handlers.onSettings).toHaveBeenCalledOnce()
  })

  it('does not fire when an input is focused', () => {
    const handlers = { onTheme: vi.fn(), onTranslation: vi.fn(), onSettings: vi.fn() }
    renderHook(() => useKeyboard(handlers))
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    fireEvent.keyDown(input, { key: 't' })
    expect(handlers.onTheme).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/renderer/useKeyboard.test.ts
```

- [ ] **Step 3: Implement `src/renderer/hooks/useKeyboard.ts`**

```typescript
// src/renderer/hooks/useKeyboard.ts
import { useEffect } from 'react'

interface Handlers {
  onTheme:       () => void
  onTranslation: () => void
  onSettings:    () => void
}

export function useKeyboard(handlers: Handlers): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return

      switch (e.key.toLowerCase()) {
        case 't': handlers.onTheme();       break
        case 'l': handlers.onTranslation(); break
        case ',': handlers.onSettings();    break
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handlers])
}
```

- [ ] **Step 4: Implement `src/renderer/hooks/useHover.ts`**

```typescript
// src/renderer/hooks/useHover.ts
import { useState, useRef, useCallback } from 'react'

export function useHover(fadeDelay = 2000) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onEnter = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(true)
  }, [])

  const onLeave = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(false), fadeDelay)
  }, [fadeDelay])

  return { visible, onEnter, onLeave }
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run tests/renderer/useKeyboard.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/renderer/hooks/ tests/renderer/useKeyboard.test.ts
git commit -m "feat: add useHover and useKeyboard hooks"
```

---

## Task 13: ControlBar + ThemePicker Components

**Files:**
- Create: `src/renderer/components/ControlBar.tsx`
- Create: `src/renderer/components/ThemePicker.tsx`

- [ ] **Step 1: Implement `src/renderer/components/ControlBar.tsx`**

```tsx
// src/renderer/components/ControlBar.tsx
interface Props {
  visible: boolean
  hasTranslation: boolean
  translationEnabled: boolean
  onTheme: () => void
  onTranslation: () => void
  onSettings: () => void
}

export function ControlBar({ visible, hasTranslation, translationEnabled, onTheme, onTranslation, onSettings }: Props) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-8 py-4"
      style={{
        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.3s ease',
      }}
    >
      <div className="flex gap-4">
        <button onClick={onTheme} className="text-white/60 hover:text-white text-sm px-3 py-1 rounded border border-white/20 hover:border-white/50 transition-all">
          主题
        </button>
        {hasTranslation && (
          <button onClick={onTranslation} className={`text-sm px-3 py-1 rounded border transition-all ${translationEnabled ? 'text-white border-white/50' : 'text-white/60 border-white/20 hover:text-white hover:border-white/50'}`}>
            译文
          </button>
        )}
      </div>
      <button onClick={onSettings} className="text-white/60 hover:text-white text-sm px-3 py-1 rounded border border-white/20 hover:border-white/50 transition-all">
        设置
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Implement `src/renderer/components/ThemePicker.tsx`**

```tsx
// src/renderer/components/ThemePicker.tsx
import type { ThemeMeta } from '../../shared/types'

interface Props {
  visible: boolean
  themes: ThemeMeta[]
  activeThemeId: string
  onSelect: (id: string) => void
  onImport: () => void
  onClose: () => void
}

export function ThemePicker({ visible, themes, activeThemeId, onSelect, onImport, onClose }: Props) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease',
        background: 'rgba(8,8,20,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '20px 24px 28px',
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <span className="text-white/40 text-xs uppercase tracking-widest">选择主题</span>
        <button onClick={onClose} className="text-white/40 hover:text-white text-lg leading-none">×</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {themes.map(theme => (
          <button
            key={theme.id}
            onClick={() => { onSelect(theme.id); onClose() }}
            className="flex flex-col items-center gap-1 group"
          >
            <div
              className="w-full h-12 rounded-lg overflow-hidden transition-all"
              style={{
                background: thumbnailGradient(theme.thumbnail),
                border: theme.id === activeThemeId ? '2px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.12)',
              }}
            />
            <span className="text-xs text-white/50 group-hover:text-white/80 transition-colors truncate w-full text-center">
              {theme.name}
            </span>
          </button>
        ))}

        {/* Import slot */}
        <button onClick={onImport} className="flex flex-col items-center gap-1 group">
          <div className="w-full h-12 rounded-lg flex items-center justify-center border border-dashed border-white/20 hover:border-white/40 transition-colors">
            <span className="text-white/30 text-xl group-hover:text-white/60 transition-colors">+</span>
          </div>
          <span className="text-xs text-white/30 group-hover:text-white/50 transition-colors">导入</span>
        </button>
      </div>
    </div>
  )
}

function thumbnailGradient(thumbnail: string): string {
  const colors = thumbnail.split(',').map(c => c.trim())
  return colors.length > 1
    ? `linear-gradient(135deg, ${colors.join(', ')})`
    : colors[0]
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/ControlBar.tsx src/renderer/components/ThemePicker.tsx
git commit -m "feat: add ControlBar and ThemePicker components"
```

---

## Task 14: SettingsPage Component

**Files:**
- Create: `src/renderer/components/SettingsPage.tsx`

- [ ] **Step 1: Implement `src/renderer/components/SettingsPage.tsx`**

```tsx
// src/renderer/components/SettingsPage.tsx
import { useState } from 'react'
import type { ThemeMeta } from '../../shared/types'

interface Props {
  visible: boolean
  themes: ThemeMeta[]
  onClose: () => void
  onImport: () => void
  onExport: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
}

export function SettingsPage({ visible, themes, onClose, onImport, onExport, onDelete, onRename }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  if (!visible) return null

  function startRename(theme: ThemeMeta) {
    setEditingId(theme.id)
    setEditingName(theme.name)
  }

  function commitRename(id: string) {
    if (editingName.trim()) onRename(id, editingName.trim())
    setEditingId(null)
  }

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0d0d1a] border border-white/10 rounded-2xl w-[480px] max-h-[70vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold">设置</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-white/60 text-xs uppercase tracking-widest">主题管理</h3>
            <button onClick={onImport} className="text-xs text-white/60 hover:text-white border border-white/20 hover:border-white/50 rounded px-3 py-1 transition-all">
              导入主题
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {themes.map(theme => (
              <div key={theme.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 group">
                <div className="w-8 h-8 rounded-md flex-shrink-0" style={{ background: thumbnailGradient(theme.thumbnail) }} />

                {editingId === theme.id ? (
                  <input
                    className="flex-1 bg-white/10 text-white text-sm rounded px-2 py-1 outline-none border border-white/20 focus:border-white/50"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onBlur={() => commitRename(theme.id)}
                    onKeyDown={e => e.key === 'Enter' && commitRename(theme.id)}
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 text-white/80 text-sm">{theme.name}</span>
                )}

                {theme.isBuiltIn && (
                  <span className="text-white/20 text-xs">内置</span>
                )}

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!theme.isBuiltIn && (
                    <button onClick={() => startRename(theme)} className="text-xs text-white/40 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-all">
                      重命名
                    </button>
                  )}
                  <button onClick={() => onExport(theme.id)} className="text-xs text-white/40 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-all">
                    导出
                  </button>
                  {!theme.isBuiltIn && (
                    <button onClick={() => onDelete(theme.id)} className="text-xs text-red-400/60 hover:text-red-400 px-2 py-1 rounded hover:bg-red-400/10 transition-all">
                      删除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function thumbnailGradient(thumbnail: string): string {
  const colors = thumbnail.split(',').map(c => c.trim())
  return colors.length > 1
    ? `linear-gradient(135deg, ${colors.join(', ')})`
    : colors[0]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/SettingsPage.tsx
git commit -m "feat: add SettingsPage component for theme management"
```

---

## Task 15: App.tsx — State Orchestration + Sync Loop

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/main.tsx`
- Modify: `src/renderer/index.css`

- [ ] **Step 1: Implement `src/renderer/App.tsx`**

```tsx
// src/renderer/App.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { LyricsDisplay } from './components/LyricsDisplay'
import { ControlBar } from './components/ControlBar'
import { ThemePicker } from './components/ThemePicker'
import { SettingsPage } from './components/SettingsPage'
import { applyTheme } from './theme/apply-theme'
import { useHover } from './hooks/useHover'
import { useKeyboard } from './hooks/useKeyboard'
import type { LyricsLine, TrackInfo, ThemeMeta, ThemeConfig, AppConfig, PlaybackStatus } from '../shared/types'

const api = (window as any).api

export default function App() {
  const [lines, setLines]                     = useState<LyricsLine[]>([])
  const [currentIndex, setCurrentIndex]       = useState(0)
  const [hasTranslation, setHasTranslation]   = useState(false)
  const [notFoundTrack, setNotFoundTrack]     = useState<TrackInfo | null>(null)
  const [isPaused, setIsPaused]               = useState(false)
  const [artworkUrl, setArtworkUrl]           = useState<string | undefined>()
  const [themes, setThemes]                   = useState<ThemeMeta[]>([])
  const [activeThemeId, setActiveThemeId]     = useState('album-color')
  const [activeTheme, setActiveTheme]         = useState<ThemeConfig | null>(null)
  const [translationEnabled, setTranslationEnabled] = useState(false)
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen]       = useState(false)

  const linesRef = useRef(lines)
  linesRef.current = lines

  const { visible: controlsVisible, onEnter, onLeave } = useHover(2000)

  // Load initial config
  useEffect(() => {
    api.invoke('config:get').then(({ result }: { result: AppConfig }) => {
      setActiveThemeId(result.activeTheme)
      setTranslationEnabled(result.translationEnabled)
    })
    api.invoke('theme:get-all').then(({ result }: { result: ThemeMeta[] }) => {
      setThemes(result)
    })
  }, [])

  // Subscribe to IPC events
  useEffect(() => {
    const unsubs = [
      api.on('lyrics:loaded', ({ lines: newLines, hasTranslation: ht }: any) => {
        setLines(newLines)
        setHasTranslation(ht)
        setCurrentIndex(0)
        setNotFoundTrack(null)
      }),
      api.on('lyrics:not-found', ({ track }: any) => {
        setLines([])
        setNotFoundTrack(track)
      }),
      api.on('playback:update', (status: PlaybackStatus) => {
        setIsPaused(status.state !== 'playing')
        if (status.track?.artworkUrl) setArtworkUrl(status.track.artworkUrl)

        // Update current lyric line index
        const idx = findCurrentIndex(linesRef.current, status.position)
        setCurrentIndex(idx)
      }),
      api.on('theme:changed', ({ theme }: { theme: ThemeConfig }) => {
        applyTheme(theme)
        setActiveTheme(theme)
      }),
      api.on('theme:list', ({ themes: t }: { themes: ThemeMeta[] }) => {
        setThemes(t)
      }),
    ]
    return () => unsubs.forEach((u: () => void) => u())
  }, [])

  const handleThemeSelect = useCallback(async (id: string) => {
    await api.invoke('theme:activate', { id })
    setActiveThemeId(id)
    const updated = await api.invoke('theme:get-all')
    setThemes(updated.result)
  }, [])

  const handleImport = useCallback(async () => {
    await api.invoke('theme:import')
    const updated = await api.invoke('theme:get-all')
    setThemes(updated.result)
  }, [])

  const handleExport  = useCallback((id: string) => api.invoke('theme:export', { id }), [])
  const handleDelete  = useCallback(async (id: string) => {
    await api.invoke('theme:delete', { id })
    const updated = await api.invoke('theme:get-all')
    setThemes(updated.result)
  }, [])
  const handleRename  = useCallback(async (id: string, name: string) => {
    await api.invoke('theme:rename', { id, name })
    const updated = await api.invoke('theme:get-all')
    setThemes(updated.result)
  }, [])

  const toggleTranslation = useCallback(() => {
    setTranslationEnabled(prev => {
      const next = !prev
      api.invoke('config:set', { patch: { translationEnabled: next } })
      return next
    })
  }, [])

  useKeyboard({
    onTheme:       () => setThemePickerOpen(prev => !prev),
    onTranslation: toggleTranslation,
    onSettings:    () => setSettingsOpen(prev => !prev),
  })

  // Album art background
  const bgStyle: React.CSSProperties = activeTheme?.background.type === 'album-art' && artworkUrl
    ? {
        backgroundImage: `url(${artworkUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: `blur(${activeTheme.background.blur}px) brightness(${1 - activeTheme.background.darken})`,
      }
    : {}

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none"
      style={{ backgroundColor: 'var(--theme-bg-color, #000)' }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Album art background layer */}
      {activeTheme?.background.type === 'album-art' && (
        <div className="absolute inset-0 scale-110" style={bgStyle} />
      )}

      {/* RGB border */}
      {activeTheme?.border && activeTheme.border.type !== 'none' && (
        <div className="absolute inset-0 pointer-events-none" style={{
          boxShadow: activeTheme.border.type === 'solid'
            ? `inset 0 0 0 ${activeTheme.border.width}px ${activeTheme.border.color}`
            : undefined,
          // rgb-cycle: uses CSS animation defined in index.css as @keyframes rgb-border
          border: activeTheme.border.type === 'rgb-cycle'
            ? `${activeTheme.border.width}px solid transparent`
            : undefined,
          animation: activeTheme.border.type === 'rgb-cycle'
            ? `rgb-border ${activeTheme.border.animationDuration}ms linear infinite`
            : undefined,
        }} />
      )}

      {/* CRT scanlines effect */}
      {activeTheme?.effect?.type === 'crt-scanlines' && (
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent ${activeTheme.effect.lineHeight - 1}px, rgba(0,0,0,${activeTheme.effect.opacity}) ${activeTheme.effect.lineHeight}px)`,
        }} />
      )}

      {/* Lyrics */}
      <LyricsDisplay
        lines={lines}
        currentIndex={currentIndex}
        showTranslation={translationEnabled}
        isPaused={isPaused}
        notFoundTrack={notFoundTrack}
        container={activeTheme?.container}
      />

      {/* Control bar */}
      <ControlBar
        visible={controlsVisible}
        hasTranslation={hasTranslation}
        translationEnabled={translationEnabled}
        onTheme={() => setThemePickerOpen(prev => !prev)}
        onTranslation={toggleTranslation}
        onSettings={() => setSettingsOpen(prev => !prev)}
      />

      {/* Theme picker */}
      <ThemePicker
        visible={themePickerOpen}
        themes={themes}
        activeThemeId={activeThemeId}
        onSelect={handleThemeSelect}
        onImport={handleImport}
        onClose={() => setThemePickerOpen(false)}
      />

      {/* Settings page */}
      <SettingsPage
        visible={settingsOpen}
        themes={themes}
        onClose={() => setSettingsOpen(false)}
        onImport={handleImport}
        onExport={handleExport}
        onDelete={handleDelete}
        onRename={handleRename}
      />
    </div>
  )
}

function findCurrentIndex(lines: LyricsLine[], position: number): number {
  if (lines.length === 0) return 0
  let lo = 0, hi = lines.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (lines[mid].time <= position) lo = mid + 1
    else hi = mid - 1
  }
  return Math.max(0, lo - 1)
}
```

- [ ] **Step 2: Update `src/renderer/main.tsx`**

```tsx
// src/renderer/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 3: Update `src/renderer/index.css`** — add CSS variable defaults and keyframes

```css
@import "tailwindcss";

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { width: 100%; height: 100%; overflow: hidden; background: #000; }

@keyframes rgb-border {
  0%   { border-color: #ff0080; }
  17%  { border-color: #ff8c00; }
  33%  { border-color: #ffe600; }
  50%  { border-color: #00ff88; }
  67%  { border-color: #00cfff; }
  83%  { border-color: #a855f7; }
  100% { border-color: #ff0080; }
}

:root {
  --theme-bg-type: solid;
  --theme-bg-color: #000000;
  --theme-current-color: #ffffff;
  --theme-current-size: 28px;
  --theme-current-weight: 600;
  --theme-current-glow: none;
  --theme-context-color: rgba(255,255,255,0.4);
  --theme-context-size: 14px;
  --theme-context-weight: 400;
  --theme-trans-color: rgba(255,255,255,0.5);
  --theme-trans-size: 13px;
  --theme-trans-weight: 400;
  --theme-trans-style: italic;
  --theme-transition-duration: 400ms;
  --theme-transition-easing: ease-in-out;
  --theme-border-width: 0px;
}
```

- [ ] **Step 4: Run app and smoke test**

```bash
npm run dev
```

Expected:
- Fullscreen window appears with black background
- Hover over window → control bar fades in at bottom
- Press `T` → theme picker panel slides up
- Press `,` → settings page opens

- [ ] **Step 5: Commit**

```bash
git add src/renderer/App.tsx src/renderer/main.tsx src/renderer/index.css
git commit -m "feat: add App.tsx with full state orchestration and sync loop"
```

---

## Task 16: Built-In Theme JSON Files

**Files:**
- Create: `themes/album-color.json`, `themes/neon.json`, `themes/dark-minimal.json`, `themes/frosted.json`, `themes/rgb-border.json`, `themes/crt-amber.json`

- [ ] **Step 1: Create all 6 theme files**

`themes/album-color.json`:
```json
{
  "name": "专辑色调", "version": "1.0",
  "background": { "type": "album-art", "fallbackColor": "#111111", "blur": 40, "darken": 0.5 },
  "currentLine": { "color": "#ffffff", "fontSize": 28, "fontWeight": 600 },
  "contextLine": { "color": "rgba(255,255,255,0.4)", "fontSize": 14, "fontWeight": 400 },
  "translation": { "color": "rgba(255,255,255,0.5)", "fontSize": 13, "fontWeight": 400, "fontStyle": "italic" },
  "transition": { "duration": 500, "easing": "ease-in-out" },
  "thumbnail": "#4a1a6b,#1a3a6b"
}
```

`themes/neon.json`:
```json
{
  "name": "霓虹发光", "version": "1.0",
  "background": { "type": "solid", "color": "#050505" },
  "currentLine": { "color": "#00ff88", "fontSize": 28, "fontWeight": 700, "glow": { "color": "#00ff88", "blur": 20, "spread": 5 } },
  "contextLine": { "color": "rgba(0,255,136,0.3)", "fontSize": 14, "fontWeight": 400 },
  "translation": { "color": "rgba(0,255,136,0.4)", "fontSize": 13, "fontWeight": 400, "fontStyle": "italic" },
  "transition": { "duration": 300, "easing": "ease-in-out" },
  "thumbnail": "#050505,#00ff88"
}
```

`themes/dark-minimal.json`:
```json
{
  "name": "极简黑", "version": "1.0",
  "background": { "type": "solid", "color": "#0a0a0a" },
  "currentLine": { "color": "#ffffff", "fontSize": 28, "fontWeight": 300 },
  "contextLine": { "color": "rgba(255,255,255,0.25)", "fontSize": 14, "fontWeight": 300 },
  "translation": { "color": "rgba(255,255,255,0.35)", "fontSize": 13, "fontWeight": 300, "fontStyle": "italic" },
  "transition": { "duration": 400, "easing": "ease-in-out" },
  "thumbnail": "#0a0a0a,#ffffff"
}
```

`themes/frosted.json`:
```json
{
  "name": "柔光毛玻璃", "version": "1.0",
  "background": { "type": "gradient", "colors": ["#e8d5f5", "#d5e8f5", "#d5f5e8"], "angle": 135 },
  "currentLine": { "color": "rgba(40,20,80,0.85)", "fontSize": 26, "fontWeight": 600 },
  "contextLine": { "color": "rgba(80,50,120,0.45)", "fontSize": 13, "fontWeight": 400 },
  "translation": { "color": "rgba(80,50,120,0.55)", "fontSize": 12, "fontWeight": 400, "fontStyle": "italic" },
  "transition": { "duration": 400, "easing": "ease-in-out" },
  "thumbnail": "#e8d5f5,#d5f5e8",
  "container": {
    "background": "rgba(255,255,255,0.55)",
    "backdropBlur": 20,
    "border": "1px solid rgba(255,255,255,0.8)",
    "borderRadius": 16,
    "padding": "24px 40px"
  }
}
```

`themes/rgb-border.json`:
```json
{
  "name": "RGB 边框", "version": "1.0",
  "background": { "type": "solid", "color": "#030308" },
  "currentLine": { "color": "#ffffff", "fontSize": 28, "fontWeight": 700, "glow": { "color": "rgba(168,85,247,0.6)", "blur": 25, "spread": 5 } },
  "contextLine": { "color": "rgba(255,255,255,0.3)", "fontSize": 14, "fontWeight": 400 },
  "translation": { "color": "rgba(255,255,255,0.4)", "fontSize": 13, "fontWeight": 400, "fontStyle": "italic" },
  "transition": { "duration": 400, "easing": "ease-in-out" },
  "thumbnail": "#030308,#a855f7",
  "border": { "type": "rgb-cycle", "width": 4, "animationDuration": 4000 }
}
```

`themes/crt-amber.json`:
```json
{
  "name": "复古琥珀", "version": "1.0",
  "background": { "type": "solid", "color": "#080810" },
  "currentLine": { "color": "#ffb300", "fontSize": 22, "fontWeight": 400, "glow": { "color": "rgba(255,179,0,0.8)", "blur": 8, "spread": 2 } },
  "contextLine": { "color": "rgba(255,160,0,0.35)", "fontSize": 12, "fontWeight": 400 },
  "translation": { "color": "rgba(255,160,0,0.45)", "fontSize": 11, "fontWeight": 400, "fontStyle": "normal" },
  "transition": { "duration": 200, "easing": "linear" },
  "thumbnail": "#080810,#ffb300",
  "effect": { "type": "crt-scanlines", "opacity": 0.15, "lineHeight": 4 }
}
```

- [ ] **Step 2: Verify themes are loaded in app**

```bash
npm run dev
```
Press `T` → theme picker should show all 6 themes with colored thumbnails.

- [ ] **Step 3: Commit**

```bash
git add themes/
git commit -m "feat: add 6 built-in theme JSON files"
```

---

## Task 17: Final Wiring + Smoke Test

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```
Expected: All tests pass.

- [ ] **Step 2: Manual smoke test checklist**

Open Spotify and play a song, then launch:
```bash
npm run dev
```

Verify:
- [ ] Lyrics load and display in 3-line focus format
- [ ] Current line updates as song progresses
- [ ] Hover over window → control bar appears, disappears after 2s
- [ ] Click 主题 → theme picker slides up with 6 themes
- [ ] Click each theme → background and text colors update instantly
- [ ] Press `L` → if track has translation, second line appears below current
- [ ] Press `,` → settings page opens; can rename/export/delete user themes
- [ ] Import a theme: export neon.json, re-import it → appears in picker
- [ ] Pause Spotify → lyrics dim slightly
- [ ] Skip track → new lyrics load within ~2 seconds

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete lyrics app MVP"
```
