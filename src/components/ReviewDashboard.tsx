'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface AccuracyStats {
  total: number
  reviewed: number
  correct: number
  incorrect: number
  partial: number
  accuracy: number
  byType: Record<string, { total: number; correct: number; accuracy: number }>
  byGroup: Record<string, { total: number; correct: number; accuracy: number }>
  byDirection: Record<string, { total: number; correct: number; accuracy: number }>
  recentTrend: { date: string; accuracy: number; total: number }[]
}

interface CorrectionSuggestion {
  type: string
  ticker?: string
  issue: string
  currentAccuracy: number
  suggestion: string
  priority: 'high' | 'medium' | 'low'
  expectedImprovement: number
}

interface ReviewRecord {
  id: string
  type: string
  ticker: string
  name: string
  group: string
  createdAt: string
  targetDate: string
  prediction: Record<string, unknown>
  actual?: Record<string, unknown>
  result: string
  accuracy?: number
  postMortem?: string
  correctionHint?: string
  suggestedFix?: string
  reviewedAt?: string
}

interface ReviewResponse {
  stats: AccuracyStats
  corrections: CorrectionSuggestion[]
  correctionsHistory: { appliedAt: string; description: string; beforeAccuracy: number; afterAccuracy?: number }[]
  lastReviewCount: number
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  daily_price: '每日预测',
  trend: '趋势预测',
  gold_zone: '黄金区域',
  safe_buy: '安全买入',
  fund_zone: '基金择时',
  stock_signal: '个股信号',
  earnings: '财报预测',
}

const GROUP_LABELS: Record<string, string> = {
  gold: '黄金',
  index: '指数',
  portfolio: '持仓股',
  sector: '赛道股',
  fund: '基金ETF',
  etf: 'ETF',
}

const DIR_LABELS: Record<string, string> = { up: '看涨', down: '看跌', flat: '震荡' }

const PRIORITY_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  high: { bg: '#fff1f2', border: '#fca5a5', text: '#991b1b', badge: '🔴 高优先' },
  medium: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', badge: '🟡 中优先' },
  low: { bg: '#f0fdf4', border: '#86efac', text: '#166534', badge: '🟢 低优先' },
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function AccuracyBar({ accuracy, height }: { accuracy: number; height?: number }) {
  const h = height ?? 6
  const color = accuracy >= 75 ? '#16a34a' : accuracy >= 55 ? '#d97706' : '#dc2626'
  return (
    <div style={{ height: h + 'px', borderRadius: (h / 2) + 'px', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)' }}>
      <div style={{
        width: accuracy + '%', height: '100%', backgroundColor: color,
        borderRadius: (h / 2) + 'px', transition: 'width 0.5s ease',
      }} />
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)',
      backgroundColor: 'var(--surface)', textAlign: 'center',
    }}>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: color ?? 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{sub}</div>}
    </div>
  )
}

function CorrectionCard({ c }: { c: CorrectionSuggestion }) {
  const style = PRIORITY_STYLES[c.priority] ?? PRIORITY_STYLES.low
  return (
    <div style={{
      padding: '0.75rem 0.875rem', borderRadius: '8px',
      backgroundColor: style.bg, border: '1px solid ' + style.border,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.35rem' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: style.text }}>
          {style.badge} · {(TYPE_LABELS[c.type] ?? c.type)}
        </span>
        <span style={{ fontSize: '0.6rem', color: style.text, opacity: 0.7, fontFamily: 'var(--font-mono)' }}>
          当前准确率 {c.currentAccuracy}% → 预期提升 +{c.expectedImprovement}%
        </span>
      </div>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: style.text, marginBottom: '0.25rem' }}>
        {c.issue}
      </div>
      <p style={{ margin: 0, fontSize: '0.7rem', color: style.text, opacity: 0.85, lineHeight: 1.55 }}>
        {c.suggestion}
      </p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ReviewDashboard() {
  const [data, setData] = useState<ReviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'errors' | 'corrections' | 'trend'>('overview')
  const [records, setRecords] = useState<ReviewRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/review', { cache: 'no-store' })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true)
    try {
      const res = await fetch('/api/review?action=records&limit=50', { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        setRecords(json.records ?? [])
      }
    } catch {
      /* optional */
    } finally {
      setRecordsLoading(false)
    }
  }, [])

  const triggerReview = useCallback(async () => {
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review' }),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.reviewed > 0) {
          await fetchData()
          await fetchRecords()
        }
      }
    } catch {
      /* optional */
    }
  }, [fetchData, fetchRecords])

  useEffect(() => {
    fetchData()
    fetchRecords()
  }, [fetchData, fetchRecords])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {[90, 70, 80, 60, 75, 50].map((w, i) => (
          <div key={i} style={{
            height: (35 + (i * 7)) + 'px', borderRadius: '6px',
            backgroundColor: 'var(--bg-secondary)', width: w + '%',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: '1rem', borderRadius: '10px', border: '1px solid #fca5a5',
        backgroundColor: '#fff1f2', color: '#991b1b', fontSize: '0.85rem',
      }}>
        加载失败：{error}
        <button onClick={fetchData} style={{
          marginLeft: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '6px',
          border: '1px solid #fca5a5', backgroundColor: '#fff', color: '#991b1b',
          cursor: 'pointer', fontSize: '0.75rem',
        }}>
          重试
        </button>
      </div>
    )
  }

  if (!data) return null

  const { stats, corrections, correctionsHistory } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Top Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
        <StatCard
          label="总预测数"
          value={String(stats.total)}
          sub={String(stats.reviewed) + '已复盘'}
        />
        <StatCard
          label="整体准确率"
          value={String(stats.accuracy) + '%'}
          sub={String(stats.correct) + '/' + String(stats.reviewed) + '正确'}
          color={stats.accuracy >= 70 ? '#16a34a' : stats.accuracy >= 50 ? '#d97706' : '#dc2626'}
        />
        <StatCard
          label="错误数"
          value={String(stats.incorrect)}
          sub={String(stats.partial) + '部分正确'}
          color="#dc2626"
        />
        <StatCard
          label="纠错建议"
          value={String(corrections.length)}
          sub={String(corrections.filter(function(c) { return c.priority === 'high' }).length) + '个高优先'}
        />
        <StatCard
          label="历史纠错"
          value={String(correctionsHistory.length)}
          sub="已应用的修正"
        />
      </div>

      {/* ── Sub-tabs ── */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border)' }}>
        {([
          { id: 'overview' as const, label: '准确率总览' },
          { id: 'errors' as const, label: '错误分析' },
          { id: 'corrections' as const, label: '纠错建议' },
          { id: 'trend' as const, label: '趋势图' },
        ]).map(function(tab) {
          return (
            <button
              key={tab.id}
              onClick={function() { setActiveTab(tab.id) }}
              style={{
                padding: '0.4rem 1rem', fontSize: '0.8rem', border: 'none',
                borderBottom: '2px solid ' + (activeTab === tab.id ? 'var(--accent)' : 'transparent'),
                background: 'none', marginBottom: '-1px',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: activeTab === tab.id ? 700 : 400, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
        <button
          onClick={triggerReview}
          style={{
            padding: '0.35rem 0.75rem', fontSize: '0.72rem', borderRadius: '6px',
            border: '1px solid var(--accent)', backgroundColor: 'transparent',
            color: 'var(--accent)', cursor: 'pointer', fontWeight: 600,
            marginBottom: '0.25rem',
          }}
        >
          🔄 触发复盘
        </button>
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Accuracy by Type */}
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
              按预测类型
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {Object.entries(stats.byType).map(function([type, d]) {
                const typeAcc = d.accuracy
                const typeColor = typeAcc >= 70 ? '#16a34a' : typeAcc >= 50 ? '#d97706' : '#dc2626'
                return (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', width: '100px', flexShrink: 0 }}>
                      {TYPE_LABELS[type] ?? type}
                    </span>
                    <div style={{ flex: 1 }}>
                      <AccuracyBar accuracy={typeAcc} />
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: typeColor, width: '50px', textAlign: 'right' }}>
                      {typeAcc}%
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', width: '40px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {d.correct}/{d.total}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Accuracy by Group */}
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
              按资产组
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {Object.entries(stats.byGroup).map(function([group, d]) {
                const groupAcc = d.accuracy
                const groupColor = groupAcc >= 70 ? '#16a34a' : groupAcc >= 50 ? '#d97706' : '#dc2626'
                return (
                  <div key={group} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', width: '100px', flexShrink: 0 }}>
                      {GROUP_LABELS[group] ?? group}
                    </span>
                    <div style={{ flex: 1 }}>
                      <AccuracyBar accuracy={groupAcc} />
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: groupColor, width: '50px', textAlign: 'right' }}>
                      {groupAcc}%
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', width: '40px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {d.correct}/{d.total}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Accuracy by Direction */}
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
              按预测方向
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {Object.entries(stats.byDirection).map(function([dir, d]) {
                const dirAcc = d.accuracy
                const dirColor = dirAcc >= 70 ? '#16a34a' : dirAcc >= 50 ? '#d97706' : '#dc2626'
                return (
                  <div key={dir} style={{
                    flex: 1, padding: '0.625rem 0.75rem', borderRadius: '8px',
                    border: '1px solid var(--border)', backgroundColor: 'var(--surface)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.2rem' }}>
                      {DIR_LABELS[dir] ?? dir}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: dirColor }}>
                      {dirAcc}%
                    </div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                      {d.correct}/{d.total}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Errors Tab ── */}
      {activeTab === 'errors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{
            fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            fontFamily: 'var(--font-mono)', marginBottom: '0.25rem',
          }}>
            最近错误记录 ({records.filter(function(r) { return r.result === 'incorrect' }).length}条)
          </div>
          {recordsLoading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>加载中...</div>
          ) : (
            records
              .filter(function(r) { return r.result === 'incorrect' })
              .slice(0, 20)
              .map(function(r) {
                return (
                  <div key={r.id} style={{
                    padding: '0.75rem 0.875rem', borderRadius: '8px',
                    border: '1px solid #fca5a5', backgroundColor: '#fff1f2',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#991b1b' }}>
                          {r.name} ({r.ticker})
                        </span>
                        <span style={{ fontSize: '0.6rem', color: '#991b1b', opacity: 0.6, marginLeft: '0.5rem' }}>
                          {TYPE_LABELS[r.type] ?? r.type}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.6rem', color: '#991b1b', opacity: 0.7, fontFamily: 'var(--font-mono)' }}>
                        预测日 {r.targetDate}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#7f1d1d', marginBottom: '0.25rem' }}>
                      预测: <strong>{DIR_LABELS[String(r.prediction.direction)] ?? String(r.prediction.direction)}</strong>
                      {' → '}
                      实际: <strong>{DIR_LABELS[String(r.actual?.direction)] ?? String(r.actual?.direction)}</strong>
                      {r.actual?.changePct != null && ' (' + (Number(r.actual.changePct) >= 0 ? '+' : '') + String(r.actual.changePct) + '%)'}
                    </div>
                    {r.postMortem && (
                      <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.7rem', color: '#7f1d1d', lineHeight: 1.5 }}>
                        {r.postMortem}
                      </p>
                    )}
                    {r.suggestedFix && (
                      <div style={{
                        padding: '0.35rem 0.5rem', borderRadius: '4px',
                        backgroundColor: '#fef3c7', fontSize: '0.65rem', color: '#92400e',
                      }}>
                        💡 纠错建议: {r.suggestedFix}
                      </div>
                    )}
                  </div>
                )
              })
          )}
        </div>
      )}

      {/* ── Corrections Tab ── */}
      {activeTab === 'corrections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
              纠错建议 ({corrections.length}条)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {corrections.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>
                  {stats.reviewed < 10
                    ? '✅ 当前已复盘' + String(stats.reviewed) + '条，需要至少10条累积数据才能生成纠错建议。继续积累中...'
                    : '✅ 当前所有预测类型准确率均在可接受范围内，无需纠错'}
                </div>
              ) : (
                corrections.map(function(c, i) { return <CorrectionCard key={i} c={c} /> })
              )}
            </div>
          </div>

          {/* Correction History */}
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
              已应用修正 ({correctionsHistory.length}条)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {correctionsHistory.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem' }}>
                  暂无已应用的修正记录
                </div>
              ) : (
                correctionsHistory.slice().reverse().map(function(h, i) {
                  return (
                    <div key={i} style={{
                      padding: '0.5rem 0.75rem', borderRadius: '6px',
                      border: '1px solid var(--border)', backgroundColor: 'var(--surface)',
                    }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text)', lineHeight: 1.5 }}>
                        {h.description}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                        应用时间: {new Date(h.appliedAt).toLocaleString('zh-CN')}
                        {h.beforeAccuracy > 0 && ' · 修正前准确率: ' + String(h.beforeAccuracy) + '%'}
                        {h.afterAccuracy != null && ' · 修正后: ' + String(h.afterAccuracy) + '%'}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Trend Tab ── */}
      {activeTab === 'trend' && (
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
            准确率趋势（最近30天）
          </div>
          {stats.recentTrend.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>
              暂无足够的复盘数据来绘制趋势图
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '120px', marginBottom: '0.5rem' }}>
                {stats.recentTrend.map(function(day, i) {
                  const barH = Math.max(8, (day.accuracy / 100) * 120)
                  const barColor = day.accuracy >= 70 ? '#16a34a' : day.accuracy >= 50 ? '#d97706' : '#dc2626'
                  return (
                    <div
                      key={i}
                      title={day.date + ': ' + day.accuracy + '% (' + day.total + '条)'}
                      style={{
                        flex: 1, height: barH + 'px',
                        backgroundColor: barColor,
                        borderRadius: '2px 2px 0 0',
                        opacity: day.total > 0 ? 0.85 : 0.3,
                        transition: 'height 0.3s ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={function(e) { (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
                      onMouseLeave={function(e) { (e.currentTarget as HTMLDivElement).style.opacity = '0.85' }}
                    />
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                <span>{stats.recentTrend[0]?.date ?? ''}</span>
                <span>{stats.recentTrend[stats.recentTrend.length - 1]?.date ?? ''}</span>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                7日均线准确率: {' '}
                <strong style={{ color: 'var(--text)' }}>
                  {(() => {
                    const last7 = stats.recentTrend.slice(-7)
                    if (last7.length === 0) return '—'
                    return Math.round(last7.reduce(function(s, d) { return s + d.accuracy }, 0) / last7.length) + '%'
                  })()}
                </strong>
                {' · '}
                30日均线: {' '}
                <strong style={{ color: 'var(--text)' }}>
                  {stats.recentTrend.length > 0
                    ? Math.round(stats.recentTrend.reduce(function(s, d) { return s + d.accuracy }, 0) / stats.recentTrend.length) + '%'
                    : '—'}
                </strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Recent Reviews ── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
            最近复盘 ({records.filter(function(r) { return r.result !== 'pending' }).length}条)
          </div>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {data.lastReviewCount > 0 ? '刚完成' + data.lastReviewCount + '条自动复盘' : '自动复盘每30分钟运行'}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '300px', overflowY: 'auto' }}>
          {records
            .filter(function(r) { return r.result !== 'pending' })
            .slice(0, 15)
            .map(function(r) {
              const isCorrect = r.result === 'correct'
              return (
                <div key={r.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 0.8fr 0.7fr 0.5fr',
                  gap: '0.5rem', alignItems: 'center', padding: '0.4rem 0.625rem',
                  borderRadius: '6px', fontSize: '0.7rem',
                  backgroundColor: isCorrect ? '#f0fdf4' : '#fff1f2',
                  border: '1px solid ' + (isCorrect ? '#86efac' : '#fca5a5'),
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                    <span style={{ fontSize: '0.65rem', color: isCorrect ? '#16a34a' : '#dc2626' }}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.name}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    {TYPE_LABELS[r.type] ?? r.type}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                    {r.targetDate}
                  </span>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 600, textAlign: 'right',
                    color: isCorrect ? '#16a34a' : '#dc2626',
                  }}>
                    {isCorrect ? (r.accuracy != null ? String(r.accuracy) + '%' : '—') : (r.correctionHint ?? '错误')}
                  </span>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
