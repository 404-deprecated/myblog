import React from 'react'

type CalloutType = 'info' | 'warning' | 'error' | 'default'

interface CalloutProps {
  type?: CalloutType
  children: React.ReactNode
}

const styles: Record<CalloutType, { border: string; bg: string; icon: string }> = {
  info:    { border: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  icon: 'ℹ️' },
  warning: { border: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: '⚠️' },
  error:   { border: '#ef4444', bg: 'rgba(239,68,68,0.08)',  icon: '🚫' },
  default: { border: 'var(--border)', bg: 'var(--surface)',  icon: '📌' },
}

export function Callout({ type = 'default', children }: CalloutProps) {
  const s = styles[type] ?? styles.default
  return (
    <div
      style={{
        borderLeft: `4px solid ${s.border}`,
        background: s.bg,
        borderRadius: '0 6px 6px 0',
        padding: '0.85rem 1.1rem',
        margin: '1.5rem 0',
        fontSize: '0.93rem',
        lineHeight: 1.65,
      }}
    >
      <span style={{ marginRight: '0.4rem' }}>{s.icon}</span>
      {children}
    </div>
  )
}
