'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { NVDA_HISTORY, TENCENT_HISTORY, ORCL_HISTORY, PDD_HISTORY, type MonthlyClose } from './portfolio-data'

interface LivePrice { price: number; changePct: number; error?: boolean }

type WRange = '3Y' | '5Y' | '10Y' | 'MAX'
const RANGE_MONTHS: Record<WRange, number> = { '3Y': 36, '5Y': 60, '10Y': 120, 'MAX': 9999 }

const WATCHLIST = [
  {
    ticker: 'NVDA',
    yfTicker: 'NVDA',
    cnName: '英伟达',
    currency: 'USD',
    color: '#16a34a',
    flag: '🇺🇸',
    history: NVDA_HISTORY,
    nextEarnings: '2026-05-28',
    earningsNote: 'Blackwell GPU出货加速，数据中心Q1收入预计达$390亿+，超市场预期概率较高。但PE~28x已在历史高位，任何指引不及预期都会引发剧烈波动。关键指标：毛利率是否维持75%以上。',
    earningsOutlook: 'positive' as 'positive' | 'neutral' | 'negative',
    preAction: '财报前7日密切跟踪算力订单信息。若近3月涨幅>30%应先减仓1/3锁利；财报前一日若已大幅上涨，考虑买看跌期权对冲。仓位上限20%。',
    postAction: '超预期+毛利率稳定：继续持有或小加仓。数据中心收入指引下调或毛利受压：次日开盘果断减仓60%，等下季度验证后再重建仓。',
  },
  {
    ticker: '0700.HK',
    yfTicker: '0700.HK',
    cnName: '腾讯控股',
    currency: 'HKD',
    color: '#2563eb',
    flag: '🇭🇰',
    history: TENCENT_HISTORY,
    nextEarnings: '2026-05-14',
    earningsNote: '微信广告+小程序+游戏三驾马车稳定增长，AI加持效率提升显著。Q1游戏收入预计增速12%。监管整体宽松，回购力度强。预计符合预期，大幅超预期概率中等。',
    earningsOutlook: 'neutral' as 'positive' | 'neutral' | 'negative',
    preAction: '港股财报日前后波动大，财报前3日建议仓位不超10%。避免杠杆产品，注意港股T+0流动性风险，做好止损预案。',
    postAction: '超预期且盘中涨幅>5%：当天减仓1/3锁利，剩余持有。不及预期：次日观察，若跌破250支撑位则减仓50%，等300以下再重建仓。',
  },
  {
    ticker: 'ORCL',
    yfTicker: 'ORCL',
    cnName: '甲骨文',
    currency: 'USD',
    color: '#7c3aed',
    flag: '🇺🇸',
    history: ORCL_HISTORY,
    nextEarnings: '2026-06-10',
    earningsNote: 'OCI云算力承接AI浪潮，与OpenAI/微软战略合作持续利好。Q4（FY2026）数据库云迁移+Autonomous DB增速强劲，机构普遍调高目标价。预计超预期概率高。',
    earningsOutlook: 'positive' as 'positive' | 'neutral' | 'negative',
    preAction: '财报前2周可分批建仓，目标仓位15-20%；等回调至60日线附近加仓。若已涨超目标价的90%则不追高，等回踩再入。',
    postAction: '超预期+云收入加速：可持有并在5-10%回调时加仓。不及预期或云增速放缓：次日观察是否跌破150支撑，跌破则减仓50%。',
  },
  {
    ticker: 'PDD',
    yfTicker: 'PDD',
    cnName: '拼多多',
    currency: 'USD',
    color: '#ea580c',
    flag: '🇺🇸',
    history: PDD_HISTORY,
    nextEarnings: '2026-05-22',
    earningsNote: '国内农业电商稳固+Temu全球扩张持续，Q1GMV增速预计超20%。美国关税豁免若落地将是重大催化剂，反之是最大尾部风险。PE估值偏低，若能维持增速则仍有上升空间。',
    earningsOutlook: 'positive' as 'positive' | 'neutral' | 'negative',
    preAction: '财报前5日可轻仓试探，仓位≤15%，设止损-8%。若前3日已涨>10%先减仓锁利，再等实际财报出来评估。',
    postAction: '超预期且指引乐观：次日前30分钟不追涨，等开盘回踩5日线后加仓1/3。不及预期：次日开盘减仓50%，跌破关键支撑则清仓等更好买点。',
  },
]

// ─── Technical Analysis ────────────────────────────────────────────────────
function sma(arr: number[], n: number): number | null {
  if (arr.length < n) return null
  return arr.slice(-n).reduce((a, b) => a + b, 0) / n
}

function computeAnalysis(data: MonthlyClose[]) {
  const vals = data.map(d => d.p)
  if (vals.length < 6) return null

  const s3 = sma(vals, 3); const s6 = sma(vals, 6)
  const s12 = vals.length >= 12 ? sma(vals, 12) : null
  const s24 = vals.length >= 24 ? sma(vals, 24) : null

  // RSI
  const win = Math.min(14, vals.length - 1)
  let g = 0, l = 0
  for (let i = vals.length - win; i < vals.length; i++) {
    const d = vals[i] - vals[i - 1]; if (d > 0) g += d; else l += Math.abs(d)
  }
  const rsi = l === 0 ? 100 : +(100 - 100 / (1 + g / win / (l / win))).toFixed(1)

  const mom3 = vals.length >= 4
    ? +((vals[vals.length - 1] / vals[vals.length - 4] - 1) * 100).toFixed(1) : 0
  const mom6 = vals.length >= 7
    ? +((vals[vals.length - 1] / vals[vals.length - 7] - 1) * 100).toFixed(1) : 0
  const ytdChg = +((vals[vals.length - 1] / vals[0] - 1) * 100).toFixed(1)

  const signals: { name: string; value: string; bullish: boolean }[] = []
  if (s3 && s6) {
    const b = s3 > s6
    signals.push({ name: 'MA3/MA6', value: b ? '金叉 — 短期多头' : '死叉 — 短期空头', bullish: b })
  }
  if (s6 && s12) {
    const b = s6 > s12
    signals.push({ name: 'MA6/MA12', value: b ? '中线上升趋势' : '中线下降趋势', bullish: b })
  }
  if (s12 && s24) {
    const b = s12 > s24
    signals.push({ name: 'MA12/MA24', value: b ? '长线多头排列' : '长线空头排列', bullish: b })
  }
  signals.push({
    name: 'RSI(14月)',
    value: rsi < 30 ? `${rsi} 超卖（强买入信号）` : rsi > 70 ? `${rsi} 超买（注意回调）` : `${rsi} 中性`,
    bullish: rsi < 30 ? true : rsi > 70 ? false : rsi < 55,
  })
  signals.push({ name: '3月动量', value: `${mom3 >= 0 ? '+' : ''}${mom3}%`, bullish: mom3 > 0 })
  signals.push({ name: '6月动量', value: `${mom6 >= 0 ? '+' : ''}${mom6}%`, bullish: mom6 > 0 })

  // Backtest: MA3/MA6 cross → next month direction
  let correct = 0, total = 0
  for (let i = 8; i < vals.length - 1; i++) {
    const fast = vals.slice(i - 2, i + 1).reduce((a, b) => a + b, 0) / 3
    const slow = vals.slice(i - 5, i + 1).reduce((a, b) => a + b, 0) / 6
    const pred = fast > slow ? 'up' : 'down'
    const actual = vals[i + 1] > vals[i] ? 'up' : 'down'
    if (pred === actual) correct++; total++
  }
  const accuracy = total > 0 ? Math.round(correct / total * 100) : 0

  const bullCount = signals.filter(s => s.bullish).length
  const bullPct = Math.round(bullCount / signals.length * 100)

  const bullSignals = signals.filter(s => s.bullish).map(s => s.name)
  const bearSignals = signals.filter(s => !s.bullish).map(s => s.name)
  const reason = bullPct >= 60
    ? `${bullSignals.slice(0, 3).join('、')} 均呈多头信号，${bearSignals.length ? `但 ${bearSignals[0]} 提示注意` : '整体向好'}。`
    : bullPct <= 40
    ? `${bearSignals.slice(0, 3).join('、')} 发出空头信号，${bullSignals.length ? `${bullSignals[0]} 仍有支撑` : '建议观望'}。`
    : `多空信号分歧，${bullSignals[0] ? bullSignals[0] + ' 偏多' : ''}${bearSignals[0] ? '，' + bearSignals[0] + ' 偏空' : ''}，建议持仓观望。`

  return { bullPct, signals, accuracy, samples: total, reason, rsi, mom3, mom6, ytdChg, s3, s6, s12, s24 }
}

// ─── Stock Chart ──────────────────────────────────────────────────────────
function StockChart({ data, range, color }: { data: MonthlyClose[]; range: WRange; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const months = RANGE_MONTHS[range]
  const filtered = data.slice(-months)

  useEffect(() => {
    const canvas = ref.current; if (!canvas || filtered.length < 2) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth; const H = canvas.offsetHeight
    canvas.width = W * dpr; canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    const vals = filtered.map(d => d.p)
    const pad = { t: 14, r: 50, b: 24, l: 10 }
    const cw = W - pad.l - pad.r; const ch = H - pad.t - pad.b

    const minP = Math.min(...vals); const maxP = Math.max(...vals)
    const range2 = maxP - minP || 1
    const xOf = (i: number) => pad.l + (i / (vals.length - 1)) * cw
    const yOf = (v: number) => pad.t + ch - ((v - minP) / range2) * ch

    // grid
    ctx.strokeStyle = '#e5e7eb22'; ctx.lineWidth = 0.5
    for (let s = 1; s < 4; s++) {
      const y = pad.t + ch / 4 * s
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke()
    }

    // SMA lines
    const smaLengths = [{ n: 6, c: '#f59e0b99' }, { n: 12, c: '#3b82f699' }, { n: 24, c: '#8b5cf699' }]
    smaLengths.forEach(({ n, c }) => {
      ctx.beginPath(); let started = false
      vals.forEach((_, i) => {
        if (i < n - 1) return
        const avg = vals.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n
        const x = xOf(i); const y = yOf(avg)
        if (!started) { ctx.moveTo(x, y); started = true } else ctx.lineTo(x, y)
      })
      ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); ctx.stroke()
      ctx.setLineDash([])
    })

    // Price line
    ctx.beginPath()
    vals.forEach((v, i) => { i === 0 ? ctx.moveTo(xOf(i), yOf(v)) : ctx.lineTo(xOf(i), yOf(v)) })
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke()

    // Fill
    ctx.lineTo(xOf(vals.length - 1), H - pad.b); ctx.lineTo(xOf(0), H - pad.b); ctx.closePath()
    const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b)
    grad.addColorStop(0, color + '35'); grad.addColorStop(1, color + '00')
    ctx.fillStyle = grad; ctx.fill()

    // Y-axis labels
    ctx.fillStyle = '#6b7280'; ctx.font = '10px system-ui'; ctx.textAlign = 'left'
    const fmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v >= 100 ? v.toFixed(0) : v.toFixed(1)
    ctx.fillText(fmt(maxP), W - pad.r + 4, pad.t + 4)
    ctx.fillText(fmt(minP), W - pad.r + 4, H - pad.b)

    // X-axis labels
    ctx.fillText(filtered[0].d.slice(0, 4), pad.l, H - 5)
    ctx.textAlign = 'right'
    ctx.fillText(filtered[filtered.length - 1].d.slice(0, 7), W - pad.r, H - 5)

    // Change %
    const chg = ((vals[vals.length - 1] - vals[0]) / vals[0] * 100).toFixed(1)
    ctx.fillStyle = parseFloat(chg) >= 0 ? '#16a34a' : '#dc2626'
    ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'right'
    ctx.fillText(`${parseFloat(chg) >= 0 ? '+' : ''}${chg}%`, W - pad.r + 44, pad.t + 1)
  }, [filtered, color])

  return <canvas ref={ref} style={{ width: '100%', height: '200px', display: 'block' }} />
}

// ─── Prediction badge ─────────────────────────────────────────────────────
function PredBadge({ bullPct, accuracy, samples }: { bullPct: number; accuracy: number; samples: number }) {
  const isBull = bullPct >= 55; const isBear = bullPct <= 45
  const pct = isBull ? bullPct : isBear ? 100 - bullPct : 50
  const color = isBull ? '#16a34a' : isBear ? '#dc2626' : '#d97706'
  const bg = isBull ? '#f0fdf4' : isBear ? '#fff1f2' : '#fffbeb'
  const label = isBull ? `📈 下月看涨 ${bullPct}%` : isBear ? `📉 下月看跌 ${100 - bullPct}%` : `➡️ 震荡整理`

  return (
    <div style={{ borderRadius: '8px', border: `1px solid ${color}40`, backgroundColor: bg, padding: '0.75rem 0.875rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color }}>{label}</span>
        <span style={{ fontSize: '0.65rem', color: '#6b7280', fontFamily: 'var(--font-mono)' }}>
          {accuracy}% 准确率 · {samples}次回测
        </span>
      </div>
      <div style={{ height: '5px', borderRadius: '3px', overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '3px' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', fontSize: '0.6rem', color: '#9ca3af' }}>
        <span>空 0%</span><span>50% 中性</span><span>多 100%</span>
      </div>
    </div>
  )
}

// ─── Earnings block ───────────────────────────────────────────────────────
function EarningsBlock({ item }: { item: typeof WATCHLIST[0] }) {
  const today = new Date('2026-05-11')
  const days = Math.round((new Date(item.nextEarnings).getTime() - today.getTime()) / 86400000)
  const oc = item.earningsOutlook === 'positive' ? '#16a34a' : item.earningsOutlook === 'negative' ? '#dc2626' : '#d97706'
  const ol = item.earningsOutlook === 'positive' ? '预期超预期' : item.earningsOutlook === 'negative' ? '预期不及预期' : '预期符合预期'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>
          📅 {item.nextEarnings}
        </span>
        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '10px', backgroundColor: days <= 7 ? '#fee2e2' : days <= 30 ? '#fef3c7' : '#f0fdf4', color: days <= 7 ? '#dc2626' : days <= 30 ? '#d97706' : '#16a34a' }}>
          {days < 0 ? `${Math.abs(days)}天前` : days === 0 ? '今天' : `还有 ${days} 天`}
        </span>
        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '10px', backgroundColor: oc + '18', color: oc, border: `1px solid ${oc}40` }}>{ol}</span>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>{item.earningsNote}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {[
          { title: '财报前策略', text: item.preAction, bg: '#fef3c7', border: '#d97706', tc: '#92400e', dc: '#78350f' },
          { title: '财报后策略', text: item.postAction, bg: '#f0fdf4', border: '#16a34a', tc: '#14532d', dc: '#166534' },
        ].map(row => (
          <div key={row.title} style={{ padding: '0.5rem 0.625rem', borderRadius: '6px', backgroundColor: row.bg, borderLeft: `3px solid ${row.border}` }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: row.tc, marginBottom: '0.2rem' }}>{row.title}</div>
            <div style={{ fontSize: '0.72rem', color: row.dc, lineHeight: 1.55 }}>{row.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Stock Card ───────────────────────────────────────────────────────────
function StockCard({ item }: { item: typeof WATCHLIST[0] }) {
  const [open, setOpen] = useState(false)
  const [wrange, setWrange] = useState<WRange>('5Y')
  const [live, setLive] = useState<LivePrice | null>(null)
  const fetched = useRef(false)

  const fetchLive = useCallback(async () => {
    if (fetched.current) return; fetched.current = true
    try {
      const res = await fetch(`/api/stocks?tickers=${item.yfTicker}`)
      const data = await res.json()
      const q = data?.[0]
      if (q && !q.error) setLive({ price: q.price, changePct: q.changePct })
    } catch { /* live price optional */ }
  }, [item.yfTicker])

  const toggle = () => { if (!open) fetchLive(); setOpen(o => !o) }

  const analysis = computeAnalysis(item.history)
  const lastPrice = item.history[item.history.length - 1].p
  const displayPrice = live?.price || lastPrice
  const chgColor = live ? (live.changePct >= 0 ? '#16a34a' : '#dc2626') : 'var(--text-muted)'

  const ranges: WRange[] = ['3Y', '5Y', '10Y', 'MAX']

  return (
    <div style={{ borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden', backgroundColor: 'var(--surface)' }}>
      <button
        onClick={toggle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: item.color }}>{item.flag} {item.ticker}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{item.cnName}</span>
          </div>
          {analysis && (
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              {analysis.bullPct >= 55 ? '📈 偏多' : analysis.bullPct <= 45 ? '📉 偏空' : '➡️ 震荡'} &nbsp;·&nbsp;
              3月 {analysis.mom3 >= 0 ? '+' : ''}{analysis.mom3}% &nbsp;·&nbsp; 回测准确率 {analysis.accuracy}%
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
            {item.currency === 'HKD' ? 'HK$' : '$'}{displayPrice.toFixed(item.currency === 'HKD' ? 0 : 2)}
          </div>
          {live && (
            <div style={{ fontSize: '0.7rem', color: chgColor }}>
              {live.changePct >= 0 ? '+' : ''}{live.changePct.toFixed(2)}% 今日
            </div>
          )}
        </div>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && analysis && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem' }}>
            {[
              ['上市时间', item.history[0].d.slice(0, 7)],
              ['IPO价', `${item.currency === 'HKD' ? 'HK$' : '$'}${item.history[0].p.toFixed(item.currency === 'HKD' ? 0 : 2)}`],
              ['上市以来', `${analysis.ytdChg >= 0 ? '+' : ''}${analysis.ytdChg.toFixed(0)}%`],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: '0.375rem 0.5rem', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{k}</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Chart range selector */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
              {ranges.map(r => (
                <button
                  key={r} onClick={() => setWrange(r)}
                  style={{ padding: '0.2rem 0.55rem', fontSize: '0.68rem', borderRadius: '5px', border: '1px solid', fontFamily: 'var(--font-mono)', cursor: 'pointer',
                    borderColor: r === wrange ? item.color : 'var(--border)',
                    backgroundColor: r === wrange ? item.color + '20' : 'transparent',
                    color: r === wrange ? item.color : 'var(--text-muted)',
                  }}
                >{r}</button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                — MA6 — MA12 — MA24
              </span>
            </div>
            <div style={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', padding: '0.5rem 0.5rem 0 0.5rem', overflow: 'hidden' }}>
              <StockChart data={item.history} range={wrange} color={item.color} />
            </div>
          </div>

          {/* Prediction */}
          <PredBadge bullPct={analysis.bullPct} accuracy={analysis.accuracy} samples={analysis.samples} />

          {/* Reason */}
          <p style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.65, margin: 0, borderLeft: `3px solid ${item.color}`, paddingLeft: '0.625rem' }}>
            {analysis.reason}
          </p>

          {/* Signals */}
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', marginBottom: '0.4rem' }}>
              技术信号（月度数据）
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.3rem' }}>
              {analysis.signals.map(s => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.35rem 0.5rem', borderRadius: '6px', backgroundColor: s.bullish ? '#f0fdf4' : '#fff1f2', border: `1px solid ${s.bullish ? '#86efac' : '#fca5a5'}` }}>
                  <span style={{ fontSize: '0.65rem', color: s.bullish ? '#16a34a' : '#dc2626', marginTop: '1px' }}>{s.bullish ? '▲' : '▼'}</span>
                  <div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: s.bullish ? '#14532d' : '#7f1d1d', fontFamily: 'var(--font-mono)' }}>{s.name}</div>
                    <div style={{ fontSize: '0.7rem', color: s.bullish ? '#166534' : '#991b1b', lineHeight: 1.4 }}>{s.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Earnings */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.875rem' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
              财报分析 &amp; 操作建议
            </div>
            <EarningsBlock item={item} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────
export function PortfolioWatchlist() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {WATCHLIST.map(item => <StockCard key={item.ticker} item={item} />)}
      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'center', marginTop: '0.25rem' }}>
        历史数据为月度估算，技术分析基于该数据集 · 仅供参考，不构成投资建议
      </p>
    </div>
  )
}
