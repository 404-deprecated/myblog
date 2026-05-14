import { NextRequest, NextResponse } from 'next/server'
import { fetchYahooChart } from '@/lib/yahoo-finance'

export const dynamic = 'force-dynamic'

// Only allow safe ticker characters to prevent injection
function safeTicker(s: string): string | null {
  return /^[A-Z0-9.^=]{1,12}$/.test(s) ? s : null
}

const YF_CONFIG: Record<string, { range: string; interval: string }> = {
  '1W': { range: '5d',  interval: '1d'  },
  '1M': { range: '1mo', interval: '1d'  },
  '3M': { range: '3mo', interval: '1d'  },
  '6M': { range: '6mo', interval: '1d'  },
  '1Y': { range: '1y',  interval: '1wk' },
  '2Y': { range: '2y',  interval: '1wk' },
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const rawTicker = searchParams.get('ticker') ?? ''
  const range = searchParams.get('range') || '1M'

  const ticker = safeTicker(rawTicker.toUpperCase())
  if (!ticker) return NextResponse.json({ error: 'invalid ticker' }, { status: 400 })

  const cfg = YF_CONFIG[range] ?? YF_CONFIG['1M']

  const { ts, closes } = await fetchYahooChart(ticker, cfg.range, cfg.interval)

  if (ts.length > 0 && closes.length > 0) {
    const prices = ts
      .map((t, i) => {
        const close = closes[i]
        if (close == null || isNaN(close) || close <= 0) return null
        return { d: new Date(t * 1000).toISOString().slice(0, 10), p: +close.toFixed(2) }
      })
      .filter((pt): pt is { d: string; p: number } => pt !== null)

    if (prices.length) {
      return NextResponse.json(
        { prices, fetchedAt: new Date().toISOString() },
        { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
      )
    }
  }

  return NextResponse.json({ error: 'Daily data unavailable — Yahoo Finance 暂时不可用' }, { status: 502 })
}
