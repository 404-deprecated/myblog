'use client'

import { useEffect, useState, useMemo } from 'react'
import type { StockQuote } from '@/app/api/stocks/route'

// ── Article-specific categories ───────────────────────────────────────────────

const CATEGORIES: Record<string, string[]> = {
  'AI基础设施': ['NVDA', 'MSFT', 'GOOGL', 'AMD'],
  'AI Agent':   ['PLTR', 'APP', 'NOW', 'CRM'],
  '机器人':     ['TSLA', 'SYM', 'ISRG'],
  'AI能源/核能':['CEG', 'VST', 'GEV', 'NNE'],
  '量子计算':   ['IONQ', 'RGTI', 'IBM'],
  'AI生物医药': ['LLY', 'RXRX', 'CRSP'],
  '网络安全':   ['CRWD', 'PANW'],
}

const ALL_TICKERS = Object.values(CATEGORIES).flat()

// ── Recommendation scoring ────────────────────────────────────────────────────

interface Rec { label: string; color: string; bg: string; detail: string }

function computeRec(s: StockQuote): Rec {
  if (s.error || s.price === 0) {
    return { label: '数据异常', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', detail: '价格获取失败' }
  }

  // No PE at all → early-stage
  if (s.forwardPe === null) {
    const grow = s.revenueGrowthPct
    if (grow !== null && grow > 40) {
      return { label: '高风险卡位', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', detail: `营收增速 +${grow}%，尚未盈利，小仓位布局` }
    }
    return { label: '谨慎观察', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', detail: '无盈利记录，等待商业化里程碑' }
  }

  let score = 0
  const notes: string[] = []

  // Forward PE
  if (s.forwardPe < 20)      { score += 3; notes.push(`FPE ${s.forwardPe.toFixed(0)} 低估`) }
  else if (s.forwardPe < 35) { score += 2; notes.push(`FPE ${s.forwardPe.toFixed(0)} 合理`) }
  else if (s.forwardPe < 55) { score += 1 }
  else                       { notes.push(`FPE ${s.forwardPe.toFixed(0)} 偏高`) }

  // PEG
  if (s.peg !== null && s.peg > 0) {
    if (s.peg < 1)        { score += 3; notes.push(`PEG ${s.peg.toFixed(2)} 低估`) }
    else if (s.peg < 1.5) { score += 2; notes.push(`PEG ${s.peg.toFixed(2)} 合理`) }
    else if (s.peg < 2.5) { score += 1 }
    else                  { notes.push(`PEG ${s.peg.toFixed(2)} 偏高`) }
  }

  // Revenue growth
  const g = s.revenueGrowthPct
  if (g !== null) {
    if (g > 40)       { score += 2; notes.push(`营收 +${g.toFixed(0)}%`) }
    else if (g > 15)  { score += 1 }
    else if (g < 0)   { score -= 1; notes.push(`营收 ${g.toFixed(0)}%`) }
  }

  // Gross margin
  const gm = s.grossMarginPct
  if (gm !== null) {
    if (gm > 65)      { score += 2; notes.push(`毛利率 ${gm.toFixed(0)}%`) }
    else if (gm > 40) { score += 1 }
  }

  const detail = notes.slice(0, 2).join(' · ') || '综合评分'

  if (score >= 7) return { label: '可关注买入', color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   detail }
  if (score >= 5) return { label: '合理持有',   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  detail }
  if (score >= 3) return { label: '观察等待',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', detail: detail || '等待更好买入时机' }
  return               { label: '估值偏贵',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  detail: notes[0] || '当前估值需谨慎，等回调' }
}

// ── Formatters ────────────────────────────────────────────────────────────────

function n(v: number | null | undefined, dec = 1, suffix = ''): string {
  if (v == null || isNaN(v)) return '—'
  return `${v.toFixed(dec)}${suffix}`
}

function cap(b: number | null | undefined): string {
  if (b == null || isNaN(b)) return '—'
  if (b >= 1000) return `$${(b / 1000).toFixed(2)}T`
  return `$${b.toFixed(0)}B`
}

function pct52(price: number, low: number | null, high: number | null): number | null {
  if (!low || !high || high === low) return null
  return ((price - low) / (high - low)) * 100
}

// ── Stock card ────────────────────────────────────────────────────────────────

function StockCard({ stock }: { stock: StockQuote }) {
  const rec = computeRec(stock)
  const up = stock.changePct >= 0
  const pos52 = pct52(stock.price, stock.low52w, stock.high52w)

  const row = (label: string, value: string, good?: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontWeight: good !== undefined ? 600 : 400,
        color: good === true ? '#22c55e' : good === false ? '#ef4444' : 'var(--text)',
      }}>{value}</span>
    </div>
  )

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '0.85rem 0.95rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em' }}>
            {stock.ticker}
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '0.1rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {stock.name}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {stock.error ? (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>加载中</span>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>${stock.price.toFixed(2)}</div>
              <div style={{ fontSize: '0.72rem', color: up ? '#22c55e' : '#ef4444', fontFamily: 'var(--font-mono)' }}>
                {up ? '+' : ''}{stock.changePct.toFixed(2)}%
              </div>
            </>
          )}
        </div>
      </div>

      {/* 52-week range bar */}
      {pos52 !== null && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
            <span>${stock.low52w?.toFixed(0)}</span>
            <span style={{ color: 'var(--text-muted)' }}>52周区间</span>
            <span>${stock.high52w?.toFixed(0)}</span>
          </div>
          <div style={{ position: 'relative', height: '4px', background: 'var(--border)', borderRadius: '2px' }}>
            <div style={{
              position: 'absolute', top: '-2px',
              left: `${Math.min(Math.max(pos52, 2), 96)}%`,
              transform: 'translateX(-50%)',
              width: '8px', height: '8px', borderRadius: '50%',
              background: pos52 > 80 ? '#22c55e' : pos52 < 20 ? '#ef4444' : 'var(--accent)',
              border: '1.5px solid var(--bg)',
            }} />
          </div>
        </div>
      )}

      {/* Metrics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.28rem', paddingTop: '0.1rem' }}>
        {row('市值', cap(stock.marketCapB))}
        {row('Forward PE', n(stock.forwardPe), stock.forwardPe !== null ? stock.forwardPe < 35 : undefined)}
        {row('PEG', n(stock.peg, 2), stock.peg !== null && stock.peg > 0 ? stock.peg < 1.5 : undefined)}
        {row('营收增速(YoY)', stock.revenueGrowthPct !== null ? `${stock.revenueGrowthPct > 0 ? '+' : ''}${stock.revenueGrowthPct.toFixed(0)}%` : '—', stock.revenueGrowthPct !== null ? stock.revenueGrowthPct > 15 : undefined)}
        {row('毛利率', n(stock.grossMarginPct, 0, '%'), stock.grossMarginPct !== null ? stock.grossMarginPct > 50 : undefined)}
        {row('运营利润率', n(stock.operatingMarginPct, 0, '%'), stock.operatingMarginPct !== null ? stock.operatingMarginPct > 15 : undefined)}
        {row('Beta', n(stock.beta, 2))}
      </div>

      {/* Recommendation */}
      <div style={{ background: rec.bg, borderRadius: '6px', padding: '0.35rem 0.5rem', marginTop: '0.1rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: rec.color }}>{rec.label}</div>
        <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)', marginTop: '0.12rem', lineHeight: 1.4 }}>
          {rec.detail}
        </div>
      </div>

      {/* Fundamentals date */}
      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'right' }}>
        基本面: {stock.fundamentalsDate}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function StockTracker() {
  const [stocks, setStocks] = useState<StockQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('全部')

  useEffect(() => {
    let cancelled = false

    const load = () => {
      fetch(`/api/stocks?tickers=${ALL_TICKERS.join(',')}`)
        .then(r => r.json())
        .then((data: StockQuote[]) => {
          if (cancelled) return
          setStocks(data)
          setLoading(false)
          setLastUpdated(new Date().toLocaleString('zh-CN', {
            month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
          }))
        })
        .catch(() => { if (!cancelled) setLoading(false) })
    }

    load()
    const timer = setInterval(load, 5 * 60 * 1000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [])

  const categories = ['全部', ...Object.keys(CATEGORIES)]

  const displayed = useMemo(() => {
    if (activeCategory === '全部') return stocks
    const tickers = CATEGORIES[activeCategory] ?? []
    return stocks.filter(s => tickers.includes(s.ticker))
  }, [stocks, activeCategory])

  return (
    <div style={{ margin: '2rem 0', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            📊 文章涉及公司实时追踪
          </span>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            价格实时 · 基本面每季更新
          </div>
        </div>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {loading ? '获取价格中...' : lastUpdated ? `价格更新于 ${lastUpdated}` : ''}
        </span>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '0.2rem 0.55rem',
              borderRadius: '5px',
              border: '1px solid var(--border)',
              background: activeCategory === cat ? 'var(--accent)' : 'transparent',
              color: activeCategory === cat ? '#fff' : 'var(--text-muted)',
              fontSize: '0.72rem',
              fontWeight: activeCategory === cat ? 600 : 400,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          正在获取实时价格...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.6rem' }}>
          {displayed.map(stock => <StockCard key={stock.ticker} stock={stock} />)}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '0.85rem', fontSize: '0.63rem', color: 'var(--text-muted)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: '0.7rem' }}>
        价格来源: Yahoo Finance（实时）· 基本面: 公司财报/公开数据（季度快照）· 买入建议基于 Forward PE / PEG / 营收增速 / 毛利率综合评分，不构成投资建议。
      </div>
    </div>
  )
}
