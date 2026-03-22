import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { fireEvent } from '@testing-library/dom'
import { useKeyboard } from '../../src/renderer/hooks/useKeyboard'

describe('useKeyboard', () => {
  it('calls onTheme when T is pressed', () => {
    const handlers = { onTheme: vi.fn(), onTranslation: vi.fn(), onSettings: vi.fn() }
    renderHook(() => useKeyboard(handlers))
    fireEvent.keyDown(document, { key: 't' })
    expect(handlers.onTheme).toHaveBeenCalledOnce()
  })

  it('calls onTranslation when L is pressed', () => {
    const handlers = { onTheme: vi.fn(), onTranslation: vi.fn(), onSettings: vi.fn() }
    renderHook(() => useKeyboard(handlers))
    fireEvent.keyDown(document, { key: 'l' })
    expect(handlers.onTranslation).toHaveBeenCalledOnce()
  })

  it('calls onSettings when comma is pressed', () => {
    const handlers = { onTheme: vi.fn(), onTranslation: vi.fn(), onSettings: vi.fn() }
    renderHook(() => useKeyboard(handlers))
    fireEvent.keyDown(document, { key: ',' })
    expect(handlers.onSettings).toHaveBeenCalledOnce()
  })

  it('does not fire when an input is focused', () => {
    const handlers = { onTheme: vi.fn(), onTranslation: vi.fn(), onSettings: vi.fn() }
    renderHook(() => useKeyboard(handlers))
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    fireEvent.keyDown(input, { key: 't' })
    expect(handlers.onTheme).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })
})
