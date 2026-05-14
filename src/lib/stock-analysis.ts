import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

// ─── Ticker → StockAnalysis URL ────────────────────────────────────────────────

function getSAUrl(ticker: string): string | null {
  if (ticker === '005930.KS') return 'https://stockanalysis.com/quote/krx/005930/'
  if (ticker === '000660.KS') return 'https://stockanalysis.com/quote/krx/000660/'
  if (ticker === '0700.HK')   return 'https://stockanalysis.com/quote/hkg/0700/'
  // CN A-shares
  if (ticker === '600036.SS') return 'https://stockanalysis.com/quote/shh/600036/'
  if (ticker === '002142.SZ') return 'https://stockanalysis.com/quote/shz/002142/'
  // US stocks — stockanalysis uses /stocks/{ticker}/
  if (/^[A-Z]{1,5}$/.test(ticker)) return `https://stockanalysis.com/stocks/${ticker.toLowerCase()}/`
  return null
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SAFinancialData {
  earningsDate: string | null
  peRatio: number | null
  forwardPE: number | null
  eps: number | null
  marketCapFmt: string | null
  revenueFmt: string | null
  netIncomeFmt: string | null
  sharesOutFmt: string | null
  beta: number | null
  dividendRate: number | null
  dividendYield: number | null
  exDividendDate: string | null
}

// ─── Parse helpers ─────────────────────────────────────────────────────────────

function findVal(html: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Match: <td...>{label}</td><td...>VALUE</td> — label may be plain text or inside <a> tag
  const re = new RegExp(
    `<td[^>]*>\\s*(?:<a[^>]*>)?\\s*${escaped}(?:\\s*\\(ttm\\))?[^<]*(?:<\\/a>)?[^<]*<\\/td>\\s*<td[^>]*>\\s*([\\d,.-]+[%BMKT]?)(?:\\s*<!---->|\\s*<span|\\s*<\\/td>)`,
    'i'
  )
  const m = re.exec(html)
  return m ? m[1].trim() : null
}

function findDateVal(html: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(
    `<td[^>]*>\\s*${escaped}[^<]*<\\/td>\\s*<td[^>]*>\\s*([A-Z][a-z]{2}\\s\\d{1,2},\\s\\d{4})\\s*<\\/td>`,
    'i'
  )
  const m = re.exec(html)
  return m ? m[1].trim() : null
}

function numVal(s: string | null): number | null {
  if (!s) return null
  let cleaned = s.replace(/,/g, '')
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

function dateVal(s: string | null): string | null {
  if (!s) return null
  try { return new Date(s).toISOString().split('T')[0] } catch { return null }
}

// ─── Main scraper ──────────────────────────────────────────────────────────────

export async function fetchStockAnalysisData(ticker: string): Promise<SAFinancialData | null> {
  const url = getSAUrl(ticker)
  if (!url) return null

  try {
    const { stdout } = await execAsync(
      `curl -s --max-time 15 -H "User-Agent: ${UA}" -H "Accept: text/html" "${url}"`
    )

    if (!stdout || stdout.length < 5000) return null

    // Extract key financial metrics from HTML tables
    const peRaw = findVal(stdout, 'PE Ratio')
    const fwdPERaw = findVal(stdout, 'Forward PE')
    const epsRaw = findVal(stdout, 'EPS')
    const mktCapRaw = findVal(stdout, 'Market Cap')
    // Revenue label might have "(ttm)" suffix
    const revRaw = findVal(stdout, 'Revenue \\(ttm\\)') || findVal(stdout, 'Revenue')
    const niRaw = findVal(stdout, 'Net Income')
    const sharesRaw = findVal(stdout, 'Shares Out')
    const betaRaw = findVal(stdout, 'Beta')
    const divRaw = findVal(stdout, 'Dividend')
    const openRaw = findVal(stdout, 'Open')
    const prevCloseRaw = findVal(stdout, 'Previous Close')

    // Dividend line typically shows: "3,000.00 (0.16%)"
    let dividendRate: number | null = null
    let dividendYield: number | null = null
    if (divRaw) {
      const parts = divRaw.split(/\s+/)
      if (parts.length >= 1) dividendRate = numVal(parts[0])
      if (parts.length >= 2) {
        const yieldStr = parts[1].replace(/[()]/g, '').replace('%', '')
        dividendYield = parseFloat(yieldStr) / 100
        if (isNaN(dividendYield)) dividendYield = null
      }
    }

    const exDivDateRaw = findDateVal(stdout, 'Ex-Dividend Date')
    const earningsDateRaw = findDateVal(stdout, 'Earnings Date')

    return {
      peRatio: numVal(peRaw),
      forwardPE: numVal(fwdPERaw),
      eps: numVal(epsRaw),
      marketCapFmt: mktCapRaw,
      revenueFmt: revRaw,
      netIncomeFmt: niRaw,
      sharesOutFmt: sharesRaw,
      beta: numVal(betaRaw),
      dividendRate,
      dividendYield,
      exDividendDate: dateVal(exDivDateRaw),
      earningsDate: dateVal(earningsDateRaw),
    }
  } catch {
    return null
  }
}
