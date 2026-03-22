import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { LyricsDisplay } from '../../src/renderer/components/LyricsDisplay'
import type { LyricsLine } from '../../src/shared/types'

const lines: LyricsLine[] = [
  { time: 0, text: 'Line one' },
  { time: 4, text: 'Line two' },
  { time: 8, text: 'Line three' },
  { time: 12, text: 'Line four' },
]

describe('LyricsDisplay', () => {
  it('renders current, prev, and next lines', () => {
    render(<LyricsDisplay lines={lines} currentIndex={1} showTranslation={false} isPaused={false} />)
    expect(screen.getByTestId('line-current')).toHaveTextContent('Line two')
    expect(screen.getByTestId('line-prev')).toHaveTextContent('Line one')
    expect(screen.getByTestId('line-next')).toHaveTextContent('Line three')
  })

  it('renders empty prev slot at first line', () => {
    render(<LyricsDisplay lines={lines} currentIndex={0} showTranslation={false} isPaused={false} />)
    expect(screen.getByTestId('line-prev')).toBeEmptyDOMElement()
    expect(screen.getByTestId('line-current')).toHaveTextContent('Line one')
  })

  it('renders empty next slot at last line', () => {
    render(<LyricsDisplay lines={lines} currentIndex={3} showTranslation={false} isPaused={false} />)
    expect(screen.getByTestId('line-next')).toBeEmptyDOMElement()
  })

  it('shows translation when available and enabled', () => {
    const withTrans: LyricsLine[] = [
      { time: 0, text: 'Hello', translation: '你好' },
    ]
    render(<LyricsDisplay lines={withTrans} currentIndex={0} showTranslation={true} isPaused={false} />)
    expect(screen.getByTestId('line-translation')).toHaveTextContent('你好')
  })

  it('does not show translation when disabled', () => {
    const withTrans: LyricsLine[] = [{ time: 0, text: 'Hello', translation: '你好' }]
    render(<LyricsDisplay lines={withTrans} currentIndex={0} showTranslation={false} isPaused={false} />)
    expect(screen.queryByTestId('line-translation')).toBeNull()
  })

  it('shows not-found message when lines is empty', () => {
    render(<LyricsDisplay lines={[]} currentIndex={-1} showTranslation={false} isPaused={false} notFoundTrack={{ title: 'Song', artist: 'Artist', album: '', duration: 0 }} />)
    expect(screen.getByText('未找到歌词')).toBeDefined()
  })
})
