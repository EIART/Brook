# Brook

A fullscreen, real-time lyrics display app built with Electron. Put it on a second monitor — it watches what's playing on Spotify or NetEase Cloud Music and shows synchronized lyrics with smooth animations and customizable themes.

---

## Features

- **Real-time sync** — Detects track changes instantly, highlights the current lyric line as the song plays
- **Multi-source lyrics** — Searches NetEase, Kugou, and QQ Music in parallel and uses the first match
- **Translation support** — Toggle bilingual display for lyrics with translations
- **6 built-in themes** — Album art, frosted glass, CRT amber, neon, RGB border, dark minimal
- **Custom themes** — Import, export, and rename your own themes
- **Dual-monitor aware** — Targets your secondary display automatically
- **Cross-machine mode** — Run the lightweight probe on a separate Mac; Brook receives playback over LAN via WebSocket

---

## Screenshots

> _Coming soon_

---

## Requirements

- macOS (AppleScript is used for player detection)
- Node.js 18+
- Spotify or NetEase Cloud Music

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/EIART/Brook.git
cd Brook

# Install dependencies
npm install

# Start in development mode
npm run dev
```

---

## Cross-Machine Setup

If your music plays on a **different Mac** than the one running Brook, use the included probe script.

### Mac A — Display machine (running Brook)

Set `pollerSource` to `"remote"` in Brook's config, then start the app:

```bash
npm run dev
```

### Mac B — Playback machine (running Spotify / NetEase)

Copy the `probe/` folder to Mac B, then:

```bash
cd probe
npm install
npx tsx src/index.ts --host <Mac-A-IP>
```

To find Mac A's IP: **System Settings → Wi-Fi → Details**.

The probe connects over WebSocket (default port `9898`), detects what's playing, and streams playback state to Brook in real time. It supports Spotify and NetEase Cloud Music, tries Spotify first, and reconnects automatically if the connection drops.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `T` | Open theme picker |
| `L` | Toggle lyrics translation |
| `,` | Open settings |

---

## Project Structure

```
Brook/
├── src/
│   ├── main/               # Electron main process
│   │   ├── index.ts        # App entry, display targeting
│   │   ├── spotify-poller.ts   # Local Spotify detection (AppleScript)
│   │   ├── remote-poller.ts    # WebSocket server for probe mode
│   │   ├── lyrics-service.ts   # Races all providers, returns first match
│   │   ├── ipc-bridge.ts       # Main ↔ renderer IPC handlers
│   │   ├── config.ts           # Persisted user config
│   │   ├── theme-manager.ts    # Theme load / import / export
│   │   └── providers/          # NetEase, Kugou, QQ Music + LRC parser
│   ├── renderer/           # React UI
│   │   ├── src/App.tsx         # Root component, state management
│   │   ├── components/         # LyricsDisplay, Capsule, ProgressBar, ControlBar, ThemePicker, SettingsPage
│   │   ├── hooks/              # useHover, useKeyboard
│   │   └── theme/              # CSS variable application
│   ├── preload/            # Context bridge (contextIsolation)
│   └── shared/types.ts     # Shared TypeScript interfaces
├── probe/                  # Standalone playback probe (Mac B)
│   └── src/
│       ├── index.ts            # CLI entry, WebSocket client, polling loop
│       └── players/            # Spotify + NeteaseMusic detectors
├── themes/                 # Built-in theme JSON files
└── tests/                  # Vitest unit tests
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start in development mode (hot reload) |
| `npm run build` | Build for current platform |
| `npm run build:mac` | Build macOS `.dmg` |
| `npm test` | Run all tests |
| `npm run lint` | Lint with ESLint |
| `npm run format` | Format with Prettier |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron 33 |
| UI | React 18 + Tailwind CSS 4 |
| Build | electron-vite + Vite 5 |
| Language | TypeScript 5.7 |
| Testing | Vitest |
| Transport | WebSocket (`ws`) |

---

## Contributing

Issues and pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

---

## License

MIT
