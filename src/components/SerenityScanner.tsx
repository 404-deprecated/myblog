'use client'

import { useState, useEffect } from 'react'

interface ScanResult {
  code: string; name: string; sector: string; mcap: number; biz: string
  demand: number; chokepoint: number; suppliers: number; expansion: number
  evidence: number; valuation: number
  factorPoints: number; penaltyPoints: number; finalScore: number
  verdict: string
  factorDetails: Record<string, { rating: number; weight: number; points: number }>
  penaltyDetails: Record<string, { rating: number; points: number }>
  fail: string[]
}

const SCORE_COLORS = [
  { min: 85, bg: '#f0fdf4', border: '#86efac', text: '#166534', label: 'Top priority' },
  { min: 70, bg: '#f0fdfa', border: '#99f6e4', text: '#134e4a', label: 'High priority' },
  { min: 55, bg: '#fffbeb', border: '#fcd34d', text: '#92400e', label: 'Track' },
  { min: 0,  bg: '#f9fafb', border: '#d1d5db', text: '#6b7280', label: 'Low priority' },
]

const FACTOR_LABELS: Record<string, string> = {
  demand: '需求拐点', coupling: '架构耦合', chokepoint: '瓶颈严重',
  suppliers: '供给集中', expansion: '扩产难度', evidence: '证据质量',
  valuation: '估值脱节', catalyst: '催化时机',
}

export default function SerenityScanner() {
  const [results, setResults] = useState<ScanResult[]>([])
  const [sector, setSector] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [minScore, setMinScore] = useState(55)
  const [onlyBuyable, setOnlyBuyable] = useState(true)

  const sectors = ['半导体设备','半导体/芯片','光通信','机器人/工控','低空经济','物理AI','AI/服务器','新能源/电力','生物医药','航天/军工','all']

  const getEligibility = (code: string) => {
    if (code.includes('.HK')) return { ok: false, label: '🇭🇰港股', color: '#3b82f6' }
    if (code.match(/^[A-Z]+$/)) return { ok: false, label: '🇺🇸美股', color: '#3b82f6' }
    if (code.startsWith('688')) return { ok: false, label: '🚫科创板', color: '#dc2626' }
    if (code.startsWith('300') || code.startsWith('301')) return { ok: false, label: '🚫创业板', color: '#dc2626' }
    return { ok: true, label: '✅可买', color: '#16a34a' }
  }

  const scan = async (s: string) => {
    setSector(s); setLoading(true); setError(''); setResults([])
    try {
      const res = await fetch(`/api/serenity-scan?sector=${encodeURIComponent(s)}`)
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResults(Array.isArray(data) ? data : [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  // Auto-scan on mount
  useEffect(() => { scan('all') }, [])

  const filtered = results.filter(r => {
    if (r.finalScore < minScore) return false
    if (onlyBuyable && !getEligibility(r.code).ok) return false
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280' }}>🔍 Serenity v2 八因子扫描</span>
        {sectors.map(s => (
          <button key={s} onClick={() => scan(s)} style={{
            padding: '0.18rem 0.5rem', fontSize: '0.6rem', borderRadius: '12px', cursor: 'pointer',
            border: '1px solid', borderColor: sector === s ? 'var(--accent)' : '#d1d5db',
            backgroundColor: sector === s ? 'var(--accent)' : 'transparent',
            color: sector === s ? '#fff' : '#6b7280', fontWeight: sector === s ? 600 : 400,
          }}>{s === 'all' ? '全部' : s}</button>
        ))}
        <select value={minScore} onChange={e => setMinScore(Number(e.target.value))}
          style={{ padding: '0.15rem', fontSize: '0.6rem', borderRadius: '6px', border: '1px solid #d1d5db', marginLeft: '0.5rem' }}>
          <option value={0}>全部评分</option>
          <option value={85}>≥85 Top</option>
          <option value={70}>≥70 High</option>
          <option value={55}>≥55 Track</option>
        </select>
        <label style={{ fontSize: '0.58rem', display: 'flex', alignItems: 'center', gap: '0.15rem', cursor: 'pointer', color: onlyBuyable ? '#16a34a' : '#6b7280', marginLeft: '0.5rem' }}>
          <input type="checkbox" checked={onlyBuyable} onChange={e => setOnlyBuyable(e.target.checked)} style={{ width: '12px', height: '12px' }} />
          只看可买(主板)
        </label>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>扫描中...</div>}
      {error && <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: '#fff1f2', color: '#991b1b', fontSize: '0.7rem' }}>{error}</div>}

      {filtered.length > 0 && (
        <div>
          <div style={{ fontSize: '0.65rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            {sector === 'all' ? '全赛道' : sector} — {filtered.length}只 (≥{minScore}分{onlyBuyable ? ', 仅主板可买' : ''}), Top: {filtered[0]?.name} {filtered[0]?.finalScore}/100
          </div>
          {filtered.map(r => {
            const sc = SCORE_COLORS.find(c => r.finalScore >= c.min) || SCORE_COLORS[3]
            return (
              <div key={r.code} style={{ marginBottom: '0.4rem', borderRadius: '8px', border: `1px solid ${sc.border}`, backgroundColor: sc.bg, overflow: 'hidden' }}>
                <div onClick={() => setExpanded(expanded === r.code ? null : r.code)}
                  style={{ padding: '0.45rem 0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1f2937' }}>{r.name}</span>
                  <span style={{ fontSize: '0.55rem', fontFamily: 'var(--font-mono)', color: '#6b7280' }}>{r.code}</span>
                  <span style={{ fontSize: '0.55rem', color: '#6b7280' }}>{r.sector} · {r.mcap}亿</span>
                  {(() => { const el = getEligibility(r.code); return (
                    <span style={{ fontSize: '0.52rem', padding: '0.05rem 0.35rem', borderRadius: '4px', color: el.color, backgroundColor: el.ok ? '#f0fdf4' : '#fff1f2', border: `1px solid ${el.ok ? '#86efac' : '#fca5a5'}`, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{el.label}</span>
                  )})()}
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, fontFamily: 'var(--font-mono)', marginLeft: 'auto', color: r.finalScore >= 70 ? '#16a34a' : r.finalScore >= 55 ? '#d97706' : '#6b7280' }}>
                    {r.finalScore}/100
                  </span>
                  <span style={{ fontSize: '0.58rem', color: sc.text, fontWeight: 600 }}>{sc.label}</span>
                  <span style={{ fontSize: '0.5rem', color: '#6b7280' }}>{expanded === r.code ? '▲' : '▼'}</span>
                </div>

                {/* Factor bars */}
                <div style={{ padding: '0 0.65rem 0.35rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {Object.entries(r.factorDetails).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.12rem', fontSize: '0.5rem' }}>
                      <span style={{ color: '#6b7280', width: '30px' }}>{FACTOR_LABELS[k] || k}</span>
                      <div style={{ width: '25px', height: '3px', borderRadius: '2px', backgroundColor: '#d1d5db' }}>
                        <div style={{ width: `${v.rating/5*100}%`, height: '100%', borderRadius: '2px', backgroundColor: v.rating >= 4 ? '#16a34a' : v.rating >= 3 ? '#d97706' : '#dc2626' }} />
                      </div>
                    </div>
                  ))}
                  <span style={{ fontSize: '0.5rem', color: '#dc2626', fontFamily: 'var(--font-mono)' }}>
                    -{r.penaltyPoints.toFixed(0)}罚
                  </span>
                </div>

                {expanded === r.code && (
                  <div style={{ padding: '0.5rem 0.65rem', borderTop: '1px solid #d1d5db', backgroundColor: '#f9fafb' }}>
                    <p style={{ fontSize: '0.62rem', lineHeight: 1.6, margin: '0 0 0.4rem 0', color: '#1f2937' }}>
                      <strong>📋 {r.verdict}</strong> · {r.biz} · 瓶颈{r.chokepoint}/5 · 供应商{r.suppliers}家 · 扩产{r.expansion}月
                    </p>

                    {/* Penalty details */}
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                      {Object.entries(r.penaltyDetails).filter(([,v]) => v.rating > 0).map(([k, v]) => (
                        <span key={k} style={{ fontSize: '0.5rem', padding: '0.08rem 0.35rem', borderRadius: '8px', backgroundColor: '#fff1f2', color: '#991b1b', border: '1px solid #fca5a5' }}>
                          ⚠ {k}: {v.rating}
                        </span>
                      ))}
                    </div>

                    {/* Fail conditions */}
                    <div>
                      <div style={{ fontSize: '0.55rem', fontWeight: 600, color: '#dc2626', marginBottom: '0.15rem' }}>💀 什么情况判断错了</div>
                      {r.fail.map((f, i) => (
                        <div key={i} style={{ fontSize: '0.55rem', color: '#991b1b', lineHeight: 1.5, paddingLeft: '0.5rem' }}>
                          • {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
