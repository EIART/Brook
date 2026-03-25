import type {
  BrowserWindow as BrowserWindowType,
  BrowserWindowConstructorOptions,
  Display,
} from 'electron'
import { join } from 'node:path'

const DEFAULT_WIDTH = 1280
const DEFAULT_HEIGHT = 720

type DisplayLike = Pick<Display, 'id' | 'workArea'>
type BrowserWindowCtor = new (
  options: BrowserWindowConstructorOptions,
) => BrowserWindowType

function createBaseOptions(
  bounds: Pick<BrowserWindowConstructorOptions, 'x' | 'y' | 'width' | 'height'>,
): BrowserWindowConstructorOptions {
  return {
    ...bounds,
    fullscreen: false,
    fullscreenable: true,
    resizable: true,
    frame: true,
    transparent: false,
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  }
}

export function createMainWindowOptions(
  displays: DisplayLike[],
  primaryDisplay?: Pick<Display, 'id'>,
): BrowserWindowConstructorOptions {
  const target =
    displays.find((display) => display.id !== primaryDisplay?.id) ??
    displays[0]

  if (!target) {
    return createBaseOptions({
      x: 0,
      y: 0,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
    })
  }

  const width = Math.min(DEFAULT_WIDTH, target.workArea.width)
  const height = Math.min(DEFAULT_HEIGHT, target.workArea.height)
  const x = Math.round(target.workArea.x + (target.workArea.width - width) / 2)
  const y = Math.round(
    target.workArea.y + (target.workArea.height - height) / 2,
  )

  return createBaseOptions({ x, y, width, height })
}

export function createMainWindow(
  BrowserWindowCtor: BrowserWindowCtor,
  displays: DisplayLike[],
  primaryDisplay?: Pick<Display, 'id'>,
) {
  const options = createMainWindowOptions(displays, primaryDisplay)
  return new BrowserWindowCtor(options)
}
