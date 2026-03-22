import { readdir, readFile, copyFile, unlink, writeFile } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'
import type { ThemeConfig, ThemeMeta } from '../shared/types'

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
