'use client'

import { useState, useCallback } from 'react'
import type { StockQuote } from '@/app/api/stocks/route'

interface Sector {
  id: string
  name: string
  tickers: string[]
  color: string
}

const SECTORS: Sector[] = [
  { id: 'ai-infra',   name: 'AI 基础设施',      color: '#2563eb', tickers: ['NVDA','AMD','AVGO','ANET','SMCI','ARM','TSM','MRVL','INTC','QCOM'] },
  { id: 'ai-soft',    name: 'AI 企业软件重构',   color: '#7c3aed', tickers: ['MSFT','GOOGL','AMZN','META','ORCL','NOW','CRM','ADBE','PLTR','SNOW'] },
  { id: 'embodied',   name: '具身智能',          color: '#0891b2', tickers: ['TSLA','ISRG','SYM','ABB','HON','APP','NVDA','GOOGL','AMZN','BRKS'] },
  { id: 'energy',     name: 'AI 能源 / 核能',    color: '#d97706', tickers: ['CEG','VST','GEV','NNE','CCJ','SMR','BWX','OKLO','NEE','AES'] },
  { id: 'quantum',    name: '量子计算',           color: '#db2777', tickers: ['IONQ','RGTI','QBTS','IBM','QUBT','GOOGL','MSFT','HON','NVDA','AMZN'] },
  { id: 'bio',        name: 'AI 生物医药',        color: '#16a34a', tickers: ['LLY','MRNA','RXRX','CRSP','EDIT','BEAM','NTLA','SANA','REGN','GOOGL'] },
  { id: 'nev',        name: '新能源汽车',         color: '#ea580c', tickers: ['TSLA','NIO','XPEV','LI','RIVN','LCID','F','GM','STLA','BLNK'] },
]

function daysUntil(dateStr: string): number {
  if (!dateStr || dateStr === '—') return Infinity
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.round(diff / 86400000)
}

function EarningsBadge({ date }: { date: string }) {
  if (!date || date === '—') return null
  const days = daysUntil(date)
  if (days < -7) return null  // past, skip
  const color = days <= 7 ? '#dc2626' : days <= 30 ? '#d97706' : '#16a34a'
  const label = days < 0 ? `${Math.abs(days)}天前` : days === 0 ? '今天' : `${days}天后`
  return (
    <span style={{
      fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '10px',
      backgroundColor: color + '18', color, border: `1px solid ${color}40`,
      fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      📅 {date.slice(5)} ({label})
    </span>
  )
}

function PEBar({ pe, maxPe = 120 }: { pe: number | null; maxPe?: number }) {
  if (pe === null) return <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>N/A</span>
  const pct = Math.min((pe / maxPe) * 100, 100)
  const color = pe < 20 ? '#16a34a' : pe < 40 ? '#d97706' : pe < 80 ? '#ea580c' : '#dc2626'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
      <div style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 600, color, minWidth: '2.5rem', textAlign: 'right' }}>{pe}x</span>
    </div>
  )
}

function StockRow({ stock }: { stock: StockQuote }) {
  const [expanded, setExpanded] = useState(false)
  const changePct = stock.changePct
  const changeColor = changePct >= 0 ? '#16a34a' : '#dc2626'

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
          padding: '0.6rem 0.875rem', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', width: '3rem', flexShrink: 0 }}>
          {stock.ticker}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {stock.name}
        </span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', width: '3.5rem', textAlign: 'right', flexShrink: 0 }}>
          {stock.error ? '—' : `$${stock.price.toFixed(0)}`}
        </span>
        <span style={{ fontSize: '0.7rem', color: changeColor, width: '3.2rem', textAlign: 'right', flexShrink: 0 }}>
          {stock.error ? '' : `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%`}
        </span>
        <div style={{ width: '8rem', flexShrink: 0 }}>
          <PEBar pe={stock.forwardPe} />
        </div>
        <EarningsBadge date={stock.nextEarnings} />
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '0.25rem' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 0.875rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
            {[
              ['财报日期', stock.nextEarnings === '—' ? '暂无' : stock.nextEarnings],
              ['前向PE', stock.forwardPe != null ? `${stock.forwardPe}x` : 'N/A'],
              ['营收增速', stock.revenueGrowthPct != null ? `${stock.revenueGrowthPct}%` : 'N/A'],
              ['毛利率', stock.grossMarginPct != null ? `${stock.grossMarginPct}%` : 'N/A'],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: '0.375rem 0.5rem', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{k}</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '0.5rem 0.625rem', borderRadius: '6px', backgroundColor: '#fef3c7', borderLeft: '3px solid #d97706' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#92400e', marginBottom: '0.2rem' }}>财报前策略</div>
            <div style={{ fontSize: '0.72rem', color: '#78350f', lineHeight: 1.5 }}>{stock.preEarningsAction}</div>
          </div>
          <div style={{ padding: '0.5rem 0.625rem', borderRadius: '6px', backgroundColor: '#f0fdf4', borderLeft: '3px solid #16a34a' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#14532d', marginBottom: '0.2rem' }}>财报后策略</div>
            <div style={{ fontSize: '0.72rem', color: '#166534', lineHeight: 1.5 }}>{stock.postEarningsAction}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function SectorCard({ sector }: { sector: Sector }) {
  const [open, setOpen] = useState(false)
  const [stocks, setStocks] = useState<StockQuote[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (stocks.length || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/stocks?tickers=${[...new Set(sector.tickers)].join(',')}`)
      const data: StockQuote[] = await res.json()
      // preserve sector order
      const map = new Map(data.map(s => [s.ticker, s]))
      setStocks([...new Set(sector.tickers)].map(t => map.get(t)).filter(Boolean) as StockQuote[])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [sector.tickers, stocks.length, loading])

  const toggle = () => {
    if (!open) load()
    setOpen(o => !o)
  }

  return (
    <div style={{
      borderRadius: '10px',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      backgroundColor: 'var(--surface)',
    }}>
      <button
        onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.875rem 1rem', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: sector.color, flexShrink: 0 }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', flex: 1 }}>
          {sector.name}
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {sector.tickers.slice(0, 4).join(' · ')} …
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {/* header row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.4rem 0.875rem',
            backgroundColor: 'var(--bg-secondary)',
            fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600,
          }}>
            <span style={{ width: '3rem' }}>代码</span>
            <span style={{ flex: 1 }}>公司</span>
            <span style={{ width: '3.5rem', textAlign: 'right' }}>股价</span>
            <span style={{ width: '3.2rem', textAlign: 'right' }}>涨跌</span>
            <span style={{ width: '8rem' }}>前向PE估值风险</span>
            <span>下次财报</span>
          </div>

          {loading && (
            <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              加载中…
            </div>
          )}

          {stocks.map(s => <StockRow key={s.ticker} stock={s} />)}
        </div>
      )}
    </div>
  )
}

export function SectorValuation() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {SECTORS.map(s => <SectorCard key={s.id} sector={s} />)}
    </div>
  )
}
