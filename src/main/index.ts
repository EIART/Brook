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

async function createWindow(): Promise<void> {
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
