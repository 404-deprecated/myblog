'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface ZuotState {
  // Position
  baseShares: number       // 底仓股数
  zuotShares: number       // 当前做T仓位
  avgCost: number          // 底仓成本
  zuotCost: number         // 做T买入均价
  // Today's trades
  todayBuys: number        // 今日买入股数
  todaySells: number       // 今日卖出股数
  todayProfit: number      // 今日做T盈利
  totalProfit: number      // 累计做T盈利
  tradeCount: number       // 今日做T笔数
  // Stats
  dailyAmplitude: number   // 今日振幅%
  currentPrice: number     // 当前价
  preClose: number         // 昨收
  open: number             // 今开
  high: number             // 今日最高
  low: number              // 今日最低
  changePct: number        // 涨跌幅%
}

const DEFAULT_STATE: ZuotState = {
  baseShares: 10000, zuotShares: 0, avgCost: 5.80, zuotCost: 0,
  todayBuys: 0, todaySells: 0, todayProfit: 0, totalProfit: 0, tradeCount: 0,
  dailyAmplitude: 0, currentPrice: 6.15, preClose: 5.59, open: 5.69, high: 6.15, low: 5.69, changePct: 10.02,
}

const CAPITAL = 100000

export default function ZuotHelper() {
  const [state, setState] = useState<ZuotState>(DEFAULT_STATE)
  const [customPrice, setCustomPrice] = useState('')
  const [buyAmount, setBuyAmount] = useState(2000)
  const [sellAmount, setSellAmount] = useState(2000)
  const [log, setLog] = useState<string[]>(['📋 做T助手已启动 — 底仓10,000股 成本¥5.80'])
  const [suggestion, setSuggestion] = useState('')

  const addLog = (msg: string) => setLog(prev => [msg, ...prev].slice(0, 50))

  // Fetch real-time price
  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch('/api/ashare?cmd=quote&codes=000725', { cache: 'no-store' })
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const s = data[0]
        setState(prev => ({
          ...prev,
          currentPrice: s.price || prev.currentPrice,
          preClose: s.preClose || prev.preClose,
          open: s.open || prev.open,
          high: s.high || prev.high,
          low: s.low || prev.low,
          changePct: s.changePct || prev.changePct,
          dailyAmplitude: s.preClose ? Math.abs(s.high - s.low) / s.preClose * 100 : prev.dailyAmplitude,
        }))
      }
    } catch {}
  }, [])

  useEffect(() => { fetchPrice(); const timer = setInterval(fetchPrice, 60000); return () => clearInterval(timer) }, [])

  // Generate suggestion
  useEffect(() => {
    const p = state.currentPrice
    const amp = state.dailyAmplitude
    const chg = state.changePct
    const open = state.open

    let sug = ''
    if (chg > 9.5) {
      sug = '🔴 涨停封板中！不要做T——卖飞了买不回来。持有不动。'
    } else if (chg > 5) {
      sug = '🟡 大涨中。若已持仓可先卖2,000股锁利，等日内回落再买回。不追高。'
    } else if (chg > 2) {
      sug = '🟢 偏强。日内若冲高>3%可卖1,000-2,000股做T，回落后补回。'
    } else if (chg < -3) {
      sug = '🟢 大跌是机会！若距MA5不远可买2,000-3,000股做反弹T，反弹1.5%即出。'
    } else if (chg < -1) {
      sug = '🟡 偏弱。观察是否企稳。若10:30后不再创新低，可轻仓(1,000股)抄底。'
    } else if (amp < 1.5 && Math.abs(chg) < 1) {
      sug = '⚪ 振幅太小(<1.5%)，今日不适合做T。持币观望。'
    } else {
      sug = '🟢 正常波动。可按照策略：跌2%买入、涨2%卖出，做日内波段。'
    }
    setSuggestion(sug)
  }, [state.currentPrice, state.dailyAmplitude, state.changePct])

  // Actions
  const doBuy = (shares: number) => {
    const cost = shares * state.currentPrice
    if (state.zuotShares + shares > state.baseShares * 0.3) {
      addLog(`⚠️ 做T仓位已达上限(${Math.floor(state.baseShares*0.3)}股)，不要再加了`)
      return
    }
    setState(prev => ({
      ...prev,
      zuotShares: prev.zuotShares + shares,
      zuotCost: prev.zuotShares === 0 ? state.currentPrice :
        (prev.zuotCost * prev.zuotShares + cost) / (prev.zuotShares + shares),
      todayBuys: prev.todayBuys + shares,
    }))
    addLog(`🟢 买入 ${shares}股 @ ¥${state.currentPrice.toFixed(2)} — 做T仓位: ${state.zuotShares + shares}股`)
  }

  const doSell = (shares: number) => {
    const actual = Math.min(shares, state.zuotShares)
    if (actual <= 0) {
      addLog('⚠️ 没有做T仓位可以卖出')
      return
    }
    const profit = (state.currentPrice - state.zuotCost) * actual
    setState(prev => ({
      ...prev,
      zuotShares: prev.zuotShares - actual,
      zuotCost: prev.zuotShares - actual <= 0 ? 0 : prev.zuotCost,
      todaySells: prev.todaySells + actual,
      todayProfit: prev.todayProfit + profit,
      totalProfit: prev.totalProfit + profit,
      tradeCount: prev.tradeCount + 1,
    }))
    const pct = state.zuotCost > 0 ? ((state.currentPrice - state.zuotCost) / state.zuotCost * 100).toFixed(1) : '?'
    addLog(`🔴 卖出 ${actual}股 @ ¥${state.currentPrice.toFixed(2)} — 盈利 ¥${profit.toFixed(0)} (${pct}%)`)
  }

  const doResetDay = () => {
    setState(prev => ({ ...prev, zuotShares: 0, zuotCost: 0, todayBuys: 0, todaySells: 0, todayProfit: 0, tradeCount: 0 }))
    addLog('🔄 当日做T仓位已清零')
  }

  // Calculations
  const baseValue = state.baseShares * state.currentPrice
  const baseCost = state.baseShares * state.avgCost
  const basePnL = baseValue - baseCost
  const basePnLPct = baseCost > 0 ? (basePnL / baseCost * 100) : 0
  const todayAmp = state.dailyAmplitude
  const zuotValue = state.zuotShares * state.currentPrice
  const totalValue = baseValue + zuotValue + (CAPITAL - baseCost - zuotValue)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Price & Status Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
        padding: '0.5rem 0.75rem', borderRadius: '8px',
        backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>京东方A</span>
        <span style={{
          fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
          color: state.changePct >= 0 ? '#dc2626' : '#16a34a',
        }}>
          ¥{state.currentPrice.toFixed(2)}
        </span>
        <span style={{
          fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
          color: state.changePct >= 0 ? '#dc2626' : '#16a34a',
        }}>
          {state.changePct > 0 ? '+' : ''}{state.changePct.toFixed(2)}%
        </span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          今开 ¥{state.open.toFixed(2)} 高 ¥{state.high.toFixed(2)} 低 ¥{state.low.toFixed(2)}
        </span>
        <span style={{
          fontSize: '0.62rem', marginLeft: 'auto', fontFamily: 'var(--font-mono)',
          color: todayAmp > 3 ? '#16a34a' : todayAmp > 2 ? '#d97706' : 'var(--text-muted)',
        }}>
          振幅 {todayAmp.toFixed(1)}% {todayAmp > 2 ? '✅ 可做T' : '❌ 不适合'}
        </span>
      </div>

      {/* Suggestion Box */}
      <div style={{
        padding: '0.5rem 0.75rem', borderRadius: '8px',
        backgroundColor: suggestion.includes('🔴') ? '#fff1f2' :
                         suggestion.includes('🟢') ? '#f0fdf4' :
                         suggestion.includes('🟡') ? '#fffbeb' : '#eff6ff',
        border: `1px solid ${suggestion.includes('🔴') ? '#fca5a5' : suggestion.includes('🟢') ? '#86efac' : suggestion.includes('🟡') ? '#fcd34d' : '#93c5fd'}`,
      }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.5 }}>{suggestion || '加载中...'}</div>
      </div>

      {/* Position Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
        {[
          { l: '底仓市值', v: `¥${baseValue.toFixed(0)}`, c: basePnL >= 0 ? '#16a34a' : '#dc2626' },
          { l: '底仓盈亏', v: `${basePnL >= 0 ? '+' : ''}¥${basePnL.toFixed(0)}`, c: basePnL >= 0 ? '#16a34a' : '#dc2626' },
          { l: '底仓收益率', v: `${basePnLPct >= 0 ? '+' : ''}${basePnLPct.toFixed(1)}%`, c: basePnL >= 0 ? '#16a34a' : '#dc2626' },
          { l: '做T仓位', v: `${state.zuotShares}股`, c: 'var(--text)' },
          { l: '今日做T盈利', v: `¥${state.todayProfit.toFixed(0)}`, c: state.todayProfit >= 0 ? '#16a34a' : '#dc2626' },
          { l: '今日做T笔数', v: `${state.tradeCount}笔`, c: 'var(--text)' },
          { l: '今日买卖', v: `买${state.todayBuys}/卖${state.todaySells}`, c: 'var(--text)' },
          { l: '累计做T盈利', v: `¥${state.totalProfit.toFixed(0)}`, c: state.totalProfit >= 0 ? '#16a34a' : '#dc2626' },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>{l}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: c, fontFamily: 'var(--font-mono)' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Trading Panel */}
      <div style={{
        display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center',
        padding: '0.5rem 0.75rem', borderRadius: '8px',
        backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>买入</span>
        <input type="number" value={buyAmount} onChange={e => setBuyAmount(Number(e.target.value))}
          style={{ width: '60px', padding: '0.2rem', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', textAlign: 'center' }} />
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>股</span>
        <button onClick={() => doBuy(buyAmount)}
          style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem', borderRadius: '4px', border: 'none', backgroundColor: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          买入
        </button>
        <button onClick={() => doBuy(2000)}
          style={{ padding: '0.2rem 0.5rem', fontSize: '0.62rem', borderRadius: '4px', border: '1px solid #dc2626', color: '#dc2626', backgroundColor: 'transparent', cursor: 'pointer' }}>
          快买2000
        </button>

        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: '0.5rem' }}>卖出</span>
        <input type="number" value={sellAmount} onChange={e => setSellAmount(Number(e.target.value))}
          style={{ width: '60px', padding: '0.2rem', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', textAlign: 'center' }} />
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>股</span>
        <button onClick={() => doSell(sellAmount)}
          style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem', borderRadius: '4px', border: 'none', backgroundColor: '#16a34a', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          卖出
        </button>
        <button onClick={() => doSell(2000)}
          style={{ padding: '0.2rem 0.5rem', fontSize: '0.62rem', borderRadius: '4px', border: '1px solid #16a34a', color: '#16a34a', backgroundColor: 'transparent', cursor: 'pointer' }}>
          快卖2000
        </button>

        <button onClick={doResetDay}
          style={{ padding: '0.2rem 0.5rem', fontSize: '0.62rem', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-muted)', backgroundColor: 'transparent', cursor: 'pointer', marginLeft: 'auto' }}>
          重置当日
        </button>
      </div>

      {/* Manual price update */}
      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
        <span>手动更新价格:</span>
        <input type="text" value={customPrice} onChange={e => setCustomPrice(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { const p = parseFloat(customPrice); if (p > 0) { setState(prev => ({ ...prev, currentPrice: p })); addLog(`📝 手动更新价格 ¥${p.toFixed(2)}`) } setCustomPrice('') }}}
          placeholder="如 6.15"
          style={{ width: '60px', padding: '0.15rem', fontSize: '0.62rem', borderRadius: '3px', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', textAlign: 'center' }} />
        <button onClick={() => { fetchPrice(); addLog('🔄 刷新实时价格') }}
          style={{ padding: '0.15rem 0.4rem', fontSize: '0.6rem', borderRadius: '3px', border: '1px solid var(--accent)', color: 'var(--accent)', backgroundColor: 'transparent', cursor: 'pointer' }}>
          刷新
        </button>
        <button onClick={() => {
          setState(DEFAULT_STATE); setLog(['📋 已重置'])
        }} style={{ padding: '0.15rem 0.4rem', fontSize: '0.6rem', borderRadius: '3px', border: '1px solid var(--border)', color: 'var(--text-muted)', backgroundColor: 'transparent', cursor: 'pointer' }}>
          全部重置
        </button>
      </div>

      {/* Trade Log */}
      <div style={{
        maxHeight: '150px', overflowY: 'auto',
        borderRadius: '6px', border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-secondary)', padding: '0.4rem 0.6rem',
      }}>
        {log.map((msg, i) => (
          <div key={i} style={{
            fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
            padding: '0.1rem 0', lineHeight: 1.4,
          }}>
            {msg}
          </div>
        ))}
      </div>
    </div>
  )
}
