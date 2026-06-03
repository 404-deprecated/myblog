'use client'

import { useState, useMemo } from 'react'
import { SECTOR_WATCHLIST, type SectorGroup, type SectorStock } from './sector-watchlist-data'

function StockRow({ stock, color }: { stock: SectorStock; color: string }) {
  const [expanded, setExpanded] = useState(false)

  const riskColors: Record<string, { bg: string; text: string; label: string }> = {
    low:  { bg: '#f0fdf4', text: '#166534', label: '低风险' },
    med:  { bg: '#fffbeb', text: '#92400e', label: '中风险' },
    high: { bg: '#fff1f2', text: '#991b1b', label: '高风险' },
  }
  const rc = riskColors[stock.risk]

  return (
    <div style={{ marginBottom: '0.25rem' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.45rem 0.75rem', borderRadius: '6px',
          border: `1px solid var(--border)`,
          cursor: 'pointer', transition: 'all 0.15s',
          backgroundColor: expanded ? 'var(--bg-secondary)' : 'transparent',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', minWidth: '100px' }}>
          {stock.name}
        </span>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: '60px' }}>
          {stock.ticker}
        </span>
        <span style={{
          fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: '8px',
          backgroundColor: stock.exchange === 'A股' ? '#eff6ff' : stock.exchange === '港股' ? '#fef3c7' : '#f0fdf4',
          color: stock.exchange === 'A股' ? '#1e40af' : stock.exchange === '港股' ? '#92400e' : '#166534',
        }}>
          {stock.exchange}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
          {stock.currentPrice}
        </span>
        <span style={{
          fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '8px',
          backgroundColor: rc.bg, color: rc.text,
        }}>
          {rc.label}
        </span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {expanded && (
        <div style={{
          marginTop: '0.2rem', marginLeft: '0.5rem', padding: '0.625rem 0.875rem',
          borderRadius: '8px', backgroundColor: 'var(--bg-secondary)',
          border: `1px solid var(--border)`, borderLeft: `3px solid ${color}`,
        }}>
          {/* Key metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {[
              { label: '市值', value: stock.marketCap },
              { label: '当前价', value: stock.currentPrice },
              { label: '合理买入区', value: stock.buyZone },
              { label: '12M目标价', value: stock.targetPrice },
              { label: '上涨空间', value: stock.upside },
              { label: '预计CAGR', value: stock.growthCAGR },
            ].map(item => (
              <div key={item.label} style={{ fontSize: '0.65rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                <br/>
                <strong style={{
                  color: item.label === '上涨空间' ? '#16a34a' : item.label === '合理买入区' ? '#2563eb' : 'var(--text)',
                  fontSize: item.label === '上涨空间' ? '0.85rem' : '0.72rem',
                }}>
                  {item.value}
                </strong>
              </div>
            ))}
          </div>

          {/* Industry Ranking */}
          <div style={{
            marginBottom: '0.5rem', padding: '0.4rem 0.6rem',
            borderRadius: '6px', backgroundColor: `${color}10`,
            border: `1px solid ${color}30`,
          }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: color, textTransform: 'uppercase' }}>🏆 行业排名</span>
            <p style={{ fontSize: '0.7rem', color: 'var(--text)', margin: '0.2rem 0 0 0', lineHeight: 1.5 }}>
              {stock.rank}
            </p>
          </div>

          {/* Supply Chain */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{
              padding: '0.4rem 0.6rem', borderRadius: '6px',
              backgroundColor: '#fffbeb', border: '1px solid #fcd34d',
            }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#92400e' }}>⬆️ 上游供应商</span>
              <p style={{ fontSize: '0.65rem', color: 'var(--text)', margin: '0.15rem 0 0 0', lineHeight: 1.5 }}>
                {stock.upstream}
              </p>
            </div>
            <div style={{
              padding: '0.4rem 0.6rem', borderRadius: '6px',
              backgroundColor: '#f0fdf4', border: '1px solid #86efac',
            }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#166534' }}>⬇️ 下游客户</span>
              <p style={{ fontSize: '0.65rem', color: 'var(--text)', margin: '0.15rem 0 0 0', lineHeight: 1.5 }}>
                {stock.downstream}
              </p>
            </div>
          </div>

          <div style={{ fontSize: '0.7rem', color: 'var(--text)', lineHeight: 1.5, marginBottom: '0.35rem' }}>
            <span style={{ fontWeight: 600 }}>催化剂：</span>{stock.catalyst}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {stock.note}
          </div>
        </div>
      )}
    </div>
  )
}

function SectorCard({ sector, color }: { sector: SectorGroup; color: string }) {
  const [showAll, setShowAll] = useState(false)
  const displayStocks = showAll ? sector.stocks : sector.stocks.slice(0, 5)

  return (
    <div style={{
      borderRadius: '10px', border: `1px solid var(--border)`,
      backgroundColor: 'var(--surface)', overflow: 'hidden',
    }}>
      {/* Sector Header */}
      <div style={{
        padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)',
        background: `linear-gradient(135deg, ${color}10, transparent)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '0.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.3rem' }}>{sector.icon}</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{sector.name}</span>
          <span style={{
            fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '10px',
            backgroundColor: `${color}18`, color, fontWeight: 600,
          }}>
            {sector.totalMarket}
          </span>
        </div>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          {sector.stocks.length}只标的
        </span>
      </div>

      {/* Sector description */}
      <div style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4, borderBottom: '1px solid var(--border)' }}>
        {sector.description}
      </div>

      {/* Stock list */}
      <div style={{ padding: '0.5rem 0.75rem' }}>
        {displayStocks.map(stock => (
          <StockRow key={stock.ticker} stock={stock} color={color} />
        ))}
        {sector.stocks.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            style={{
              width: '100%', padding: '0.35rem', marginTop: '0.25rem',
              fontSize: '0.7rem', color, border: 'none', background: 'none',
              cursor: 'pointer', fontWeight: 600,
            }}
          >
            {showAll ? '收起' : `展开全部 ${sector.stocks.length} 只`}
          </button>
        )}
      </div>
    </div>
  )
}

export default function SectorWatchlist() {
  const [activeSector, setActiveSector] = useState<string | null>(null)

  const sectors = SECTOR_WATCHLIST

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Quick nav */}
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveSector(null)}
          style={{
            padding: '0.25rem 0.7rem', fontSize: '0.7rem', borderRadius: '16px',
            border: '1px solid', borderColor: activeSector === null ? 'var(--accent)' : 'var(--border)',
            backgroundColor: activeSector === null ? 'var(--accent)' : 'transparent',
            color: activeSector === null ? '#fff' : 'var(--text-muted)',
            cursor: 'pointer', fontWeight: activeSector === null ? 600 : 400,
          }}>
          全部赛道
        </button>
        {sectors.map(s => (
          <button
            key={s.name}
            onClick={() => setActiveSector(activeSector === s.name ? null : s.name)}
            style={{
              padding: '0.25rem 0.7rem', fontSize: '0.7rem', borderRadius: '16px',
              border: '1px solid', borderColor: activeSector === s.name ? s.color : 'var(--border)',
              backgroundColor: activeSector === s.name ? `${s.color}18` : 'transparent',
              color: activeSector === s.name ? s.color : 'var(--text-muted)',
              cursor: 'pointer', fontWeight: activeSector === s.name ? 600 : 400,
            }}>
            {s.icon} {s.name}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex', gap: '1.5rem', fontSize: '0.72rem', color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)', flexWrap: 'wrap',
      }}>
        <span>赛道: <strong style={{ color: 'var(--text)' }}>{sectors.length}</strong></span>
        <span>标的: <strong style={{ color: 'var(--text)' }}>{sectors.reduce((sum, s) => sum + s.stocks.length, 0)}</strong></span>
        <span>综合潜在空间: <strong style={{ color: '#16a34a' }}>+50% avg</strong></span>
      </div>

      {/* Sector cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {sectors
          .filter(s => !activeSector || s.name === activeSector)
          .map(s => (
            <SectorCard key={s.name} sector={s} color={s.color} />
          ))}
      </div>

      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        数据来源: 十五五规划纲要、国务院AI+行动意见、工信部 · 价格为合理估算区间 · 仅供参考不构成投资建议
      </p>
    </div>
  )
}
