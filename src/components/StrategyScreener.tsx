'use client'

import { useState, useEffect, useCallback } from 'react'

interface StrategyResult { name: string; score: number; signals: string[]; match: boolean }
interface StockResult {
  code: string; name: string; price: number; changePct: number
  amount: number; volRatio: number; rsi6: number
  ma5: number; ma20: number; trendUp: boolean; macd: string; amplitude: number
  strategies: StrategyResult[]; bestStrategy: string; bestScore: number
}

const STRATEGY_INFO: Record<string, { icon: string; color: string; desc: string; hold: string; wr: string }> = {
  '涨停打板': { icon:'🚀',color:'#f87171',desc:'A股最主流短线策略，捕捉情绪高潮资金聚集',hold:'1~3天',wr:'35~50%'},
  '均线趋势': { icon:'📈',color:'#4ade80',desc:'只做均线多头排列，回踩支撑买，趋势破坏卖',hold:'2~8周',wr:'40~55%'},
  '板块轮动': { icon:'🔄',color:'#a78bfa',desc:'资金流向监控，提前布局下一个热点板块',hold:'2~4周',wr:'45~60%'},
  '波动做T': { icon:'💹',color:'#fbbf24',desc:'高振幅+高流动性，日内波段赚差价',hold:'当天',wr:'50~65%'},
}

const DARK = {
  bg: '#0d1117', card: '#161b22', cardBorder: '#30363d',
  text: '#e6edf3', muted: '#8b949e', dim: '#484f58',
  input: '#0d1117', inputBorder: '#30363d',
}

const DEFAULT_CODES = '000725,600036,601689,603667,603728,002050,300750,002371,688017,601012,002475,601138,300308,300274,002241,688256,688981,603019,600276,300760,600028,688065,688639,002459,600438'

// ── 策略操作指导生成 ─────────────────────────────────────────────
function generateGuidance(r: StockResult, strat: StrategyResult, accountSize = 100000) {
  const p = r.price; const riskPct = 2; const riskAmount = accountSize * riskPct / 100

  switch (strat.name) {
    case '涨停打板': {
      const stopLoss = p * 0.95  // -5% below current (break of封板)
      const riskPerShare = p - stopLoss
      const maxShares = Math.floor(riskAmount / riskPerShare)
      const takeProfit1 = p * 1.05; const takeProfit2 = p * 1.10
      return {
        entry: `明日竞价高开3%以上可追，平开/低开则等回踩¥${(r.ma5||p*0.97).toFixed(2)}企稳`,
        stopLoss: `¥${stopLoss.toFixed(2)}（跌破涨停价/MA5支撑）`,
        position: `${Math.min(maxShares, Math.floor(accountSize*0.15/p))}股（¥${(Math.min(maxShares,Math.floor(accountSize*0.15/p))*p).toFixed(0)}，≤总资金15%）`,
        takeProfit: `首目标¥${takeProfit1.toFixed(2)}(+5%) 减半仓，二目标¥${takeProfit2.toFixed(2)}(+10%) 清仓`,
        keyWatch: '次日竞价成交量>前日30%、龙虎榜无出货席位、封板资金/日成交>30%',
        rules: ['单票≤15%仓','次日低开破涨停价立刻止损','连板至第3日必清仓','同一题材最多2只'],
      }
    }
    case '均线趋势': {
      const stopLoss = Math.min(r.ma20, p * 0.93)
      const riskPerShare = p - stopLoss
      const maxShares = Math.floor(riskAmount / riskPerShare)
      const takeProfit = r.ma20 ? r.ma20 * 1.10 : p * 1.10
      return {
        entry: r.price > r.ma20
          ? `已有仓位持有，回踩MA20(¥${r.ma20.toFixed(2)})可加仓`
          : `等站上MA20(¥${r.ma20.toFixed(2)})确认趋势后再入场`,
        stopLoss: `¥${stopLoss.toFixed(2)}（跌破MA20或-7%硬止损）`,
        position: `${Math.min(maxShares, Math.floor(accountSize*0.2/p))}股（¥${(Math.min(maxShares,Math.floor(accountSize*0.2/p))*p).toFixed(0)}，≤总资金20%）`,
        takeProfit: `¥${takeProfit.toFixed(2)}(MA20上方+10%) 或 MACD死叉时离场`,
        keyWatch: `MA20(¥${r.ma20.toFixed(2)})得失是关键。收盘不破MA20就持有，破则无条件离场。`,
        rules: ['只做MA多头排列','收盘破MA20=无条件离场','分批建仓，不一次满仓','持有2-8周有耐心'],
      }
    }
    case '板块轮动': {
      const stopLoss = p * 0.95
      return {
        entry: `已确认放量上涨(量比${r.volRatio.toFixed(1)})，¥${(p*0.98).toFixed(2)}~¥${p.toFixed(2)}区间可建仓`,
        stopLoss: `¥${stopLoss.toFixed(2)}（-5%或缩量至均量一半以下）`,
        position: `${Math.floor(accountSize*0.15/p)}股（¥${(Math.floor(accountSize*0.15/p)*p).toFixed(0)}，≤总资金15%）`,
        takeProfit: `板块涨幅>10%或龙头股RSI>80时分批减仓`,
        keyWatch: '板块资金净流入是否持续2日以上、龙头股是否出现放量滞涨、板块涨停数是否增加',
        rules: ['同板块≤35%仓','板块连续2日无涨停=退潮','新板块涨幅>10%开始分批减','做多强势板块'],
      }
    }
    case '波动做T': {
      const buyZone = p * 0.98; const sellZone = p * 1.02
      const stopLoss = p * 0.965
      const riskPerShare = p - stopLoss
      const maxShares = Math.floor(riskAmount * 0.5 / riskPerShare) // 50% of risk for T
      return {
        entry: `底仓持有不动。日内¥${buyZone.toFixed(2)}以下买入做T，反弹¥${sellZone.toFixed(2)}以上卖出`,
        stopLoss: `¥${stopLoss.toFixed(2)}（做T部分-1.5%止损，底仓-3.5%止损）`,
        position: `底仓${Math.floor(accountSize*0.5/p)}股+做T仓${maxShares}股/日（≤底仓30%）`,
        takeProfit: `每笔做T目标+1.5~3%，月做10-15笔→增厚3-5%`,
        keyWatch: `今日振幅${r.amplitude}%${r.amplitude>2?'✅可做T':r.amplitude>1.5?'⚠️勉强':'❌振幅太小不适合'}。量比${r.volRatio.toFixed(1)}，流动性${r.amount>10e8?'充足':'一般'}`,
        rules: ['底仓不卖！只做T+0','做T仓位≤底仓30%','单笔T止损-1.5%','连续3笔亏损停手'],
      }
    }
    default:
      return { entry: '--', stopLoss: '--', position: '--', takeProfit: '--', keyWatch: '--', rules: [] }
  }
}

export default function StrategyScreener() {
  const [results, setResults] = useState<StockResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [codes, setCodes] = useState(DEFAULT_CODES)
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchData = useCallback(async (c: string) => {
    setLoading(true); setError(''); setResults([])
    try {
      const res = await fetch(`/api/strategy-screener?codes=${encodeURIComponent(c)}`)
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResults(Array.isArray(data) ? data : [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData(codes) }, [])

  const filtered = filter === 'all' ? results : results.filter(r => r.bestStrategy === filter)
  const stratCounts: Record<string, number> = {}
  results.forEach(r => { stratCounts[r.bestStrategy] = (stratCounts[r.bestStrategy]||0) + 1 })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem', borderRadius: '10px', backgroundColor: DARK.bg, border: `1px solid ${DARK.cardBorder}` }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#58a6ff' }}>🎯 策略匹配器</span>
        <input value={codes} onChange={e => setCodes(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') fetchData(codes) }}
          placeholder="股票代码,逗号分隔"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.62rem', width: '260px', borderRadius: '6px', border: `1px solid ${DARK.inputBorder}`, backgroundColor: DARK.input, color: DARK.text, fontFamily: 'var(--font-mono)', outline: 'none' }} />
        <button onClick={() => fetchData(codes)}
          style={{ padding: '0.25rem 0.75rem', fontSize: '0.62rem', borderRadius: '6px', border: 'none', backgroundColor: '#238636', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>扫描</button>
      </div>

      {/* Strategy filter */}
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} style={{
          padding: '0.2rem 0.6rem', fontSize: '0.6rem', borderRadius: '12px', cursor: 'pointer',
          border: '1px solid', borderColor: filter==='all' ? '#58a6ff' : DARK.cardBorder,
          backgroundColor: filter==='all' ? '#1f6feb22' : DARK.card,
          color: filter==='all' ? '#58a6ff' : DARK.muted, fontWeight: filter==='all' ? 700 : 400,
        }}>全部 ({results.length})</button>
        {Object.entries(STRATEGY_INFO).map(([name, info]) => (
          <button key={name} onClick={() => setFilter(name)} style={{
            padding: '0.2rem 0.6rem', fontSize: '0.6rem', borderRadius: '12px', cursor: 'pointer',
            border: '1px solid', borderColor: filter===name ? info.color : DARK.cardBorder,
            backgroundColor: filter===name ? `${info.color}18` : DARK.card,
            color: filter===name ? info.color : DARK.muted, fontWeight: filter===name ? 700 : 400,
          }}>{info.icon} {name} ({stratCounts[name]||0})</button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '2rem', color: DARK.muted }}>策略匹配中...</div>}
      {error && <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: '#490202', color: '#f87171', border: '1px solid #f8717150', fontSize: '0.7rem' }}>{error}</div>}

      {filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {filtered.map(r => {
            const best = r.strategies.find(s => s.name === r.bestStrategy) || r.strategies[0]
            const info = STRATEGY_INFO[best.name] || { icon:'📊',color:DARK.muted }
            const isUp = r.changePct >= 0
            const isExpanded = expanded === r.code
            const matchedStrats = r.strategies.filter(s => s.match)

            return (
              <div key={r.code} style={{
                borderRadius: '8px', border: `1px solid ${best.match ? info.color+'50' : DARK.cardBorder}`,
                backgroundColor: DARK.card, overflow: 'hidden',
              }}>
                {/* Clickable header */}
                <div onClick={() => setExpanded(isExpanded ? null : r.code)}
                  style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: DARK.text }}>{r.name}</span>
                  <span style={{ fontSize: '0.58rem', fontFamily: 'var(--font-mono)', color: DARK.dim }}>{r.code}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: isUp ? '#f87171' : '#4ade80' }}>
                    ¥{r.price.toFixed(2)} <span style={{ fontSize: '0.65rem' }}>{isUp?'+':''}{r.changePct.toFixed(1)}%</span>
                  </span>
                  <div style={{ display: 'flex', gap: '0.25rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
                    {matchedStrats.map(s => {
                      const si = STRATEGY_INFO[s.name]
                      return (
                        <span key={s.name} style={{
                          padding: '0.12rem 0.4rem', borderRadius: '10px', fontSize: '0.52rem',
                          backgroundColor: si ? `${si.color}20` : DARK.card,
                          color: si?.color || DARK.muted,
                          border: `1px solid ${si?.color+'40' || DARK.cardBorder}`,
                          fontFamily: 'var(--font-mono)', fontWeight: 600,
                        }}>{si?.icon} {s.name} {s.score}分</span>
                      )
                    })}
                    <span style={{ color: DARK.muted, fontSize: '0.6rem' }}>{isExpanded ? '▲' : '▼ 点击查看操作指导'}</span>
                  </div>
                </div>

                {/* Quick indicators — always visible */}
                <div style={{ padding: '0 0.75rem 0.4rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.56rem', color: DARK.muted }}>
                  <span>量比:<b style={{ color: DARK.text }}>{r.volRatio.toFixed(1)}x</b></span>
                  <span>RSI(6):<b style={{ color: r.rsi6>70?'#f87171':r.rsi6<30?'#4ade80':DARK.text }}>{r.rsi6}</b></span>
                  <span style={{ color: r.macd==='golden'?'#f87171':'#4ade80', fontWeight: 600 }}>MACD:{r.macd==='golden'?'金叉':'死叉'}</span>
                  <span>振幅:<b style={{ color: DARK.text }}>{r.amplitude}%</b></span>
                  <span>MA5:<b style={{ color: r.price>r.ma5?'#f87171':'#4ade80' }}>¥{r.ma5.toFixed(2)}</b></span>
                  <span>MA20:<b style={{ color: r.price>r.ma20?'#f87171':'#4ade80' }}>¥{r.ma20.toFixed(2)}</b></span>
                  <span style={{ color: r.trendUp?'#4ade80':'#f87171', fontWeight: 600 }}>趋势:{r.trendUp?'⬆️多头':'⬇️空头'}</span>
                  {best.match && (
                    <span style={{ fontWeight: 700, marginLeft: 'auto', color: '#4ade80', backgroundColor: '#4ade8015', padding: '0.12rem 0.5rem', borderRadius: '4px', border: '1px solid #4ade8040' }}>
                      ✅ {info.icon} {best.name} · {STRATEGY_INFO[best.name]?.hold} · 胜率{STRATEGY_INFO[best.name]?.wr}
                    </span>
                  )}
                </div>

                {/* Expanded: 操作指导 */}
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${DARK.cardBorder}`, padding: '0.6rem 0.75rem', backgroundColor: '#0d1117' }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#58a6ff', marginBottom: '0.5rem' }}>
                      📋 匹配策略操作指导（基于10万本金·2%单笔风险原则）
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.5rem' }}>
                      {matchedStrats.map(strat => {
                        const g = generateGuidance(r, strat)
                        const si = STRATEGY_INFO[strat.name]
                        return (
                          <div key={strat.name} style={{
                            padding: '0.5rem 0.6rem', borderRadius: '6px',
                            backgroundColor: `${si.color}08`, border: `1px solid ${si.color}30`,
                          }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: si.color, marginBottom: '0.4rem' }}>
                              {si.icon} {strat.name} · 得分{strat.score}/100 · {si.wr}胜率
                            </div>
                            {[
                              ['🎯 入场', g.entry],
                              ['🛑 止损', g.stopLoss],
                              ['📦 仓位', g.position],
                              ['💰 止盈', g.takeProfit],
                              ['👀 关注', g.keyWatch],
                            ].map(([label, value]) => (
                              <div key={label} style={{ marginBottom: '0.3rem', fontSize: '0.54rem' }}>
                                <span style={{ color: DARK.muted }}>{label}：</span>
                                <span style={{ color: DARK.text, lineHeight: 1.5 }}>{value}</span>
                              </div>
                            ))}
                            <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                              {g.rules.map((rule, i) => (
                                <span key={i} style={{ fontSize: '0.48rem', padding: '0.08rem 0.3rem', borderRadius: '6px', backgroundColor: `${si.color}15`, color: si.color, border: `1px solid ${si.color}30` }}>
                                  {rule}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: `1px solid ${DARK.cardBorder}`, backgroundColor: DARK.card, display: 'flex', gap: '1.2rem', flexWrap: 'wrap', fontSize: '0.55rem', color: DARK.muted }}>
        <strong style={{ color: '#58a6ff' }}>策略速查：</strong>
        {Object.entries(STRATEGY_INFO).map(([name, info]) => (
          <span key={name} style={{ color: info.color }}>{info.icon} {name}: {info.desc}（{info.hold}，胜率{info.wr}）</span>
        ))}
      </div>
    </div>
  )
}
