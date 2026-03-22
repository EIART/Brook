import type { ThemeConfig } from '../../shared/types'

export function applyTheme(theme: ThemeConfig): void {
  const root = document.documentElement
  const set = (k: string, v: string): void => root.style.setProperty(k, v)

  // Background
  set('--theme-bg-type', theme.background.type)
  if (theme.background.type === 'solid') {
    set('--theme-bg-color', theme.background.color)
  } else if (theme.background.type === 'gradient') {
    const { colors, angle } = theme.background
    set('--theme-bg-gradient', `linear-gradient(${angle}deg, ${colors.join(', ')})`)
  } else if (theme.background.type === 'album-art') {
    set('--theme-bg-color', theme.background.fallbackColor)
    set('--theme-bg-blur', `${theme.background.blur}px`)
    set('--theme-bg-darken', String(theme.background.darken))
  }

  // Current line
  set('--theme-current-color', theme.currentLine.color)
  set('--theme-current-size', `${theme.currentLine.fontSize}px`)
  set('--theme-current-weight', String(theme.currentLine.fontWeight))
  if (theme.currentLine.glow) {
    const { color, blur, spread } = theme.currentLine.glow
    set('--theme-current-glow', `0 0 ${blur}px ${color}, 0 0 ${spread}px ${color}`)
  } else {
    set('--theme-current-glow', 'none')
  }

  // Context line
  set('--theme-context-color', theme.contextLine.color)
  set('--theme-context-size', `${theme.contextLine.fontSize}px`)
  set('--theme-context-weight', String(theme.contextLine.fontWeight))

  // Translation
  set('--theme-trans-color', theme.translation.color)
  set('--theme-trans-size', `${theme.translation.fontSize}px`)
  set('--theme-trans-weight', String(theme.translation.fontWeight))
  set('--theme-trans-style', theme.translation.fontStyle)

  // Transition
  set('--theme-transition-duration', `${theme.transition.duration}ms`)
  set('--theme-transition-easing', theme.transition.easing)

  // Optional border
  const border = theme.border
  if (!border || border.type === 'none') {
    set('--theme-border-width', '0px')
  } else if (border.type === 'solid') {
    set('--theme-border-width', `${border.width}px`)
    set('--theme-border-color', border.color)
  } else if (border.type === 'rgb-cycle') {
    set('--theme-border-width', `${border.width}px`)
    set('--theme-border-duration', `${border.animationDuration}ms`)
  }
}
