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
