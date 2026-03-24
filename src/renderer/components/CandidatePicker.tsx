import type { LyricsCandidate } from '../../shared/types'

interface Props {
  visible: boolean
  candidates: LyricsCandidate[]
  activeId: string | null
  onSelect: (id: string) => void
  onClose: () => void
}

const PROVIDER_COLORS: Record<string, string> = {
  netease: '#e74c3c',
  kugou:   '#3498db',
  qq:      '#27ae60',
}

const PROVIDER_LABELS: Record<string, string> = {
  netease: '网易云',
  kugou:   '酷狗',
  qq:      'QQ音乐',
}

export function CandidatePicker({ visible, candidates, activeId, onSelect, onClose }: Props) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease',
        background: 'rgba(8,8,20,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '20px 24px 28px',
        maxHeight: '60vh',
        overflowY: 'auto',
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <span className="text-white/40 text-xs uppercase tracking-widest">歌词来源</span>
        <button onClick={onClose} className="text-white/40 hover:text-white text-lg leading-none">×</button>
      </div>

      {candidates.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-4">暂无候选歌词</p>
      ) : (
        <div className="flex flex-col gap-2">
          {candidates.map(candidate => {
            const isActive = candidate.id === activeId
            const color = PROVIDER_COLORS[candidate.provider] ?? '#888'
            const label = PROVIDER_LABELS[candidate.provider] ?? candidate.provider
            return (
              <button
                key={candidate.id}
                onClick={() => onSelect(candidate.id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                  border: isActive ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span
                  className="text-xs font-medium px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: color + '33', color }}
                >
                  {label}
                </span>
                <span className="text-white/80 text-sm truncate">{candidate.title}</span>
                <span className="text-white/30 text-xs truncate shrink-0">{candidate.artist}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
