import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const YF_HOSTS = ['query2', 'query1'] as const
const CURL_TIMEOUT = 12
const MAX_CONCURRENT = 4 // prevent system freeze from too many parallel curl subprocesses
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

// ─── Cookie jar + crumb for v10 quoteSummary ─────────────────────────────────────
let cookieJar: string | null = null
let crumbCache: string | null = null
let crumbFetchedAt = 0
const CRUMB_TTL = 30 * 60 * 1000 // 30 min

async function ensureCrumb(): Promise<string | null> {
  if (crumbCache && Date.now() - crumbFetchedAt < CRUMB_TTL) return crumbCache

  const jar = `/tmp/yf_cookies_${process.pid}.txt`

  // Get cookie from fc.yahoo.com (redirects to consent page which sets cookies)
  try {
    await execAsync(
      `curl -s -c "${jar}" --max-time 10 -H "User-Agent: ${UA}" -H "Accept: text/html" "https://fc.yahoo.com/" -o /dev/null`
    )
  } catch { /* ok */ }

  // Get crumb using the cookie
  for (const host of YF_HOSTS) {
    try {
      const { stdout } = await execAsync(
        `curl -s -b "${jar}" --max-time 10 -H "User-Agent: ${UA}" "https://${host}.finance.yahoo.com/v1/test/getcrumb"`
      )
      const crumb = stdout.trim()
      if (crumb && crumb.length < 20 && !crumb.includes('{')) {
        cookieJar = jar
        crumbCache = crumb
        crumbFetchedAt = Date.now()
        return crumb
      }
    } catch { /* try next host */ }
  }

  return crumbCache // return stale crumb as fallback
}

// ─── Concurrency limiter (semaphore) ────────────────────────────────────────────
let inFlight = 0
const pending: (() => void)[] = []

async function acquireSlot(): Promise<void> {
  while (inFlight >= MAX_CONCURRENT) {
    await new Promise<void>(r => pending.push(r))
  }
  inFlight++
}

function releaseSlot(): void {
  inFlight--
  pending.shift()?.()
}

export interface PricePoint {
  d: string
  p: number
}

export interface YfChartMeta {
  regularMarketPrice?: number
  chartPreviousClose?: number
  regularMarketDayHigh?: number
  regularMarketDayLow?: number
  regularMarketVolume?: number
  regularMarketOpen?: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  shortName?: string
  longName?: string
  currency?: string
  exchangeName?: string
  marketCap?: number
}

export interface YfChartResult {
  ts: number[]
  closes: number[]
  meta?: YfChartMeta | null
}

// ─── Core fetch via curl (Yahoo Finance blocks Node.js fetch/undici, accepts curl) ─
async function curlFetch(url: string): Promise<string> {
  await acquireSlot()
  try {
    const { stdout } = await execAsync(
      `curl -s --max-time ${CURL_TIMEOUT} -H "User-Agent: ${UA}" "${url}"`
    )
    return stdout
  } finally {
    releaseSlot()
  }
}

async function curlFetchWithSession(url: string): Promise<string> {
  await acquireSlot()
  try {
    const jar = cookieJar ?? `/tmp/yf_cookies_${process.pid}.txt`
    const { stdout } = await execAsync(
      `curl -s -b "${jar}" --max-time ${CURL_TIMEOUT} -H "User-Agent: ${UA}" "${url}"`
    )
    return stdout
  } finally {
    releaseSlot()
  }
}

/** Raw Yahoo Finance chart response, returns timestamps, close prices, and meta. */
export async function fetchYahooChart(
  ticker: string,
  range: string,
  interval = '1d',
): Promise<YfChartResult> {
  const enc = encodeURIComponent(ticker)

  for (const host of YF_HOSTS) {
    const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${enc}?range=${range}&interval=${interval}&includePrePost=false`
    try {
      const stdout = await curlFetch(url)
      const result = JSON.parse(stdout).chart?.result?.[0]
      if (!result) continue
      const ts: number[] = result.timestamp || []
      const closes: number[] =
        result.indicators?.adjclose?.[0]?.adjclose ||
        result.indicators?.quote?.[0]?.close || []
      if (ts.length > 0 && closes.length > 0) {
        const m = result.meta
        const meta: YfChartMeta | null = m ? {
          regularMarketPrice: m.regularMarketPrice,
          chartPreviousClose: m.chartPreviousClose,
          regularMarketDayHigh: m.regularMarketDayHigh,
          regularMarketDayLow: m.regularMarketDayLow,
          regularMarketVolume: m.regularMarketVolume,
          regularMarketOpen: m.regularMarketOpen,
          fiftyTwoWeekHigh: m.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: m.fiftyTwoWeekLow,
          shortName: m.shortName,
          longName: m.longName,
          currency: m.currency,
          exchangeName: m.exchangeName,
          marketCap: m.marketCap,
        } : null
        return { ts, closes, meta }
      }
    } catch { /* try next host */ }
  }

  return { ts: [], closes: [], meta: null }
}

/** Returns parsed PricePoint array (date + price), filtering out invalid values. */
export async function fetchPrices(
  ticker: string,
  range: string,
  interval = '1d',
): Promise<PricePoint[]> {
  const { ts, closes } = await fetchYahooChart(ticker, range, interval)
  return ts
    .map((t, i) => ({ d: new Date(t * 1000).toISOString().slice(0, 10), p: closes[i] }))
    .filter(x => x.p != null && !isNaN(x.p) && x.p > 0)
}

// ─── v10 quoteSummary types ──────────────────────────────────────────────────────

interface YfRaw {
  raw: number
  fmt?: string
}

interface QSPrice {
  shortName?: string
  longName?: string
  regularMarketPrice?: YfRaw
  regularMarketChange?: YfRaw
  regularMarketChangePercent?: YfRaw
  marketCap?: YfRaw
  currency?: string
  exchangeName?: string
  regularMarketOpen?: YfRaw
  regularMarketDayHigh?: YfRaw
  regularMarketDayLow?: YfRaw
  regularMarketVolume?: YfRaw
}

interface QSSummaryDetail {
  previousClose?: YfRaw
  open?: YfRaw
  dayLow?: YfRaw
  dayHigh?: YfRaw
  volume?: YfRaw
  averageVolume?: YfRaw
  fiftyTwoWeekLow?: YfRaw
  fiftyTwoWeekHigh?: YfRaw
  beta?: YfRaw
  trailingPE?: YfRaw
  forwardPE?: YfRaw
  dividendRate?: YfRaw
  dividendYield?: YfRaw
  exDividendDate?: YfRaw
  marketCap?: YfRaw
}

interface QSFinancial {
  totalRevenue?: YfRaw
  netIncomeToCommon?: YfRaw
  earningsGrowth?: YfRaw
  revenueGrowth?: YfRaw
  profitMargins?: YfRaw
  targetMeanPrice?: YfRaw
  targetHighPrice?: YfRaw
  targetLowPrice?: YfRaw
  recommendationKey?: string
  numberOfAnalystOpinions?: YfRaw
}

interface QSStats {
  sharesOutstanding?: YfRaw
  trailingEps?: YfRaw
  forwardEps?: YfRaw
  beta?: YfRaw
  pegRatio?: YfRaw
  bookValue?: YfRaw
  priceToBook?: YfRaw
}

interface QSTrend {
  trend?: Array<{
    period: string
    strongBuy: number
    buy: number
    hold: number
    sell: number
    strongSell: number
  }>
}

interface QSCalendar {
  earnings?: {
    earningsDate?: YfRaw[]
    earningsAverage?: YfRaw
    earningsLow?: YfRaw
    earningsHigh?: YfRaw
  }
  exDividendDate?: YfRaw
  dividendDate?: YfRaw
}

export interface QuoteSummaryResult {
  price?: QSPrice
  summaryDetail?: QSSummaryDetail
  financialData?: QSFinancial
  defaultKeyStatistics?: QSStats
  recommendationTrend?: QSTrend
  calendarEvents?: QSCalendar
}

export interface StockNewsItem {
  title: string
  link: string
  description: string
  pubDate: string
  source: string
}

// ─── Fetch quoteSummary (v10 - requires crumb auth) ────────────────────────────────

export async function fetchQuoteSummary(ticker: string): Promise<QuoteSummaryResult | null> {
  const enc = encodeURIComponent(ticker)
  const modules = 'price,summaryDetail,financialData,defaultKeyStatistics,recommendationTrend,calendarEvents'

  for (const host of YF_HOSTS) {
    const crumb = await ensureCrumb()
    if (!crumb) continue

    const url = `https://${host}.finance.yahoo.com/v10/finance/quoteSummary/${enc}?modules=${modules}&crumb=${crumb}`
    try {
      const stdout = await curlFetchWithSession(url)
      const parsed = JSON.parse(stdout)
      const qs = parsed?.quoteSummary
      if (qs?.error) {
        // Crumb may be invalid — clear and retry once
        crumbCache = null
        const newCrumb = await ensureCrumb()
        if (!newCrumb) continue
        const retryUrl = `https://${host}.finance.yahoo.com/v10/finance/quoteSummary/${enc}?modules=${modules}&crumb=${newCrumb}`
        const retryStdout = await curlFetchWithSession(retryUrl)
        const retryParsed = JSON.parse(retryStdout)
        const retryResult = retryParsed?.quoteSummary?.result?.[0]
        if (retryResult) return retryResult as QuoteSummaryResult
        continue
      }
      const result = qs.result?.[0]
      if (result) return result as QuoteSummaryResult
    } catch { /* try next host */ }
  }
  return null
}

// ─── RSS news parsing ────────────────────────────────────────────────────────────

function parseRssItems(xml: string): StockNewsItem[] {
  const items: StockNewsItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1]
    const extract = (tag: string): string => {
      const re = new RegExp(
        `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
        'i'
      )
      const m = re.exec(content)
      return (m ? (m[1] ?? m[2] ?? '') : '').trim()
    }

    const title = extract('title')
    if (!title) continue

    items.push({
      title,
      link: extract('link'),
      description: extract('description'),
      pubDate: extract('pubDate'),
      source: extract('source'),
    })
  }

  return items.slice(0, 10)
}

export async function fetchStockNews(ticker: string): Promise<StockNewsItem[]> {
  const enc = encodeURIComponent(ticker)
  try {
    const stdout = await curlFetch(
      `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${enc}&region=US&lang=en-US`
    )
    return parseRssItems(stdout)
  } catch {
    return []
  }
}
