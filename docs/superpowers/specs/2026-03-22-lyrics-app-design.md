# Lyrics App Design Spec
**Date:** 2026-03-22
**Status:** Approved

---

## Overview

A personal desktop lyrics display app built with Electron + React + TypeScript. Designed to run fullscreen on a dedicated desk screen as an ambient lyrics display, complementing an RGB lighting setup and white desk aesthetic.

---

## User-Facing Design Decisions

### 1. Display Mode: Full-Screen Immersive

The app occupies the entire screen of a dedicated desk monitor. It runs as a permanent ambient display — always on, always visible, no window chrome or taskbar.

### 2. Lyrics Sync: Single-Line Focus

```
                    [ Only for a moment ]      ← prev line (dim, 0.8x size)
              [ And the moment's gone ]        ← current line (bright, 1.0x)
                    [ All my dreams ]          ← next line (dim, 0.8x size)
```

- Current line is centered, full brightness, full size
- Adjacent lines are dimmer and slightly smaller
- Transitions between lines are smooth (CSS animation)

### 3. Translation: Smart Toggle

- Default: show original lyrics only
- User can toggle translation on/off via the control bar or keyboard shortcut
- When translation is available, the translated line appears below the current line in a smaller, dimmer style
- Toggle button auto-hides when no translation data is available for the current track

### 4. Controls: Hover Overlay

- Normally: full-screen shows only lyrics, zero UI chrome
- On mouse enter: a control bar fades in at the bottom with three buttons:
  - **主题** — opens theme picker panel
  - **译文** — toggles translation on/off
  - **设置** — opens settings page
- On mouse leave: control bar fades out after 2 seconds
- Keyboard shortcuts work regardless of hover state:
  - `T` — cycle theme picker
  - `L` — toggle translation
  - `,` — open settings

### 5. Theme System: JSON Config Files

#### Theme Picker (triggered by clicking 「主题」)

A panel slides up from the bottom of the screen showing:
- A 2×N thumbnail grid of all installed themes
- Each thumbnail shows the theme's color palette as a small gradient preview
- Theme name label below each thumbnail
- Currently active theme has a highlighted border
- A `+` "Import" slot at the end of the grid

#### Theme Config Format

Each theme is a single `.json` file stored in:
```
~/Library/Application Support/lyrics-app/themes/
```

Example theme file (`neon.json`):
```json
{
  "name": "霓虹发光",
  "version": "1.0",
  "background": {
    "type": "solid",
    "color": "#050505"
  },
  "currentLine": {
    "color": "#00ff88",
    "fontSize": 28,
    "fontWeight": 700,
    "glow": { "color": "#00ff88", "blur": 20, "spread": 5 }
  },
  "contextLine": {
    "color": "#00ff8855",
    "fontSize": 14,
    "fontWeight": 400
  },
  "translation": {
    "color": "#00ff8877",
    "fontSize": 13
  },
  "transition": {
    "duration": 400,
    "easing": "ease-in-out"
  },
  "thumbnail": "#050505,#00ff88"
}
```

#### Theme Management (Settings Page)

The settings page includes a theme management section where the user can:
- **Import**: drag-and-drop or file picker to import a `.json` theme file
- **Export**: click any theme to export it as a `.json` file
- **Delete**: remove a theme (with confirmation for built-in themes)
- **Rename**: edit the display name of any theme

Built-in themes ship with the app and cannot be deleted (but can be exported and modified).

---

## Built-In Themes

The app ships with the following default themes, covering the visual styles explored during design:

| ID | Name | Style |
|----|------|-------|
| `album-color` | 专辑色调 | Dynamic background extracted from album art |
| `neon` | 霓虹发光 | Black background, neon green glowing text |
| `dark-minimal` | 极简黑 | Pure black, thin white text, high contrast |
| `frosted` | 柔光毛玻璃 | Soft pastel gradient, frosted glass card |
| `rgb-border` | RGB 边框 | Dark background with RGB edge glow |
| `crt-amber` | 复古琥珀 | CRT scanline effect, amber monochrome |

---

## Technical Architecture (for reference)

### Stack
- **Shell**: Electron (macOS)
- **Renderer**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + CSS custom properties for theme variables
- **IPC**: Electron contextBridge (typed)

### Core Modules (Main Process)
- **SpotifyPoller**: `osascript` polling at adaptive intervals (1s playing, 5s paused); detects track/state changes
- **LyricsService**: `Promise.any` across NetEase → Kugou → QQ Music providers; parses LRC to `LyricsLine[]`
- **ThemeManager**: Reads/writes JSON theme files from the user data directory; validates schema on load
- **IPCBridge**: Typed channels for lyrics, playback state, theme updates

### Data Flow
1. SpotifyPoller detects track change → emits `track:changed`
2. LyricsService receives event → concurrently queries all providers → returns first success
3. Renderer receives `lyrics:loaded` via IPC → starts 250ms sync loop
4. Sync loop reads `player position` → binary search for current line index → re-renders

### Theme Application
- Active theme JSON is passed to renderer via IPC on app start and on theme change
- Renderer converts theme values to CSS custom properties on `:root`
- All visual components reference `var(--theme-*)` tokens only — no hardcoded colors

### File Locations
```
~/Library/Application Support/lyrics-app/
  themes/           ← user theme JSON files
  config.json       ← app preferences (active theme, translation toggle state)
```

---

## Out of Scope (Personal Use)

- Multi-monitor management
- Spotify Connect fallback (Web API)
- Cloud sync
- Auto-update
- Support for players other than Spotify
