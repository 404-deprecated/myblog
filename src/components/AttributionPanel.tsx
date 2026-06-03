'use client'

import { useState, useMemo } from 'react'
import { STOCK_ATTRIBUTIONS, getAttributionStats, type MoveAttribution } from './attribution-data'

const TICKERS = [
  { id: 'NVDA', name: 'NVIDIA', market: '美股' },
  { id: 'TENCENT', name: '腾讯控股', market: '港股' },
  { id: 'ORCL', name: 'Oracle', market: '美股' },
  { id: 'PDD', name: '拼多多', market: '美股' },
  { id: 'CMB', name: '招商银行', market: 'A股' },
  { id: 'NBB', name: '宁波银行', market: 'A股' },
  { id: 'MU', name: '美光科技', market: '美股' },
  { id: '005930.KS', name: '三星电子', market: '韩股' },
  { id: '000660.KS', name: 'SK海力士', market: '韩股' },
]

const STYLES = {
  card: {
    borderRadius: '10px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
    overflow: 'hidden' as const,
  },
  tickerBtn: (active: boolean) => ({
    padding: '0.35rem 0.85rem',
    fontSize: '0.78rem',
    borderRadius: '20px',
    border: '1px solid',
    borderColor: active ? 'var(--accent)' : 'var(--border)',
    backgroundColor: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)',
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
  }),
  moveBar: (chg: number) => ({
    height: '6px',
    borderRadius: '3px',
    backgroundColor: chg > 0 ? '#22c55e' : '#ef4444',
    width: `${Math.min(Math.abs(chg) / 5, 100)}%`,
    minWidth: '20px',
    transition: 'width 0.3s ease',
  }),
  tag: (type: 'macro' | 'micro' | 'label') => ({
    fontSize: '0.65rem',
    padding: '0.15rem 0.5rem',
    borderRadius: '12px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    whiteSpace: 'nowrap' as const,
    backgroundColor: type === 'macro' ? '#fffbeb' : type === 'micro' ? '#f0fdf4' : '#eff6ff',
    color: type === 'macro' ? '#92400e' : type === 'micro' ? '#166534' : '#1e40af',
    border: `1px solid ${type === 'macro' ? '#fcd34d' : type === 'micro' ? '#86efac' : '#93c5fd'}`,
  }),
}

function MoveRow({ move, isExpanded, onToggle }: {
  move: MoveAttribution
  isExpanded: boolean
  onToggle: () => void
}) {
  const isUp = move.changePct > 0
  return (
    <div style={{ marginBottom: '0.375rem' }}>
      {/* Summary row */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.625rem',
          padding: '0.5rem 0.75rem', borderRadius: '8px',
          backgroundColor: isUp ? '#f0fdf4' : '#fff1f2',
          border: `1px solid ${isUp ? '#86efac' : '#fca5a5'}`,
          cursor: 'pointer', transition: 'all 0.15s', flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', flexShrink: 0 }}>
          {move.start}→{move.end}
        </span>
        <span style={{ flex: 1, minWidth: '60px' }}>
          <div style={STYLES.moveBar(move.changePct)} />
        </span>
        <span style={{
          fontSize: '0.9rem', fontWeight: 700,
          color: isUp ? '#15803d' : '#991b1b', flexShrink: 0,
          fontFamily: 'var(--font-mono)',
        }}>
          {move.changePct > 0 ? '+' : ''}{move.changePct}%
        </span>
        <span style={{
          fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)',
          flexShrink: 0, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {move.labels[0]}
        </span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div style={{
          marginTop: '0.25rem', padding: '0.75rem 0.875rem',
          borderRadius: '8px', backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
        }}>
          {/* Labels */}
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.625rem' }}>
            {move.labels.map((l, i) => (
              <span key={i} style={STYLES.tag('label')}>{l}</span>
            ))}
          </div>

          {/* Price info */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.625rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>起: <strong style={{ color: 'var(--text)' }}>{move.startPrice.toFixed(1)}</strong></span>
            <span>终: <strong style={{ color: 'var(--text)' }}>{move.endPrice.toFixed(1)}</strong></span>
            <span>幅度: <strong style={{ color: isUp ? '#15803d' : '#991b1b' }}>{move.changePct > 0 ? '+' : ''}{move.changePct}%</strong></span>
          </div>

          {/* Macro drivers */}
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
              🌍 宏观驱动
            </div>
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {move.macroDrivers.map((d, i) => (
                <span key={i} style={STYLES.tag('macro')}>{d}</span>
              ))}
            </div>
          </div>

          {/* Micro drivers */}
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
              🏢 公司/行业驱动
            </div>
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {move.microDrivers.map((d, i) => (
                <span key={i} style={STYLES.tag('micro')}>{d}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AttributionPanel() {
  const [ticker, setTicker] = useState('NVDA')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'up' | 'down'>('all')

  const moves = useMemo(() => {
    let m = STOCK_ATTRIBUTIONS[ticker] || []
    if (filter === 'up') m = m.filter(x => x.changePct > 0)
    if (filter === 'down') m = m.filter(x => x.changePct < 0)
    return m
  }, [ticker, filter])

  const stats = useMemo(() => getAttributionStats(ticker), [ticker])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Ticker selector */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
        {TICKERS.map(t => (
          <button key={t.id} onClick={() => { setTicker(t.id); setExpandedIdx(null) }}
            style={STYLES.tickerBtn(ticker === t.id)}>
            {t.name}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        <span>波动段: <strong style={{ color: 'var(--text)' }}>{stats.total}</strong></span>
        <span>归因覆盖: <strong style={{ color: '#16a34a' }}>{stats.coverage}%</strong></span>
        <span>最大涨幅: <strong style={{ color: '#15803d' }}>+{stats.maxUp}%</strong></span>
        <span>最大跌幅: <strong style={{ color: '#991b1b' }}>{stats.maxDown}%</strong></span>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.375rem' }}>
        {(['all', 'up', 'down'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '0.2rem 0.75rem', fontSize: '0.7rem', borderRadius: '14px',
              border: '1px solid', borderColor: filter === f ? 'var(--accent)' : 'var(--border)',
              backgroundColor: filter === f ? 'var(--accent)' : 'transparent',
              color: filter === f ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer', fontWeight: filter === f ? 600 : 400,
            }}>
            {{ all: '全部', up: '📈 上涨', down: '📉 下跌' }[f]}
          </button>
        ))}
      </div>

      {/* Move list */}
      <div style={STYLES.card}>
        <div style={{ padding: '0.875rem 1rem' }}>
          {moves.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
              该筛选项下无数据
            </p>
          )}
          {moves.map((move, idx) => (
            <MoveRow
              key={`${move.start}-${move.end}`}
              move={move}
              isExpanded={expandedIdx === idx}
              onToggle={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            />
          ))}
        </div>
      </div>

      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        基于月度收盘价 · 归因由 AI 辅助生成 · 仅供参考
      </p>
    </div>
  )
}
