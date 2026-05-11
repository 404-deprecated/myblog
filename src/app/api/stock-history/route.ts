import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function sma(arr: number[], n: number): number | null {
  if (arr.length < n) return null
  return arr.slice(-n).reduce((a, b) => a + b, 0) / n
}

function computeRsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null
  const slice = closes.slice(-(period + 1))
  let gains = 0, losses = 0
  for (let i = 1; i < slice.length; i++) {
    const d = slice[i] - slice[i - 1]
    if (d > 0) gains += d; else losses += Math.abs(d)
  }
  const rs = losses === 0 ? 999 : gains / losses * period / period
  return +(100 - 100 / (1 + (gains / period) / (losses / period || 0.001))).toFixed(1)
}

function backtestSma(closes: number[]): { accuracy: number; samples: number } {
  let correct = 0, total = 0
  for (let i = 20; i < closes.length - 1; i++) {
    const slice = closes.slice(0, i + 1)
    const fast = slice.slice(-5).reduce((a, b) => a + b, 0) / 5
    const slow = slice.length >= 20 ? slice.slice(-20).reduce((a, b) => a + b, 0) / 20 : null
    if (slow === null) continue
    const predicted = fast > slow ? 'up' : 'down'
    const actual = closes[i + 1] > closes[i] ? 'up' : 'down'
    if (predicted === actual) correct++
    total++
  }
  return { accuracy: total > 0 ? Math.round(correct / total * 100) : 0, samples: total }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ticker = searchParams.get('ticker')
  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 })

  try {
    const YF_HEADERS = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://finance.yahoo.com/',
    }

    // Try max range first, fall back to 5y
    const ranges = ['max', '5y']
    let res: Response | null = null
    for (const range of ranges) {
      for (const host of ['query2', 'query1']) {
        const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=1wk&includePrePost=false`
        try {
          const r = await fetch(url, { headers: YF_HEADERS, signal: AbortSignal.timeout(10000) })
          if (r.ok) { res = r; break }
        } catch { /* try next */ }
      }
      if (res) break
    }
    if (!res) throw new Error('Yahoo Finance unavailable — 行情数据暂时无法获取，请稍后再试')
    const raw = await res.json()
    const result = raw.chart?.result?.[0]
    if (!result) throw new Error('No data')

    const timestamps: number[] = result.timestamp || []
    const q = result.indicators?.quote?.[0] || {}
    const adjClose: number[] = result.indicators?.adjclose?.[0]?.adjclose || q.close || []

    const prices = timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        close: adjClose[i] != null ? +adjClose[i].toFixed(2) : null,
        volume: q.volume?.[i] ?? null,
      }))
      .filter(p => p.close != null && p.close > 0) as { date: string; close: number; volume: number | null }[]

    const closes = prices.map(p => p.close)
    const recent = closes.slice(-52)

    const sma5 = sma(recent, 5)
    const sma13 = sma(recent, 13)
    const sma26 = sma(recent, 26)
    const rsi = computeRsi(recent)
    const mom4 = recent.length >= 5
      ? +((recent[recent.length - 1] / recent[recent.length - 5] - 1) * 100).toFixed(1)
      : 0

    const signals: { name: string; value: string; bullish: boolean }[] = []
    if (sma5 != null && sma13 != null) {
      const b = sma5 > sma13
      signals.push({ name: 'MA5/MA13', value: b ? '金叉 — 短期上升趋势' : '死叉 — 短期下降趋势', bullish: b })
    }
    if (sma13 != null && sma26 != null) {
      const b = sma13 > sma26
      signals.push({ name: 'MA13/MA26', value: b ? '多头排列' : '空头排列', bullish: b })
    }
    if (rsi != null) {
      const b = rsi < 50
      signals.push({
        name: 'RSI(14)',
        value: rsi < 30 ? `${rsi} 超卖（强买入）` : rsi > 70 ? `${rsi} 超买（强卖出）` : `${rsi} ${b ? '偏弱' : '偏强'}`,
        bullish: rsi < 30 ? true : rsi > 70 ? false : b,
      })
    }
    signals.push({ name: '4周动量', value: `${mom4 >= 0 ? '+' : ''}${mom4}%`, bullish: mom4 > 0 })

    const bullCount = signals.filter(s => s.bullish).length
    const bullPct = Math.round(bullCount / signals.length * 100)
    const bt = backtestSma(closes)

    const meta = result.meta || {}

    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      name: meta.shortName || meta.longName || ticker,
      currency: meta.currency || 'USD',
      exchange: meta.exchangeName || '',
      currentPrice: closes[closes.length - 1],
      prevClose: closes[closes.length - 2] || closes[closes.length - 1],
      weekChange: closes.length >= 2
        ? +((closes[closes.length - 1] / closes[closes.length - 2] - 1) * 100).toFixed(2)
        : 0,
      high52w: meta.fiftyTwoWeekHigh ?? null,
      low52w: meta.fiftyTwoWeekLow ?? null,
      ipoDate: prices[0]?.date ?? null,
      prices,
      sma5, sma13, sma26, rsi, momentum4w: mom4,
      signals,
      bullPct,
      prediction: bullPct >= 55 ? 'bullish' : bullPct <= 45 ? 'bearish' : 'neutral',
      predictionLabel: bullPct >= 55 ? `看涨 ${bullPct}%` : bullPct <= 45 ? `看跌 ${100 - bullPct}%` : `震荡 — 信号分歧`,
      backtestAccuracy: bt.accuracy,
      backtestSamples: bt.samples,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}
