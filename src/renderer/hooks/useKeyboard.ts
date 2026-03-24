import { useEffect } from 'react'

interface Handlers {
  onTheme:       () => void
  onTranslation: () => void
  onSettings:    () => void
  onCandidates:  () => void
}

export function useKeyboard(handlers: Handlers): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return

      switch (e.key.toLowerCase()) {
        case 't': handlers.onTheme();       break
        case 'l': handlers.onTranslation(); break
        case ',': handlers.onSettings();    break
        case 's': handlers.onCandidates();  break
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handlers])
}
