import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'
const execAsync = promisify(exec)

interface MarketEvent {
  d: string
  label: string
  impact: 'pos' | 'neg'
  detail: string
  source: 'manual' | 'auto'
}

interface EventsStore {
  updatedAt: string
  autoCheckedAt: string | null
  markets: { nasdaq: MarketEvent[]; shanghai: MarketEvent[]; hangseng: MarketEvent[] }
  pendingFlags: { d: string; changePct: number; market: string; idx: string }[]
}

const EVENTS_FILE = join(process.cwd(), 'data', 'market-events.json')

async function readEvents(): Promise<EventsStore> {
  const raw = await readFile(EVENTS_FILE, 'utf-8')
  return JSON.parse(raw)
}

async function writeEvents(store: EventsStore): Promise<void> {
  await writeFile(EVENTS_FILE, JSON.stringify(store, null, 2), 'utf-8')
}

// ─── Fetch price data for a ticker ──────────────────────────────────────────
async function fetchPrices(ticker: string, range = '6mo'): Promise<{ ts: number[]; closes: number[] }> {
  const enc = encodeURIComponent(ticker)
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${enc}?range=${range}&interval=1d&includePrePost=false`
  try {
    const { stdout } = await execAsync(
      `curl -s --max-time 10 -H "User-Agent: Mozilla/5.0" "${url}"`
    )
    const r = JSON.parse(stdout).chart?.result?.[0]
    if (!r) return { ts: [], closes: [] }
    const closes = r.indicators?.adjclose?.[0]?.adjclose || r.indicators?.quote?.[0]?.close || []
    return { ts: r.timestamp || [], closes }
  } catch { return { ts: [], closes: [] } }
}

// ─── Pre-fetch all macro data once (fast, parallel) ──────────────────────────
async function prefetchMacroContexts(): Promise<Map<string, string>> {
  const macroMap = new Map<string, string>()
  const indicators = [
    { ticker: '^VIX', key: 'vix', label: 'VIX', threshold: 25, alert: '恐慌情绪升温' },
    { ticker: '^TNX', key: 'yield', label: '10Y美债', threshold: 0, alert: '' },
    { ticker: 'CL=F', key: 'oil', label: 'WTI原油', threshold: 0, alert: '' },
    { ticker: 'DX-Y.NYB', key: 'usd', label: '美元指数', threshold: 99, alert: '美元走弱' },
  ]

  const results = await Promise.allSettled(
    indicators.map(async ({ ticker, key }) => {
      const data = await fetchPrices(ticker, '6mo')
      return { key, ...data }
    })
  )

  // Build a date-indexed map of macro snapshots
  const validResults = results
    .filter((r): r is PromiseFulfilledResult<{ key: string; ts: number[]; closes: number[] }> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(r => r.ts.length > 0)

  // Collect all unique dates from all series
  const allDates = new Set<string>()
  for (const r of validResults) {
    for (const t of r.ts) {
      allDates.add(new Date(t * 1000).toISOString().slice(0, 10))
    }
  }

  // For each date, build a context string
  for (const date of allDates) {
    const parts: string[] = []
    for (const r of validResults) {
      const idx = r.ts.findIndex(t => new Date(t * 1000).toISOString().slice(0, 10) >= date)
      if (idx < 0 || !r.closes[idx]) continue
      const val = r.closes[idx]

      if (r.key === 'vix') {
        if (val > 25) parts.push('VIX' + val.toFixed(0) + '恐慌偏高')
        else if (val < 15) parts.push('VIX' + val.toFixed(0) + '极度低波')
      } else if (r.key === 'yield') {
        if (idx >= 5) {
          const prev = r.closes[idx - 5]
          const chg = prev > 0 ? (val - prev) / prev * 100 : 0
          if (Math.abs(chg) > 3) {
            parts.push('10Y美债' + (chg > 0 ? '升' : '降') + Math.abs(chg).toFixed(0) + 'bp至' + val.toFixed(2) + '%')
          }
        }
      } else if (r.key === 'oil') {
        if (idx >= 5) {
          const prev = r.closes[idx - 5]
          const chg = prev > 0 ? (val - prev) / prev * 100 : 0
          if (Math.abs(chg) > 5) {
            parts.push('原油' + (chg > 0 ? '涨' : '跌') + Math.abs(chg).toFixed(0) + '%至$' + val.toFixed(0))
          }
        }
      } else if (r.key === 'usd') {
        if (val < 99) parts.push('美元走弱DXY' + val.toFixed(0))
        else if (val > 105) parts.push('美元走强DXY' + val.toFixed(0))
      }
    }
    if (parts.length > 0) macroMap.set(date, parts.join('；'))
  }

  return macroMap
}

// ─── Auto-attribution: generate event detail from data ───────────────────────
function attributeEvent(
  market: string, date: string, changePct: number,
  macroCtx: string, isIndex: boolean,
): MarketEvent {
  const impact = changePct > 0 ? 'pos' : 'neg'
  const absChg = Math.abs(changePct)
  const dirLabel = changePct > 0 ? '大涨' : '大跌'
  const severity = absChg > 4 ? '剧烈' : absChg > 2.5 ? '显著' : '明显'

  // Rule-based attribution
  let reason = ''
  const ctx = macroCtx.toLowerCase()

  if (ctx.includes('恐慌') && impact === 'neg') {
    reason = '恐慌情绪蔓延，VIX飙升引发避险抛售'
  } else if (ctx.includes('飙升') && ctx.includes('美债') && impact === 'neg') {
    reason = '美债收益率急升压制成长股估值，科技股领跌'
  } else if (ctx.includes('骤降') && ctx.includes('美债') && impact === 'pos') {
    reason = '美债收益率大幅回落，利率敏感型资产全面反弹'
  } else if (ctx.includes('原油') && ctx.includes('涨') && impact === 'neg') {
    reason = '油价急涨推升通胀担忧，企业成本预期恶化'
  } else if (ctx.includes('走弱') && impact === 'pos') {
    reason = '美元走弱利好出口企业和新兴市场资金流入'
  } else if (ctx.includes('走强') && impact === 'neg') {
    reason = '美元走强压制海外营收预期，跨国企业承压'
  } else if (absChg > 4) {
    reason = `盘中出现${severity}波动，${ctx || '具体催化剂待确认'}`
  } else {
    reason = ctx || '技术面驱动，无明确宏观催化剂'
  }

  const label = `${market}${severity}${dirLabel}`
  const detail = `${market}在${date}${dirLabel}${absChg.toFixed(1)}%。${reason}。`

  return { d: date, label, impact, detail, source: 'auto' }
}

// ─── Detect + attribute significant moves ────────────────────────────────────
async function detectAndAttribute(
  ticker: string, market: string, lastEventDate: string, isIndex: boolean,
  macroMap: Map<string, string>,
): Promise<{ events: MarketEvent[]; pending: { d: string; changePct: number; market: string; idx: string }[] }> {
  const { ts, closes } = await fetchPrices(ticker)
  if (!ts.length) return { events: [], pending: [] }

  const autoEvents: MarketEvent[] = []
  const pending: { d: string; changePct: number; market: string; idx: string }[] = []

  let peak = closes[0], trough = closes[0], peakIdx = 0

  for (let i = 30; i < closes.length; i++) {
    if (!closes[i] || !closes[i-1]) continue
    const dailyChg = (closes[i] - closes[i-1]) / closes[i-1] * 100
    const date = new Date(ts[i] * 1000).toISOString().slice(0, 10)

    if (closes[i] > peak) { peak = closes[i]; peakIdx = i }

    // Single-day significant moves (>= 2%)
    if (Math.abs(dailyChg) >= 2 && date > lastEventDate) {
      const macroCtx = macroMap.get(date) || '宏观环境无明显异常'
      const evt = attributeEvent(market, date, dailyChg, macroCtx, isIndex)
      autoEvents.push(evt)
      pending.push({ d: date, changePct: +dailyChg.toFixed(1), market, idx: ticker })
    }

    // Multi-day swing >= 5%
    if (peakIdx > i - 5 && i > peakIdx + 3) {
      const swing = (peak - closes[i]) / peak * 100
      if (swing < -5 && date > lastEventDate) {
        const macroCtx = macroMap.get(date) || ''
        const evt: MarketEvent = {
          d: date, label: `${market}阶段回调`,
          impact: 'neg',
          detail: `${market}自高点回调${Math.abs(swing).toFixed(0)}%至${closes[i].toFixed(0)}。${macroCtx || '技术性调整，获利了结压力释放'}。`,
          source: 'auto',
        }
        if (!autoEvents.some(e => e.d === date)) {
          autoEvents.push(evt)
        }
        peak = closes[i]; peakIdx = i
      }
    }
  }

  return { events: autoEvents.slice(-10), pending: pending.slice(-10) }
}

// ─── GET handler ──────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const url = new URL(req.url)
  const action = url.searchParams.get('action') ?? 'read'

  const store = await readEvents()

  if (action === 'auto-annotate') {
    // Phase 1: pre-fetch all macro data (parallel, fast)
    const macroMap = await prefetchMacroContexts()

    // Phase 2: detect + attribute for each market
    const markets = [
      { ticker: '^IXIC', key: 'nasdaq' as const, name: '纳斯达克' },
      { ticker: '000001.SS', key: 'shanghai' as const, name: '上证' },
      { ticker: '^HSI', key: 'hangseng' as const, name: '恒生' },
    ]

    let newEvents = 0
    const allPending: typeof store.pendingFlags = []

    for (const m of markets) {
      const existing = store.markets[m.key]
      const lastDate = existing.length > 0 ? existing[existing.length - 1].d : '2020-01-01'
      const result = await detectAndAttribute(m.ticker, m.name, lastDate, true, macroMap)

      for (const evt of result.events) {
        if (!existing.some(e => e.d === evt.d)) {
          existing.push(evt)
          newEvents++
        }
      }
      allPending.push(...result.pending)
    }

    // Sort each market's events
    for (const key of ['nasdaq', 'shanghai', 'hangseng'] as const) {
      store.markets[key].sort((a, b) => a.d.localeCompare(b.d))
    }

    store.pendingFlags = allPending
    store.autoCheckedAt = new Date().toISOString()
    if (newEvents > 0) store.updatedAt = new Date().toISOString().slice(0, 10)

    await writeEvents(store)

    return NextResponse.json({ ok: true, newEvents, totalPending: allPending.length })
  }

  // Default: read + light auto-check (no attribution, just detection for freshness)
  const markets = [
    { ticker: '^IXIC', key: 'nasdaq' as const, name: '纳斯达克' },
    { ticker: '000001.SS', key: 'shanghai' as const, name: '上证' },
    { ticker: '^HSI', key: 'hangseng' as const, name: '恒生' },
  ]

  let pendingFlags: typeof store.pendingFlags = []

  for (const m of markets) {
    const existing = store.markets[m.key]
    const lastDate = existing.length > 0 ? existing[existing.length - 1].d : '2020-01-01'
    const { ts, closes } = await fetchPrices(m.ticker)
    if (!ts.length) continue

    for (let i = ts.length - 30; i < ts.length; i++) {
      if (i <= 0 || !closes[i] || !closes[i-1]) continue
      const dailyChg = (closes[i] - closes[i-1]) / closes[i-1] * 100
      const date = new Date(ts[i] * 1000).toISOString().slice(0, 10)
      if (Math.abs(dailyChg) >= 2 && date > lastDate && !existing.some(e => e.d === date)) {
        pendingFlags.push({ d: date, changePct: +dailyChg.toFixed(1), market: m.name, idx: m.ticker })
      }
    }
  }

  if (pendingFlags.length > 0) {
    store.pendingFlags = pendingFlags.slice(-20)
    store.autoCheckedAt = new Date().toISOString()
    await writeEvents(store).catch(() => {})
  }

  // Combined timeline for UI display
  const combined = [
    ...store.markets.nasdaq,
    ...store.markets.shanghai,
    ...store.markets.hangseng,
  ].sort((a, b) => a.d.localeCompare(b.d))
  .filter((ev, i, arr) => i === 0 || ev.d !== arr[i-1].d)

  return NextResponse.json({
    updatedAt: store.updatedAt,
    autoCheckedAt: store.autoCheckedAt,
    pendingFlags: store.pendingFlags,
    hasPending: store.pendingFlags.length > 0,
    events: store.markets,
    timeline: combined,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
  })
}
