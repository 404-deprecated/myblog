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
  source?: 'manual' | 'auto'
}

interface EventsStore {
  updatedAt: string
  autoCheckedAt: string | null
  markets: {
    nasdaq: MarketEvent[]
    shanghai: MarketEvent[]
    hangseng: MarketEvent[]
  }
  pendingFlags: { d: string; changePct: number; market: string }[]
}

const EVENTS_FILE = join(process.cwd(), 'data', 'market-events.json')

async function readEvents(): Promise<EventsStore> {
  const raw = await readFile(EVENTS_FILE, 'utf-8')
  return JSON.parse(raw)
}

async function writeEvents(store: EventsStore): Promise<void> {
  await writeFile(EVENTS_FILE, JSON.stringify(store, null, 2), 'utf-8')
}

// ─── Auto-detect significant moves from Yahoo Finance ────────────────────────
async function detectSignificantMoves(
  ticker: string, market: string, lastEventDate: string,
): Promise<{ events: MarketEvent[]; pending: { d: string; changePct: number; market: string }[] }> {
  const enc = encodeURIComponent(ticker)
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${enc}?range=6mo&interval=1d&includePrePost=false`
  try {
    const { stdout } = await execAsync(
      `curl -s --max-time 10 -H "User-Agent: Mozilla/5.0" "${url}"`
    )
    const result = JSON.parse(stdout).chart?.result?.[0]
    if (!result) return { events: [], pending: [] }

    const ts: number[] = result.timestamp || []
    const closes: number[] =
      result.indicators?.adjclose?.[0]?.adjclose ||
      result.indicators?.quote?.[0]?.close || []

    const autoEvents: MarketEvent[] = []
    const pending: { d: string; changePct: number; market: string }[] = []

    // Detect single-day moves > 2.5% and multi-day swings > 5%
    let peak = closes[0], trough = closes[0], peakIdx = 0, troughIdx = 0
    for (let i = 30; i < closes.length; i++) {
      if (!closes[i] || !closes[i-1]) continue
      const dailyChg = (closes[i] - closes[i-1]) / closes[i-1] * 100
      const date = new Date(ts[i] * 1000).toISOString().slice(0, 10)

      // Track peak/trough for swing detection
      if (closes[i] > peak) { peak = closes[i]; peakIdx = i }
      if (closes[i] < trough) { trough = closes[i]; troughIdx = i }

      // Single-day big move
      if (Math.abs(dailyChg) > 2.5 && date > lastEventDate) {
        const impact = dailyChg > 0 ? 'pos' : 'neg'
        const label = dailyChg > 0 ? `${market}单日大涨` : `${market}单日大跌`
        const detail = `${market}在${date}${dailyChg > 0 ? '上涨' : '下跌'}${Math.abs(dailyChg).toFixed(1)}%，收盘${closes[i].toFixed(0)}。原因待标注。`
        autoEvents.push({ d: date, label, impact, detail, source: 'auto' })
        pending.push({ d: date, changePct: +dailyChg.toFixed(1), market })
      }

      // Multi-day swing > 5%
      const swingFromPeak = peakIdx > 30 ? (peak - closes[i]) / peak * 100 : 0
      const swingFromTrough = troughIdx > 30 ? (closes[i] - trough) / trough * 100 : 0
      if ((swingFromPeak < -5 || swingFromTrough > 5) && date > lastEventDate) {
        if (swingFromTrough > 5) {
          const label = `${market}持续反弹`
          const detail = `${market}自低点反弹${swingFromTrough.toFixed(0)}%。原因待标注。`
          if (!autoEvents.some(e => e.d === date)) {
            autoEvents.push({ d: date, label, impact: 'pos', detail, source: 'auto' })
          }
        }
      }
    }

    return { events: autoEvents.slice(-5), pending: pending.slice(-10) }
  } catch {
    return { events: [], pending: [] }
  }
}

// ─── GET handler ──────────────────────────────────────────────────────────────
export async function GET() {
  const store = await readEvents()

  // Auto-check for new significant moves
  const markets = [
    { ticker: '^IXIC', key: 'nasdaq' as const },
    { ticker: '000001.SS', key: 'shanghai' as const },
    { ticker: '^HSI', key: 'hangseng' as const },
  ]

  let pendingFlags: { d: string; changePct: number; market: string }[] = []
  let autoEvents: MarketEvent[] = []

  for (const m of markets) {
    const existing = store.markets[m.key]
    const lastDate = existing.length > 0 ? existing[existing.length - 1].d : '2020-01-01'
    const result = await detectSignificantMoves(m.ticker, m.key === 'nasdaq' ? '纳斯达克' : m.key === 'shanghai' ? '上证' : '恒生', lastDate)
    autoEvents.push(...result.events)
    pendingFlags.push(...result.pending)
  }

  // Save updated pending flags
  if (pendingFlags.length > 0) {
    store.pendingFlags = pendingFlags.slice(-20)
    store.autoCheckedAt = new Date().toISOString()
    await writeEvents(store).catch(() => {})
  }

  // Merge manual + auto events for each market, sorted by date
  const allEvents = {
    nasdaq: [...store.markets.nasdaq, ...autoEvents.filter(e => e.d.includes('纳斯达克')).map(e => ({...e, d: e.d}))]
      .sort((a, b) => a.d.localeCompare(b.d)),
    shanghai: [...store.markets.shanghai],
    hangseng: [...store.markets.hangseng],
  }

  // Combined timeline
  const combined = [
    ...allEvents.nasdaq,
    ...allEvents.shanghai,
    ...allEvents.hangseng,
  ].sort((a, b) => a.d.localeCompare(b.d))
  .filter((ev, i, arr) => i === 0 || ev.d !== arr[i-1].d)

  return NextResponse.json({
    updatedAt: store.updatedAt,
    autoCheckedAt: store.autoCheckedAt,
    pendingFlags: store.pendingFlags,
    hasPending: store.pendingFlags.length > 0,
    events: allEvents,
    timeline: combined,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
  })
}
