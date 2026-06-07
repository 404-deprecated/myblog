'use client'

import { useState, useEffect } from 'react'

export default function MarketEventsFreshness() {
  const [status, setStatus] = useState<{ updatedAt: string; autoCheckedAt: string | null; hasPending: boolean; pendingCount: number } | null>(null)
  const [annotating, setAnnotating] = useState(false)

  const fetchStatus = () => {
    fetch('/api/market-events', { cache: 'no-store' }).then(r => r.json()).then(d => setStatus({
      updatedAt: d.updatedAt, autoCheckedAt: d.autoCheckedAt,
      hasPending: d.hasPending, pendingCount: d.pendingFlags?.length ?? 0,
    })).catch(() => {})
  }
  useEffect(() => { fetchStatus() }, [])

  const autoAnnotate = async () => {
    setAnnotating(true)
    try {
      const res = await fetch('/api/market-events?action=auto-annotate', { cache: 'no-store' })
      const d = await res.json()
      if (d.newEvents > 0) window.location.reload()
    } catch {} finally { setAnnotating(false); fetchStatus() }
  }

  if (!status) return null
  const daysSinceUpdate = Math.floor((Date.now() - new Date(status.updatedAt).getTime()) / 86400000)
  const isStale = daysSinceUpdate > 30
  const hasGaps = status.hasPending

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>
      <span style={{ padding: '2px 8px', borderRadius: '10px', backgroundColor: isStale ? '#fff1f2' : '#f0fdf4', color: isStale ? '#991b1b' : '#166534', border: '1px solid ' + (isStale ? '#fca5a5' : '#86efac') }}>
        {isStale ? '⚠ 已' + daysSinceUpdate + '天未更新' : '✓ ' + daysSinceUpdate + '天前更新'}
      </span>
      {hasGaps && <>
        <span style={{ padding: '2px 8px', borderRadius: '10px', backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' }}>⚡ {status.pendingCount}次异动</span>
        <button onClick={autoAnnotate} disabled={annotating} style={{ padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--accent)', backgroundColor: 'transparent', color: 'var(--accent)', cursor: annotating ? 'not-allowed' : 'pointer', fontSize: '0.6rem', fontFamily: 'var(--font-mono)', opacity: annotating ? 0.5 : 1 }}>{annotating ? '归因中…' : '自动归因'}</button>
      </>}
    </div>
  )
}
