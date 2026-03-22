import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHover } from '../../src/renderer/hooks/useHover'

describe('useHover', () => {
  afterEach(() => vi.useRealTimers())

  it('starts invisible', () => {
    const { result } = renderHook(() => useHover())
    expect(result.current.visible).toBe(false)
  })

  it('does not show immediately on enter', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useHover(2000, 300))
    act(() => result.current.onEnter())
    expect(result.current.visible).toBe(false)
  })

  it('shows after enterDelay ms', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useHover(2000, 300))
    act(() => result.current.onEnter())
    act(() => vi.advanceTimersByTime(300))
    expect(result.current.visible).toBe(true)
  })

  it('cancels enter if mouse leaves before enterDelay', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useHover(2000, 300))
    act(() => result.current.onEnter())
    act(() => vi.advanceTimersByTime(100))
    act(() => result.current.onLeave())
    act(() => vi.advanceTimersByTime(300))
    expect(result.current.visible).toBe(false)
  })

  it('hides after fadeDelay ms when mouse leaves', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useHover(500, 0))
    act(() => result.current.onEnter())
    act(() => vi.advanceTimersByTime(0))
    expect(result.current.visible).toBe(true)
    act(() => result.current.onLeave())
    act(() => vi.advanceTimersByTime(500))
    expect(result.current.visible).toBe(false)
  })
})
