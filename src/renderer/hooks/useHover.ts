import { useState, useRef, useCallback, useEffect } from 'react'

export function useHover(fadeDelay = 2000, enterDelay = 300) {
  const [visible, setVisible] = useState(false)
  const fadeTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current)  clearTimeout(fadeTimerRef.current)
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current)
    }
  }, [])

  const onEnter = useCallback(() => {
    if (fadeTimerRef.current)  clearTimeout(fadeTimerRef.current)
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current)
    enterTimerRef.current = setTimeout(() => setVisible(true), enterDelay)
  }, [enterDelay])

  const onLeave = useCallback(() => {
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current)
    if (fadeTimerRef.current)  clearTimeout(fadeTimerRef.current)
    fadeTimerRef.current = setTimeout(() => setVisible(false), fadeDelay)
  }, [fadeDelay])

  return { visible, onEnter, onLeave }
}
