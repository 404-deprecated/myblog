'use client'

import { useEffect, useState } from 'react'

interface HistoryPoint {
  date: string
  value: number
}

interface TickerData {
  current: number
  previous: number
  change: number
  changePct: number
  history: HistoryPoint[]
  updatedAt: string
}

interface SpreadData {
  current: number
  history: HistoryPoint[]
  updatedAt: string
}

interface StaticIndicator {
  current: number
  updatedAt: string
}

interface MarketData {
  sp500: TickerData | null
  nasdaq: TickerData | null
  vix: TickerData | null
  yieldSpread: SpreadData | null
  cape: StaticIndicator
  buffett: StaticIndicator
  breadth: StaticIndicator
  fetchedAt: string
}

// ── SVG sparkline ────────────────────────────────────────────────────────────

function Sparkline({
  history,
  color,
  width = 160,
  height = 48,
}: {
  history: HistoryPoint[]
  color: string
  width?: number
  height?: number
}) {
  const values = history.map((d) => d.value).filter((v) => v != null && !isNaN(v))
  if (values.length < 2) return <div style={{ width, height }} />

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pad = 4

  const pts = values
    .map((v, i) => {
      const x = ((i / (values.length - 1)) * (width - pad * 2) + pad).toFixed(1)
      const y = (height - pad - ((v - min) / range) * (height - pad * 2)).toFixed(1)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  )
}

// ── Gauge bar ────────────────────────────────────────────────────────────────

function GaugeBar({
  value,
  min,
  max,
  zones,
}: {
  value: number
  min: number
  max: number
  zones: { from: number; to: number; color: string }[]
}) {
  const clamp = Math.min(Math.max(value, min), max)
  const pct = ((clamp - min) / (max - min)) * 100

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div
        style={{
          position: 'relative',
          height: '6px',
          borderRadius: '3px',
          background: 'var(--border)',
          overflow: 'visible',
        }}
      >
        {zones.map((z, i) => {
          const left = ((Math.max(z.from, min) - min) / (max - min)) * 100
          const right = ((Math.min(z.to, max) - min) / (max - min)) * 100
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: 0,
                left: `${left}%`,
                width: `${right - left}%`,
                height: '100%',
                background: z.color,
                opacity: 0.35,
                borderRadius: '3px',
              }}
            />
          )
        })}
        <div
          style={{
            position: 'absolute',
            top: '-3px',
            left: `${pct}%`,
            transform: 'translateX(-50%)',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: 'var(--text)',
            border: '2px solid var(--bg)',
            zIndex: 2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '0.3rem',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

// ── Individual cards ─────────────────────────────────────────────────────────

function TickerCard({
  label,
  data,
  fmt,
  color,
}: {
  label: string
  data: TickerData | null
  fmt: (v: number) => string
  color: string
}) {
  const up = (data?.change ?? 0) >= 0
  const changeColor = up ? '#22c55e' : '#ef4444'

  return (
    <div style={cardStyle}>
      <div style={labelStyle}>{label}</div>
      {data ? (
        <>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
            {fmt(data.current)}
          </div>
          <div style={{ fontSize: '0.78rem', color: changeColor, fontFamily: 'var(--font-mono)', marginBottom: '0.75rem' }}>
            {up ? '▲' : '▼'} {fmt(Math.abs(data.change))} ({data.changePct >= 0 ? '+' : ''}{data.changePct.toFixed(2)}%)
          </div>
          <Sparkline history={data.history} color={color} />
        </>
      ) : (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>数据加载中...</div>
      )}
    </div>
  )
}

function VixCard({ data }: { data: TickerData | null }) {
  const v = data?.current ?? 17.2
  const signal = v < 12 ? { label: '极度平静 ⚠', color: '#f59e0b' }
    : v < 20 ? { label: '正常', color: '#22c55e' }
    : v < 30 ? { label: '波动偏高 🟡', color: '#f59e0b' }
    : { label: '恐慌 🔴', color: '#ef4444' }

  return (
    <div style={cardStyle}>
      <div style={labelStyle}>VIX 恐慌指数</div>
      {data ? (
        <>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
            {v.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.78rem', color: signal.color, marginBottom: '0.75rem' }}>{signal.label}</div>
          <Sparkline history={data.history} color={signal.color} />
          <GaugeBar
            value={v}
            min={0}
            max={45}
            zones={[
              { from: 0, to: 12, color: '#f59e0b' },
              { from: 12, to: 20, color: '#22c55e' },
              { from: 20, to: 30, color: '#f59e0b' },
              { from: 30, to: 45, color: '#ef4444' },
            ]}
          />
        </>
      ) : (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>数据加载中...</div>
      )}
    </div>
  )
}

function SpreadCard({ data }: { data: SpreadData | null }) {
  const v = data?.current ?? 0.48
  const inverted = v < 0
  const signal = inverted
    ? { label: '倒挂 🔴', color: '#ef4444' }
    : v < 0.3
    ? { label: '接近倒挂 🟡', color: '#f59e0b' }
    : { label: '正常', color: '#22c55e' }

  return (
    <div style={cardStyle}>
      <div style={labelStyle}>2s10s 利差</div>
      {data ? (
        <>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
            {v >= 0 ? '+' : ''}{v.toFixed(2)}%
          </div>
          <div style={{ fontSize: '0.78rem', color: signal.color, marginBottom: '0.75rem' }}>{signal.label}</div>
          <Sparkline history={data.history} color={signal.color} />
          <GaugeBar
            value={v}
            min={-2}
            max={2}
            zones={[
              { from: -2, to: 0, color: '#ef4444' },
              { from: 0, to: 0.3, color: '#f59e0b' },
              { from: 0.3, to: 2, color: '#22c55e' },
            ]}
          />
          {data.updatedAt && (
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.4rem', fontFamily: 'var(--font-mono)' }}>
              FRED · {data.updatedAt}
            </div>
          )}
        </>
      ) : (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>数据加载中...</div>
      )}
    </div>
  )
}

function CapeCard({ data }: { data: StaticIndicator }) {
  const v = data.current
  const signal = v > 35 ? { label: '极度高估 ✅触发', color: '#ef4444' }
    : v > 25 ? { label: '偏高 🟡', color: '#f59e0b' }
    : { label: '合理', color: '#22c55e' }

  return (
    <div style={cardStyle}>
      <div style={labelStyle}>席勒 CAPE</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
        {v.toFixed(1)}
      </div>
      <div style={{ fontSize: '0.78rem', color: signal.color, marginBottom: '0.75rem' }}>{signal.label}</div>
      <GaugeBar
        value={v}
        min={8}
        max={48}
        zones={[
          { from: 8, to: 16, color: '#22c55e' },
          { from: 16, to: 25, color: '#22c55e' },
          { from: 25, to: 35, color: '#f59e0b' },
          { from: 35, to: 48, color: '#ef4444' },
        ]}
      />
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.75rem', fontFamily: 'var(--font-mono)' }}>
        历史均值 16 · 月度更新 · {data.updatedAt}
      </div>
    </div>
  )
}

function BuffettCard({ data }: { data: StaticIndicator }) {
  const v = data.current
  const signal = v > 200 ? { label: '创历史纪录 ✅触发', color: '#ef4444' }
    : v > 150 ? { label: '过热 🟡', color: '#f59e0b' }
    : { label: '正常', color: '#22c55e' }

  return (
    <div style={cardStyle}>
      <div style={labelStyle}>巴菲特指标</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
        {v.toFixed(1)}%
      </div>
      <div style={{ fontSize: '0.78rem', color: signal.color, marginBottom: '0.75rem' }}>{signal.label}</div>
      <GaugeBar
        value={v}
        min={40}
        max={260}
        zones={[
          { from: 40, to: 100, color: '#22c55e' },
          { from: 100, to: 150, color: '#22c55e' },
          { from: 150, to: 200, color: '#f59e0b' },
          { from: 200, to: 260, color: '#ef4444' },
        ]}
      />
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.75rem', fontFamily: 'var(--font-mono)' }}>
        &gt;200% 警戒线 · 月度更新 · {data.updatedAt}
      </div>
    </div>
  )
}

function BreadthCard({ data }: { data: StaticIndicator }) {
  const v = data.current
  const signal = v > 70 ? { label: '健康', color: '#22c55e' }
    : v > 50 ? { label: '收窄 🟡', color: '#f59e0b' }
    : { label: '弱势 🔴', color: '#ef4444' }

  return (
    <div style={cardStyle}>
      <div style={labelStyle}>市场宽度</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
        {v.toFixed(1)}%
      </div>
      <div style={{ fontSize: '0.78rem', color: signal.color, marginBottom: '0.75rem' }}>{signal.label}</div>
      <GaugeBar
        value={v}
        min={20}
        max={100}
        zones={[
          { from: 20, to: 50, color: '#ef4444' },
          { from: 50, to: 70, color: '#f59e0b' },
          { from: 70, to: 100, color: '#22c55e' },
        ]}
      />
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.75rem', fontFamily: 'var(--font-mono)' }}>
        S&P 500 个股在200日均线上方 · 周度更新 · {data.updatedAt}
      </div>
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '1rem 1.1rem 1.1rem',
  minWidth: 0,
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-muted)',
  marginBottom: '0.4rem',
  fontFamily: 'var(--font-mono)',
}

// ── Main export ──────────────────────────────────────────────────────────────

export function MarketIndicators() {
  const [data, setData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = () => {
      fetch('/api/market-data')
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) {
            setData(d)
            setLoading(false)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError(true)
            setLoading(false)
          }
        })
    }

    load()
    const timer = setInterval(load, 5 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const updatedAt = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1.25rem',
        margin: '2rem 0',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          市场指标实时面板
        </span>
        {loading && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>加载中...</span>
        )}
        {error && (
          <span style={{ fontSize: '0.72rem', color: '#ef4444' }}>数据加载失败，显示备用数据</span>
        )}
        {updatedAt && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            更新于 {updatedAt} · 每5分钟刷新
          </span>
        )}
      </div>

      {/* Row 1: Index prices + VIX */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
          marginBottom: '0.75rem',
        }}
      >
        <TickerCard
          label="S&P 500"
          data={data?.sp500 ?? null}
          fmt={(v) => v.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          color="var(--accent)"
        />
        <TickerCard
          label="纳斯达克"
          data={data?.nasdaq ?? null}
          fmt={(v) => v.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          color="#8b5cf6"
        />
        <VixCard data={data?.vix ?? null} />
        <SpreadCard data={data?.yieldSpread ?? null} />
      </div>

      {/* Row 2: Valuation gauges */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
        }}
      >
        <CapeCard data={data?.cape ?? { current: 39.7, updatedAt: '2026-05-01' }} />
        <BuffettCard data={data?.buffett ?? { current: 230.0, updatedAt: '2026-05-01' }} />
        <BreadthCard data={data?.breadth ?? { current: 56.9, updatedAt: '2026-05-08' }} />
        <div
          style={{
            ...cardStyle,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.4rem',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
          }}
        >
          <div style={{ ...labelStyle, marginBottom: '0.5rem' }}>数据来源</div>
          <div>📈 指数/VIX: Yahoo Finance</div>
          <div>📊 利差: FRED (T10Y2Y)</div>
          <div>📋 CAPE/巴菲特/宽度:</div>
          <div style={{ paddingLeft: '1rem' }}>每月/每周手动更新</div>
          <div style={{ marginTop: '0.4rem', fontSize: '0.68rem' }}>
            免责声明：不构成投资建议
          </div>
        </div>
      </div>
    </div>
  )
}
