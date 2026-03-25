import { describe, expect, it, vi } from 'vitest'
import {
  createMainWindow,
  createMainWindowOptions,
} from '../../src/main/window-options'

describe('createMainWindowOptions', () => {
  it('uses the first non-primary display and centers a windowed 1280x720 window on it', () => {
    const primary = {
      id: 1,
      workArea: { x: 0, y: 25, width: 1440, height: 875 },
    } as const
    const secondary = {
      id: 2,
      workArea: { x: 1440, y: 0, width: 1920, height: 1080 },
    } as const
    const tertiary = {
      id: 3,
      workArea: { x: 3360, y: 0, width: 2560, height: 1440 },
    } as const

    const options = createMainWindowOptions(
      [primary, secondary, tertiary],
      primary,
    )

    expect(options).toMatchObject({
      x: 1760,
      y: 180,
      width: 1280,
      height: 720,
      fullscreen: false,
      fullscreenable: true,
      resizable: true,
      frame: true,
      transparent: false,
      backgroundColor: '#000000',
      webPreferences: {
        preload: expect.stringMatching(/[\/]preload[\/]index\.js$/),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })
  })

  it('keeps the single available display when there is no non-primary target', () => {
    const only = {
      id: 7,
      workArea: { x: 50, y: 20, width: 1600, height: 900 },
    } as const

    const options = createMainWindowOptions([only], only)

    expect(options).toMatchObject({ x: 210, y: 110, width: 1280, height: 720 })
  })

  it('falls back to displays[0] when the provided primary display is missing from the list', () => {
    const first = {
      id: 10,
      workArea: { x: 100, y: 30, width: 1501, height: 901 },
    } as const
    const second = {
      id: 11,
      workArea: { x: 1700, y: 0, width: 1920, height: 1080 },
    } as const

    const options = createMainWindowOptions([first, second], {
      id: 999,
    } as const)

    expect(options).toMatchObject({ x: 211, y: 121, width: 1280, height: 720 })
  })

  it('uses workArea rather than bounds when calculating size and position', () => {
    const display = {
      id: 1,
      workArea: { x: 200, y: 60, width: 1024, height: 640 },
      bounds: { x: 0, y: 0, width: 1280, height: 800 },
    } as const

    const options = createMainWindowOptions([display], display)

    expect(options).toMatchObject({ x: 200, y: 60, width: 1024, height: 640 })
  })

  it('clamps width and height when the target workArea is smaller than 1280x720', () => {
    const display = {
      id: 4,
      workArea: { x: 10, y: 15, width: 900, height: 700 },
    } as const

    const options = createMainWindowOptions([display], display)

    expect(options).toMatchObject({ x: 10, y: 15, width: 900, height: 700 })
  })

  it('returns the hardcoded origin fallback when no displays are available and preserves flags', () => {
    expect(createMainWindowOptions([], undefined)).toEqual({
      x: 0,
      y: 0,
      width: 1280,
      height: 720,
      fullscreen: false,
      fullscreenable: true,
      resizable: true,
      frame: true,
      transparent: false,
      backgroundColor: '#000000',
      webPreferences: {
        preload: expect.stringMatching(/[\/]preload[\/]index\.js$/),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })
  })

  it('rounds centered coordinates to integers for odd workArea sizes', () => {
    const display = {
      id: 5,
      workArea: { x: 100, y: 31, width: 1501, height: 901 },
    } as const

    const options = createMainWindowOptions([display], display)

    expect(options).toMatchObject({ x: 211, y: 122, width: 1280, height: 720 })
  })

  it('preserves the existing BrowserWindow flags and webPreferences subtree', () => {
    const display = {
      id: 6,
      workArea: { x: 100, y: 31, width: 1501, height: 901 },
    } as const

    const options = createMainWindowOptions([display], display)

    expect(options).toEqual({
      x: 211,
      y: 122,
      width: 1280,
      height: 720,
      fullscreen: false,
      fullscreenable: true,
      resizable: true,
      frame: true,
      transparent: false,
      backgroundColor: '#000000',
      webPreferences: {
        preload: expect.stringMatching(/[\/]preload[\/]index\.js$/),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })
  })

  it('forwards the generated options into the BrowserWindow constructor helper', () => {
    const display = {
      id: 2,
      workArea: { x: 1440, y: 0, width: 1920, height: 1080 },
    } as const
    const BrowserWindowCtor = vi.fn(function BrowserWindowMock(
      this: { options?: unknown },
      options,
    ) {
      this.options = options
    })

    const win = createMainWindow(
      BrowserWindowCtor as never,
      [display],
      display,
    )

    expect(BrowserWindowCtor).toHaveBeenCalledOnce()
    expect(BrowserWindowCtor).toHaveBeenCalledWith(
      createMainWindowOptions([display], display),
    )
    expect(win).toBeInstanceOf(BrowserWindowCtor)
  })
})
