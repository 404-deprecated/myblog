'use client'

import { useState } from 'react'
import { SECTOR_WATCHLIST, type SectorGroup, type SectorStock } from './sector-watchlist-data'

// Extract A-share stocks from sector data
function getAShareStocks(): { sector: string; icon: string; color: string; stocks: SectorStock[] }[] {
  return SECTOR_WATCHLIST.map(s => ({
    sector: s.name,
    icon: s.icon,
    color: s.color,
    stocks: s.stocks.filter(st => st.exchange === 'A股'),
  })).filter(s => s.stocks.length > 0)
}

export default function SectorQuickAccess({ onSelect, activeCodes }: {
  onSelect: (codes: string[]) => void
  activeCodes: string[]
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const sectors = getAShareStocks()

  const toggleSector = (name: string) => {
    setCollapsed(prev => ({ ...prev, [name]: !prev[name] }))
  }

  const handleStockClick = (stock: SectorStock) => {
    // Extract pure code from ticker (e.g., '000977.SZ' → '000977')
    const code = stock.ticker.replace(/\.(SZ|SH)$/i, '')
    if (/^\d{6}$/.test(code)) {
      // Toggle: remove if already active, add if not
      if (activeCodes.includes(code)) {
        onSelect(activeCodes.filter(c => c !== code))
      } else {
        onSelect([...activeCodes, code])
      }
    }
  }

  const isActive = (stock: SectorStock) => {
    const code = stock.ticker.replace(/\.(SZ|SH)$/i, '')
    return activeCodes.includes(code)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
        十五五策略 · A股快捷选股（点击添加/移除）
      </div>

      {sectors.map(s => (
        <div key={s.sector} style={{
          borderRadius: '8px', border: `1px solid ${s.color}30`,
          backgroundColor: 'var(--surface)', overflow: 'hidden',
        }}>
          {/* Sector header */}
          <div
            onClick={() => toggleSector(s.sector)}
            style={{
              padding: '0.35rem 0.65rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              backgroundColor: `${s.color}08`,
              borderBottom: collapsed[s.sector] ? 'none' : `1px solid var(--border)`,
            }}
          >
            <span style={{ fontSize: '0.85rem' }}>{s.icon}</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)' }}>
              {s.sector}
            </span>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {s.stocks.length}只
            </span>
            <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {collapsed[s.sector] ? '▶' : '▼'}
            </span>
          </div>

          {/* Stock chips */}
          {!collapsed[s.sector] && (
            <div style={{
              padding: '0.35rem 0.5rem',
              display: 'flex', flexWrap: 'wrap', gap: '0.25rem',
            }}>
              {s.stocks.map(stock => {
                const active = isActive(stock)
                const code = stock.ticker.replace(/\.(SZ|SH)$/i, '')
                return (
                  <button
                    key={stock.ticker}
                    onClick={() => handleStockClick(stock)}
                    title={stock.name}
                    style={{
                      padding: '0.15rem 0.45rem', fontSize: '0.6rem',
                      borderRadius: '10px', cursor: 'pointer',
                      fontFamily: 'var(--font-mono)',
                      border: `1px solid ${active ? s.color : 'var(--border)'}`,
                      backgroundColor: active ? `${s.color}18` : 'transparent',
                      color: active ? s.color : 'var(--text-muted)',
                      fontWeight: active ? 600 : 400,
                      transition: 'all 0.1s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {active ? '✓ ' : ''}{code} {stock.name.length > 4 ? stock.name.slice(0, 4) + '…' : stock.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}

      {/* Bulk actions */}
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        <button onClick={() => {
          const all = sectors.flatMap(s => s.stocks.map(st => st.ticker.replace(/\.(SZ|SH)$/i, '')).filter(c => /^\d{6}$/.test(c)))
          onSelect(all)
        }} style={{
          padding: '0.2rem 0.6rem', fontSize: '0.62rem', borderRadius: '8px',
          border: '1px solid var(--accent)', backgroundColor: 'transparent',
          color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font-mono)',
        }}>
          全选A股
        </button>
        <button onClick={() => onSelect([])} style={{
          padding: '0.2rem 0.6rem', fontSize: '0.62rem', borderRadius: '8px',
          border: '1px solid var(--border)', backgroundColor: 'transparent',
          color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)',
        }}>
          清空
        </button>
        <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
          已选 {activeCodes.length} 只
        </span>
      </div>
    </div>
  )
}
