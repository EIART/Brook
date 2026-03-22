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

  it('renders artwork img when artworkUrl is present', () => {
    render(<Capsule track={track} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/art.jpg')
  })

  it('renders placeholder div when artworkUrl is absent', () => {
    const trackNoArt: TrackInfo = { ...track, artworkUrl: undefined }
    const { queryByRole } = render(<Capsule track={trackNoArt} />)
    expect(queryByRole('img')).toBeNull()
  })
})
