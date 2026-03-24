# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将歌词 App 的 UI 全面重做为 Apple 风格桌面摆件——大字、极简沉浸、毛玻璃 HUD、全屏悬停叠层。

**Architecture:** 新增 `Capsule`（顶部 HUD）、`ProgressBar`（底部进度条）两个组件；重写 `LyricsDisplay`（新字型 + 入场动画）和 `ControlBar`（悬停全屏叠层）；修改 `useHover`（300ms 进入延迟）；最小化改动 `App.tsx`（新增两个 state、渲染新组件）。

**Tech Stack:** React 18 + TypeScript, Tailwind CSS v4, Vitest + @testing-library/react, Electron/IPC (不涉及)

---

## File Map

| 文件 | 操作 |
|------|------|
| `src/renderer/hooks/useHover.ts` | 修改：加 `enterDelay` 参数 |
| `src/renderer/src/index.css` | 修改：加 `@keyframes lyric-enter` 和 `.lyric-current-enter` 类 |
| `src/renderer/components/LyricsDisplay.tsx` | 重写：新字型 + 入场动画 |
| `src/renderer/components/Capsule.tsx` | 新建：顶部毛玻璃胶囊 |
| `src/renderer/components/ProgressBar.tsx` | 新建：底部常驻进度条 |
| `src/renderer/components/ControlBar.tsx` | 重写：全屏悬停叠层 |
| `src/renderer/src/App.tsx` | 修改：新增 state + 渲染新组件 |
| `tests/renderer/LyricsDisplay.test.tsx` | 不动（新实现行为与旧实现一致，测试自动通过） |
| `tests/renderer/Capsule.test.tsx` | 新建 |
| `tests/renderer/ProgressBar.test.tsx` | 新建 |
| `tests/renderer/ControlBar.test.tsx` | 新建 |
| `tests/renderer/useHover.test.ts` | 新建：测试 enterDelay |

---

## Task 1: useHover — 加 300ms 进入延迟

**Files:**
- Modify: `src/renderer/hooks/useHover.ts`
- Create: `tests/renderer/useHover.test.ts`

**背景：** 当前 `onEnter` 立即触发，鼠标无意划过窗口会意外弹出叠层。需要在鼠标停留 300ms 后才显示，鼠标提前离开则取消。

- [ ] **Step 1: 写测试（先跑 fail）**

创建 `tests/renderer/useHover.test.ts`：

```typescript
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
```

- [ ] **Step 2: 跑测试确认 fail**

```bash
cd /Users/liuzhengyanshuo/workspace/lyrics-app
npx vitest run tests/renderer/useHover.test.ts
```

Expected: FAIL（文件不存在或 enterDelay 参数不存在）

- [ ] **Step 3: 重写 `useHover.ts`**

```typescript
import { useState, useRef, useCallback } from 'react'

export function useHover(fadeDelay = 2000, enterDelay = 300) {
  const [visible, setVisible] = useState(false)
  const fadeTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onEnter = useCallback(() => {
    if (fadeTimerRef.current)  clearTimeout(fadeTimerRef.current)
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current)
    enterTimerRef.current = setTimeout(() => setVisible(true), enterDelay)
  }, [enterDelay])

  const onLeave = useCallback(() => {
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current)
    fadeTimerRef.current = setTimeout(() => setVisible(false), fadeDelay)
  }, [fadeDelay])

  return { visible, onEnter, onLeave }
}
```

- [ ] **Step 4: 跑测试确认 pass**

```bash
npx vitest run tests/renderer/useHover.test.ts
```

Expected: 5/5 PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/hooks/useHover.ts tests/renderer/useHover.test.ts
git commit -m "feat: add enterDelay to useHover (300ms default)"
```

---

## Task 2: index.css — 加入场动画 keyframe

**Files:**
- Modify: `src/renderer/src/index.css`

**背景：** `LyricsDisplay` 的当前行入场动画（translateY + fade in）需要一个 CSS keyframe 和对应的工具类。

> **关于进度条高度**：3px 高度直接硬编码在 Task 5 的 `ProgressBar.tsx` 组件中，index.css 里无需额外变量。

> **关于背景渐变**：规格文档中的渐变背景（`radial-gradient` 紫蓝色）是 mockup 对 `album-color` 主题的静态表示。实际运行时 `album-color` 主题通过 `album-art` type 动态提取专辑封面颜色，由 App.tsx 现有逻辑处理，本次计划不变更。

- [ ] **Step 1: 更新 `index.css`**

在 `@keyframes rgb-border` 之后添加新 keyframe，并更新 `:root` 变量：

```css
@import "tailwindcss";

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { width: 100%; height: 100%; overflow: hidden; background: #000; }

@keyframes rgb-border {
  0%   { border-color: #ff0080; }
  17%  { border-color: #ff8c00; }
  33%  { border-color: #ffe600; }
  50%  { border-color: #00ff88; }
  67%  { border-color: #00cfff; }
  83%  { border-color: #a855f7; }
  100% { border-color: #ff0080; }
}

@keyframes lyric-enter {
  from { transform: translateY(14px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.lyric-current-enter {
  animation: lyric-enter 380ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

:root {
  --theme-bg-type: solid;
  --theme-bg-color: #000000;
  --theme-current-color: #ffffff;
  --theme-current-size: 28px;
  --theme-current-weight: 600;
  --theme-current-glow: none;
  --theme-context-color: rgba(255,255,255,0.4);
  --theme-context-size: 14px;
  --theme-context-weight: 400;
  --theme-trans-color: rgba(255,255,255,0.5);
  --theme-trans-size: 13px;
  --theme-trans-weight: 400;
  --theme-trans-style: italic;
  --theme-transition-duration: 400ms;
  --theme-transition-easing: ease-in-out;
  --theme-border-width: 0px;
}
```

- [ ] **Step 2: 确认 typecheck 通过**

```bash
npx tsc -p tsconfig.web.json --noEmit --composite false
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/index.css
git commit -m "feat: add lyric-enter keyframe animation to index.css"
```

---

## Task 3: LyricsDisplay — 新字型 + 入场动画

**Files:**
- Modify: `src/renderer/components/LyricsDisplay.tsx`
- Modify: `tests/renderer/LyricsDisplay.test.tsx`

**背景：** 重写为 4 行（prev/cur/trans/next）新字型；当前行用 `key={currentIndex}` 触发 CSS 入场动画；译文加斜体、降低亮度；下一行加模糊；所有行使用 inline transition。

- [ ] **Step 1: 跑基线测试**

先确认现有测试全过，为后续改动建立基线：

```bash
npx vitest run tests/renderer/LyricsDisplay.test.tsx
```

Expected: 5/5 PASS

> **关于测试文件修改**：新实现用 `{prev?.text ?? null}`（渲染 `null`，即真正空节点），与旧实现 `{prev ? prev.text : null}` 行为一致，**`toBeEmptyDOMElement()` 断言仍然成立**，测试文件无需修改。File Map 中"修改"标注有误，实际不动。

- [ ] **Step 2: 重写 `LyricsDisplay.tsx`**

```tsx
import type { LyricsLine, TrackInfo } from '../../shared/types'

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'
const DUR  = '380ms'
const transition = `opacity ${DUR} ${EASE}, font-size ${DUR} ${EASE}, filter ${DUR} ${EASE}`

interface Props {
  lines: LyricsLine[]
  currentIndex: number
  showTranslation: boolean
  isPaused: boolean
  notFoundTrack?: TrackInfo | null
}

export function LyricsDisplay({
  lines,
  currentIndex,
  showTranslation,
  isPaused,
  notFoundTrack,
}: Props): JSX.Element {
  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p
          data-testid="line-current"
          style={{
            fontSize: 'clamp(34px, 5.2vw, 60px)',
            fontWeight: 600,
            color: '#fff',
            textAlign: 'center',
            opacity: isPaused ? 0.5 : 1,
          }}
        >
          {notFoundTrack ? `${notFoundTrack.title} — ${notFoundTrack.artist}` : null}
        </p>
        {notFoundTrack && (
          <p style={{ fontSize: 'clamp(15px, 2.2vw, 24px)', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
            未找到歌词
          </p>
        )}
      </div>
    )
  }

  const prev        = lines[currentIndex - 1] ?? null
  const current     = lines[currentIndex]     ?? null
  const next        = lines[currentIndex + 1] ?? null
  const translation = (showTranslation && current?.translation) ? current.translation : null

  return (
    <div
      className="flex flex-col items-center justify-center h-full"
      style={{
        gap: 8,
        padding: '70px 60px 50px',
        opacity: isPaused ? 0.6 : 1,
        transition: 'opacity 0.3s',
      }}
    >
      {/* 上一行 */}
      <p
        data-testid="line-prev"
        className="text-center w-full"
        style={{
          fontSize: 'clamp(16px, 2.4vw, 26px)',
          fontWeight: 300,
          color: 'rgba(255,255,255,0.28)',
          transition,
        }}
      >
        {prev?.text ?? null}
      </p>

      {/* 当前行 — key 强制 remount，触发 CSS 入场动画 */}
      <p
        key={currentIndex}
        data-testid="line-current"
        className="text-center w-full lyric-current-enter"
        style={{
          fontSize: 'clamp(34px, 5.2vw, 60px)',
          fontWeight: 600,
          color: '#fff',
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          textShadow: '0 0 40px rgba(255,255,255,0.25)',
          padding: '8px 0',
        }}
      >
        {current?.text ?? null}
      </p>

      {/* 译文（条件渲染） */}
      {translation !== null && (
        <p
          data-testid="line-translation"
          className="text-center w-full"
          style={{
            fontSize: 'clamp(15px, 2.2vw, 24px)',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.35)',
            fontStyle: 'italic',
            transition,
          }}
        >
          {translation}
        </p>
      )}

      {/* 下一行 */}
      <p
        data-testid="line-next"
        className="text-center w-full"
        style={{
          fontSize: 'clamp(16px, 2.4vw, 26px)',
          fontWeight: 300,
          color: 'rgba(255,255,255,0.18)',
          filter: 'blur(0.5px)',
          transition,
        }}
      >
        {next?.text ?? null}
      </p>
    </div>
  )
}
```

> 注意：移除了 `container` 参数（新设计不使用 ThemeContainer 包裹盒）。

- [ ] **Step 3: 跑测试，确认全部 pass**

```bash
npx vitest run tests/renderer/LyricsDisplay.test.tsx
```

Expected: 5/5 PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/LyricsDisplay.tsx
git commit -m "feat: rewrite LyricsDisplay with new typography and entry animation"
```

---

## Task 4: Capsule — 顶部毛玻璃 HUD

**Files:**
- Create: `src/renderer/components/Capsule.tsx`
- Create: `tests/renderer/Capsule.test.tsx`

**背景：** 常驻顶部，显示专辑封面缩略图 + 歌名 + 分隔点 + 歌手名。track 为 null 时不渲染。

- [ ] **Step 1: 写测试**

创建 `tests/renderer/Capsule.test.tsx`：

```tsx
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
```

- [ ] **Step 2: 跑测试确认 fail**

```bash
npx vitest run tests/renderer/Capsule.test.tsx
```

Expected: FAIL（文件不存在）

- [ ] **Step 3: 创建 `Capsule.tsx`**

```tsx
import type { TrackInfo } from '../../shared/types'

interface Props {
  track: TrackInfo | null
}

export function Capsule({ track }: Props): JSX.Element | null {
  if (!track) return null

  return (
    <div
      className="absolute flex items-center"
      style={{
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        gap: 10,
        background: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 100,
        padding: '7px 16px 7px 10px',
        whiteSpace: 'nowrap',
      }}
    >
      {/* 专辑封面 */}
      {track.artworkUrl ? (
        <img
          src={track.artworkUrl}
          alt=""
          style={{ width: 22, height: 22, borderRadius: 5, flexShrink: 0, objectFit: 'cover' }}
        />
      ) : (
        <div style={{ width: 22, height: 22, borderRadius: 5, flexShrink: 0, background: 'rgba(255,255,255,0.15)' }} />
      )}

      {/* 歌名 */}
      <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.01em' }}>
        {track.title}
      </span>

      {/* 分隔点 */}
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />

      {/* 歌手名 */}
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
        {track.artist}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: 跑测试确认 pass**

```bash
npx vitest run tests/renderer/Capsule.test.tsx
```

Expected: 4/4 PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/Capsule.tsx tests/renderer/Capsule.test.tsx
git commit -m "feat: add Capsule component (top frosted-glass HUD)"
```

---

## Task 5: ProgressBar — 底部常驻进度条

**Files:**
- Create: `src/renderer/components/ProgressBar.tsx`
- Create: `tests/renderer/ProgressBar.test.tsx`

**背景：** 常驻底部，3px 高，显示播放进度。

- [ ] **Step 1: 写测试**

创建 `tests/renderer/ProgressBar.test.tsx`：

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ProgressBar } from '../../src/renderer/components/ProgressBar'

describe('ProgressBar', () => {
  it('sets fill width to 0 when duration is 0', () => {
    const { container } = render(<ProgressBar position={0} duration={0} />)
    const fill = container.querySelector('div > div') as HTMLElement
    expect(fill.style.width).toBe('0%')
  })

  it('sets fill width proportional to position/duration', () => {
    const { container } = render(<ProgressBar position={60} duration={200} />)
    const fill = container.querySelector('div > div') as HTMLElement
    expect(fill.style.width).toBe('30%')
  })

  it('caps fill width at 100%', () => {
    const { container } = render(<ProgressBar position={999} duration={100} />)
    const fill = container.querySelector('div > div') as HTMLElement
    expect(fill.style.width).toBe('100%')
  })
})
```

- [ ] **Step 2: 跑测试确认 fail**

```bash
npx vitest run tests/renderer/ProgressBar.test.tsx
```

Expected: FAIL（文件不存在）

- [ ] **Step 3: 创建 `ProgressBar.tsx`**

```tsx
interface Props {
  position: number  // 当前播放位置（秒）
  duration: number  // 总时长（秒）
}

export function ProgressBar({ position, duration }: Props): JSX.Element {
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0

  return (
    <div
      className="absolute bottom-0 left-0 right-0"
      style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.06)' }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          backgroundColor: 'rgba(255,255,255,0.28)',
          borderRadius: 1,
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: 跑测试确认 pass**

```bash
npx vitest run tests/renderer/ProgressBar.test.tsx
```

Expected: 3/3 PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/ProgressBar.tsx tests/renderer/ProgressBar.test.tsx
git commit -m "feat: add ProgressBar component (3px bottom progress)"
```

---

## Task 6: ControlBar — 重写为全屏悬停叠层

**Files:**
- Modify: `src/renderer/components/ControlBar.tsx`
- Create: `tests/renderer/ControlBar.test.tsx`

**背景：** 旧 ControlBar 是底部控制条 + 按钮。新版是全屏半透明叠层，显示曲目信息、进度、快捷键徽章。`visible` 由 `useHover` 控制（已有 300ms 延迟）。

新 Props 接口：
```ts
{
  visible: boolean
  track: TrackInfo | null
  position: number
  onTheme: () => void
  onTranslation: () => void
  onSettings: () => void
}
```

> 移除了旧接口的 `hasTranslation` 和 `translationEnabled`，新叠层没有 toggle 按钮。

- [ ] **Step 1: 写测试**

创建 `tests/renderer/ControlBar.test.tsx`：

```tsx
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
```

- [ ] **Step 2: 跑测试确认 fail**

```bash
npx vitest run tests/renderer/ControlBar.test.tsx
```

Expected: FAIL（接口不匹配）

- [ ] **Step 3: 重写 `ControlBar.tsx`**

```tsx
import type { TrackInfo } from '../../shared/types'

interface Props {
  visible: boolean
  track: TrackInfo | null
  position: number
  onTheme: () => void
  onTranslation: () => void
  onSettings: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function ControlBar({ visible, track, position, onTheme, onTranslation, onSettings }: Props): JSX.Element {
  const duration = track?.duration ?? 0
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0

  const shortcuts = [
    { key: 'T', label: '主题',  action: onTheme },
    { key: 'L', label: '译文',  action: onTranslation },
    { key: ',', label: '设置',  action: onSettings },
  ]

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{
        gap: 16,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 200ms ease-out',
      }}
    >
      {/* 区块 1：曲目信息 */}
      <div className="flex items-center" style={{ gap: 10 }}>
        {track?.artworkUrl ? (
          <img
            src={track.artworkUrl}
            alt=""
            style={{ width: 36, height: 36, borderRadius: 7, flexShrink: 0, objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: 7, flexShrink: 0, background: 'rgba(255,255,255,0.1)' }} />
        )}
        <div className="flex flex-col" style={{ gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
            {track?.title ?? '—'}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            {track ? `${track.artist} · ${track.album}` : ''}
          </span>
        </div>
      </div>

      {/* 区块 2：进度条 */}
      <div className="flex items-center" style={{ gap: 8 }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{formatTime(position)}</span>
        <div style={{ width: 120, height: 2, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 1, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 1 }} />
        </div>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{formatTime(duration)}</span>
      </div>

      {/* 区块 3：快捷键徽章 */}
      <div className="flex" style={{ gap: 24 }}>
        {shortcuts.map(({ key, label, action }) => (
          <button
            key={key}
            onClick={action}
            className="flex flex-col items-center"
            style={{ gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div
              style={{
                width: 28, height: 28,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.8)',
              }}
            >
              {key}
            </div>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 跑测试确认 pass**

```bash
npx vitest run tests/renderer/ControlBar.test.tsx
```

Expected: 6/6 PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/ControlBar.tsx tests/renderer/ControlBar.test.tsx
git commit -m "feat: rewrite ControlBar as full-screen hover overlay"
```

---

## Task 7: App.tsx — 接入新组件

**Files:**
- Modify: `src/renderer/src/App.tsx`

**背景：** 新增 `currentTrack` 和 `currentPosition` state；引入 `Capsule` 和 `ProgressBar` 并渲染；更新 `ControlBar` 的 props（新接口）；同步 `playback:update` handler。

这是集成任务，没有独立测试（组件已各自测过）。完成后需运行全量测试确认。

- [ ] **Step 1: 更新 `App.tsx`**

完整替换（只列出变更点——完整文件见下方）：

```tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { LyricsDisplay } from '../components/LyricsDisplay'
import { ControlBar } from '../components/ControlBar'
import { ThemePicker } from '../components/ThemePicker'
import { SettingsPage } from '../components/SettingsPage'
import { Capsule } from '../components/Capsule'
import { ProgressBar } from '../components/ProgressBar'
import { applyTheme } from '../theme/apply-theme'
import { useHover } from '../hooks/useHover'
import { useKeyboard } from '../hooks/useKeyboard'
import type { LyricsLine, TrackInfo, ThemeMeta, ThemeConfig, AppConfig, PlaybackStatus } from '../../shared/types'

const api = (window as any).api

export default function App() {
  const [lines, setLines]                     = useState<LyricsLine[]>([])
  const [currentIndex, setCurrentIndex]       = useState(0)
  const [hasTranslation, setHasTranslation]   = useState(false)
  const [notFoundTrack, setNotFoundTrack]     = useState<TrackInfo | null>(null)
  const [isPaused, setIsPaused]               = useState(false)
  const [artworkUrl, setArtworkUrl]           = useState<string | undefined>()
  const [currentTrack, setCurrentTrack]       = useState<TrackInfo | null>(null)
  const [currentPosition, setCurrentPosition] = useState(0)
  const [themes, setThemes]                   = useState<ThemeMeta[]>([])
  const [activeThemeId, setActiveThemeId]     = useState('album-color')
  const [activeTheme, setActiveTheme]         = useState<ThemeConfig | null>(null)
  const [translationEnabled, setTranslationEnabled] = useState(false)
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen]       = useState(false)

  const linesRef = useRef(lines)
  linesRef.current = lines

  const { visible: controlsVisible, onEnter, onLeave } = useHover(2000, 300)

  // Load initial config
  useEffect(() => {
    api.invoke('config:get').then(({ result }: { result: AppConfig }) => {
      setActiveThemeId(result.activeTheme)
      setTranslationEnabled(result.translationEnabled)
    })
    api.invoke('theme:get-all').then(({ result }: { result: ThemeMeta[] }) => {
      setThemes(result)
    })
  }, [])

  // Subscribe to IPC events
  useEffect(() => {
    const unsubs = [
      api.on('lyrics:loaded', ({ lines: newLines, hasTranslation: ht }: any) => {
        setLines(newLines)
        setHasTranslation(ht)
        setCurrentIndex(0)
        setNotFoundTrack(null)
      }),
      api.on('lyrics:not-found', ({ track }: any) => {
        setLines([])
        setNotFoundTrack(track)
      }),
      api.on('playback:update', (status: PlaybackStatus) => {
        setIsPaused(status.state !== 'playing')
        if (status.track) {
          setCurrentTrack(status.track)
          if (status.track.artworkUrl) setArtworkUrl(status.track.artworkUrl)
        }
        setCurrentPosition(status.position)
        const idx = findCurrentIndex(linesRef.current, status.position)
        setCurrentIndex(idx)
      }),
      api.on('theme:changed', ({ theme }: { theme: ThemeConfig }) => {
        applyTheme(theme)
        setActiveTheme(theme)
      }),
      api.on('theme:list', ({ themes: t }: { themes: ThemeMeta[] }) => {
        setThemes(t)
      }),
    ]
    return () => unsubs.forEach((u: () => void) => u())
  }, [])

  const handleThemeSelect = useCallback(async (id: string) => {
    await api.invoke('theme:activate', { id })
    setActiveThemeId(id)
    const updated = await api.invoke('theme:get-all')
    setThemes(updated.result)
  }, [])

  const handleImport = useCallback(async () => {
    await api.invoke('theme:import')
    const updated = await api.invoke('theme:get-all')
    setThemes(updated.result)
  }, [])

  const handleExport  = useCallback((id: string) => api.invoke('theme:export', { id }), [])
  const handleDelete  = useCallback(async (id: string) => {
    await api.invoke('theme:delete', { id })
    const updated = await api.invoke('theme:get-all')
    setThemes(updated.result)
  }, [])
  const handleRename  = useCallback(async (id: string, name: string) => {
    await api.invoke('theme:rename', { id, name })
    const updated = await api.invoke('theme:get-all')
    setThemes(updated.result)
  }, [])

  const toggleTranslation = useCallback(() => {
    setTranslationEnabled(prev => {
      const next = !prev
      api.invoke('config:set', { patch: { translationEnabled: next } })
      return next
    })
  }, [])

  useKeyboard({
    onTheme:       () => setThemePickerOpen(prev => !prev),
    onTranslation: toggleTranslation,
    onSettings:    () => setSettingsOpen(prev => !prev),
  })

  // Album art background
  const bgStyle: React.CSSProperties = activeTheme?.background.type === 'album-art' && artworkUrl
    ? {
        backgroundImage: `url(${artworkUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: `blur(${activeTheme.background.blur}px) brightness(${1 - activeTheme.background.darken})`,
      }
    : {}

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none"
      style={{ backgroundColor: 'var(--theme-bg-color, #000)' }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Album art background layer */}
      {activeTheme?.background.type === 'album-art' && (
        <div className="absolute inset-0 scale-110" style={bgStyle} />
      )}

      {/* RGB border */}
      {activeTheme?.border && activeTheme.border.type !== 'none' && (
        <div className="absolute inset-0 pointer-events-none" style={{
          boxShadow: activeTheme.border.type === 'solid'
            ? `inset 0 0 0 ${activeTheme.border.width}px ${activeTheme.border.color}`
            : undefined,
          border: activeTheme.border.type === 'rgb-cycle'
            ? `${activeTheme.border.width}px solid transparent`
            : undefined,
          animation: activeTheme.border.type === 'rgb-cycle'
            ? `rgb-border ${activeTheme.border.animationDuration}ms linear infinite`
            : undefined,
        }} />
      )}

      {/* CRT scanlines effect */}
      {activeTheme?.effect?.type === 'crt-scanlines' && (
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent ${activeTheme.effect.lineHeight - 1}px, rgba(0,0,0,${activeTheme.effect.opacity}) ${activeTheme.effect.lineHeight}px)`,
        }} />
      )}

      {/* Lyrics */}
      <LyricsDisplay
        lines={lines}
        currentIndex={currentIndex}
        showTranslation={translationEnabled}
        isPaused={isPaused}
        notFoundTrack={notFoundTrack}
      />

      {/* Top capsule HUD */}
      <Capsule track={currentTrack} />

      {/* Bottom progress bar */}
      <ProgressBar position={currentPosition} duration={currentTrack?.duration ?? 0} />

      {/* Hover overlay */}
      <ControlBar
        visible={controlsVisible}
        track={currentTrack}
        position={currentPosition}
        onTheme={() => setThemePickerOpen(prev => !prev)}
        onTranslation={toggleTranslation}
        onSettings={() => setSettingsOpen(prev => !prev)}
      />

      {/* Theme picker */}
      <ThemePicker
        visible={themePickerOpen}
        themes={themes}
        activeThemeId={activeThemeId}
        onSelect={handleThemeSelect}
        onImport={handleImport}
        onClose={() => setThemePickerOpen(false)}
      />

      {/* Settings page */}
      <SettingsPage
        visible={settingsOpen}
        themes={themes}
        onClose={() => setSettingsOpen(false)}
        onImport={handleImport}
        onExport={handleExport}
        onDelete={handleDelete}
        onRename={handleRename}
      />
    </div>
  )
}

function findCurrentIndex(lines: LyricsLine[], position: number): number {
  if (lines.length === 0) return 0
  let lo = 0, hi = lines.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (lines[mid].time <= position) lo = mid + 1
    else hi = mid - 1
  }
  return Math.max(0, lo - 1)
}
```

- [ ] **Step 2: 运行全量测试**

```bash
npx vitest run
```

Expected: 全部 pass（新增测试 + 原有测试）

- [ ] **Step 3: TypeScript 检查**

```bash
npx tsc -p tsconfig.web.json --noEmit --composite false
```

Expected: 0 errors

- [ ] **Step 4: 构建验证**

```bash
npm run build
```

Expected: build 成功，无 error

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat: wire Capsule, ProgressBar, and new ControlBar into App"
```

---

## 完成检查

运行完所有任务后确认：

- [ ] `npx vitest run` — 全部 pass
- [ ] `npx tsc -p tsconfig.web.json --noEmit --composite false` — 0 errors
- [ ] `npm run build` — 构建成功
- [ ] 打开 App，验证：顶部胶囊可见、歌词大字清晰、底部 3px 进度条存在、悬停 300ms 后叠层出现、离开后叠层消失
