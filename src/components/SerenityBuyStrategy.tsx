'use client'

import { useState } from 'react'
import { BUY_STRATEGY_MATRIX, STRATEGY_SUMMARY, type BuyStrategy } from './serenity-buy-strategy'

const URGENCY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  now:   { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
  dip:   { bg: '#fffbeb', border: '#fcd34d', text: '#92400e' },
  wait:  { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
  limit: { bg: '#fff1f2', border: '#fca5a5', text: '#991b1b' },
}

function StrategyCard({ stock }: { stock: BuyStrategy }) {
  const [expanded, setExpanded] = useState(false)
  const uc = URGENCY_COLORS[stock.urgency]

  return (
    <div style={{ marginBottom: '0.375rem' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 0.75rem', borderRadius: '8px',
          border: `1px solid ${uc.border}`, backgroundColor: uc.bg,
          cursor: 'pointer', transition: 'all 0.15s', flexWrap: 'wrap',
        }}
      >
        <span style={{
          fontSize: '0.65rem', padding: '0.12rem 0.5rem', borderRadius: '10px',
          backgroundColor: uc.border, color: uc.text, fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          {stock.urgencyLabel}
        </span>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>
          {stock.name}
        </span>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {stock.ticker}
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{stock.sector}</span>
        <span style={{
          fontSize: '0.75rem', fontWeight: 700, marginLeft: 'auto',
          color: 'var(--text)', fontFamily: 'var(--font-mono)',
        }}>
          瓶颈{stock.serenityScore}/10
        </span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {expanded && (
        <div style={{
          marginTop: '0.25rem', padding: '0.75rem 0.875rem',
          borderRadius: '8px', backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
        }}>
          {/* Metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '0.625rem' }}>
            {[
              { l: '最大仓位', v: stock.maxPosition, c: '#2563eb' },
              { l: '买入区间', v: stock.entryZone, c: '#16a34a' },
              { l: '当前估算', v: stock.currentEstimate, c: 'var(--text)' },
              { l: '12M目标', v: stock.target12m, c: 'var(--text)' },
              { l: '上涨空间', v: stock.upside, c: '#16a34a' },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ fontSize: '0.65rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{l}</span><br/>
                <strong style={{ color: c, fontSize: '0.78rem' }}>{v}</strong>
              </div>
            ))}
          </div>

          {/* Catalyst */}
          <div style={{ fontSize: '0.68rem', color: 'var(--text)', marginBottom: '0.4rem', lineHeight: 1.5 }}>
            <strong>催化剂：</strong>{stock.keyCatalyst}
          </div>

          {/* Risk flags */}
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            {stock.riskFlags.map((r, i) => (
              <span key={i} style={{
                fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: '10px',
                backgroundColor: '#fff1f2', color: '#991b1b', border: '1px solid #fca5a5',
              }}>
                ⚠ {r}
              </span>
            ))}
          </div>

          {/* Serenity note */}
          <div style={{
            padding: '0.5rem 0.625rem', borderRadius: '6px',
            backgroundColor: '#faf5ff', border: '1px solid #d8b4fe',
            marginBottom: '0.5rem',
          }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#7c3aed' }}>🔮 Serenity视角</span>
            <p style={{ fontSize: '0.68rem', color: 'var(--text)', margin: '0.2rem 0 0 0', lineHeight: 1.5 }}>
              {stock.serenityNote}
            </p>
          </div>

          {/* Position advice */}
          <div style={{
            padding: '0.5rem 0.625rem', borderRadius: '6px',
            backgroundColor: '#f0fdf4', border: '1px solid #86efac',
          }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#166534' }}>📋 操作建议</span>
            <p style={{ fontSize: '0.68rem', color: 'var(--text)', margin: '0.2rem 0 0 0', lineHeight: 1.5 }}>
              {stock.positionAdvice}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SerenityBuyStrategy() {
  const [filter, setFilter] = useState<string>('all')

  const filtered = filter === 'all'
    ? BUY_STRATEGY_MATRIX
    : BUY_STRATEGY_MATRIX.filter(s => s.urgency === filter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Disclaimer */}
      <div style={{
        padding: '0.625rem 0.875rem', borderRadius: '8px',
        backgroundColor: '#fffbeb', border: '1px solid #fcd34d',
      }}>
        <p style={{ fontSize: '0.68rem', color: '#92400e', margin: 0, lineHeight: 1.5 }}>
          <strong>⚠️ 免责声明：</strong>{STRATEGY_SUMMARY.disclaimer}
        </p>
      </div>

      {/* Cash reserve warning */}
      <div style={{
        padding: '0.75rem 1rem', borderRadius: '10px',
        background: 'linear-gradient(135deg, #faf5ff, #f0fdf4)',
        border: '2px solid #7c3aed',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🔮</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#7c3aed' }}>
            Serenity 最终提醒
          </span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text)', margin: '0 0 0.5rem 0', lineHeight: 1.6 }}>
          {STRATEGY_SUMMARY.cashReserveNote}
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.3rem 0.75rem', borderRadius: '16px',
          backgroundColor: '#7c3aed', color: '#fff',
          fontSize: '0.8rem', fontWeight: 700,
        }}>
          💰 保留现金: <span style={{ fontSize: '1rem' }}>{STRATEGY_SUMMARY.cashReserve}</span>
        </div>
      </div>

      {/* Priority tiers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          行动优先级
        </span>
        {STRATEGY_SUMMARY.priorityOrder.map((tier, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
            padding: '0.5rem 0.75rem', borderRadius: '8px',
            backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
          }}>
            <span style={{
              width: '24px', height: '24px', borderRadius: '50%',
              backgroundColor: i === 0 ? '#16a34a' : i === 1 ? '#d97706' : i === 2 ? '#dc2626' : '#6b7280',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
            }}>
              {i + 1}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>
                {tier.label}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {tier.stocks.join('、')}
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.1rem', fontStyle: 'italic' }}>
                {tier.note}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Position rules */}
      <div style={{
        padding: '0.625rem 0.875rem', borderRadius: '8px',
        backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          仓位纪律
        </span>
        <ul style={{ margin: '0.3rem 0 0 1.2rem', padding: 0 }}>
          {STRATEGY_SUMMARY.positionRules.map((rule, i) => (
            <li key={i} style={{ fontSize: '0.7rem', color: 'var(--text)', lineHeight: 1.6 }}>{rule}</li>
          ))}
        </ul>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: '全部 15只' },
          { key: 'now', label: '🟢 立刻买入' },
          { key: 'dip', label: '🟡 等回调' },
          { key: 'wait', label: '🔵 持有不操作' },
          { key: 'limit', label: '🔴 严格限仓' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{
              padding: '0.2rem 0.65rem', fontSize: '0.68rem', borderRadius: '14px',
              border: '1px solid', borderColor: filter === f.key ? 'var(--accent)' : 'var(--border)',
              backgroundColor: filter === f.key ? 'var(--accent)' : 'transparent',
              color: filter === f.key ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer', fontWeight: filter === f.key ? 600 : 400,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Strategy cards */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filtered.map(stock => (
          <StrategyCard key={stock.ticker} stock={stock} />
        ))}
      </div>

      <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        Serenity Chokepoint Theory · 数据截至2026-06-04 · 不构成投资建议
      </p>
    </div>
  )
}
