import { useState, useRef, useCallback } from 'react'

export function useHover(fadeDelay = 2000) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onEnter = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(true)
  }, [])

  const onLeave = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(false), fadeDelay)
  }, [fadeDelay])

  return { visible, onEnter, onLeave }
}
