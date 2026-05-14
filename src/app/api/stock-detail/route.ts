import { NextRequest, NextResponse } from 'next/server'
import {
  fetchYahooChart,
  fetchQuoteSummary,
  fetchStockNews,
  type YfChartMeta,
  type QuoteSummaryResult,
  type StockNewsItem,
} from '@/lib/yahoo-finance'
import { fetchStockAnalysisData } from '@/lib/stock-analysis'

export const dynamic = 'force-dynamic'

function safeTicker(s: string): string | null {
  return /^[A-Z0-9.^=]{1,12}$/.test(s) ? s : null
}

// ─── Extract helpers ──────────────────────────────────────────────────────────────

function raw(obj: { raw?: number } | undefined): number | null {
  return obj?.raw != null ? obj.raw : null
}

function fmt(obj: { fmt?: string } | undefined): string | null {
  return obj?.fmt ?? null
}

function tsToDate(obj: { raw?: number } | undefined): string | null {
  if (!obj?.raw) return null
  return new Date(obj.raw * 1000).toISOString().split('T')[0]
}

function numValStr(s: string): number | null {
  const cleaned = s.replace(/,/g, '')
  const multipliers: Record<string, number> = { T: 1e12, B: 1e9, M: 1e6, K: 1e3 }
  for (const [suffix, mult] of Object.entries(multipliers)) {
    if (cleaned.endsWith(suffix)) {
      const n = parseFloat(cleaned.slice(0, -1))
      return isNaN(n) ? null : n * mult
    }
  }
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function analystLabel(key: string | undefined): string | null {
  if (!key) return null
  const map: Record<string, string> = {
    strong_buy: '强力买入',
    buy: '买入',
    hold: '持有',
    underperform: '跑输大盘',
    sell: '卖出',
  }
  return map[key] ?? key
}

// ─── Response types ──────────────────────────────────────────────────────────────

export interface StockDetailResponse {
  ticker: string
  name: string | null
  currency: string | null
  price: number | null
  previousClose: number | null
  open: number | null
  dayHigh: number | null
  dayLow: number | null
  volume: number | null
  high52w: number | null
  low52w: number | null
  changePct: number | null
  // Financials
  marketCap: number | null
  marketCapFmt: string | null
  totalRevenue: number | null
  totalRevenueFmt: string | null
  netIncome: number | null
  netIncomeFmt: string | null
  trailingEps: number | null
  forwardEps: number | null
  trailingPE: number | null
  forwardPE: number | null
  sharesOutstanding: number | null
  sharesOutstandingFmt: string | null
  dividendRate: number | null
  dividendYield: number | null
  exDividendDate: string | null
  beta: number | null
  analystRating: string | null
  numberOfAnalysts: number | null
  targetMeanPrice: number | null
  targetHighPrice: number | null
  targetLowPrice: number | null
  earningsDateStart: string | null
  earningsDateEnd: string | null
  earningsDateIsPast: boolean
  profitMargin: number | null
  revenueGrowth: number | null
  pegRatio: number | null
  // News
  news: StockNewsItem[]
  fetchedAt: string
  errors: string[]
}

// ─── Main handler ────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const rawTicker = searchParams.get('ticker') ?? ''

  const ticker = safeTicker(rawTicker.toUpperCase())
  if (!ticker) {
    return NextResponse.json({ error: 'invalid ticker' }, { status: 400 })
  }

  const errors: string[] = []

  // Fetch three data sources in parallel
  const [chartS, quoteS, newsS] = await Promise.allSettled([
    fetchYahooChart(ticker, '5d', '1d'),
    fetchQuoteSummary(ticker),
    fetchStockNews(ticker),
  ])

  // ─── Chart meta ──────────────────────────────────────────────────────────────
  let chartMeta: YfChartMeta | null | undefined
  if (chartS.status === 'fulfilled') {
    chartMeta = chartS.value.meta
  } else {
    errors.push('chart data unavailable')
  }

  // ─── Quote summary ──────────────────────────────────────────────────────────
  let qs: QuoteSummaryResult | null = null
  if (quoteS.status === 'fulfilled') {
    qs = quoteS.value
  } else {
    errors.push('financial data unavailable')
  }

  // ─── News ────────────────────────────────────────────────────────────────────
  let news: StockNewsItem[] = []
  if (newsS.status === 'fulfilled') {
    news = newsS.value
  } else {
    errors.push('news unavailable')
  }

  // ─── Normalize fields ──────────────────────────────────────────────────────
  const meta = chartMeta ?? null
  const p = qs?.price
  const sd = qs?.summaryDetail
  const fd = qs?.financialData
  const ks = qs?.defaultKeyStatistics
  const ce = qs?.calendarEvents

  const price = meta?.regularMarketPrice ?? raw(p?.regularMarketPrice) ?? null
  const previousClose = meta?.chartPreviousClose ?? raw(sd?.previousClose) ?? raw(p?.regularMarketPrice) ?? null
  const open = meta?.regularMarketOpen ?? raw(p?.regularMarketOpen) ?? raw(sd?.open) ?? null
  const dayHigh = meta?.regularMarketDayHigh ?? raw(p?.regularMarketDayHigh) ?? raw(sd?.dayHigh) ?? null
  const dayLow = meta?.regularMarketDayLow ?? raw(p?.regularMarketDayLow) ?? raw(sd?.dayLow) ?? null
  const volume = meta?.regularMarketVolume ?? raw(p?.regularMarketVolume) ?? raw(sd?.volume) ?? null
  const high52w = meta?.fiftyTwoWeekHigh ?? raw(sd?.fiftyTwoWeekHigh) ?? null
  const low52w = meta?.fiftyTwoWeekLow ?? raw(sd?.fiftyTwoWeekLow) ?? null

  const name = (p?.longName || p?.shortName) ?? meta?.longName ?? meta?.shortName ?? null
  const currency = p?.currency ?? meta?.currency ?? null

  const changePct = price != null && previousClose != null && previousClose > 0
    ? +((price - previousClose) / previousClose * 100).toFixed(2)
    : null

  let marketCap = raw(p?.marketCap) ?? raw(sd?.marketCap)
  let marketCapFmt = fmt(p?.marketCap) ?? fmt(sd?.marketCap)

  let totalRevenue = raw(fd?.totalRevenue)
  let totalRevenueFmt = fmt(fd?.totalRevenue)
  let netIncome = raw(fd?.netIncomeToCommon)
  let netIncomeFmt = fmt(fd?.netIncomeToCommon)

  let trailingEps = raw(ks?.trailingEps)
  const forwardEps = raw(ks?.forwardEps)
  let trailingPE = raw(sd?.trailingPE)
  let forwardPE = raw(sd?.forwardPE)

  let sharesOutstanding = raw(ks?.sharesOutstanding) ?? raw(p?.marketCap)
  let sharesOutstandingFmt = fmt(ks?.sharesOutstanding)

  let dividendRate = raw(sd?.dividendRate)
  let dividendYield = raw(sd?.dividendYield)
  let exDividendDate = tsToDate(sd?.exDividendDate) ?? tsToDate(ce?.exDividendDate)

  let beta = raw(ks?.beta) ?? raw(sd?.beta)

  const recommendationKey = fd?.recommendationKey
  const analystRating = analystLabel(recommendationKey)
  const numberOfAnalysts = raw(fd?.numberOfAnalystOpinions)
  const targetMeanPrice = raw(fd?.targetMeanPrice)
  const targetHighPrice = raw(fd?.targetHighPrice)
  const targetLowPrice = raw(fd?.targetLowPrice)

  let earningsDateStart: string | null = null
  let earningsDateEnd: string | null = null
  let earningsDateIsPast = false
  if (ce?.earnings?.earningsDate) {
    const dates = ce.earnings.earningsDate
    // Yahoo returns dates sorted by recency; find the first future date (>= today)
    const today = new Date().toISOString().split('T')[0]
    for (const d of dates) {
      const dateStr = tsToDate(d)
      if (dateStr && dateStr >= today) {
        earningsDateStart = dateStr
        break
      }
    }
    // If no future date found, use the most recent one and mark as past
    if (!earningsDateStart && dates[0]) {
      earningsDateStart = tsToDate(dates[0])
      earningsDateIsPast = true
    }
    if (dates.length > 1 && earningsDateStart) {
      // Try to find end date (next element after start)
      const startIdx = dates.findIndex(d => tsToDate(d) === earningsDateStart)
      if (startIdx >= 0 && dates[startIdx + 1]) {
        earningsDateEnd = tsToDate(dates[startIdx + 1])
      }
    }
  }

  const profitMargin = raw(fd?.profitMargins)
  const revenueGrowth = raw(fd?.revenueGrowth)
  const pegRatio = raw(ks?.pegRatio)

  // ─── StockAnalysis fallback for KR/CN/HK stocks where Yahoo lacks PE/EPS ─────
  if (trailingPE == null && forwardPE == null && trailingEps == null) {
    const sa = await fetchStockAnalysisData(ticker)
    if (sa) {
      if (trailingPE == null && sa.peRatio != null) trailingPE = sa.peRatio
      if (forwardPE == null && sa.forwardPE != null) forwardPE = sa.forwardPE
      if (trailingEps == null && sa.eps != null) trailingEps = sa.eps
      if (netIncome == null && sa.netIncomeFmt) {
        netIncomeFmt = sa.netIncomeFmt
        netIncome = numValStr(sa.netIncomeFmt)
      }
      if (beta == null && sa.beta != null) beta = sa.beta
      if (sharesOutstanding == null && sa.sharesOutFmt) {
        sharesOutstandingFmt = sa.sharesOutFmt
        sharesOutstanding = numValStr(sa.sharesOutFmt)
      }
      if (marketCapFmt == null && sa.marketCapFmt) {
        marketCapFmt = sa.marketCapFmt
        marketCap = numValStr(sa.marketCapFmt)
      }
      if (totalRevenueFmt == null && sa.revenueFmt) {
        totalRevenueFmt = sa.revenueFmt
        totalRevenue = numValStr(sa.revenueFmt)
      }
      if (dividendRate == null && sa.dividendRate != null) dividendRate = sa.dividendRate
      if (dividendYield == null && sa.dividendYield != null) dividendYield = sa.dividendYield
      if (exDividendDate == null && sa.exDividendDate) exDividendDate = sa.exDividendDate
      if (sa.earningsDate && (earningsDateIsPast || !earningsDateStart)) {
        const today = new Date().toISOString().split('T')[0]
        if (sa.earningsDate >= today) {
          earningsDateStart = sa.earningsDate
          earningsDateIsPast = false
        }
      }
    }
  }

  const response: StockDetailResponse = {
    ticker,
    name,
    currency,
    price,
    previousClose,
    open,
    dayHigh,
    dayLow,
    volume,
    high52w,
    low52w,
    changePct,
    marketCap,
    marketCapFmt,
    totalRevenue,
    totalRevenueFmt,
    netIncome,
    netIncomeFmt,
    trailingEps,
    forwardEps,
    trailingPE,
    forwardPE,
    sharesOutstanding,
    sharesOutstandingFmt,
    dividendRate,
    dividendYield,
    exDividendDate,
    beta,
    analystRating,
    numberOfAnalysts,
    targetMeanPrice,
    targetHighPrice,
    targetLowPrice,
    earningsDateStart,
    earningsDateEnd,
    earningsDateIsPast,
    profitMargin,
    revenueGrowth,
    pegRatio,
    news,
    fetchedAt: new Date().toISOString(),
    errors,
  }

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
    },
  })
}
