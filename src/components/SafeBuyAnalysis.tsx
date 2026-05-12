'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface MethodResult {
  price: number
  weight: number
  probability: number
  label: string
  detail: string
}

interface BacktestResult {
  accuracy3m: number
  accuracy6m: number
  accuracy12m: number
  samples: number
}

interface SafeBuyAsset {
  ticker: string
  name: string
  type: 'gold' | 'index' | 'stock' | 'etf'
  currency: string
  currentPrice: number
  safeBuyPrice: number
  discountPct: number
  safetyProbability: number
  currentSafety: number
  currentSafetyReasoning: string
  methods: MethodResult[]
  reasoning: string
  backtest: BacktestResult
}

interface SafeBuyResponse {
  generatedAt: string
  count: number
  results: SafeBuyAsset[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', CNY: '¥', HKD: 'HK$' }

function fmtPrice(price: number, currency: string): string {
  const sym = CURRENCY_SYMBOL[currency] ?? '$'
  if (price >= 10000) return `${sym}${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (price >= 100) return `${sym}${price.toFixed(0)}`
  return `${sym}${price.toFixed(2)}`
}

function getSafetyLevel(prob: number): { label: string; color: string; bg: string; barColor: string } {
  if (prob >= 90) return { label: '极高安全', color: '#15803d', bg: '#f0fdf4', barColor: '#16a34a' }
  if (prob >= 80) return { label: '高安全', color: '#166534', bg: '#f0fdf4', barColor: '#22c55e' }
  if (prob >= 70) return { label: '较安全', color: '#b45309', bg: '#fffbeb', barColor: '#f59e0b' }
  if (prob >= 60) return { label: '一般', color: '#92400e', bg: '#fef3c7', barColor: '#d97706' }
  return { label: '注意风险', color: '#991b1b', bg: '#fff1f2', barColor: '#ef4444' }
}

function getTypeLabel(type: SafeBuyAsset['type']): string {
  switch (type) {
    case 'gold': return '黄金'
    case 'index': return '指数'
    case 'stock': return '个股'
    case 'etf': return 'ETF'
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SafetyBar({ probability }: { probability: number }) {
  const level = getSafetyLevel(probability)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '0.65rem' }}>
        <span style={{ color: level.color, fontWeight: 600 }}>{probability}%</span>
        <span style={{ color: level.color, opacity: 0.7 }}>{level.label}</span>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)' }}>
        <div style={{
          width: `${probability}%`, height: '100%',
          backgroundColor: level.barColor,
          borderRadius: '3px', transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}

function MethodTag({ method, currency }: { method: MethodResult; currency: string }) {
  const probColor = method.probability >= 85 ? '#16a34a' : method.probability >= 70 ? '#d97706' : '#dc2626'
  return (
    <div style={{
      padding: '0.5rem 0.625rem', borderRadius: '8px',
      border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)',
      fontSize: '0.72rem', lineHeight: 1.5,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{method.label}</span>
        <span style={{ fontSize: '0.65rem', color: probColor, fontWeight: 600 }}>
          {fmtPrice(method.price, currency)} · {method.probability}%
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        {method.detail}
      </p>
    </div>
  )
}

function BacktestBadge({ backtest }: { backtest: BacktestResult }) {
  if (backtest.samples < 3) {
    return (
      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        样本不足({backtest.samples}次)，准确率待积累
      </span>
    )
  }

  const avgAcc = Math.round((backtest.accuracy3m + backtest.accuracy6m + backtest.accuracy12m) / 3)
  const color = avgAcc >= 85 ? '#16a34a' : avgAcc >= 70 ? '#d97706' : '#dc2626'

  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        回测 {backtest.samples}次
      </span>
      <span style={{ fontSize: '0.68rem', color, fontWeight: 600 }}>
        3月: {backtest.accuracy3m}%
      </span>
      <span style={{ fontSize: '0.68rem', color, fontWeight: 600 }}>
        6月: {backtest.accuracy6m}%
      </span>
      <span style={{ fontSize: '0.68rem', color, fontWeight: 600 }}>
        12月: {backtest.accuracy12m}%
      </span>
      <span style={{ fontSize: '0.6rem', color, opacity: 0.7 }}>
        均{avgAcc}%
      </span>
    </div>
  )
}

// ─── Highlight Card (Gold & Key Assets) ──────────────────────────────────────
function HighlightCard({ asset }: { asset: SafeBuyAsset }) {
  const [expanded, setExpanded] = useState(false)
  const level = getSafetyLevel(asset.safetyProbability)
  const nowLevel = getSafetyLevel(asset.currentSafety)

  return (
    <div style={{
      borderRadius: '12px', border: `1px solid ${level.barColor}40`,
      backgroundColor: level.bg, overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '1.125rem 1.25rem', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        {/* Icon & Name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: asset.type === 'gold' ? '#d97706' : asset.type === 'index' ? '#2563eb' : '#16a34a',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: '0.65rem', color: level.color, opacity: 0.7, fontWeight: 500 }}>
              {getTypeLabel(asset.type)}
            </span>
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
            {asset.name}
          </div>
        </div>

        {/* Current Price + Now Safety */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>当前价格</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)' }}>
            {fmtPrice(asset.currentPrice, asset.currency)}
          </div>
          <div style={{
            marginTop: '3px', padding: '2px 8px', borderRadius: '10px',
            backgroundColor: nowLevel.barColor + '20', border: `1px solid ${nowLevel.barColor}40`,
            fontSize: '0.6rem', fontWeight: 700, color: nowLevel.color,
          }}>
            现价买入安全 {asset.currentSafety}%
          </div>
        </div>

        {/* Arrow divider */}
        <div style={{ fontSize: '1.2rem', color: level.barColor, flexShrink: 0 }}>→</div>

        {/* Safe Buy Price */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: '0.6rem', color: level.color }}>安全买入价</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: level.color }}>
            {fmtPrice(asset.safeBuyPrice, asset.currency)}
          </div>
          <div style={{
            marginTop: '3px', padding: '2px 8px', borderRadius: '10px',
            backgroundColor: level.barColor + '20', border: `1px solid ${level.barColor}40`,
            fontSize: '0.6rem', fontWeight: 700, color: level.color,
          }}>
            回调 -{asset.discountPct}%
          </div>
        </div>

        {/* Safety Badge */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{
            width: '50px', height: '50px', borderRadius: '50%',
            border: `3px solid ${level.barColor}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#fff',
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: level.color, lineHeight: 1 }}>
              {asset.safetyProbability}%
            </span>
            <span style={{ fontSize: '0.45rem', color: level.color, opacity: 0.7 }}>安全买</span>
          </div>
        </div>

        {/* Expand arrow */}
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div style={{ borderTop: `1px solid ${level.barColor}30`, padding: '1rem 1.25rem' }}>
          {/* Stats grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem',
            marginBottom: '0.875rem',
          }}>
            <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.5)' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>当前买入安全率</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: nowLevel.color }}>
                {asset.currentSafety}%
              </div>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.5)' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>安全买入需回调</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: asset.discountPct > 15 ? '#16a34a' : asset.discountPct > 5 ? '#d97706' : '#dc2626' }}>
                -{asset.discountPct}%
              </div>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.5)' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>安全买价概率</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: level.color }}>
                {asset.safetyProbability}%
              </div>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.5)' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>分析方法</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
                {asset.methods.length}种
              </div>
            </div>
          </div>

          {/* Current safety bar + reasoning */}
          <div style={{
            marginBottom: '0.875rem', padding: '0.625rem 0.75rem',
            borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.6)',
            border: `1px solid ${nowLevel.barColor}40`,
          }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: nowLevel.color, marginBottom: '0.35rem' }}>
              📍 当前价格买入安全评估：{asset.currentSafety}%
            </div>
            <SafetyBar probability={asset.currentSafety} />
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.7rem', color: 'var(--text)', lineHeight: 1.55 }}>
              {asset.currentSafetyReasoning}
            </p>
          </div>

          {/* Safe buy safety bar */}
          <div style={{ marginBottom: '0.875rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: level.color, marginBottom: '0.35rem' }}>
              🎯 安全买入价概率（回调后）：{asset.safetyProbability}%
            </div>
            <SafetyBar probability={asset.safetyProbability} />
          </div>

          {/* Safe buy reasoning */}
          <p style={{
            margin: '0 0 0.75rem 0', fontSize: '0.78rem', color: 'var(--text)',
            lineHeight: 1.65, borderLeft: `3px solid ${level.barColor}`,
            paddingLeft: '0.625rem',
          }}>
            {asset.reasoning}
          </p>

          {/* Methods grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.375rem', marginBottom: '0.75rem' }}>
            {asset.methods.map((m, i) => (
              <MethodTag key={i} method={m} currency={asset.currency} />
            ))}
          </div>

          {/* Backtest */}
          <div style={{
            padding: '0.5rem 0.75rem', borderRadius: '6px',
            backgroundColor: 'rgba(255,255,255,0.5)',
          }}>
            <BacktestBadge backtest={asset.backtest} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Compact Row (for table view) ────────────────────────────────────────────
function AssetRow({ asset }: { asset: SafeBuyAsset }) {
  const [expanded, setExpanded] = useState(false)
  const level = getSafetyLevel(asset.safetyProbability)
  const nowLevel = getSafetyLevel(asset.currentSafety)

  return (
    <>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'grid', gridTemplateColumns: '1.8fr 1fr 0.7fr 1fr 0.8fr 0.65fr 0.45fr',
          gap: '0.35rem', alignItems: 'center', padding: '0.7rem 0.75rem',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          borderBottom: '1px solid var(--border)',
          fontSize: '0.78rem', color: 'var(--text)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-secondary)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            backgroundColor: asset.type === 'gold' ? '#d97706' : asset.type === 'index' ? '#2563eb' : asset.type === 'etf' ? '#7c3aed' : '#16a34a',
            flexShrink: 0,
          }} />
          <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {asset.name}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.75rem', textAlign: 'right' }}>
          {fmtPrice(asset.currentPrice, asset.currency)}
        </span>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: nowLevel.color, textAlign: 'center' }}>
          {asset.currentSafety}%
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.75rem', color: level.color, textAlign: 'right' }}>
          {fmtPrice(asset.safeBuyPrice, asset.currency)}
        </span>
        <span style={{ textAlign: 'right', fontSize: '0.72rem', color: asset.discountPct > 10 ? '#16a34a' : '#d97706', fontWeight: 600 }}>
          -{asset.discountPct}%
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
          <div style={{
            width: '30px', height: '4px', borderRadius: '2px', overflow: 'hidden',
            backgroundColor: 'var(--bg-secondary)',
          }}>
            <div style={{
              width: `${asset.safetyProbability}%`, height: '100%',
              backgroundColor: level.barColor, borderRadius: '2px',
            }} />
          </div>
          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: level.color, width: '28px', textAlign: 'right' }}>
            {asset.safetyProbability}%
          </span>
        </div>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div style={{
          padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-secondary)',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}>
          {/* Current safety */}
          <div style={{
            padding: '0.5rem 0.625rem', borderRadius: '6px',
            backgroundColor: nowLevel.bg, border: `1px solid ${nowLevel.barColor}30`,
          }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: nowLevel.color, marginBottom: '0.2rem' }}>
              📍 现价买入安全评估: {asset.currentSafety}%
            </div>
            <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text)', lineHeight: 1.5 }}>
              {asset.currentSafetyReasoning}
            </p>
          </div>
          {/* Safe buy reasoning */}
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text)', lineHeight: 1.6 }}>
            {asset.reasoning}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.375rem' }}>
            {asset.methods.map((m, i) => (
              <MethodTag key={i} method={m} currency={asset.currency} />
            ))}
          </div>
          <div style={{ paddingTop: '0.25rem' }}>
            <BacktestBadge backtest={asset.backtest} />
          </div>
        </div>
      )}
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function SafeBuyAnalysis() {
  const [data, setData] = useState<SafeBuyResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'gold' | 'index' | 'stock' | 'etf'>('all')
  const [sortBy, setSortBy] = useState<'probability' | 'discount'>('probability')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/safe-buy', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[80, 60, 75, 50, 65, 40, 70, 55].map((w, i) => (
          <div key={i} style={{
            height: `${40 + Math.random() * 30}px`, borderRadius: '8px',
            backgroundColor: 'var(--bg-secondary)', width: `${w}%`,
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
        数据加载失败：{error}
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

  if (!data || !data.results.length) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>暂无数据</div>
  }

  const gold = data.results.filter(r => r.type === 'gold')
  const indices = data.results.filter(r => r.type === 'index')
  const stocks = data.results.filter(r => r.type === 'stock')
  const etfs = data.results.filter(r => r.type === 'etf')

  let displayResults = data.results
  if (filter === 'gold') displayResults = gold
  else if (filter === 'index') displayResults = indices
  else if (filter === 'stock') displayResults = stocks
  else if (filter === 'etf') displayResults = etfs

  // Sort
  displayResults = [...displayResults].sort((a, b) => {
    if (sortBy === 'probability') return b.safetyProbability - a.safetyProbability
    return b.discountPct - a.discountPct
  })

  // Aggregate stats
  const avgProb = Math.round(data.results.reduce((s, r) => s + r.safetyProbability, 0) / data.results.length)
  const avgDiscount = +(data.results.reduce((s, r) => s + r.discountPct, 0) / data.results.length).toFixed(1)
  const highSafety = data.results.filter(r => r.safetyProbability >= 80).length
  const totalBacktestSamples = data.results.reduce((s, r) => s + r.backtest.samples, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Stats Overview ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
        {[
          { label: '分析资产', value: `${data.count}个`, sub: '黄金+指数+个股+ETF' },
          { label: '平均安全概率', value: `${avgProb}%`, sub: `${highSafety}/${data.count}个≥80%` },
          { label: '平均安全折扣', value: `${avgDiscount}%`, sub: '距安全买价需回调' },
          { label: '回测总样本', value: `${totalBacktestSamples}次`, sub: '历史回测验证' },
        ].map(stat => (
          <div key={stat.label} style={{
            padding: '0.75rem 1rem', borderRadius: '10px',
            border: '1px solid var(--border)', backgroundColor: 'var(--surface)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{stat.label}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>{stat.value}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {([
            { id: 'all', label: '全部' },
            { id: 'gold', label: '黄金' },
            { id: 'index', label: '指数' },
            { id: 'stock', label: '个股' },
            { id: 'etf', label: 'ETF' },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: '0.3rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px',
                border: '1px solid',
                borderColor: filter === f.id ? 'var(--accent)' : 'var(--border)',
                backgroundColor: filter === f.id ? 'var(--accent)' : 'transparent',
                color: filter === f.id ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer', fontWeight: filter === f.id ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {([
            { id: 'probability' as const, label: '按安全性' },
            { id: 'discount' as const, label: '按折扣' },
          ]).map(s => (
            <button
              key={s.id}
              onClick={() => setSortBy(s.id)}
              style={{
                padding: '0.25rem 0.6rem', fontSize: '0.7rem', borderRadius: '6px',
                border: '1px solid',
                borderColor: sortBy === s.id ? 'var(--accent)' : 'var(--border)',
                backgroundColor: sortBy === s.id ? 'var(--accent)' : 'transparent',
                color: sortBy === s.id ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'var(--font-mono)', fontWeight: sortBy === s.id ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Gold & Index Highlights ── */}
      {(gold.length > 0 || indices.length > 0) && filter === 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
            重点关注 · 黄金 & 指数
          </div>
          {[...gold, ...indices].map(asset => (
            <HighlightCard key={asset.ticker} asset={asset} />
          ))}
        </div>
      )}

      {/* ── All Assets Table ── */}
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
          {filter === 'all' ? '全部分析结果' : `${filter === 'gold' ? '黄金' : filter === 'index' ? '指数' : filter === 'stock' ? '个股' : 'ETF'} 分析`}
        </div>

        <div style={{
          borderRadius: '10px', border: '1px solid var(--border)',
          backgroundColor: 'var(--surface)', overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1.8fr 1fr 0.7fr 1fr 0.8fr 0.65fr 0.45fr',
            gap: '0.35rem', padding: '0.5rem 0.75rem',
            borderBottom: '2px solid var(--border)',
            backgroundColor: 'var(--bg-secondary)',
            fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
          }}>
            <span>资产</span>
            <span style={{ textAlign: 'right' }}>当前价</span>
            <span style={{ textAlign: 'center' }}>现价安全</span>
            <span style={{ textAlign: 'right' }}>安全买入价</span>
            <span style={{ textAlign: 'right' }}>需回调</span>
            <span style={{ textAlign: 'right' }}>买价安全率</span>
            <span style={{ textAlign: 'center' }}>详情</span>
          </div>

          {/* Table body */}
          {displayResults.map(asset => (
            <AssetRow key={asset.ticker} asset={asset} />
          ))}
        </div>
      </div>

      {/* ── Methodology Explanation ── */}
      <div style={{
        borderRadius: '10px', border: '1px solid var(--border)',
        backgroundColor: 'var(--surface)', padding: '1rem 1.25rem',
      }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: '0.75rem' }}>
          分析方法说明
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.625rem' }}>
          {[
            {
              title: '布林带统计支撑 (35%)',
              text: '基于20日均线和2倍标准差计算统计下轨。正态分布中约95%的价格在2σ范围内。再额外加3%安全边际。适用于趋势性资产。',
            },
            {
              title: '历史回撤分析 (30%)',
              text: '统计历史上所有>5%的回撤幅度，取80分位数作为"典型大回撤"，取其70%作为安全缓冲。基于实际历史波动而非理论分布。',
            },
            {
              title: 'RSI标准化价格 (15%)',
              text: '基于当前RSI(14)与目标买入区RSI=30的差距，结合日均波动率计算回到买入区需要的回调幅度。RSI越高，安全买价越低。',
            },
            {
              title: '估值回归支撑 (20%)',
              text: '仅适用于个股。基于PEG=1计算公平PE，再打85-92折作为安全边际。当前PE远高于公平PE时安全买价显著降低。',
            },
            {
              title: '黄金公允价值 (20%)',
              text: '仅适用于黄金。2年均线作为长期趋势公允价值参考，安全买价=均线×0.92。黄金有向长期均线回归的特性。',
            },
            {
              title: '回测验证',
              text: '在历史数据上模拟"仅当价格触及安全买价时才买入"的策略，统计3/6/12个月后的胜率。回测样本越多，可靠性越高。',
            },
          ].map(item => (
            <div key={item.title} style={{
              padding: '0.625rem 0.75rem', borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.25rem' }}>
                {item.title}
              </div>
              <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <div style={{
        padding: '0.75rem 1rem', borderRadius: '8px',
        backgroundColor: '#fffbeb', border: '1px solid #fcd34d',
        fontSize: '0.72rem', color: '#92400e', lineHeight: 1.6,
      }}>
        <strong>风险提示：</strong>
        安全买入价是基于统计模型和历史数据的估算，不代表未来价格一定会达到或在此之上。
        市场存在极端事件（黑天鹅）风险，任何统计模型在极端行情下可能失效。
        回测准确率反映历史表现，不保证未来结果。建议结合基本面分析、仓位管理和止损策略综合决策。
        所有分析仅供参考，不构成投资建议。
      </div>

      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
        生成时间 {new Date(data.generatedAt).toLocaleString('zh-CN')} · 数据每30分钟刷新 · Yahoo Finance + 统计模型
      </p>
    </div>
  )
}
