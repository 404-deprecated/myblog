import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

export const revalidate = 3600 // 1 hour
const execAsync = promisify(exec)

export interface MacroSignal {
  key: string
  name: string
  value: number
  unit: string
  trend: 'up' | 'down' | 'flat'
  impact: 'bullish' | 'bearish' | 'neutral'
  score: number      // -1 to +1
  note: string
  layer: 'macro' | 'sector' | 'sentiment'
  source: 'live' | 'static'
  weight: number     // within-layer weight (0-1, sums to 1 per layer)
}

export interface MacroResponse {
  signals: MacroSignal[]
  macroScore: number    // -1 to +1
  sectorScore: number
  sentimentScore: number
  compositeScore: number  // 0-100, bullish percentage
  compositeLabel: string
  fetchedAt: string
  errors?: string[]
}

// Yahoo Finance macro proxies — more reliable than FRED for automated access
const YF_MACRO = [
  { yfTicker: '^VIX',    key: 'vix',  periods: 6, label: 'VIX' },
  { yfTicker: '^TNX',    key: 'yield10', periods: 6, label: '10Y Yield' },
  { yfTicker: 'CL=F',    key: 'oil',  periods: 6, label: 'WTI Oil' },
  { yfTicker: 'DX-Y.NYB', key: 'usd', periods: 6, label: 'USD Index' },
]

async function fetchYahooMacro(ticker: string): Promise<{ values: number[]; latestDate: string }> {
  const enc = ticker.replace('^', '%5E')
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${enc}?range=3mo&interval=1wk&includePrePost=false`
  const { stdout } = await execAsync(
    `curl -s --max-time 10 -H "User-Agent: Mozilla/5.0" "${url}"`
  )
  const result = JSON.parse(stdout).chart?.result?.[0]
  if (!result) throw new Error(`Yahoo ${ticker}: no data`)
  const ts: number[] = result.timestamp || []
  const closes: number[] = result.indicators?.adjclose?.[0]?.adjclose
    || result.indicators?.quote?.[0]?.close || []
  const pts = ts
    .map((t, i) => ({ d: new Date(t * 1000).toISOString().slice(0, 10), p: closes[i] }))
    .filter(x => x.p != null && !isNaN(x.p) && x.p > 0)
  if (!pts.length) throw new Error(`Yahoo ${ticker}: no valid prices`)
  const recent = pts.slice(-6)
  return {
    values: recent.map(r => r.p),
    latestDate: recent[recent.length - 1].d,
  }
}

function trend(current: number, prev: number, threshold = 0.02): 'up' | 'down' | 'flat' {
  const pct = (current - prev) / Math.abs(prev || 1)
  if (pct > threshold) return 'up'
  if (pct < -threshold) return 'down'
  return 'flat'
}

// Static signals — manually maintained, reflect current market context (2026-05)
const STATIC_SIGNALS: MacroSignal[] = [
  {
    key: 'fed_stance', name: '美联储立场', value: 0, unit: '',
    trend: 'down', impact: 'bullish', score: 0.6,
    note: '2026年降息周期进行中，鸽派立场维持，流动性宽松',
    layer: 'macro', source: 'static', weight: 0.15,
  },
  {
    key: 'geopolitical', name: '地缘政治风险', value: 0, unit: '',
    trend: 'down', impact: 'bullish', score: 0.4,
    note: '中美关税90天暂停+停火协议，风险溢价下降',
    layer: 'sentiment', source: 'static', weight: 0.30,
  },
  {
    key: 'policy_tech', name: '科技监管政策', value: 0, unit: '',
    trend: 'flat', impact: 'neutral', score: 0.1,
    note: 'AI监管框架逐步明朗化，半导体出口限制仍有不确定性',
    layer: 'sector', source: 'static', weight: 0.15,
  },
  {
    key: 'sector_ai', name: 'AI行业景气', value: 0, unit: '',
    trend: 'up', impact: 'bullish', score: 0.85,
    note: 'Blackwell算力超级周期，数据中心资本开支持续超预期',
    layer: 'sector', source: 'static', weight: 0.35,
  },
  {
    key: 'tech_narrative', name: '技术变革叙事', value: 0, unit: '',
    trend: 'up', impact: 'bullish', score: 0.75,
    note: 'AGI路线图清晰，AI代理应用落地，叙事溢价持续扩张',
    layer: 'sector', source: 'static', weight: 0.30,
  },
  {
    key: 'market_breadth', name: '市场宽度', value: 0, unit: '',
    trend: 'up', impact: 'bullish', score: 0.5,
    note: '纳指创历史新高，标普500成分股涨幅扩散，多数板块参与',
    layer: 'sentiment', source: 'static', weight: 0.20,
  },
  {
    key: 'competitive_moat', name: '竞争格局', value: 0, unit: '',
    trend: 'flat', impact: 'bullish', score: 0.6,
    note: '科技巨头垄断加强，AI寡头格局形成，护城河拓宽',
    layer: 'sector', source: 'static', weight: 0.20,
  },
]

export async function GET() {
  const errors: string[] = []

  // Fetch Yahoo macro data in parallel
  const yahooResults = await Promise.allSettled(
    YF_MACRO.map(async ({ yfTicker, key, label }) => {
      const data = await fetchYahooMacro(yfTicker)
      return { key, label, ...data }
    })
  )

  const yahooData = new Map<string, { values: number[]; latestDate: string }>()
  for (const r of yahooResults) {
    if (r.status === 'fulfilled') {
      yahooData.set(r.value.key, { values: r.value.values, latestDate: r.value.latestDate })
    } else {
      errors.push('Yahoo ' + (r as PromiseRejectedResult).reason?.toString?.().slice(0, 40) || 'fetch failed')
    }
  }

  const liveSignals: MacroSignal[] = []

  // ── VIX from Yahoo ^VIX ──────────────────────────────────────────────────
  const vixData = yahooData.get('vix')
  if (vixData) {
    const current = vixData.values[vixData.values.length - 1]
    const prev = vixData.values[0]
    const t = trend(current, prev, 0.05)
    const score = current < 15 ? 0.7 : current < 20 ? 0.4 : current < 25 ? 0 : current < 35 ? -0.5 : -0.9
    liveSignals.push({
      key: 'vix', name: 'VIX 恐慌指数', value: +current.toFixed(1), unit: '',
      trend: t, impact: current < 20 ? 'bullish' : current < 28 ? 'neutral' : 'bearish',
      score,
      note: `VIX ${current.toFixed(1)}，${current < 15 ? '极度低波动，市场乐观' : current < 20 ? '正常偏低，风险偏好健康' : current < 28 ? '波动率偏高，市场紧张' : '恐慌指数高企，建议降低风险仓位'}`,
      layer: 'sentiment', source: 'live', weight: 0.50,
    })
  }

  // ── 10Y Yield from Yahoo ^TNX ────────────────────────────────────────────
  const yieldData = yahooData.get('yield10')
  if (yieldData) {
    const current = yieldData.values[yieldData.values.length - 1]
    const prev = yieldData.values[0]
    const t = trend(current, prev, 0.02)
    const score = current < 3.5 ? 0.6 : current < 4.2 ? 0.2 : current < 5.0 ? -0.2 : -0.5
    liveSignals.push({
      key: 'yield10', name: '10年期美债收益率', value: +current.toFixed(2), unit: '%',
      trend: t, impact: t === 'down' ? 'bullish' : t === 'up' ? 'bearish' : 'neutral',
      score,
      note: `${current.toFixed(2)}%，${current < 4.2 ? '收益率温和，股票吸引力强' : '高收益率压制股票估值，尤其成长股'}`,
      layer: 'macro', source: 'live', weight: 0.20,
    })
  }

  // ── WTI Oil from Yahoo CL=F ──────────────────────────────────────────────
  const oilData = yahooData.get('oil')
  if (oilData) {
    const current = oilData.values[oilData.values.length - 1]
    const prev = oilData.values[0]
    const t = trend(current, prev, 0.03)
    const score = current < 60 ? 0.5 : current < 80 ? 0.3 : current < 100 ? -0.2 : -0.6
    liveSignals.push({
      key: 'oil', name: 'WTI原油价格', value: +current.toFixed(1), unit: '$/bbl',
      trend: t, impact: current < 80 ? 'bullish' : current < 100 ? 'neutral' : 'bearish',
      score,
      note: `WTI $${current.toFixed(1)}（${oilData.latestDate}）${current < 70 ? '，低油价抑制通胀，利好科技/消费' : current < 90 ? '，油价温和，经济可承受' : '，高油价推升通胀，侵蚀企业利润'}`,
      layer: 'macro', source: 'live', weight: 0.10,
    })
  }

  // ── USD Index from Yahoo DX-Y.NYB ────────────────────────────────────────
  const usdData = yahooData.get('usd')
  if (usdData) {
    const current = usdData.values[usdData.values.length - 1]
    const prev = usdData.values[0]
    const t = trend(current, prev, 0.005)
    const score = t === 'down' ? 0.4 : t === 'up' ? -0.3 : 0.1
    liveSignals.push({
      key: 'usd', name: '美元指数 (DXY)', value: +current.toFixed(1), unit: '',
      trend: t, impact: t === 'down' ? 'bullish' : t === 'up' ? 'bearish' : 'neutral',
      score,
      note: `DXY ${current.toFixed(1)}（${usdData.latestDate}）${t === 'down' ? '，美元走弱，利好出口企业和新兴市场' : t === 'up' ? '，美元走强，压制海外营收和大宗商品' : '，美元相对稳定，影响中性'}`,
      layer: 'macro', source: 'live', weight: 0.15,
    })
  }

  const allSignals = [...liveSignals, ...STATIC_SIGNALS]

  // --- Compute layer scores ---
  function layerScore(layer: MacroSignal['layer']): number {
    const s = allSignals.filter(x => x.layer === layer)
    if (!s.length) return 0
    const totalW = s.reduce((a, b) => a + b.weight, 0)
    return s.reduce((acc, x) => acc + x.score * (x.weight / totalW), 0)
  }

  const macroScore = layerScore('macro')
  const sectorScore = layerScore('sector')
  const sentimentScore = layerScore('sentiment')

  const composite = macroScore * 0.4 + sectorScore * 0.3 + sentimentScore * 0.3
  const bullPct = Math.round(((composite + 1) / 2) * 100)  // map [-1,1] → [0,100]

  const compositeLabel =
    bullPct >= 70 ? '强烈看多' :
    bullPct >= 60 ? '偏多' :
    bullPct >= 45 ? '中性偏多' :
    bullPct >= 35 ? '中性偏空' :
    bullPct >= 25 ? '偏空' : '强烈看空'

  return NextResponse.json(
    {
      signals: allSignals,
      macroScore: +macroScore.toFixed(3),
      sectorScore: +sectorScore.toFixed(3),
      sentimentScore: +sentimentScore.toFixed(3),
      compositeScore: bullPct,
      compositeLabel,
      fetchedAt: new Date().toISOString(),
      errors: errors.length ? [...new Set(errors)].slice(0, 1) : undefined,
    } satisfies MacroResponse,
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
  )
}
