import { describe, it, expect, beforeEach } from 'vitest'
import { applyTheme } from '../../src/renderer/theme/apply-theme'
import type { ThemeConfig } from '../../src/shared/types'

const neonTheme: ThemeConfig = {
  name: '霓虹', version: '1.0',
  background: { type: 'solid', color: '#050505' },
  currentLine: { color: '#00ff88', fontSize: 28, fontWeight: 700, glow: { color: '#00ff88', blur: 20, spread: 5 } },
  contextLine: { color: '#00ff8855', fontSize: 14, fontWeight: 400 },
  translation: { color: '#00ff8877', fontSize: 13, fontWeight: 400, fontStyle: 'italic' },
  transition: { duration: 400, easing: 'ease-in-out' },
  thumbnail: '#050505,#00ff88',
}

describe('applyTheme', () => {
  beforeEach(() => { document.documentElement.removeAttribute('style') })

  it('sets background color CSS variable for solid type', () => {
    applyTheme(neonTheme)
    const style = document.documentElement.style
    expect(style.getPropertyValue('--theme-bg-color')).toBe('#050505')
    expect(style.getPropertyValue('--theme-bg-type')).toBe('solid')
  })

  it('sets current line color and font variables', () => {
    applyTheme(neonTheme)
    const style = document.documentElement.style
    expect(style.getPropertyValue('--theme-current-color')).toBe('#00ff88')
    expect(style.getPropertyValue('--theme-current-size')).toBe('28px')
    expect(style.getPropertyValue('--theme-current-weight')).toBe('700')
  })

  it('sets transition duration and easing', () => {
    applyTheme(neonTheme)
    const style = document.documentElement.style
    expect(style.getPropertyValue('--theme-transition-duration')).toBe('400ms')
    expect(style.getPropertyValue('--theme-transition-easing')).toBe('ease-in-out')
  })

  it('sets glow text-shadow variable when glow is defined', () => {
    applyTheme(neonTheme)
    const style = document.documentElement.style
    const glow = style.getPropertyValue('--theme-current-glow')
    expect(glow).toContain('#00ff88')
  })
})
