import type { Tone } from "@/lib/labels"

interface StatTileProps {
  label: string
  value: number
  tone: Tone
  active?: boolean
  loading?: boolean
  onClick?: () => void
}

// Tone → dot color, reusing the badge foreground custom property.
export function StatTile({ label, value, tone, active, loading, onClick }: StatTileProps) {
  const dot = <span className="dot" style={{ background: `var(--${tone}-fg)` }} aria-hidden />

  if (loading) {
    return (
      <div className="stat">
        <div className="stat-label">{dot} {label}</div>
        <div className="stat-value skeleton" style={{ height: "1.75rem", width: "2.5ch" }} aria-hidden>
          &nbsp;
        </div>
      </div>
    )
  }

  const content = (
    <>
      <div className="stat-label">{dot} {label}</div>
      <div className="stat-value">{value}</div>
    </>
  )

  if (onClick) {
    return (
      <button type="button" className="stat" aria-pressed={active} onClick={onClick}>
        {content}
      </button>
    )
  }
  return <div className="stat">{content}</div>
}
