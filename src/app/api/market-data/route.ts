import { NextResponse } from 'next/server'

interface HistoryPoint {
  date: string
  value: number
}

interface SeriesData {
  current: number
  previous: number
  change: number
  changePct: number
  history: HistoryPoint[]
  updatedAt: string
}

interface StaticIndicator {
  current: number
  updatedAt: string
}

// Parse FRED CSV: "DATE,VALUE\n2026-05-08,7398.93\n..."
async function fetchFred(seriesId: string, days = 60): Promise<SeriesData> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!res.ok) throw new Error(`FRED ${seriesId}: HTTP ${res.status}`)

  const text = await res.text()
  const lines = text.trim().split('\n').slice(1) // skip header

  const all: HistoryPoint[] = lines
    .map((line) => {
      const comma = line.indexOf(',')
      const date = line.slice(0, comma).trim()
      const val = parseFloat(line.slice(comma + 1).trim())
      return { date, value: val }
    })
    .filter((d) => !isNaN(d.value))

  const history = all.slice(-days)
  const current = history[history.length - 1]
  const prev = history[history.length - 2]

  return {
    current: current.value,
    previous: prev?.value ?? current.value,
    change: current.value - (prev?.value ?? current.value),
    changePct: prev ? ((current.value - prev.value) / prev.value) * 100 : 0,
    history,
    updatedAt: current.date,
  }
}

export async function GET() {
  const [sp500Res, nasdaqRes, vixRes, spreadRes] = await Promise.allSettled([
    fetchFred('SP500', 60),
    fetchFred('NASDAQCOM', 60),
    fetchFred('VIXCLS', 60),
    fetchFred('T10Y2Y', 60),
  ])

  const staticIndicators: { cape: StaticIndicator; buffett: StaticIndicator; breadth: StaticIndicator } = {
    cape: { current: 39.7, updatedAt: '2026-05-01' },
    buffett: { current: 230.0, updatedAt: '2026-05-01' },
    breadth: { current: 56.9, updatedAt: '2026-05-08' },
  }

  return NextResponse.json(
    {
      sp500: sp500Res.status === 'fulfilled' ? sp500Res.value : null,
      nasdaq: nasdaqRes.status === 'fulfilled' ? nasdaqRes.value : null,
      vix: vixRes.status === 'fulfilled' ? vixRes.value : null,
      yieldSpread: spreadRes.status === 'fulfilled' ? spreadRes.value : null,
      ...staticIndicators,
      fetchedAt: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  )
}
