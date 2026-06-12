'use client'

import { useState, useEffect, useCallback } from 'react'

interface Signal { type: string; text: string }
interface StockFlow {
  code: string; name: string; price: number; changePct: number
  amount: number; volRatio: number; turnover: number
  rsi14: number; macd: string; ma5: number; ma20: number; ma60: number | null
  trendUp: boolean; trendDown: boolean
  upperShadow: number; lowerShadow: number
  phase: string; phaseLabel: string; phaseAdvice: string
  signals: Signal[]; warnings: string[]; checklist: number; buySignal: boolean
}
interface SectorTop3 { code:string; name:string; flow:number; chg?:number }
interface SectorHeat { name:string;total:number;accum:number;markup:number;dist:number;buySignal:number;flow:number;score:number;top3:SectorTop3[];outflow3?:SectorTop3[] }
interface MidcapStock { code:string;name:string;price:number;chg1d:number;chg3d:number|null;chg7d:number|null;marketCapB:number;industry:string;desc:string;reason:string;turnover:number;pe:number }
interface NorthBound { direction:string;amount:number;signal:string;isTrading:boolean }
interface FlowData { stocks: StockFlow[]; breadth: { bullish:number;bearish:number;total:number;distribution:number;accumulation:number;markup:number }; sectorHeat?:Record<string,SectorHeat[]>; midcapGainers?:Record<string,MidcapStock[]>; northBound?:NorthBound; moneyTypes?:Record<string,{desc:string;typical:string[];cap:string}>; updatedAt: string }

const DARK = { bg:'#0d1117',card:'#161b22',cardBorder:'#30363d',text:'#e6edf3',muted:'#8b949e',dim:'#484f58',input:'#0d1117',inputBorder:'#30363d' }

const PHASE_COLORS: Record<string,string> = {
  accumulation:'#4ade80',markup:'#f87171',shakeout:'#fbbf24',distribution:'#ef4444',neutral:'#8b949e',
}

const DEFAULT_CODES = '000725,600036,601689,603667,603728,002050,300750,002371,688017,601012,002475,601138,300308,300274,002241,688256,688981,603019,600276,300760,600028,688065,688639,002459,600438,688012,300014,002202,601615,300124,601869,002179,600893,000099,002389,600118,688631,002126,002472,603009,600879,600990,603950,300777'

export default function InstitutionalFlow() {
  const [data, setData] = useState<FlowData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [codes, setCodes] = useState(DEFAULT_CODES)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [heatmapTf, setHeatmapTf] = useState<'1d'|'3d'|'7d'>('1d')
  const [midcapTf, setMidcapTf] = useState<'1d'|'3d'|'7d'>('1d')

  const fetchData = useCallback(async (c: string) => {
    setLoading(true); setError(''); setData(null)
    try {
      const res = await fetch(`/api/institutional-flow?codes=${encodeURIComponent(c)}`)
      const d = await res.json()
      if (d.error) { setError(d.error); return }
      setData(d)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData(codes) }, [])

  const filtered = data ? data.stocks.filter(s => {
    if (filter === 'distribution') return s.phase === 'distribution'
    if (filter === 'accumulation') return s.phase === 'accumulation'
    if (filter === 'markup') return s.phase === 'markup'
    if (filter === 'buy') return s.buySignal
    if (filter === 'warn') return s.warnings.length > 0
    return true
  }) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem', borderRadius: '10px', backgroundColor: DARK.bg, border: `1px solid ${DARK.cardBorder}` }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#58a6ff' }}>🐋 主力动向分析</span>
        <input value={codes} onChange={e => setCodes(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') fetchData(codes) }}
          placeholder="股票代码,逗号分隔"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.62rem', width: '260px', borderRadius: '6px', border: `1px solid ${DARK.inputBorder}`, backgroundColor: DARK.input, color: DARK.text, fontFamily: 'var(--font-mono)', outline: 'none' }} />
        <button onClick={() => fetchData(codes)}
          style={{ padding: '0.25rem 0.75rem', fontSize: '0.62rem', borderRadius: '6px', border: 'none', backgroundColor: '#238636', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>扫描</button>
        <button onClick={() => fetchData(codes)}
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.55rem', borderRadius: '6px', border: `1px solid ${DARK.cardBorder}`, backgroundColor: DARK.card, color: DARK.muted, cursor: 'pointer' }}>🔄</button>
      </div>

      {/* Market Breadth */}
      {data?.breadth && data.breadth.total > 0 && (
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.6rem', padding: '0.4rem 0.6rem', borderRadius: '6px', backgroundColor: DARK.card, border: `1px solid ${DARK.cardBorder}` }}>
          <span style={{ color:'#4ade80' }}>📈 看涨: {data.breadth.bullish}</span>
          <span style={{ color:'#f87171' }}>📉 看跌: {data.breadth.bearish}</span>
          <span style={{ color:'#fbbf24' }}>🏗️ 建仓: {data.breadth.accumulation}</span>
          <span style={{ color:'#f87171' }}>🚀 拉升: {data.breadth.markup}</span>
          <span style={{ color:'#ef4444' }}>⚠️ 出货: {data.breadth.distribution}</span>
          <span style={{ color: DARK.muted }}>共{data.breadth.total}只</span>
          <span style={{ color: DARK.dim, marginLeft: 'auto' }}>{data.updatedAt}</span>
        </div>
      )}

      {/* 🏗️ 主力建仓热力图 */}
      {data?.sectorHeat && (() => {
        const sectors = (data.sectorHeat[heatmapTf] || []).slice(0, 10)
        return (
          <div style={{ padding: '0.5rem 0.7rem', borderRadius: '8px', backgroundColor: DARK.card, border: `1px solid ${DARK.cardBorder}` }}>
            {/* Header + timeframe toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#fbbf24' }}>🏗️ 主力建仓热力图 — 按行业聚合</span>
              <div style={{ display: 'flex', gap: '0.15rem' }}>
                {([['1d','1天'],['3d','3天'],['7d','7天']] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setHeatmapTf(k)} style={{
                    padding: '0.1rem 0.4rem', fontSize: '0.5rem', borderRadius: '8px', cursor: 'pointer',
                    border: '1px solid', borderColor: heatmapTf === k ? '#fbbf24' : DARK.cardBorder,
                    backgroundColor: heatmapTf === k ? '#fbbf2420' : 'transparent',
                    color: heatmapTf === k ? '#fbbf24' : DARK.muted,
                    fontWeight: heatmapTf === k ? 700 : 400,
                  }}>{l}</button>
                ))}
              </div>
            </div>

            {/* Sector rows */}
            {sectors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem 0', color: DARK.muted, fontSize: '0.55rem' }}>
                暂无{heatmapTf === '3d' ? '3天' : '7天'}数据，K线数据加载中 — 请重新扫描
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {sectors.map(s => {
                  const barColor = s.score >= 3 ? '#f87171' : s.score >= 1 ? '#fbbf24' : s.score >= 0 ? '#4ade80' : '#8b949e'
                  return (
                    <div key={s.name}>
                      {/* Bar row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.55rem' }}>
                        <span style={{ fontWeight: 600, color: DARK.text, minWidth: '72px' }}>{s.name}</span>
                        <span style={{ flex: 1, height: '6px', borderRadius: '3px', backgroundColor: DARK.dim, overflow: 'hidden' }}>
                          <span style={{ display: 'block', height: '100%', borderRadius: '3px', backgroundColor: barColor,
                            width: `${Math.min(100, Math.max(5, (s.score + 3) * 12))}%`, transition: 'width 0.3s' }} />
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: barColor, fontWeight: 700, minWidth: '32px' }}>
                          {s.score >= 0 ? '+' : ''}{s.score}
                        </span>
                        {heatmapTf === '1d' && (
                          <span style={{ color: DARK.muted, fontSize: '0.46rem', minWidth: '80px' }}>
                            {s.accum > 0 && `🏗️${s.accum}只 `}{s.markup > 0 && `🚀${s.markup}只 `}{s.dist > 0 && `⚠️${s.dist}只`}
                          </span>
                        )}
                        <span style={{ color: s.flow >= 0 ? '#f87171' : '#4ade80', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', minWidth: '52px', textAlign: 'right' }}>
                          {s.flow >= 0 ? '+' : ''}{s.flow}亿
                        </span>
                      </div>
                      {/* Inflow top3 */}
                      {s.top3 && s.top3.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.35rem', paddingLeft: '76px', marginTop: '0.12rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.44rem', color: '#f87171', marginRight: '0.1rem' }}>▲流入</span>
                          {s.top3.map((t, i) => (
                            <span key={t.code} style={{ fontSize: '0.46rem', display: 'flex', alignItems: 'center', gap: '0.18rem',
                              padding: '0.05rem 0.28rem', borderRadius: '3px',
                              backgroundColor: i === 0 ? '#f8717115' : '#ffffff06',
                              border: `1px solid ${i === 0 ? '#f8717140' : DARK.cardBorder}` }}>
                              <span style={{ color: i === 0 ? '#fbbf24' : DARK.dim, fontWeight: 700 }}>#{i + 1}</span>
                              <span style={{ color: DARK.text }}>{t.name}</span>
                              <span style={{ fontFamily: 'var(--font-mono)', color: '#f87171', fontWeight: 600 }}>+{t.flow}亿</span>
                              {t.chg != null && <span style={{ fontFamily: 'var(--font-mono)', color: '#f87171', fontSize: '0.42rem' }}>{t.chg >= 0 ? '+' : ''}{t.chg}%</span>}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Outflow top3 */}
                      {s.outflow3 && s.outflow3.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.35rem', paddingLeft: '76px', marginTop: '0.08rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.44rem', color: '#4ade80', marginRight: '0.1rem' }}>▼流出</span>
                          {s.outflow3.map((t, i) => (
                            <span key={t.code} style={{ fontSize: '0.46rem', display: 'flex', alignItems: 'center', gap: '0.18rem',
                              padding: '0.05rem 0.28rem', borderRadius: '3px',
                              backgroundColor: '#4ade8010',
                              border: `1px solid #4ade8030` }}>
                              <span style={{ color: DARK.dim, fontWeight: 700 }}>#{i + 1}</span>
                              <span style={{ color: DARK.text }}>{t.name}</span>
                              <span style={{ fontFamily: 'var(--font-mono)', color: '#4ade80', fontWeight: 600 }}>{t.flow}亿</span>
                              {t.chg != null && <span style={{ fontFamily: 'var(--font-mono)', color: '#4ade80', fontSize: '0.42rem' }}>{t.chg >= 0 ? '+' : ''}{t.chg}%</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ fontSize: '0.46rem', color: DARK.dim, marginTop: '0.4rem' }}>
              {heatmapTf === '1d' ? '得分 = (建仓×3 + 拉升×2 - 出货×2 + 买入信号×2) ÷ 股票数  ·  资金 = 成交额 × 方向' : `${heatmapTf === '3d' ? '3' : '7'}日累计资金流向估算，按行业净流入排序`}
            </div>
          </div>
        )
      })()}

      {/* 北向资金 + 资金类型 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {/* 北向资金 */}
        {data?.northBound && (
          <div style={{ padding: '0.5rem 0.7rem', borderRadius: '8px', backgroundColor: DARK.card, border: `1px solid ${DARK.cardBorder}` }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#58a6ff', marginBottom: '0.35rem' }}>🌏 北向资金（外资·最聪明的钱）</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
              color: data.northBound.isTrading ? (data.northBound.amount>10?'#f87171':'#fbbf24') : DARK.muted }}>
              {data.northBound.signal}
            </div>
            {data.northBound.isTrading && (
              <div style={{ marginTop: '0.2rem', fontSize: '0.5rem', color: DARK.muted }}>
                配额使用率: {data.northBound.amount}%
              </div>
            )}
            {!data.northBound.isTrading && (
              <div style={{ marginTop: '0.2rem', fontSize: '0.5rem', color: DARK.muted }}>
                交易时段自动显示实时北向资金流向
              </div>
            )}
          </div>
        )}

        {/* 资金类型说明 */}
        {data?.moneyTypes && (
          <div style={{ padding: '0.5rem 0.7rem', borderRadius: '8px', backgroundColor: DARK.card, border: `1px solid ${DARK.cardBorder}` }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#fbbf24', marginBottom: '0.35rem' }}>💰 资金类型识别</div>
            {Object.entries(data.moneyTypes).map(([name, info]) => (
              <div key={name} style={{ marginBottom: '0.2rem', fontSize: '0.52rem' }}>
                <span style={{ color: DARK.text, fontWeight: 600 }}>{name}</span>
                <span style={{ color: DARK.muted }}> — {info.desc}（{info.cap}）</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🚀 中小盘涨幅榜 100亿-1000亿 */}
      {data?.midcapGainers && (
        <div style={{ padding: '0.5rem 0.7rem', borderRadius: '8px', backgroundColor: DARK.card, border: `1px solid ${DARK.cardBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.3rem' }}>
            <div>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#a78bfa' }}>🚀 中小盘涨幅榜</span>
              <span style={{ fontSize: '0.5rem', color: DARK.muted, marginLeft: '0.4rem' }}>市值 100亿–1000亿 · TOP 20</span>
            </div>
            <div style={{ display: 'flex', gap: '0.15rem' }}>
              {([['1d','1天'],['3d','3天'],['7d','7天']] as const).map(([k, l]) => (
                <button key={k} onClick={() => setMidcapTf(k)} style={{
                  padding: '0.1rem 0.4rem', fontSize: '0.5rem', borderRadius: '8px', cursor: 'pointer',
                  border: '1px solid', borderColor: midcapTf === k ? '#a78bfa' : DARK.cardBorder,
                  backgroundColor: midcapTf === k ? '#a78bfa20' : 'transparent',
                  color: midcapTf === k ? '#a78bfa' : DARK.muted, fontWeight: midcapTf === k ? 700 : 400,
                }}>{l}</button>
              ))}
            </div>
          </div>

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2rem 1fr 3.5rem 3.5rem 4rem 3rem', gap: '0.3rem', padding: '0.2rem 0.35rem', fontSize: '0.46rem', color: DARK.dim, borderBottom: `1px solid ${DARK.cardBorder}`, marginBottom: '0.15rem' }}>
            <span>#</span><span>公司 / 行业 / 介绍</span><span style={{textAlign:'right'}}>涨幅</span><span style={{textAlign:'right'}}>市值</span><span style={{textAlign:'right'}}>换手/PE</span><span style={{textAlign:'right'}}>价格</span>
          </div>

          {(data.midcapGainers[midcapTf] || []).map((s, i) => {
            const chg = midcapTf === '1d' ? s.chg1d : midcapTf === '3d' ? s.chg3d : s.chg7d
            const chgVal = chg ?? s.chg1d
            const intensity = Math.min(1, Math.abs(chgVal) / 10)
            const rowBg = chgVal >= 7 ? `rgba(248,113,113,${0.06 + intensity * 0.08})` : chgVal >= 3 ? `rgba(251,191,36,${0.04})` : 'transparent'
            return (
              <div key={s.code} style={{ display: 'grid', gridTemplateColumns: '1.2rem 1fr 3.5rem 3.5rem 4rem 3rem', gap: '0.3rem', padding: '0.28rem 0.35rem', borderRadius: '4px', backgroundColor: rowBg, alignItems: 'start' }}>
                {/* Rank */}
                <span style={{ fontSize: '0.48rem', fontWeight: 700, color: i < 3 ? '#fbbf24' : DARK.dim, paddingTop: '0.1rem' }}>{i + 1}</span>

                {/* Name + industry + desc */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.56rem', fontWeight: 700, color: DARK.text }}>{s.name}</span>
                    <span style={{ fontSize: '0.42rem', fontFamily: 'var(--font-mono)', color: DARK.dim }}>{s.code}</span>
                    <span style={{ fontSize: '0.42rem', padding: '0.05rem 0.25rem', borderRadius: '3px', backgroundColor: '#a78bfa15', color: '#a78bfa', border: '1px solid #a78bfa30' }}>{s.industry}</span>
                  </div>
                  <div style={{ fontSize: '0.44rem', color: DARK.muted, marginTop: '0.06rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.desc}</div>
                  {s.reason && <div style={{ fontSize: '0.44rem', color: '#fbbf24', marginTop: '0.04rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>💡 {s.reason}</div>}
                </div>

                {/* Change */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: chgVal >= 0 ? '#f87171' : '#4ade80' }}>
                    {chgVal >= 0 ? '+' : ''}{chgVal.toFixed(2)}%
                  </div>
                  {midcapTf !== '1d' && s.chg1d != null && (
                    <div style={{ fontSize: '0.42rem', color: DARK.muted, fontFamily: 'var(--font-mono)' }}>1d:{s.chg1d >= 0 ? '+' : ''}{s.chg1d.toFixed(1)}%</div>
                  )}
                </div>

                {/* Market cap */}
                <div style={{ textAlign: 'right', fontSize: '0.5rem', color: DARK.muted, fontFamily: 'var(--font-mono)' }}>
                  <div style={{ color: DARK.text }}>{s.marketCapB}亿</div>
                </div>

                {/* Turnover + PE */}
                <div style={{ textAlign: 'right', fontSize: '0.46rem', color: DARK.muted, fontFamily: 'var(--font-mono)' }}>
                  <div>换手 {s.turnover}%</div>
                  {s.pe > 0 && <div>PE {s.pe}x</div>}
                </div>

                {/* Price */}
                <div style={{ textAlign: 'right', fontSize: '0.52rem', fontFamily: 'var(--font-mono)', color: DARK.text }}>
                  ¥{s.price.toFixed(2)}
                </div>
              </div>
            )
          })}

          {(!data.midcapGainers[midcapTf] || data.midcapGainers[midcapTf].length === 0) && (
            <div style={{ textAlign: 'center', padding: '1rem', color: DARK.muted, fontSize: '0.55rem' }}>暂无数据，请重新扫描</div>
          )}
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', fontSize: '0.55rem' }}>
        {[
          {k:'all',l:'全部',c:'#58a6ff'},
          {k:'buy',l:'✅ 买入信号',c:'#4ade80'},
          {k:'markup',l:'🚀 拉升中',c:'#f87171'},
          {k:'accumulation',l:'🏗️ 建仓中',c:'#fbbf24'},
          {k:'distribution',l:'⚠️ 出货中',c:'#ef4444'},
          {k:'warn',l:'🔴 预警',c:'#ef4444'},
        ].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} style={{
            padding: '0.15rem 0.5rem', borderRadius: '10px', cursor: 'pointer', border: '1px solid',
            borderColor: filter===f.k ? f.c : DARK.cardBorder,
            backgroundColor: filter===f.k ? `${f.c}18` : DARK.card,
            color: filter===f.k ? f.c : DARK.muted, fontWeight: filter===f.k ? 700 : 400,
          }}>{f.l}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '2rem', color: DARK.muted }}>主力分析中...</div>}
      {error && <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: '#490202', color: '#f87171', fontSize: '0.7rem' }}>{error}</div>}

      {/* Stock cards */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {filtered.map(s => {
            const pc = PHASE_COLORS[s.phase] || DARK.muted
            const isExpanded = expanded === s.code
            return (
              <div key={s.code} style={{ borderRadius: '8px', border: `1px solid ${pc}50`, backgroundColor: DARK.card, overflow: 'hidden' }}>
                <div onClick={() => setExpanded(isExpanded ? null : s.code)}
                  style={{ padding: '0.45rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: DARK.text }}>{s.name}</span>
                  <span style={{ fontSize: '0.55rem', fontFamily: 'var(--font-mono)', color: DARK.dim }}>{s.code}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: s.changePct>=0?'#f87171':'#4ade80' }}>
                    ¥{s.price.toFixed(2)} {s.changePct>=0?'+':''}{s.changePct.toFixed(1)}%
                  </span>
                  <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: '6px', backgroundColor: `${pc}20`, color: pc, fontWeight: 700, marginLeft: 'auto' }}>
                    {s.phaseLabel}
                  </span>
                  {s.buySignal && <span style={{ fontSize: '0.55rem', padding: '0.1rem 0.35rem', borderRadius: '6px', backgroundColor: '#4ade8020', color: '#4ade80', fontWeight: 700, border: '1px solid #4ade8040' }}>✅ 买入信号 {s.checklist}/8</span>}
                  <span style={{ color: DARK.muted, fontSize: '0.55rem' }}>{isExpanded?'▲':'▼'}</span>
                </div>

                {/* Quick stats */}
                <div style={{ padding: '0 0.7rem 0.35rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.54rem', color: DARK.muted }}>
                  <span>量比:<b style={{color:DARK.text}}>{s.volRatio.toFixed(1)}x</b></span>
                  <span>换手:<b style={{color:s.turnover>15?'#ef4444':s.turnover>8?'#fbbf24':DARK.text}}>{s.turnover}%</b></span>
                  <span>RSI:<b style={{color:s.rsi14>70?'#f87171':s.rsi14<30?'#4ade80':DARK.text}}>{s.rsi14}</b></span>
                  <span style={{color:s.macd==='golden'?'#f87171':'#4ade80'}}>MACD:{s.macd==='golden'?'金叉':'死叉'}</span>
                  <span>上影:<b style={{color:DARK.text}}>{s.upperShadow}%</b></span>
                  <span>下影:<b style={{color:DARK.text}}>{s.lowerShadow}%</b></span>
                  <span style={{color:s.trendUp?'#4ade80':'#f87171'}}>趋势:{s.trendUp?'多头':'空头'}</span>
                </div>

                {/* Expanded: signals + advice */}
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${DARK.cardBorder}`, padding: '0.5rem 0.7rem', backgroundColor: '#0d1117' }}>
                    {/* Phase advice */}
                    <div style={{ padding: '0.4rem 0.5rem', borderRadius: '6px', backgroundColor: `${pc}10`, border: `1px solid ${pc}30`, marginBottom: '0.5rem', fontSize: '0.58rem' }}>
                      <span style={{ fontWeight: 700, color: pc }}>{s.phaseLabel}：</span>
                      <span style={{ color: DARK.text }}>{s.phaseAdvice}</span>
                    </div>

                    {/* Signals */}
                    {s.signals.filter(sg=>sg.type==='bullish').length>0 && (
                      <div style={{ marginBottom: '0.4rem' }}>
                        <div style={{ fontSize: '0.52rem', fontWeight: 700, color: '#4ade80', marginBottom: '0.2rem' }}>🟢 看涨信号</div>
                        {s.signals.filter(sg=>sg.type==='bullish').map((sg,i) => (
                          <div key={i} style={{ fontSize: '0.55rem', color: '#4ade80', padding: '0.15rem 0', borderBottom: `1px solid ${DARK.cardBorder}` }}>{sg.text}</div>
                        ))}
                      </div>
                    )}
                    {s.signals.filter(sg=>sg.type==='bearish').length>0 && (
                      <div style={{ marginBottom: '0.4rem' }}>
                        <div style={{ fontSize: '0.52rem', fontWeight: 700, color: '#f87171', marginBottom: '0.2rem' }}>🔴 看跌信号</div>
                        {s.signals.filter(sg=>sg.type==='bearish').map((sg,i) => (
                          <div key={i} style={{ fontSize: '0.55rem', color: '#f87171', padding: '0.15rem 0', borderBottom: `1px solid ${DARK.cardBorder}` }}>{sg.text}</div>
                        ))}
                      </div>
                    )}
                    {s.warnings.length>0 && (
                      <div style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', backgroundColor: '#7f1d1d15', border: '1px solid #ef444440' }}>
                        <div style={{ fontSize: '0.52rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.15rem' }}>🚨 风险预警</div>
                        {s.warnings.map((w,i) => (
                          <div key={i} style={{ fontSize: '0.54rem', color: '#fca5a5' }}>{w}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ padding: '0.4rem 0.7rem', borderRadius: '8px', border: `1px solid ${DARK.cardBorder}`, backgroundColor: DARK.card, display: 'flex', gap: '0.8rem', flexWrap: 'wrap', fontSize: '0.52rem', color: DARK.muted }}>
        <span style={{color:'#fbbf24'}}>🏗️建仓=缩量横盘/地量/长下影</span>
        <span style={{color:'#f87171'}}>🚀拉升=放量突破/量价配合</span>
        <span style={{color:'#fbbf24'}}>🔄洗盘=缩量回调/低点不创新低</span>
        <span style={{color:'#ef4444'}}>⚠️出货=放量滞涨/长上影/量价背离</span>
        <span style={{color:'#4ade80'}}>✅买入=量比 &gt; 1.5 + 多头 + 金叉 + RSI &lt; 70 + 量价配合 ≥ 4/8</span>
      </div>
    </div>
  )
}
