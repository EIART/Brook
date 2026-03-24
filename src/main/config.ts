import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { AppConfig } from '../shared/types'

const DEFAULTS: AppConfig = {
  activeTheme: 'album-color',
  translationEnabled: false,
  pollerSource: 'remote',
  remotePort: 9898,
  webPort: 9899,
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
