import { NextRequest, NextResponse } from 'next/server'
import { fetchYahooChart } from '@/lib/yahoo-finance'

export const dynamic = 'force-dynamic'

function safeTicker(s: string): string | null {
  return /^[A-Z0-9.^=]{1,12}$/.test(s) ? s : null
}

function sma(values: number[], n: number): number | null {
  if (values.length < n) return null
  return +(values.slice(-n).reduce((a, b) => a + b, 0) / n).toFixed(2)
}

export interface StockStreakData {
  ticker: string
  name: string
  price: number
  prevClose: number
  dayChange: number
  dayChangePct: number
  streak: number
  streakPct: number
  ma20: number | null
  ma50: number | null
  recentLow: number | null
  recentHigh: number | null
  error?: string
}

async function analyzeStock(ticker: string): Promise<StockStreakData> {
  const { ts, closes: rawCloses, meta } = await fetchYahooChart(ticker, '3mo', '1d')

  // Filter out null/NaN/zero values and trim trailing nulls
  const closes = rawCloses.filter(c => c != null && !isNaN(c) && c > 0)

  if (!closes.length) {
    return {
      ticker, name: meta?.shortName ?? ticker, price: 0, prevClose: 0,
      dayChange: 0, dayChangePct: 0, streak: 0, streakPct: 0,
      ma20: null, ma50: null, recentLow: null, recentHigh: null,
      error: '无数据',
    }
  }

  const price = closes[closes.length - 1]
  const prevClose = closes.length > 1 ? closes[closes.length - 2] : price
  const dayChange = +(price - prevClose).toFixed(2)
  const dayChangePct = prevClose ? +((price - prevClose) / prevClose * 100).toFixed(2) : 0

  // Streak: count consecutive up/down days from the end
  let streak = 0
  for (let i = closes.length - 1; i > 0; i--) {
    if (closes[i] > closes[i - 1]) {
      if (streak >= 0) streak++
      else break
    } else if (closes[i] < closes[i - 1]) {
      if (streak <= 0) streak--
      else break
    } else {
      break
    }
  }

  const streakPct = Math.abs(streak) >= 2
    ? +((price / closes[closes.length - 1 - Math.abs(streak)] - 1) * 100).toFixed(2)
    : dayChangePct

  const ma20 = sma(closes, 20)
  const ma50 = sma(closes, 50)
  const recent20 = closes.slice(-20)
  const recentLow = recent20.length ? +Math.min(...recent20).toFixed(2) : null
  const recentHigh = recent20.length ? +Math.max(...recent20).toFixed(2) : null

  return {
    ticker,
    name: meta?.shortName ?? meta?.longName ?? ticker,
    price,
    prevClose,
    dayChange,
    dayChangePct,
    streak,
    streakPct,
    ma20,
    ma50,
    recentLow,
    recentHigh,
  }
}

export async function GET(req: NextRequest) {
  const raw = new URL(req.url).searchParams.get('tickers') ?? ''
  const tickers = raw
    .split(',')
    .map(t => safeTicker(t.trim().toUpperCase()))
    .filter((t): t is string => t !== null)

  if (!tickers.length) {
    return NextResponse.json({ error: 'no valid tickers' }, { status: 400 })
  }

  const results = await Promise.allSettled(tickers.map(analyzeStock))

  const data: StockStreakData[] = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    return {
      ticker: tickers[i], name: tickers[i], price: 0, prevClose: 0,
      dayChange: 0, dayChangePct: 0, streak: 0, streakPct: 0,
      ma20: null, ma50: null, recentLow: null, recentHigh: null,
      error: '获取失败',
    }
  })

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
