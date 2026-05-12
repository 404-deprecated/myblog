import { NextRequest, NextResponse } from 'next/server'
import { loadFundamentals, getEarningsActions } from '@/lib/fundamentals'

export interface StockQuote {
  ticker: string
  name: string
  price: number
  prevClose: number
  change: number
  changePct: number
  high52w: number | null
  low52w: number | null
  marketCapB: number | null
  sharesOutM: number | null
  forwardPe: number | null
  peg: number | null
  revenueGrowthPct: number | null
  grossMarginPct: number | null
  operatingMarginPct: number | null
  beta: number | null
  fundamentalsDate: string
  fundamentalsUpdatedAt: string
  nextEarnings: string
  preEarningsAction: string
  postEarningsAction: string
  error?: boolean
}
const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
}

async function fetchPrice(ticker: string): Promise<Pick<StockQuote, 'price'|'prevClose'|'change'|'changePct'|'high52w'|'low52w'|'name'>> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
  const res = await fetch(url, { headers: YF_HEADERS, signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const meta = json?.chart?.result?.[0]?.meta
  if (!meta) throw new Error('no meta')
  const price: number = meta.regularMarketPrice ?? 0
  const prevClose: number = meta.chartPreviousClose ?? meta.regularMarketPrice ?? 0
  return {
    name: meta.longName ?? meta.shortName ?? ticker,
    price,
    prevClose,
    change: price - prevClose,
    changePct: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
    high52w: meta.fiftyTwoWeekHigh ?? null,
    low52w: meta.fiftyTwoWeekLow ?? null,
  }
}

export async function GET(req: NextRequest) {
  const raw = new URL(req.url).searchParams.get('tickers') ?? ''
  const tickers = raw.split(',').map(t => t.trim().toUpperCase()).filter(Boolean).slice(0, 50)
  if (!tickers.length) return NextResponse.json({ error: 'no tickers' }, { status: 400 })

  const [fundamentalsStore, priceResults] = await Promise.all([
    loadFundamentals().catch(() => null),
    Promise.allSettled(tickers.map(fetchPrice)),
  ])

  const stocks: StockQuote[] = tickers.map((ticker, i) => {
    const fund = fundamentalsStore?.stocks[ticker]
    const actions = fund ? getEarningsActions(fund.sector) : { pre: '暂无数据', post: '暂无数据' }
    const fundData = fund ? {
      sharesOutM: fund.sharesOutM,
      forwardPe: fund.forwardPe,
      peg: fund.peg,
      revenueGrowthPct: fund.revenueGrowthPct,
      grossMarginPct: fund.grossMarginPct,
      operatingMarginPct: fund.operatingMarginPct,
      beta: fund.beta,
      fundamentalsDate: fund.fundamentalsDate,
      fundamentalsUpdatedAt: fundamentalsStore?.updatedAt ?? '—',
      nextEarnings: fund.nextEarnings,
      preEarningsAction: actions.pre,
      postEarningsAction: actions.post,
    } : {
      sharesOutM: null, forwardPe: null, peg: null,
      revenueGrowthPct: null, grossMarginPct: null, operatingMarginPct: null,
      beta: null, fundamentalsDate: '—', fundamentalsUpdatedAt: fundamentalsStore?.updatedAt ?? '—',
      nextEarnings: '—', preEarningsAction: '暂无数据', postEarningsAction: '暂无数据',
    }

    const r = priceResults[i]
    if (r.status === 'fulfilled') {
      const { price, ...priceRest } = r.value
      const marketCapB = fundData.sharesOutM ? (fundData.sharesOutM * price) / 1000 : null
      return { ticker, ...priceRest, price, marketCapB, ...fundData }
    }
    return {
      ticker,
      name: fund?.name ?? ticker,
      price: 0, prevClose: 0, change: 0, changePct: 0,
      high52w: null, low52w: null, marketCapB: null,
      ...fundData, error: true,
    }
  })

  return NextResponse.json(stocks, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
