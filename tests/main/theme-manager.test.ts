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
