import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

export const dynamic = 'force-dynamic'

const execAsync = promisify(exec)

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

  for (const host of ['query2', 'query1']) {
    const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${ticker}?range=${cfg.range}&interval=${cfg.interval}&includePrePost=false`
    try {
      const { stdout } = await execAsync(
        `curl -s --max-time 10 -H "User-Agent: Mozilla/5.0" -H "Accept: application/json" "${url}"`,
      )
      const raw = JSON.parse(stdout)
      const result = raw.chart?.result?.[0]
      if (!result) continue

      const timestamps: number[] = result.timestamp || []
      const adjClose: number[] =
        result.indicators?.adjclose?.[0]?.adjclose ||
        result.indicators?.quote?.[0]?.close || []

      const prices = timestamps
        .map((ts, i) => {
          const close = adjClose[i]
          if (close == null || isNaN(close) || close <= 0) return null
          return { d: new Date(ts * 1000).toISOString().slice(0, 10), p: +close.toFixed(2) }
        })
        .filter((pt): pt is { d: string; p: number } => pt !== null)

      if (!prices.length) continue

      return NextResponse.json(
        { prices, fetchedAt: new Date().toISOString() },
        { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
      )
    } catch { /* try next host */ }
  }

  return NextResponse.json({ error: 'Daily data unavailable — Yahoo Finance 暂时不可用' }, { status: 502 })
}
