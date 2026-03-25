import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Capsule } from '../../src/renderer/components/Capsule'
import type { TrackInfo } from '../../src/shared/types'

const track: TrackInfo = {
  title: 'Dust in the Wind',
  artist: 'Kansas',
  album: 'Leftoverture',
  duration: 209,
  artworkUrl: 'https://example.com/art.jpg',
}

describe('Capsule', () => {
  it('renders title and artist when track is provided', () => {
    render(<Capsule track={track} />)
    expect(screen.getByText('Dust in the Wind')).toBeDefined()
    expect(screen.getByText('Kansas')).toBeDefined()
  })

  it('renders nothing when track is null', () => {
    const { container } = render(<Capsule track={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('does not render artwork img when artworkUrl is present', () => {
    render(<Capsule track={track} />)
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('still renders text content when artworkUrl is absent', () => {
    const trackNoArt: TrackInfo = { ...track, artworkUrl: undefined }
    render(<Capsule track={trackNoArt} />)
    expect(screen.getByText('Dust in the Wind')).toBeInTheDocument()
    expect(screen.getByText('Kansas')).toBeInTheDocument()
    expect(screen.queryByRole('img')).toBeNull()
  })
})
