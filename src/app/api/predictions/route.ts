import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'

export const dynamic = 'force-dynamic'
const execAsync = promisify(exec)

// ─── Types ────────────────────────────────────────────────────────────────────
export type PredDir = 'up' | 'down' | 'flat'
export type PredResult = 'correct' | 'incorrect' | 'pending'

export interface DailyPrediction {
  id: string
  ticker: string
  name: string
  type: 'index' | 'stock'
  currency: string
  createdAt: string
  targetDate: string        // YYYY-MM-DD being predicted
  currentPrice: number
  predictedDirection: PredDir
  bullPct: number           // 0-100
  confidence: number        // 0-100
  targetLow: number
  targetHigh: number
  reasoning: string
  keyRisks: string[]
  technicalScore: number
  macroScore: number
  // Filled after targetDate:
  actualPrice?: number
  actualChangeP?: number
  actualDirection?: PredDir
  result?: PredResult
  postMortem?: string
  reviewedAt?: string
}

export interface EarningsPrediction {
  id: string
  ticker: string
  name: string
  earningsDate: string
  season: string
  createdAt: string
  priceAtCreation: number
  predictedReaction: 'strong_up' | 'up' | 'flat' | 'down' | 'strong_down'
  confidence: number
  reasoning: string
  keyFactors: string[]
  expectedEPS: string
  // Post-earnings (filled after earningsDate):
  actualEPS?: string
  actualPriceChange?: number
  actualReaction?: 'strong_up' | 'up' | 'flat' | 'down' | 'strong_down'
  result?: 'correct' | 'incorrect'
  postMortem?: string
  reviewedAt?: string
}

export interface PredictionStore {
  daily: DailyPrediction[]
  earnings: EarningsPrediction[]
}

// ─── Storage ──────────────────────────────────────────────────────────────────
const DATA_FILE = join(process.cwd(), 'data', 'predictions.json')

async function readStore(): Promise<PredictionStore> {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf-8'))
  } catch {
    return { daily: [], earnings: [] }
  }
}

async function writeStore(store: PredictionStore): Promise<void> {
  const dir = dirname(DATA_FILE)
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8')
}

// ─── Price fetch (same curl pattern as stock-daily) ───────────────────────────
async function fetchPrices(ticker: string): Promise<{ d: string; p: number }[]> {
  const enc = encodeURIComponent(ticker)
  for (const host of ['query2', 'query1']) {
    const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${enc}?range=3mo&interval=1d&includePrePost=false`
    try {
      const { stdout } = await execAsync(
        `curl -s --max-time 10 -H "User-Agent: Mozilla/5.0" "${url}"`
      )
      const result = JSON.parse(stdout).chart?.result?.[0]
      if (!result) continue
      const ts: number[] = result.timestamp || []
      const closes: number[] =
        result.indicators?.adjclose?.[0]?.adjclose ||
        result.indicators?.quote?.[0]?.close || []
      const pts = ts
        .map((t, i) => ({ d: new Date(t * 1000).toISOString().slice(0, 10), p: closes[i] }))
        .filter(x => x.p != null && !isNaN(x.p) && x.p > 0)
      if (pts.length) return pts
    } catch { /* try next host */ }
  }
  return []
}

// ─── Technical signals ────────────────────────────────────────────────────────
function calcTechnicals(prices: { d: string; p: number }[]) {
  const v = prices.map(p => p.p)
  if (v.length < 10) return null

  const sma = (n: number) => v.slice(-n).reduce((a, b) => a + b, 0) / n
  const s5 = sma(5)
  const s20 = v.length >= 20 ? sma(20) : null
  const s60 = v.length >= 60 ? sma(60) : null

  const win = Math.min(14, v.length - 1)
  let g = 0, lo = 0
  for (let i = v.length - win; i < v.length; i++) {
    const d = v[i] - v[i - 1]
    d > 0 ? (g += d) : (lo -= d)
  }
  const rsi = lo === 0 ? 100 : +(100 - 100 / (1 + (g / win) / (lo / win))).toFixed(1)
  const mom5  = v.length >= 6  ? +((v[v.length-1]/v[v.length-6]  - 1)*100).toFixed(2) : 0
  const mom20 = v.length >= 21 ? +((v[v.length-1]/v[v.length-21] - 1)*100).toFixed(2) : 0

  // ATR-like: avg daily range last 10 sessions
  const r10 = v.slice(-10)
  const atrAbs = r10.reduce((s, x, i) => i === 0 ? 0 : s + Math.abs(x - r10[i-1]), 0) / 9

  // Weighted bull score
  const signals = [
    { bull: s5 > (s20 ?? s5 - 1), w: 0.30 },
    ...(s20 ? [{ bull: s20 > (s60 ?? s20 - 1), w: 0.25 }] : []),
    { bull: rsi > 45 && rsi < 72, w: 0.20 },
    { bull: mom5 > 0,  w: 0.15 },
    { bull: mom20 > 0, w: 0.10 },
  ]
  const tw = signals.reduce((a, s) => a + s.w, 0)
  const bullPct = Math.round(signals.reduce((a, s) => a + (s.bull ? s.w : 0), 0) / tw * 100)

  return { price: v[v.length-1], s5, s20, s60, rsi, mom5, mom20, bullPct, atrAbs }
}

// ─── Macro score ──────────────────────────────────────────────────────────────
async function getMacroScore(): Promise<number> {
  try {
    const base = process.env.SITE_URL ?? 'http://localhost:3001'
    const res = await fetch(`${base}/api/macro-signals`, { cache: 'no-store' })
    const data = await res.json()
    return typeof data.compositeScore === 'number' ? data.compositeScore : 50
  } catch { return 50 }
}

// ─── Next trading date ────────────────────────────────────────────────────────
function nextTradingDay(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function todayStr(): string { return new Date().toISOString().slice(0, 10) }

// ─── Build prediction reasoning ───────────────────────────────────────────────
function buildReasoning(
  tech: NonNullable<ReturnType<typeof calcTechnicals>>,
  macroScore: number,
): { reasoning: string; keyRisks: string[] } {
  const combined = Math.round(tech.bullPct * 0.6 + macroScore * 0.4)
  const dir = combined > 55 ? '看涨' : combined < 45 ? '看跌' : '震荡'
  const smaMsg = tech.s5 > (tech.s20 ?? tech.s5 - 1) ? 'SMA5在SMA20上方（多头排列）' : 'SMA5跌破SMA20（空头排列）'
  const rsiMsg = tech.rsi > 72 ? `RSI ${tech.rsi} 超买警告` : tech.rsi < 30 ? `RSI ${tech.rsi} 超卖反弹` : `RSI ${tech.rsi} 中性`
  const momMsg = tech.mom5 >= 0 ? `5日动量 +${tech.mom5}%` : `5日动量 ${tech.mom5}%`
  const macroMsg = macroScore >= 60 ? `宏观 ${macroScore}%（偏多）` : macroScore <= 40 ? `宏观 ${macroScore}%（偏空）` : `宏观 ${macroScore}%（中性）`

  const reasoning = `${dir}${combined}%：${smaMsg}；${rsiMsg}；${momMsg}；${macroMsg}。技术×60% + 宏观×40% = ${combined}%`

  const risks: string[] = []
  if (tech.rsi > 70) risks.push(`RSI ${tech.rsi} 超买，回调压力存在`)
  if (tech.rsi < 32) risks.push(`RSI ${tech.rsi} 超卖，可能继续探底`)
  if (Math.abs(tech.mom5) > 3) risks.push(`5日累涨跌幅 ${tech.mom5}%，均值回归压力`)
  if (macroScore < 45) risks.push('宏观偏弱，系统性风险高于均值')
  risks.push('突发新闻/数据公布可能令预测失效')

  return { reasoning, keyRisks: risks.slice(0, 3) }
}

// ─── Post-mortem: why the prediction was wrong ────────────────────────────────
function buildPostMortem(pred: DailyPrediction, changeP: number): string {
  const actual: PredDir = changeP > 0.3 ? 'up' : changeP < -0.3 ? 'down' : 'flat'
  if (actual === pred.predictedDirection) return ''
  const mag = Math.abs(changeP)
  const degree = mag > 3 ? '大幅' : mag > 1.5 ? '明显' : '小幅'

  if (pred.predictedDirection === 'up' && actual === 'down') {
    return mag > 2
      ? `❌ 预测偏多：市场${degree}下跌 ${changeP.toFixed(1)}%，超出多头预期。常见原因：①宏观突发利空（Fed意外表态/地缘风险）②板块资金集中出逃 ③前期涨幅过大触发止盈。修正建议：RSI>70时降低看涨置信度10-15%；关注隔日宏观日历（CPI/FOMC）。`
      : `❌ 预测偏多：市场${degree}收跌 ${Math.abs(changeP).toFixed(1)}%。技术多头信号被当日情绪性卖压抵消，无明显正向催化剂。修正建议：多头信号需配合成交量放大确认，无量涨=信号质量低。`
  }
  if (pred.predictedDirection === 'down' && actual === 'up') {
    return `❌ 预测偏空：市场${degree}上涨 ${changeP.toFixed(1)}%。空头技术信号被正向催化剂压制（可能：政策利好/财报超预期/外盘强势带动）。修正建议：做空信号出现时先检查是否有即将到来的利好事件（政策发布窗口期慎空）。`
  }
  return `❌ 预测震荡，实际${actual === 'up' ? '上涨' : '下跌'} ${Math.abs(changeP).toFixed(1)}%。趋势动能强于模型预期，信号出现后行情加速。修正建议：增加超短周期（1-3日）动量权重以捕捉趋势延续。`
}

// ─── Tracked assets ───────────────────────────────────────────────────────────
const TRACKED = [
  { ticker: '^IXIC',      name: '纳斯达克',  type: 'index' as const, currency: 'USD' },
  { ticker: '000001.SS',  name: '上证指数',  type: 'index' as const, currency: 'CNY' },
  { ticker: 'NVDA',       name: '英伟达',    type: 'stock' as const, currency: 'USD' },
  { ticker: '0700.HK',    name: '腾讯控股',  type: 'stock' as const, currency: 'HKD' },
  { ticker: 'ORCL',       name: '甲骨文',    type: 'stock' as const, currency: 'USD' },
  { ticker: 'PDD',        name: '拼多多',    type: 'stock' as const, currency: 'USD' },
]

// ─── Auto-review past pending predictions ────────────────────────────────────
async function autoReview(store: PredictionStore): Promise<boolean> {
  const today = todayStr()
  const pending = store.daily.filter(p => p.result === 'pending' && p.targetDate < today)
  if (!pending.length) return false

  let changed = false
  for (const pred of pending) {
    const prices = await fetchPrices(pred.ticker)
    // Find the closing price on or after targetDate
    const pt = prices.find(p => p.d === pred.targetDate)
      ?? prices.find(p => p.d > pred.targetDate)
    if (!pt) continue

    const changeP = +((pt.p - pred.currentPrice) / pred.currentPrice * 100).toFixed(2)
    const dir: PredDir = changeP > 0.3 ? 'up' : changeP < -0.3 ? 'down' : 'flat'
    const correct = dir === pred.predictedDirection

    pred.actualPrice = +pt.p.toFixed(2)
    pred.actualChangeP = changeP
    pred.actualDirection = dir
    pred.result = correct ? 'correct' : 'incorrect'
    pred.reviewedAt = new Date().toISOString()
    if (!correct) pred.postMortem = buildPostMortem(pred, changeP)
    changed = true
  }
  return changed
}

// ─── Auto-review past pending earnings predictions ────────────────────────────
async function autoReviewEarnings(store: PredictionStore): Promise<boolean> {
  const today = todayStr()
  const pending = store.earnings.filter(
    e => !e.result && e.earningsDate < today
  )
  if (!pending.length) return false

  let changed = false
  for (const ep of pending) {
    const prices = await fetchPrices(ep.ticker)
    if (!prices.length) continue

    // Price on day of earnings and day after
    const onDay  = prices.find(p => p.d === ep.earningsDate)
    const nextPt = prices.find(p => p.d > ep.earningsDate)
    const refPt  = onDay ?? nextPt
    if (!refPt) continue

    const changeP = +((refPt.p - ep.priceAtCreation) / ep.priceAtCreation * 100).toFixed(2)
    const actual: EarningsPrediction['actualReaction'] =
      changeP > 5 ? 'strong_up' : changeP > 1.5 ? 'up' :
      changeP < -5 ? 'strong_down' : changeP < -1.5 ? 'down' : 'flat'

    // Broad match: strong_up/up both count as 'up' direction
    const predDir = ep.predictedReaction.includes('up') ? 'up' : ep.predictedReaction.includes('down') ? 'down' : 'flat'
    const actualDir = actual.includes('up') ? 'up' : actual.includes('down') ? 'down' : 'flat'

    ep.actualPriceChange = changeP
    ep.actualReaction = actual
    ep.result = predDir === actualDir ? 'correct' : 'incorrect'
    ep.reviewedAt = new Date().toISOString()

    if (ep.result === 'incorrect') {
      ep.postMortem = `预测${ep.predictedReaction}，实际${actual}（${changeP > 0 ? '+' : ''}${changeP.toFixed(1)}%）。`
        + (Math.abs(changeP) > 8
          ? '财报结果偏离市场预期较大，需复盘具体收入/EPS数字与预期的差距。'
          : '股价变化温和，可能市场预期已被充分定价，或财报数据符合预期但指引令市场失望。')
    }
    changed = true
  }
  return changed
}

// ─── GET: return all predictions (and auto-review pending ones) ───────────────
export async function GET() {
  const store = await readStore()
  const d1 = await autoReview(store)
  const d2 = await autoReviewEarnings(store)
  if (d1 || d2) await writeStore(store)
  return NextResponse.json(store)
}

// ─── POST: generate today's daily predictions ────────────────────────────────
export async function POST() {
  const store = await readStore()
  const today = todayStr()
  const targetDate = nextTradingDay()

  // Avoid duplicates for the same calendar day
  if (store.daily.some(p => p.createdAt.startsWith(today) && p.targetDate === targetDate)) {
    return NextResponse.json({ message: '今日预测已存在', store }, { status: 200 })
  }

  const macroScore = await getMacroScore()
  const newPreds: DailyPrediction[] = []

  for (const asset of TRACKED) {
    const prices = await fetchPrices(asset.ticker)
    if (!prices.length) continue
    const tech = calcTechnicals(prices)
    if (!tech) continue

    const combined = Math.round(tech.bullPct * 0.6 + macroScore * 0.4)
    const dir: PredDir = combined > 55 ? 'up' : combined < 45 ? 'down' : 'flat'
    const confidence = Math.min(88, Math.round(Math.abs(combined - 50) * 2 + 52))

    // Target range based on typical daily ATR
    const bias = dir === 'up' ? 0.003 : dir === 'down' ? -0.003 : 0
    const center = tech.price * (1 + bias)
    const { reasoning, keyRisks } = buildReasoning(tech, macroScore)

    newPreds.push({
      id: `${today.replace(/-/g, '')}_${asset.ticker.replace(/[^\w]/g, '')}`,
      ticker: asset.ticker, name: asset.name,
      type: asset.type, currency: asset.currency,
      createdAt: new Date().toISOString(),
      targetDate,
      currentPrice: +tech.price.toFixed(2),
      predictedDirection: dir,
      bullPct: combined,
      confidence,
      targetLow:  +(center - tech.atrAbs * 0.9).toFixed(2),
      targetHigh: +(center + tech.atrAbs * 0.9).toFixed(2),
      reasoning,
      keyRisks,
      technicalScore: tech.bullPct,
      macroScore,
      result: 'pending',
    })
  }

  store.daily.unshift(...newPreds)  // newest first
  await writeStore(store)
  return NextResponse.json({ generated: newPreds.length, store })
}

// ─── DELETE: clear all predictions (dev/reset) ────────────────────────────────
export async function DELETE() {
  await writeStore({ daily: [], earnings: [] })
  return NextResponse.json({ ok: true })
}
