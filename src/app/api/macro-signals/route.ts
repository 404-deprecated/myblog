import { NextResponse } from 'next/server'

export const revalidate = 3600 // 1 hour

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

async function fetchFred(id: string, periods = 5): Promise<{ current: number; prev: number; values: number[]; latestDate: string }> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`FRED ${id}: ${res.status}`)
  const lines = (await res.text()).trim().split('\n').slice(1)
  const parsed = lines
    .map(l => { const c = l.indexOf(','); return { date: l.slice(0, c).trim(), v: parseFloat(l.slice(c + 1).trim()) } })
    .filter(r => !isNaN(r.v))
  const recent = parsed.slice(-periods)
  return {
    current: recent[recent.length - 1].v,
    prev: recent[0].v,
    values: recent.map(r => r.v),
    latestDate: recent[recent.length - 1].date,
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
  const liveSignals: MacroSignal[] = []
  const errors: string[] = []

  // --- FEDFUNDS: Federal funds rate ---
  try {
    const { current, prev, values } = await fetchFred('FEDFUNDS', 6)
    const t = trend(current, prev, 0.01)
    const score = current <= 3.5 ? 0.7 : current <= 4.5 ? 0.3 : current <= 5.5 ? -0.2 : -0.6
    liveSignals.push({
      key: 'rate', name: '联邦基金利率', value: +current.toFixed(2), unit: '%',
      trend: t, impact: t === 'down' ? 'bullish' : t === 'up' ? 'bearish' : 'neutral',
      score,
      note: `当前 ${current.toFixed(2)}%，近6月${t === 'down' ? '下行' : t === 'up' ? '上行' : '持平'}；${current <= 4.0 ? '降息周期利好成长股' : '利率偏高，压制估值'}`,
      layer: 'macro', source: 'live', weight: 0.20,
    })
  } catch (e) { errors.push(String(e)) }

  // --- CPIAUCSL: CPI ---
  try {
    const { values } = await fetchFred('CPIAUCSL', 14)
    const current = values[values.length - 1]
    const yearAgo = values[values.length - 13] ?? values[0]
    const yoy = ((current - yearAgo) / yearAgo) * 100
    const prev12 = values[values.length - 2]
    const prevYoy = ((prev12 - (values[values.length - 14] ?? values[0])) / (values[values.length - 14] ?? values[0])) * 100
    const t = trend(yoy, prevYoy, 0.1)
    const score = yoy < 2.5 ? 0.6 : yoy < 3.5 ? 0.2 : yoy < 5.0 ? -0.3 : -0.7
    liveSignals.push({
      key: 'inflation', name: 'CPI通货膨胀', value: +yoy.toFixed(1), unit: '% YoY',
      trend: t, impact: yoy < 3 ? 'bullish' : yoy < 4.5 ? 'neutral' : 'bearish',
      score,
      note: `同比 ${yoy.toFixed(1)}%，${yoy < 3 ? '接近目标区间，美联储压力减轻' : yoy < 4.5 ? '高于目标但可控' : '高通胀持续，加息压力大'}`,
      layer: 'macro', source: 'live', weight: 0.15,
    })
  } catch (e) { errors.push(String(e)) }

  // --- DGS10: 10Y Treasury yield ---
  try {
    const { current, values } = await fetchFred('DGS10', 6)
    const prev = values[0]
    const t = trend(current, prev, 0.02)
    const score = current < 3.5 ? 0.6 : current < 4.2 ? 0.2 : current < 5.0 ? -0.2 : -0.5
    liveSignals.push({
      key: 'yield10', name: '10年期美债收益率', value: +current.toFixed(2), unit: '%',
      trend: t, impact: t === 'down' ? 'bullish' : t === 'up' ? 'bearish' : 'neutral',
      score,
      note: `${current.toFixed(2)}%，${current < 4.2 ? '收益率温和，股票吸引力强' : '高收益率压制股票估值，尤其成长股'}`,
      layer: 'macro', source: 'live', weight: 0.15,
    })
  } catch (e) { errors.push(String(e)) }

  // --- T10Y2Y: Yield curve spread ---
  try {
    const { current, values } = await fetchFred('T10Y2Y', 6)
    const prev = values[0]
    const t = trend(current, prev, 0.05)
    const score = current > 0.5 ? 0.6 : current > 0 ? 0.2 : current > -0.5 ? -0.2 : -0.6
    liveSignals.push({
      key: 'yield_curve', name: '收益率曲线（10Y-2Y）', value: +current.toFixed(2), unit: 'pts',
      trend: t, impact: current > 0 ? 'bullish' : current > -0.5 ? 'neutral' : 'bearish',
      score,
      note: `利差 ${current > 0 ? '+' : ''}${current.toFixed(2)}，${current > 0.3 ? '曲线陡峭化，经济扩张信号' : current > 0 ? '曲线正常化中' : '仍倒挂，衰退风险存在'}`,
      layer: 'macro', source: 'live', weight: 0.15,
    })
  } catch (e) { errors.push(String(e)) }

  // --- VIXCLS: VIX fear gauge ---
  try {
    const { current, values } = await fetchFred('VIXCLS', 6)
    const prev = values[0]
    const t = trend(current, prev, 0.05)
    const score = current < 15 ? 0.7 : current < 20 ? 0.4 : current < 25 ? 0 : current < 35 ? -0.5 : -0.9
    liveSignals.push({
      key: 'vix', name: 'VIX 恐慌指数', value: +current.toFixed(1), unit: '',
      trend: t, impact: current < 20 ? 'bullish' : current < 28 ? 'neutral' : 'bearish',
      score,
      note: `VIX ${current.toFixed(1)}，${current < 15 ? '极度低波动，市场乐观' : current < 20 ? '正常偏低，风险偏好健康' : current < 28 ? '波动率偏高，市场紧张' : '恐慌指数高企，建议降低风险仓位'}`,
      layer: 'sentiment', source: 'live', weight: 0.50,
    })
  } catch (e) { errors.push(String(e)) }

  // --- DCOILWTICO: WTI crude oil (FRED weekly, may lag 1-2 weeks) ---
  try {
    const { current, values, latestDate } = await fetchFred('DCOILWTICO', 6)
    const prev = values[0]
    const t = trend(current, prev, 0.03)
    const score = current < 60 ? 0.5 : current < 80 ? 0.3 : current < 100 ? -0.2 : -0.6
    liveSignals.push({
      key: 'oil', name: 'WTI原油价格', value: +current.toFixed(1), unit: '$/bbl',
      trend: t, impact: current < 80 ? 'bullish' : current < 100 ? 'neutral' : 'bearish',
      score,
      note: `WTI $${current.toFixed(1)}（${latestDate}）${current < 70 ? '，低油价抑制通胀，利好科技/消费' : current < 90 ? '，油价温和，经济可承受' : '，高油价推升通胀，侵蚀企业利润'}`,
      layer: 'macro', source: 'live', weight: 0.10,
    })
  } catch (e) { errors.push(String(e)) }

  // --- DTWEXBGS: USD broad trade-weighted index (≠ DXY; DTWEXBGS ~115-120 range) ---
  try {
    const { current, values, latestDate } = await fetchFred('DTWEXBGS', 6)
    const prev = values[0]
    const t = trend(current, prev, 0.003)
    // Falling USD = bullish for global stocks, commodities, emerging markets
    const score = t === 'down' ? 0.4 : t === 'up' ? -0.3 : 0.1
    liveSignals.push({
      key: 'usd', name: '美元贸易加权指数', value: +current.toFixed(1), unit: 'idx',
      trend: t, impact: t === 'down' ? 'bullish' : t === 'up' ? 'bearish' : 'neutral',
      score,
      note: `DTWEXBGS ${current.toFixed(1)}（${latestDate}，非DXY）${t === 'down' ? '，美元走弱，利好出口企业和新兴市场' : t === 'up' ? '，美元走强，压制海外营收和大宗商品' : '，美元相对稳定，影响中性'}`,
      layer: 'macro', source: 'live', weight: 0.10,
    })
  } catch (e) { errors.push(String(e)) }

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
      errors: errors.length ? errors : undefined,
    } satisfies MacroResponse,
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
  )
}
