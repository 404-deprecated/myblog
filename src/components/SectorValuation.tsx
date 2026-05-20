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
  if (days < -7) return null
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
    <div style={{ borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden', backgroundColor: 'var(--surface)' }}>
      <button
        onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.875rem 1rem', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: sector.color, flexShrink: 0 }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', flex: 1 }}>{sector.name}</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {sector.tickers.slice(0, 4).join(' · ')} …
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.4rem 0.875rem', backgroundColor: 'var(--bg-secondary)',
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

// ── Comps view helpers ──────────────────────────────────────────────

function median(vals: number[]): number {
  if (!vals.length) return 0
  const sorted = [...vals].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function percentile(vals: number[], p: number): number {
  if (!vals.length) return 0
  const sorted = [...vals].sort((a, b) => a - b)
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

type CellSentiment = 'good' | 'bad' | 'neutral'

function cellBg(sentiment: CellSentiment): string {
  if (sentiment === 'good') return 'rgba(22,163,74,0.10)'
  if (sentiment === 'bad')  return 'rgba(220,38,38,0.10)'
  return 'transparent'
}

function cellColor(sentiment: CellSentiment): string {
  if (sentiment === 'good') return '#15803d'
  if (sentiment === 'bad')  return '#b91c1c'
  return 'var(--text)'
}

function sentiment(value: number | null, med: number | null, lowerIsBetter: boolean): CellSentiment {
  if (value === null || med === null) return 'neutral'
  if (lowerIsBetter) return value < med ? 'good' : value > med * 1.1 ? 'bad' : 'neutral'
  return value > med ? 'good' : value < med * 0.9 ? 'bad' : 'neutral'
}

interface CompsCellProps {
  value: number | null
  suffix?: string
  decimals?: number
  sent: CellSentiment
  isStats?: boolean
}

function CompsCell({ value, suffix = '', decimals = 1, sent, isStats }: CompsCellProps) {
  const bg = isStats ? 'transparent' : cellBg(sent)
  const color = isStats ? 'var(--text-muted)' : cellColor(sent)
  return (
    <td style={{
      padding: '0.45rem 0.625rem', textAlign: 'right', fontSize: '0.75rem',
      fontFamily: 'var(--font-mono)', backgroundColor: bg, color,
      fontWeight: isStats ? 500 : 600,
    }}>
      {value === null ? '—' : `${value.toFixed(decimals)}${suffix}`}
    </td>
  )
}

type StatsRow = { label: string; revGrowth: number | null; grossMargin: number | null; opMargin: number | null; fwdPe: number | null; peg: number | null; evRevenue: number | null }

function CompsTable({ stocks }: { stocks: StockQuote[] }) {
  const valid = stocks.filter(s => !s.error)

  const revGrowths  = valid.map(s => s.revenueGrowthPct).filter((v): v is number => v !== null)
  const grossMargins = valid.map(s => s.grossMarginPct).filter((v): v is number => v !== null)
  const opMargins   = valid.map(s => s.operatingMarginPct).filter((v): v is number => v !== null)
  const fwdPes      = valid.map(s => s.forwardPe).filter((v): v is number => v !== null)
  const pegs        = valid.map(s => s.peg).filter((v): v is number => v !== null)
  const evRevenues  = valid.map(s => s.evRevenue).filter((v): v is number => v !== null)

  const medRevGrowth  = revGrowths.length  ? median(revGrowths)   : null
  const medGrossMargin = grossMargins.length ? median(grossMargins) : null
  const medOpMargin   = opMargins.length   ? median(opMargins)    : null
  const medFwdPe      = fwdPes.length      ? median(fwdPes)       : null
  const medPeg        = pegs.length        ? median(pegs)         : null
  const medEvRevenue  = evRevenues.length  ? median(evRevenues)   : null

  const statsRows: StatsRow[] = [
    {
      label: '中位数',
      revGrowth:   medRevGrowth,
      grossMargin: medGrossMargin,
      opMargin:    medOpMargin,
      fwdPe:       medFwdPe,
      peg:         medPeg,
      evRevenue:   medEvRevenue,
    },
    {
      label: '75th%',
      revGrowth:   revGrowths.length  ? percentile(revGrowths, 75)   : null,
      grossMargin: grossMargins.length ? percentile(grossMargins, 75) : null,
      opMargin:    opMargins.length   ? percentile(opMargins, 75)    : null,
      fwdPe:       fwdPes.length      ? percentile(fwdPes, 75)       : null,
      peg:         pegs.length        ? percentile(pegs, 75)         : null,
      evRevenue:   evRevenues.length  ? percentile(evRevenues, 75)   : null,
    },
    {
      label: '25th%',
      revGrowth:   revGrowths.length  ? percentile(revGrowths, 25)   : null,
      grossMargin: grossMargins.length ? percentile(grossMargins, 25) : null,
      opMargin:    opMargins.length   ? percentile(opMargins, 25)    : null,
      fwdPe:       fwdPes.length      ? percentile(fwdPes, 25)       : null,
      peg:         pegs.length        ? percentile(pegs, 25)         : null,
      evRevenue:   evRevenues.length  ? percentile(evRevenues, 25)   : null,
    },
  ]

  const thStyle: React.CSSProperties = { padding: '0.5rem 0.625rem', textAlign: 'right', fontSize: '0.65rem', fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap' }
  const thLeft: React.CSSProperties = { ...thStyle, textAlign: 'left' }
  const headerBg = '#1e293b'
  const sepStyle: React.CSSProperties = { padding: '0.3rem 0.625rem', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }
  const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }

  const renderCompanyRows = (cols: 'ops' | 'mult') =>
    valid.map(s => {
      const ticker = s.ticker
      if (cols === 'ops') {
        return (
          <tr key={ticker} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: '0.45rem 0.625rem', fontSize: '0.72rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', marginRight: '0.4rem' }}>{ticker}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{s.name}</span>
            </td>
            <CompsCell value={s.revenueGrowthPct} suffix="%" decimals={0} sent={sentiment(s.revenueGrowthPct, medRevGrowth, false)} />
            <CompsCell value={s.grossMarginPct}   suffix="%" decimals={0} sent={sentiment(s.grossMarginPct,  medGrossMargin, false)} />
            <CompsCell value={s.operatingMarginPct} suffix="%" decimals={0} sent={sentiment(s.operatingMarginPct, medOpMargin, false)} />
          </tr>
        )
      }
      return (
        <tr key={ticker} style={{ borderBottom: '1px solid var(--border)' }}>
          <td style={{ padding: '0.45rem 0.625rem', fontSize: '0.72rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', marginRight: '0.4rem' }}>{ticker}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{s.name}</span>
          </td>
          <CompsCell value={s.forwardPe}  suffix="x" sent={sentiment(s.forwardPe,  medFwdPe,     true)} />
          <CompsCell value={s.peg}        suffix="x" sent={sentiment(s.peg,        medPeg,       true)} />
          <CompsCell value={s.evRevenue}  suffix="x" sent={sentiment(s.evRevenue,  medEvRevenue, true)} />
        </tr>
      )
    })

  const renderStatsRows = (cols: 'ops' | 'mult') =>
    statsRows.map(row => (
      <tr key={row.label} style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
        <td style={{ padding: '0.4rem 0.625rem', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          {row.label}
        </td>
        {cols === 'ops' ? (
          <>
            <CompsCell value={row.revGrowth}   suffix="%" decimals={1} sent="neutral" isStats />
            <CompsCell value={row.grossMargin} suffix="%" decimals={1} sent="neutral" isStats />
            <CompsCell value={row.opMargin}    suffix="%" decimals={1} sent="neutral" isStats />
          </>
        ) : (
          <>
            <CompsCell value={row.fwdPe}    suffix="x" sent="neutral" isStats />
            <CompsCell value={row.peg}      suffix="x" sent="neutral" isStats />
            <CompsCell value={row.evRevenue} suffix="x" sent="neutral" isStats />
          </>
        )}
      </tr>
    ))

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr style={{ backgroundColor: headerBg }}>
            <th style={{ ...thLeft, width: '40%' }}>公司</th>
            <th style={thStyle}>营收增速</th>
            <th style={thStyle}>毛利率</th>
            <th style={thStyle}>经营利润率</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colSpan={4} style={sepStyle}>运营指标</td></tr>
          {renderCompanyRows('ops')}
          <tr><td colSpan={4} style={{ padding: '0.2rem' }} /></tr>
          {renderStatsRows('ops')}
        </tbody>
      </table>

      <div style={{ marginTop: '1.25rem' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ backgroundColor: headerBg }}>
              <th style={{ ...thLeft, width: '40%' }}>公司</th>
              <th style={thStyle}>前向PE</th>
              <th style={thStyle}>PEG</th>
              <th style={thStyle}>EV/收入</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={4} style={sepStyle}>估值倍数</td></tr>
            {renderCompanyRows('mult')}
            <tr><td colSpan={4} style={{ padding: '0.2rem' }} /></tr>
            {renderStatsRows('mult')}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '0.75rem', fontSize: '0.62rem', color: 'var(--text-muted)', textAlign: 'right' }}>
        LTM财报数据 · fundamentals.json · 手动维护
      </div>
    </div>
  )
}

function CompsView() {
  const [activeSector, setActiveSector] = useState(SECTORS[0].id)
  const [stocksMap, setStocksMap] = useState<Record<string, StockQuote[]>>({})
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})

  const loadSector = useCallback(async (sectorId: string) => {
    if (stocksMap[sectorId] || loadingMap[sectorId]) return
    const sector = SECTORS.find(s => s.id === sectorId)
    if (!sector) return
    setLoadingMap(m => ({ ...m, [sectorId]: true }))
    try {
      const res = await fetch(`/api/stocks?tickers=${[...new Set(sector.tickers)].join(',')}`)
      const data: StockQuote[] = await res.json()
      const map = new Map(data.map(s => [s.ticker, s]))
      const ordered = [...new Set(sector.tickers)].map(t => map.get(t)).filter(Boolean) as StockQuote[]
      setStocksMap(m => ({ ...m, [sectorId]: ordered }))
    } catch { /* ignore */ }
    finally { setLoadingMap(m => ({ ...m, [sectorId]: false })) }
  }, [stocksMap, loadingMap])

  const handleTab = (id: string) => {
    setActiveSector(id)
    loadSector(id)
  }

  // trigger load on first render for default sector
  useState(() => { loadSector(SECTORS[0].id) })

  const currentStocks = stocksMap[activeSector] ?? []
  const isLoading = loadingMap[activeSector] ?? false

  return (
    <div>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '0.375rem',
        marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem',
      }}>
        {SECTORS.map(s => {
          const active = s.id === activeSector
          return (
            <button
              key={s.id}
              onClick={() => handleTab(s.id)}
              style={{
                padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
                cursor: 'pointer', border: `1px solid ${active ? s.color : 'var(--border)'}`,
                backgroundColor: active ? s.color + '18' : 'transparent',
                color: active ? s.color : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {s.name}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          加载中…
        </div>
      ) : currentStocks.length ? (
        <CompsTable stocks={currentStocks} />
      ) : null}
    </div>
  )
}

export function SectorValuation() {
  const [view, setView] = useState<'list' | 'comps'>('list')

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.35rem 1rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600,
    cursor: 'pointer', border: '1px solid var(--border)',
    backgroundColor: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div style={{ display: 'flex', gap: '0.375rem', alignSelf: 'flex-start' }}>
        <button style={btnStyle(view === 'list')}  onClick={() => setView('list')}>列表</button>
        <button style={btnStyle(view === 'comps')} onClick={() => setView('comps')}>估值对比</button>
      </div>

      {view === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {SECTORS.map(s => <SectorCard key={s.id} sector={s} />)}
        </div>
      ) : (
        <div style={{ borderRadius: '10px', border: '1px solid var(--border)', padding: '1rem', backgroundColor: 'var(--surface)' }}>
          <CompsView />
        </div>
      )}
    </div>
  )
}
