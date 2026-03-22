import { useState, useEffect, useRef, useCallback } from 'react'
import { LyricsDisplay } from '../components/LyricsDisplay'
import { ControlBar } from '../components/ControlBar'
import { Capsule } from '../components/Capsule'
import { ProgressBar } from '../components/ProgressBar'
import { ThemePicker } from '../components/ThemePicker'
import { SettingsPage } from '../components/SettingsPage'
import { applyTheme } from '../theme/apply-theme'
import { useHover } from '../hooks/useHover'
import { useKeyboard } from '../hooks/useKeyboard'
import type { LyricsLine, TrackInfo, ThemeMeta, ThemeConfig, AppConfig, PlaybackStatus } from '../../shared/types'

const api = (window as any).api

export default function App() {
  const [lines, setLines]                     = useState<LyricsLine[]>([])
  const [currentIndex, setCurrentIndex]       = useState(0)
  const [_hasTranslation, setHasTranslation]  = useState(false)
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
