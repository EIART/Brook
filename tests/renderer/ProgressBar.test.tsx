import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ProgressBar } from '../../src/renderer/components/ProgressBar'

describe('ProgressBar', () => {
  it('sets fill width to 0 when duration is 0', () => {
    const { container } = render(<ProgressBar position={0} duration={0} />)
    const fill = container.querySelector('div > div > div') as HTMLElement
    expect(fill.style.width).toBe('0%')
  })

  it('sets fill width proportional to position/duration', () => {
    const { container } = render(<ProgressBar position={60} duration={200} />)
    const fill = container.querySelector('div > div > div') as HTMLElement
    expect(fill.style.width).toBe('30%')
  })

  it('caps fill width at 100%', () => {
    const { container } = render(<ProgressBar position={999} duration={100} />)
    const fill = container.querySelector('div > div > div') as HTMLElement
    expect(fill.style.width).toBe('100%')
  })
})
