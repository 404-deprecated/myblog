'use client'

import { useState, useEffect, useCallback } from 'react'

interface WatchItem {
  code: string; name: string; price: number; changePct: number
  volume: number; amount: number; high: number; low: number
  turnover: number; volumeRatio: number
  ma5: number; ma20: number; maStructure: string; trendUp: boolean
  cost: number | null; costPct: number | null
  signals: string[]; signalLevel: string
}
interface Leader { code: string; name: string; price: number; changePct: number; amount: number; turnover: number; volumeRatio: number; industry: string; industryRank: string; marketCap: string; mainBusiness: string; pe: string }
interface Sector { name: string; changePct: number; upCount: number; totalCount: number; topStock?: string; topPct?: number }
interface FundFlow { code: string; name: string; industry: string; price: number; changePct: number; amount: number; estInflow: number }
interface SectorStockFlow { code: string; name: string; price: number; changePct: number; amount: number; estInflow: number; biz: string; pe: string }
interface MarketHeat {
  hotSectors: Sector[]; breadth: { up: number; down: number; flat: number; limitUp: number; total: number; upRatio: number }
  topInflowStocks?: FundFlow[]; topOutflowStocks?: FundFlow[]; topInflowSectors?: { name: string; totalInflow: number; upRatio: number; stockCount: number }[]
  sectorTopStocks?: Record<string, SectorStockFlow[]>
}

const SIGNAL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  limit_up:    { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
  profit2:     { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
  profit1:     { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
  bullish:     { bg: '#f0fdfa', border: '#99f6e4', text: '#134e4a' },
  opportunity: { bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46' },
  warn:        { bg: '#fffbeb', border: '#fcd34d', text: '#92400e' },
  bearish:     { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
  stop_loss:   { bg: '#fff1f2', border: '#fca5a5', text: '#991b1b' },
  normal:      { bg: 'transparent', border: 'var(--border)', text: 'var(--text)' },
}

// ── 龙头详情行 ──────────────────────────────────────────────
function LeaderRow({ leader: l }: { leader: Leader }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <tr onClick={() => setExpanded(!expanded)}
        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
        <td style={{ padding: '0.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.58rem' }}>{l.code}</td>
        <td style={{ padding: '0.25rem', fontWeight: 600, fontSize: '0.6rem' }}>
          {l.name}
          {expanded ? ' ▲' : ' ▼'}
        </td>
        <td style={{ padding: '0.25rem', fontSize: '0.55rem', color: 'var(--text-muted)', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {l.industry || '--'}
        </td>
        <td style={{ padding: '0.25rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#dc2626', fontWeight: 700 }}>
          {l.changePct>=0?'+':''}{l.changePct.toFixed(1)}%
        </td>
        <td style={{ padding: '0.25rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{(l.amount/1e8).toFixed(1)}亿</td>
        <td style={{ padding: '0.25rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{l.turnover.toFixed(1)}%</td>
        <td style={{ padding: '0.25rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.55rem' }}>{l.marketCap || '--'}</td>
      </tr>
      {expanded && (
        <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <td colSpan={7} style={{ padding: '0.4rem 0.6rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.58rem' }}>
              {l.industry && (
                <span>🏭 <strong>行业:</strong> {l.industry}{l.industryRank ? ` (#${l.industryRank})` : ''}</span>
              )}
              {l.pe && <span>📊 <strong>PE:</strong> {l.pe}</span>}
              <span>💰 <strong>现价:</strong> ¥{l.price.toFixed(2)}</span>
              <span>📈 <strong>量比:</strong> {(l.volumeRatio||1).toFixed(1)}x</span>
              {l.mainBusiness && (
                <div style={{ width: '100%', marginTop: '0.2rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  📝 {l.mainBusiness.length > 120 ? l.mainBusiness.slice(0,120)+'...' : l.mainBusiness}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── 板块资金流详情行 ──────────────────────────────────────────
function SectorFlowRow({ sector, top3, bottom1 }: {
  sector: { name: string; totalInflow: number; upRatio: number; stockCount: number }
  top3: SectorStockFlow[]; bottom1: SectorStockFlow
}) {
  const [open, setOpen] = useState(false)
  const inflowColor = sector.totalInflow >= 0 ? '#dc2626' : '#16a34a'
  return (
    <div style={{ marginBottom: '0.2rem' }}>
      <div onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.4rem',
        borderRadius: '6px', cursor: 'pointer',
        backgroundColor: sector.totalInflow >= 0 ? '#fef2f2' : '#f0fdf4',
        border: `1px solid ${sector.totalInflow >= 0 ? '#fecaca' : '#bbf7d0'}`,
      }}>
        <span style={{ fontWeight: 600, fontSize: '0.65rem', minWidth: '70px', color: '#1f2937' }}>{sector.name}</span>
        <span style={{ fontFamily: 'var(--font-mono)', color: inflowColor, fontWeight: 700, fontSize: '0.7rem' }}>
          {sector.totalInflow >= 0 ? '+' : ''}{sector.totalInflow.toFixed(1)}亿
        </span>
        <span style={{ fontSize: '0.55rem', color: '#6b7280' }}>
          {sector.upRatio}%↑ ({sector.stockCount}只)
        </span>
        {/* Top 3 preview */}
        <div style={{ display: 'flex', gap: '0.3rem', marginLeft: 'auto', fontSize: '0.52rem' }}>
          {top3.map((t, i) => (
            <span key={i} style={{ color: t.changePct >= 0 ? '#dc2626' : '#16a34a', fontFamily: 'var(--font-mono)' }}>
              {t.name.length > 4 ? t.name.slice(0,4)+'…' : t.name}
              <span style={{ fontWeight: 600, color: t.changePct >= 0 ? '#dc2626' : '#16a34a' }}> {t.changePct >= 0 ? '+' : ''}{t.changePct}%</span>
            </span>
          ))}
        </div>
        <span style={{ fontSize: '0.5rem', color: '#6b7280' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ padding: '0.35rem 0.5rem', backgroundColor: '#f9fafb', borderRadius: '0 0 6px 6px', border: '1px solid #d1d5db', borderTop: 'none' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.56rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #d1d5db' }}>
                {['代码','名称','涨跌','成交额','净流入(估)','PE','分析'].map(h => (
                  <th key={h} style={{ padding: '0.15rem 0.2rem', textAlign: h==='分析'||h==='名称'?'left':'right', color: '#6b7280', fontWeight: 600, fontSize: '0.52rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...top3, ...(bottom1 && bottom1.changePct < -1 ? [bottom1] : [])].map((t, i) => {
                const isBad = t.changePct < -1 && i >= 3
                const analysis = t.changePct >= 3 ? '✅ 强势流入'
                  : t.changePct >= 0 ? '➡️ 温和流入'
                  : t.changePct >= -2 ? '⚖️ 轻度流出'
                  : t.changePct >= -5 ? '⚠️ 明显流出'
                  : '🔴 大幅流出'
                return (
                  <tr key={t.code} style={{ borderBottom: '1px solid #d1d5db', backgroundColor: isBad ? '#fff1f2' : 'transparent' }}>
                    <td style={{ padding: '0.15rem', fontFamily: 'var(--font-mono)', fontSize: '0.54rem', color: '#1f2937' }}>{t.code}</td>
                    <td style={{ padding: '0.15rem', fontWeight: 600, fontSize: '0.56rem', color: '#1f2937' }}>{t.name.length > 5 ? t.name.slice(0,5)+'…' : t.name}</td>
                    <td style={{ padding: '0.15rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: t.changePct >= 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                      {t.changePct >= 0 ? '+' : ''}{t.changePct}%
                    </td>
                    <td style={{ padding: '0.15rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: '#1f2937' }}>
                      {(t.amount / 1e8).toFixed(1)}亿
                    </td>
                    <td style={{ padding: '0.15rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: t.estInflow >= 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                      {t.estInflow >= 0 ? '+' : ''}{t.estInflow.toFixed(1)}亿
                    </td>
                    <td style={{ padding: '0.15rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: '#6b7280' }}>
                      {t.pe || '--'}
                    </td>
                    <td style={{ padding: '0.15rem', fontSize: '0.52rem', color: isBad ? '#991b1b' : '#1f2937' }}>
                      {analysis}
                      {t.biz ? <span style={{ color: '#6b7280', fontSize: '0.48rem', display: 'block' }}>{t.biz.slice(0, 30)}</span> : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function SwingMonitor() {
  const [watchlist, setWatchlist] = useState<WatchItem[]>([])
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [marketHeat, setMarketHeat] = useState<MarketHeat | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const DEFAULT = '000725,600036,002142,002050,002371,601012,002459,600438,002202,600028,002241,002475,601138,600522,600667,600584,002273,002600,600011,000543,600688,601578,003039,600919,601166,600879,600118,002389,601698,002236,603893,603667,002230,603019,000938,002837,601869,600276,601689,603728,603009,002472,603662,300115,300007,301076,688017'
  const [codes, setCodes] = useState(DEFAULT)
  const [onlyUptrend, setOnlyUptrend] = useState(true) // 口诀7: 只做上升趋势

  const fetchData = useCallback(async (codesStr: string) => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/scan-market?cmd=all&codes=${codesStr}`, { cache: 'no-store' })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setWatchlist(data.watchlist || [])
      setLeaders(data.leaders || [])
      setSectors(data.sectors || [])
      setMarketHeat(data.marketHeat || null)
      setUpdatedAt(data.updatedAt || '')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData(codes) }, [])

  const trading = new Date().getHours() >= 9 && new Date().getHours() < 15 &&
    !(new Date().getHours() === 11 && new Date().getMinutes() > 30) &&
    !(new Date().getHours() < 9 || (new Date().getHours() === 9 && new Date().getMinutes() < 15))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>⚡ 短线盯盘</span>
        <span style={{
          fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '8px',
          backgroundColor: trading ? '#fef2f2' : '#f0fdf4', color: trading ? '#dc2626' : '#16a34a',
          border: `1px solid ${trading ? '#fca5a5' : '#86efac'}`,
        }}>
          {trading ? '● 交易中' : '○ 非交易时间'}
        </span>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {updatedAt}
        </span>
        <label style={{ fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.2rem', cursor: 'pointer', color: onlyUptrend ? '#059669' : 'var(--text-muted)', marginLeft: '0.5rem' }}>
          <input type="checkbox" checked={onlyUptrend} onChange={e => setOnlyUptrend(e.target.checked)}
            style={{ width: '12px', height: '12px' }} />
          ⬆️ 只看上升趋势
        </label>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.3rem' }}>
          <input value={codes} onChange={e => setCodes(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') fetchData(codes) }}
            placeholder="自选代码,逗号分隔"
            style={{ fontSize: '0.62rem', padding: '0.2rem 0.4rem', width: '200px', borderRadius: '4px', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', backgroundColor: 'var(--surface)', color: 'var(--text)' }} />
          <button onClick={() => fetchData(codes)}
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.62rem', borderRadius: '4px', border: 'none', backgroundColor: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
            刷新
          </button>
        </div>
      </div>

      {error && <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: '#fff1f2', color: '#991b1b', fontSize: '0.7rem' }}>{error}</div>}
      {loading && <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>加载中...</div>}

      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '0.75rem' }}>
          {/* Panel 1: Watchlist */}
          <div style={{ borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', overflow: 'hidden' }}>
            <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between' }}>
              📌 自选股信号
              <span style={{ fontSize: '0.6rem', fontWeight: 400, color: 'var(--text-muted)' }}>{watchlist.length}只</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.65rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                    {['代码','名称','现价','涨跌','量比','MA5','趋势','成本','盈亏','信号'].map(h => (
                      <th key={h} style={{ padding: '0.3rem 0.4rem', textAlign: h==='信号'||h==='名称'?'left':'right', whiteSpace:'nowrap', fontWeight:600, color:'var(--text-muted)', fontSize:'0.6rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {watchlist.filter(w => !onlyUptrend || w.trendUp).map(w => {
                    const sc = SIGNAL_COLORS[w.signalLevel] || SIGNAL_COLORS.normal
                    return (
                      <tr key={w.code} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.3rem', fontFamily: 'var(--font-mono)', fontSize: '0.62rem' }}>{w.code}</td>
                        <td style={{ padding: '0.3rem', fontWeight: 600 }}>{w.name.length > 5 ? w.name.slice(0,5)+'…' : w.name}</td>
                        <td style={{ padding: '0.3rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{w.price.toFixed(2)}</td>
                        <td style={{ padding: '0.3rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: w.changePct>=0?'#dc2626':'#16a34a' }}>{w.changePct>=0?'+':''}{w.changePct.toFixed(1)}%</td>
                        <td style={{ padding: '0.3rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: w.volumeRatio>=1.5?'#dc2626':'var(--text)' }}>{w.volumeRatio.toFixed(1)}x</td>
                        <td style={{ padding: '0.3rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{w.ma5.toFixed(2)}</td>
                        <td style={{ padding: '0.3rem', textAlign: 'center', fontSize: '0.7rem' }}>{w.trendUp ? '⬆️' : w.maStructure==='空头' ? '⬇️' : '↔️'}</td>
                        <td style={{ padding: '0.3rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{w.cost ? w.cost.toFixed(2) : '--'}</td>
                        <td style={{ padding: '0.3rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: (w.costPct??0)>=0?'#dc2626':'#16a34a' }}>{w.costPct != null ? `${w.costPct>=0?'+':''}${w.costPct.toFixed(1)}%` : '--'}</td>
                        <td style={{ padding: '0.3rem', fontSize: '0.6rem' }}>
                          {w.signals.map(s => <span key={s} style={{ marginRight: '0.2rem' }}>{s}</span>)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Panel 0: Market Heat */}
          {marketHeat && (
            <div style={{ borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', overflow: 'hidden' }}>
              <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.78rem' }}>
                🔥 市场热度
              </div>
              <div style={{ padding: '0.5rem 0.75rem' }}>
                {/* Breadth bar */}
                {marketHeat.breadth.total > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', marginBottom: '0.2rem' }}>
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>涨 {marketHeat.breadth.up}</span>
                      <span style={{ color: '#6b7280' }}>平 {marketHeat.breadth.flat}</span>
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>跌 {marketHeat.breadth.down}</span>
                      <span style={{ color: '#7c3aed', fontWeight: 700 }}>涨停 {marketHeat.breadth.limitUp}</span>
                    </div>
                    <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${marketHeat.breadth.up/marketHeat.breadth.total*100}%`, backgroundColor: '#dc2626', transition: 'width 0.3s' }} />
                      <div style={{ width: `${marketHeat.breadth.flat/marketHeat.breadth.total*100}%`, backgroundColor: 'var(--border)' }} />
                      <div style={{ width: `${marketHeat.breadth.down/marketHeat.breadth.total*100}%`, backgroundColor: '#16a34a', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: '0.65rem', textAlign: 'center', marginTop: '0.15rem', fontWeight: 700,
                      color: marketHeat.breadth.upRatio >= 60 ? '#dc2626' : marketHeat.breadth.upRatio >= 40 ? '#d97706' : '#16a34a' }}>
                      上涨比例: {marketHeat.breadth.upRatio}% {marketHeat.breadth.upRatio >= 60 ? '🔥 强势' : marketHeat.breadth.upRatio >= 40 ? '⚖️ 中性' : '❄️ 弱势'}
                    </div>
                  </div>
                )}
                {/* Hot sectors */}
                {marketHeat.hotSectors.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>热点板块</div>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {marketHeat.hotSectors.map(s => {
                        const upRatio = s.totalCount > 0 ? Math.round(s.upCount/s.totalCount*100) : 0
                        return (
                          <span key={s.name} style={{
                            padding: '0.2rem 0.45rem', borderRadius: '12px', fontSize: '0.58rem',
                            backgroundColor: s.changePct >= 2 ? '#fef2f2' : s.changePct <= -1 ? '#f0fdf4' : '#f3f4f6',
                            border: `1px solid ${s.changePct >= 2 ? '#fca5a5' : s.changePct <= -1 ? '#86efac' : '#d1d5db'}`,
                            fontFamily: 'var(--font-mono)', color: '#1f2937',
                          }}>
                            {s.name}
                            <span style={{ color: s.changePct >= 0 ? '#dc2626' : '#16a34a', fontWeight: 700, marginLeft: '0.25rem' }}>
                              {s.changePct >= 0 ? '+' : ''}{s.changePct.toFixed(1)}%
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.5rem' }}> {upRatio}%涨</span>
                          {s.topStock && s.topPct && s.topPct > 2 && (
                            <span style={{ color: '#dc2626', fontSize: '0.5rem', marginLeft: '0.2rem' }}>
                              🥇{s.topStock}
                            </span>
                          )}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Panel 0b: Fund Flow */}
          {marketHeat?.topInflowStocks && marketHeat.topInflowStocks.length > 0 && (
            <div style={{ borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', overflow: 'hidden' }}>
              <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.78rem' }}>
                💰 主力资金估算（点击板块展开TOP3个股）
              </div>
              <div style={{ padding: '0.4rem 0.6rem', maxHeight: '420px', overflowY: 'auto' }}>
                {marketHeat.topInflowSectors?.slice(0, 10).map(s => {
                  const stocks = marketHeat.sectorTopStocks?.[s.name] || []
                  const top3 = stocks.slice(0, 3)
                  const bottom1 = stocks.slice(-1)
                  const [open, setOpen] = [false, () => {}]
                  return <SectorFlowRow key={s.name} sector={s} top3={top3} bottom1={bottom1[0]} />
                })}
              </div>
            </div>
          )}

          {/* Panel 2: Leaders */}
          <div style={{ borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', overflow: 'hidden' }}>
            <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.78rem' }}>
              🏆 龙头候选（涨幅≥5% + 成交≥5亿）
              <span style={{ fontSize: '0.58rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                点击展开详情
              </span>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.58rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', position: 'sticky', top: 0 }}>
                    {['代码','名称','行业','涨跌','成交额','换手','市值'].map(h => (
                      <th key={h} style={{ padding: '0.25rem 0.3rem', textAlign: h==='名称'||h==='行业'?'left':'right', whiteSpace:'nowrap', fontWeight:600, color:'var(--text-muted)', fontSize:'0.55rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaders.slice(0, 12).map(l => (
                    <LeaderRow key={l.code} leader={l} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Panel 3: Hot Sectors */}
          <div style={{ borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', overflow: 'hidden' }}>
            <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.78rem' }}>
              🔥 十五五八大战略赛道
              <span style={{ fontSize: '0.55rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem' }}>点击龙头候选查看赛道标的</span>
            </div>
            <div style={{ padding: '0.5rem 0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {[
                {n:'🧠 AI与大模型',c:'#6366f1'},{n:'💾 集成电路',c:'#8b5cf6'},
                {n:'🤖 具身智能/机器人',c:'#06b6d4'},{n:'🚁 低空经济',c:'#10b981'},
                {n:'⚡ 新能源/储能',c:'#eab308'},{n:'🛰️ 商业航天',c:'#3b82f6'},
                {n:'🧬 生物技术',c:'#ec4899'},{n:'🚗 智能汽车',c:'#f97316'},
              ].map(s => (
                <span key={s.n} style={{
                  padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.62rem',
                  backgroundColor: `${s.c}12`, border: `1px solid ${s.c}30`, color: 'var(--text)',
                  fontWeight: 600,
                }}>
                  {s.n}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 口诀实时监控 */}
      {watchlist.length > 0 && (
        <div style={{
          padding: '0.5rem 0.75rem', borderRadius: '8px',
          border: '1px solid var(--border)', backgroundColor: 'var(--surface)',
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, marginBottom: '0.35rem' }}>📜 口诀实时监控</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.4rem', fontSize: '0.6rem' }}>
            {/* 口诀②: 连续小涨/大涨 */}
            <div style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
              <span style={{ fontWeight: 700, color: '#16a34a' }}>📜② 连续小涨是真涨</span>
              <div style={{ marginTop: '0.15rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {watchlist.filter(w => w.signals.some(s => s.includes('②连续小涨✅'))).map(w => (
                  <span key={w.code} style={{ color: '#16a34a', fontFamily: 'var(--font-mono)' }}>
                    ✅ {w.name} <small>+{w.changePct}%</small>
                  </span>
                ))}
                {!watchlist.some(w => w.signals.some(s => s.includes('②连续小涨✅'))) && <span style={{ color: 'var(--text-muted)' }}>无触发</span>}
              </div>
              <div style={{ marginTop: '0.1rem' }}>
                <span style={{ fontWeight: 600, color: '#dc2626' }}>📜② 连续大涨要离场</span>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {watchlist.filter(w => w.signals.some(s => s.includes('②连续大涨⚠️'))).map(w => (
                    <span key={w.code} style={{ color: '#dc2626', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      ⚠️ {w.name} <small>+{w.changePct}%</small>
                    </span>
                  ))}
                  {!watchlist.some(w => w.signals.some(s => s.includes('②连续大涨'))) && <span style={{ color: 'var(--text-muted)' }}>无触发</span>}
                </div>
              </div>
            </div>
            {/* 口诀⑤: 缩量新低/回升 */}
            <div style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', backgroundColor: '#faf5ff', border: '1px solid #d8b4fe' }}>
              <span style={{ fontWeight: 700, color: '#7c3aed' }}>📜⑤ 缩量新低是底部</span>
              <div style={{ marginTop: '0.15rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {watchlist.filter(w => w.signals.some(s => s.includes('⑤缩量新低→底✅'))).map(w => (
                  <span key={w.code} style={{ color: '#7c3aed', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    💡 {w.name} <small>{w.changePct}%</small>
                  </span>
                ))}
                {!watchlist.some(w => w.signals.some(s => s.includes('⑤缩量新低'))) && <span style={{ color: 'var(--text-muted)' }}>无触发</span>}
              </div>
              <div style={{ marginTop: '0.1rem' }}>
                <span style={{ fontWeight: 600, color: '#d97706' }}>📜⑤ 缩量回升是问题</span>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {watchlist.filter(w => w.signals.some(s => s.includes('⑤缩量回升⚠️'))).map(w => (
                    <span key={w.code} style={{ color: '#d97706', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      ⚠️ {w.name} <small>+{w.changePct}%</small>
                    </span>
                  ))}
                  {!watchlist.some(w => w.signals.some(s => s.includes('⑤缩量回升'))) && <span style={{ color: 'var(--text-muted)' }}>无触发</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 操作规则 */}
      <div style={{
        padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-secondary)', fontSize: '0.62rem', lineHeight: 1.6,
      }}>
        <strong>📋 执行规则</strong>{' '}
        <span style={{ color: '#16a34a' }}>买入：上升趋势+连续小涨+缩量新低+低位横盘新低</span> |{' '}
        <span style={{ color: '#dc2626' }}>卖出：冲高可卖/连续大涨离场/高位横盘冲高抛/放量滞涨/上影出货/连涨多日换股</span> |{' '}
        <span style={{ color: '#d97706' }}>纪律：宁可少进勿多买 +10%卖一半 +20%全清 -5%硬止损</span>
      </div>
    </div>
  )
}
