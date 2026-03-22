import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ControlBar } from '../../src/renderer/components/ControlBar'
import type { TrackInfo } from '../../src/shared/types'

const track: TrackInfo = {
  title: 'Dust in the Wind',
  artist: 'Kansas',
  album: 'Leftoverture',
  duration: 209,
}

describe('ControlBar', () => {
  it('is invisible (opacity 0) when visible=false', () => {
    const { container } = render(
      <ControlBar visible={false} track={track} position={60} onTheme={() => {}} onTranslation={() => {}} onSettings={() => {}} />
    )
    const overlay = container.firstChild as HTMLElement
    expect(overlay.style.opacity).toBe('0')
    expect(overlay.style.pointerEvents).toBe('none')
  })

  it('is visible (opacity 1) when visible=true', () => {
    const { container } = render(
      <ControlBar visible={true} track={track} position={60} onTheme={() => {}} onTranslation={() => {}} onSettings={() => {}} />
    )
    const overlay = container.firstChild as HTMLElement
    expect(overlay.style.opacity).toBe('1')
  })

  it('shows track title and artist when visible', () => {
    render(<ControlBar visible={true} track={track} position={60} onTheme={() => {}} onTranslation={() => {}} onSettings={() => {}} />)
    expect(screen.getByText('Dust in the Wind')).toBeDefined()
    expect(screen.getByText(/Kansas/)).toBeDefined()
  })

  it('calls onTheme when T button is clicked', () => {
    const onTheme = vi.fn()
    render(<ControlBar visible={true} track={track} position={0} onTheme={onTheme} onTranslation={() => {}} onSettings={() => {}} />)
    fireEvent.click(screen.getByText('T'))
    expect(onTheme).toHaveBeenCalledOnce()
  })

  it('calls onSettings when , button is clicked', () => {
    const onSettings = vi.fn()
    render(<ControlBar visible={true} track={track} position={0} onTheme={() => {}} onTranslation={() => {}} onSettings={onSettings} />)
    fireEvent.click(screen.getByText(','))
    expect(onSettings).toHaveBeenCalledOnce()
  })

  it('shows dash when track is null', () => {
    render(<ControlBar visible={true} track={null} position={0} onTheme={() => {}} onTranslation={() => {}} onSettings={() => {}} />)
    expect(screen.getByText('—')).toBeDefined()
  })
})
