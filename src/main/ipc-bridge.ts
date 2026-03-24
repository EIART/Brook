// src/main/ipc-bridge.ts
import { ipcMain, dialog, BrowserWindow } from 'electron'
import type { EventEmitter } from 'node:events'
import type { LyricsService } from './lyrics-service'
import type { ThemeManager } from './theme-manager'
import type { Config } from './config'
import type { LyricsCandidate } from '../shared/types'
import type { WebBroadcastServer } from './web-server'

function send(win: BrowserWindow, web: WebBroadcastServer | undefined, channel: string, data: unknown): void {
  win.webContents.send(channel, data)
  web?.broadcast(channel, data)
}

export function registerIpcHandlers(
  win: BrowserWindow,
  poller: EventEmitter,
  lyricsService: LyricsService,
  themeManager: ThemeManager,
  config: Config,
  webServer?: WebBroadcastServer,
): void {
  // NOTE: position:get is not used — playback position is pushed to renderer
  // via 'playback:update' events from the poller. No polling needed.

  ipcMain.handle('config:get', async () => ({ result: config.get() }))
  webServer?.onInvoke('config:get', async () => ({ result: config.get() }))

  ipcMain.handle('config:set', async (_e, { patch }) => { await config.set(patch) })
  webServer?.onInvoke('config:set', async ({ patch }: any) => { await config.set(patch) })

  ipcMain.handle('theme:get-all', async () => ({ result: await themeManager.listThemes() }))
  webServer?.onInvoke('theme:get-all', async () => ({ result: await themeManager.listThemes() }))

  ipcMain.handle('theme:activate', async (_e, { id }) => {
    await config.set({ activeTheme: id })
    const theme = await themeManager.loadTheme(id)
    send(win, webServer, 'theme:changed', { theme })
  })
  webServer?.onInvoke('theme:activate', async ({ id }: any) => {
    await config.set({ activeTheme: id })
    const theme = await themeManager.loadTheme(id)
    send(win, webServer, 'theme:changed', { theme })
  })

  // theme:import / theme:export require native dialog — Electron only
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
  webServer?.onInvoke('theme:delete', async ({ id }: any) => { await themeManager.deleteTheme(id) })

  ipcMain.handle('theme:rename', async (_e, { id, name }) => {
    await themeManager.renameTheme(id, name)
  })
  webServer?.onInvoke('theme:rename', async ({ id, name }: any) => { await themeManager.renameTheme(id, name) })

  let lastCandidates: LyricsCandidate[] = []

  // Forward poller events to renderer
  poller.on('playback:update', (status) => {
    send(win, webServer, 'playback:update', status)
  })

  poller.on('track:changed', async (track) => {
    try {
      const candidates = await lyricsService.fetchAllCandidates({
        title: track.title,
        artist: track.artist,
        duration: track.duration,
      })
      lastCandidates = candidates
      send(win, webServer, 'candidates:loaded', { candidates, activeIndex: 0 })

      if (candidates.length > 0) {
        const lines = await lyricsService.fetchForCandidate(candidates[0])
        const hasTranslation = lines.some(l => l.translation !== undefined)
        send(win, webServer, 'lyrics:loaded', { lines, hasTranslation })
      } else {
        send(win, webServer, 'lyrics:not-found', { track })
      }
    } catch {
      send(win, webServer, 'lyrics:not-found', { track })
    }
  })

  ipcMain.handle('candidate:select', async (_e, { id }: { id: string }) => {
    const candidate = lastCandidates.find(c => c.id === id)
    if (!candidate) return
    const lines = await lyricsService.fetchForCandidate(candidate)
    const hasTranslation = lines.some(l => l.translation !== undefined)
    send(win, webServer, 'lyrics:loaded', { lines, hasTranslation })
  })
  webServer?.onInvoke('candidate:select', async ({ id }: any) => {
    const candidate = lastCandidates.find(c => c.id === id)
    if (!candidate) return
    const lines = await lyricsService.fetchForCandidate(candidate)
    const hasTranslation = lines.some(l => l.translation !== undefined)
    send(win, webServer, 'lyrics:loaded', { lines, hasTranslation })
  })
}
