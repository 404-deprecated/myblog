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
interface SectorHeat { name:string;total:number;accum:number;markup:number;dist:number;buySignal:number;flow:number;score:number }
interface TopStock { code:string;name:string;price:number;changePct:number;phase:string;phaseKey:string;buySignal:boolean;estFlow:number;moneyTypes:string[] }
interface NorthBound { direction:string;amount:number;signal:string;isTrading:boolean }
interface FlowData { stocks: StockFlow[]; breadth: { bullish:number;bearish:number;total:number;distribution:number;accumulation:number;markup:number }; sectorHeat?:SectorHeat[]; sectorTop3?:Record<string,Record<string,{topInflow:TopStock[];topOutflow:TopStock[]}>>; northBound?:NorthBound; moneyTypes?:Record<string,{desc:string;typical:string[];cap:string}>; updatedAt: string }

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
  const [timeframe, setTimeframe] = useState<string>('1d')
  const [heatmapTf, setHeatmapTf] = useState<'1d'|'3d'|'1w'>('1d')

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
      {data && ((data.sectorHeat && data.sectorHeat.length > 0) || data.sectorTop3) && (() => {
        // Build sector list for selected timeframe
        const sectors: Array<{
          name: string; score: number; flow: number
          accum: number; markup: number; dist: number
          top3: TopStock[]
        }> = []

        if (heatmapTf === '1d' && data.sectorHeat && data.sectorHeat.length > 0) {
          data.sectorHeat.slice(0, 10).forEach(s => {
            sectors.push({
              name: s.name, score: s.score, flow: s.flow,
              accum: s.accum, markup: s.markup, dist: s.dist,
              top3: data.sectorTop3?.['1d']?.[s.name]?.topInflow ?? [],
            })
          })
        } else {
          const tfKey = heatmapTf
          const top3Data = data.sectorTop3?.[tfKey] || {}
          Object.entries(top3Data).forEach(([name, d]) => {
            const inflow = d.topInflow.reduce((a, s) => a + s.estFlow, 0)
            const outflow = d.topOutflow.reduce((a, s) => a + Math.abs(s.estFlow), 0)
            const flow = Math.round((inflow - outflow) * 10) / 10
            const score = Math.round(Math.min(5, Math.max(-5, flow / 3)) * 10) / 10
            sectors.push({ name, score, flow, accum: 0, markup: 0, dist: 0, top3: d.topInflow })
          })
          sectors.sort((a, b) => b.flow - a.flow)
          sectors.splice(10)
        }

        if (sectors.length === 0) return null
        return (
          <div style={{ padding: '0.5rem 0.7rem', borderRadius: '8px', backgroundColor: DARK.card, border: `1px solid ${DARK.cardBorder}` }}>
            {/* Header + timeframe toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#fbbf24' }}>🏗️ 主力建仓热力图 — 按行业聚合</span>
              <div style={{ display: 'flex', gap: '0.15rem' }}>
                {([['1d','1天'],['3d','3天'],['1w','7天']] as const).map(([k, l]) => (
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {sectors.map(s => {
                const barColor = s.score >= 3 ? '#f87171' : s.score >= 1 ? '#fbbf24' : s.score >= 0 ? '#4ade80' : '#8b949e'
                return (
                  <div key={s.name}>
                    {/* Bar row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.55rem' }}>
                      <span style={{ fontWeight: 600, color: DARK.text, minWidth: '70px' }}>{s.name}</span>
                      <span style={{ flex: 1, height: '6px', borderRadius: '3px', backgroundColor: DARK.dim, overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%', borderRadius: '3px', backgroundColor: barColor,
                          width: `${Math.min(100, Math.max(5, (s.score + 3) * 12))}%`, transition: 'width 0.3s' }} />
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: barColor, fontWeight: 700, minWidth: '35px' }}>
                        {s.score >= 0 ? '+' : ''}{s.score}
                      </span>
                      {heatmapTf === '1d' && (
                        <span style={{ color: DARK.muted, fontSize: '0.48rem', minWidth: '80px' }}>
                          {s.accum > 0 && `🏗️${s.accum}只 `}{s.markup > 0 && `🚀${s.markup}只 `}{s.dist > 0 && `⚠️${s.dist}只`}
                        </span>
                      )}
                      <span style={{ color: s.flow >= 0 ? '#f87171' : '#4ade80', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', minWidth: '55px' }}>
                        资金{s.flow >= 0 ? '+' : ''}{s.flow}亿
                      </span>
                    </div>
                    {/* Top3 inflow companies */}
                    {s.top3.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.4rem', paddingLeft: '74px', marginTop: '0.1rem', flexWrap: 'wrap' }}>
                        {s.top3.slice(0, 3).map((t, i) => (
                          <span key={t.code} style={{ fontSize: '0.46rem', color: DARK.muted, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <span style={{ color: i === 0 ? '#fbbf24' : DARK.dim }}>#{i + 1}</span>
                            <span style={{ color: DARK.text }}>{t.name.length > 4 ? t.name.slice(0, 4) : t.name}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', color: '#f87171' }}>+{t.estFlow}亿</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ fontSize: '0.48rem', color: DARK.dim, marginTop: '0.4rem' }}>
              {heatmapTf === '1d' ? '得分 = (建仓×3 + 拉升×2 - 出货×2 + 买入信号×2) ÷ 股票数' : '资金净流入 = 行业TOP3流入合计 − 流出合计'}
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

      {/* 各行业 TOP3 流入/流出 */}
      {data?.sectorTop3 && (
        <div style={{ padding: '0.5rem 0.7rem', borderRadius: '8px', backgroundColor: DARK.card, border: `1px solid ${DARK.cardBorder}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.3rem' }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#f87171' }}>📊 各行业资金流入/流出 TOP3</span>
            <div style={{ display: 'flex', gap: '0.15rem' }}>
              {[
                {k:'1d',l:'1天'},{k:'3d',l:'3天'},{k:'1w',l:'1周'},{k:'2w',l:'2周'},
              ].map(tf => (
                <button key={tf.k} onClick={() => setTimeframe(tf.k)} style={{
                  padding: '0.1rem 0.4rem', fontSize: '0.5rem', borderRadius: '8px', cursor: 'pointer',
                  border: '1px solid', borderColor: timeframe===tf.k ? '#f87171' : DARK.cardBorder,
                  backgroundColor: timeframe===tf.k ? '#f8717120' : 'transparent',
                  color: timeframe===tf.k ? '#f87171' : DARK.muted, fontWeight: timeframe===tf.k?700:400,
                }}>{tf.l}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.4rem' }}>
            {Object.entries(data.sectorTop3[timeframe] || data.sectorTop3['1d'] || {}).slice(0, 8).map(([sec, top3]) => (
              <div key={sec} style={{ padding: '0.3rem 0.4rem', borderRadius: '6px', backgroundColor: DARK.bg, border: `1px solid ${DARK.cardBorder}` }}>
                <div style={{ fontSize: '0.55rem', fontWeight: 700, color: DARK.text, marginBottom: '0.2rem' }}>{sec}</div>
                {/* Top inflow — only if there are positive flows */}
                {top3.topInflow.length > 0 && (
                  <div style={{ marginBottom: '0.15rem' }}>
                    <span style={{ fontSize: '0.48rem', color: '#f87171' }}>🟢 流入TOP{Math.min(3,top3.topInflow.length)}:</span>
                    {top3.topInflow.map((s,i) => (
                      <div key={i} style={{ fontSize: '0.5rem', color: DARK.text, paddingLeft: '0.5rem', display:'flex',gap:'0.3rem',alignItems:'center' }}>
                        <span style={{fontFamily:'var(--font-mono)',color:DARK.dim}}>{s.code}</span>
                        <span>{s.name.length>5?s.name.slice(0,5)+'…':s.name}</span>
                        <span style={{fontFamily:'var(--font-mono)',color:'#f87171',fontWeight:600}}>+{s.estFlow}亿</span>
                        <span style={{fontSize:'0.45rem',color:DARK.muted}}>{s.phase.slice(0,4)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Top outflow — only if there are negative flows */}
                {top3.topOutflow.length > 0 && (
                  <div>
                    <span style={{ fontSize: '0.48rem', color: '#4ade80' }}>🔴 流出TOP{Math.min(3,top3.topOutflow.length)}:</span>
                    {top3.topOutflow.map((s,i) => (
                      <div key={i} style={{ fontSize: '0.5rem', color: DARK.text, paddingLeft: '0.5rem', display:'flex',gap:'0.3rem',alignItems:'center' }}>
                        <span style={{fontFamily:'var(--font-mono)',color:DARK.dim}}>{s.code}</span>
                        <span>{s.name.length>5?s.name.slice(0,5)+'…':s.name}</span>
                        <span style={{fontFamily:'var(--font-mono)',color:'#4ade80',fontWeight:600}}>{s.estFlow}亿</span>
                        <span style={{fontSize:'0.45rem',color:DARK.muted}}>{s.phase.slice(0,4)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {top3.topInflow.length === 0 && top3.topOutflow.length === 0 && (
                  <span style={{ fontSize: '0.5rem', color: DARK.muted }}>暂无数据</span>
                )}
              </div>
            ))}
          </div>
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
