import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { logPrediction } from '@/lib/review-store'
import { loadTunedParams, detectRegime, applyRegimeAdjustments } from '@/lib/auto-tune'

export const dynamic = 'force-dynamic'
const execAsync = promisify(exec)

// ─── Types ────────────────────────────────────────────────────────────────────
export type PredDir = 'up' | 'down' | 'flat'
export type PredResult = 'correct' | 'incorrect' | 'pending'
export type PredGroup = 'portfolio' | 'sector' | 'fund'

export interface DailyPrediction {
  id: string
  ticker: string
  name: string
  type: 'index' | 'stock'
  currency: string
  group: PredGroup
  sectorName?: string        // for sector group — which sector this represents
  createdAt: string
  targetDate: string
  currentPrice: number
  predictedDirection: PredDir
  bullPct: number
  confidence: number
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

// ─── Price fetch ──────────────────────────────────────────────────────────────
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

  const r10 = v.slice(-10)
  const atrAbs = r10.reduce((s, x, i) => i === 0 ? 0 : s + Math.abs(x - r10[i-1]), 0) / 9

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

// ─── Post-mortem: why the prediction was wrong (with deep attribution) ──────────
function buildPostMortem(pred: DailyPrediction, changeP: number): string {
  const actual: PredDir = changeP > 0.3 ? 'up' : changeP < -0.3 ? 'down' : 'flat'
  if (actual === pred.predictedDirection) return ''
  const mag = Math.abs(changeP)
  const degree = mag > 3 ? '大幅' : mag > 1.5 ? '明显' : '小幅'

  // Extract technical context from reasoning
  const reasoning = pred.reasoning || ''
  const hasRsi = reasoning.match(/RSI\s+([\d.]+)/)
  const rsiVal = hasRsi ? parseFloat(hasRsi[1]) : null
  const hasMom = reasoning.match(/([+-]?[\d.]+)%/)
  const momVal = hasMom ? parseFloat(hasMom[1]) : null
  const isOverbought = rsiVal !== null && rsiVal > 72
  const isOversold = rsiVal !== null && rsiVal < 30
  const isMomentumStrong = momVal !== null && Math.abs(momVal) > 5
  const isCombinedHigh = pred.bullPct >= 80
  const isCombinedLow = pred.bullPct <= 20

  if (pred.predictedDirection === 'up' && actual === 'down') {
    let rootCause = ''
    let fix = ''
    if (isOverbought && isMomentumStrong) {
      rootCause = `RSI${rsiVal}超买+5日涨${momVal}%，前期过度上涨后的均值回归。`
      fix = 'RSI>72且5日涨幅>5%时，强制降为震荡（flat），不生成看涨信号。'
    } else if (isCombinedHigh) {
      rootCause = `技术评分${pred.technicalScore}+宏观评分${pred.macroScore}推高综合得分至${pred.bullPct}%，模型过度自信。`
      fix = '技术评分>90时引入"过度乐观"惩罚因子，降低综合得分5-10%。'
    } else {
      rootCause = `技术多头信号(${pred.technicalScore}分)被${mag > 1.5 ? '较强' : ''}空头力量压制。可能原因：板块轮动、宏观数据不及预期、或隔夜外盘拖累。`
      fix = '增加VIX变动过滤：VIX单日涨>10%时所有看涨信号降级。'
    }
    return `❌ 预测偏多→实际${degree}下跌${mag.toFixed(1)}%。归因：${rootCause}修正：${fix}`
  }

  if (pred.predictedDirection === 'down' && actual === 'up') {
    let rootCause = ''
    let fix = ''
    if (isOversold) {
      rootCause = `RSI${rsiVal}深度超卖触发技术性反弹，空头信号被超跌反弹覆盖。`
      fix = 'RSI<32时看跌信号需叠加成交量萎缩确认，否则降为震荡。'
    } else if (pred.macroScore > 60) {
      rootCause = `宏观偏多(${pred.macroScore}分)但技术看跌，两者冲突时市场选择跟随宏观趋势。`
      fix = '宏观>60时，技术看跌信号的触发阈值从45降至35（更严苛）。'
    } else {
      rootCause = `正向催化剂（政策/财报/外盘）压制了技术空头信号。技术评分${pred.technicalScore}的看跌逻辑被外部利好打破。`
      fix = '生成看跌预测时检查当日是否有财报/政策事件，有则自动降置信度。'
    }
    return `❌ 预测偏空→实际${degree}上涨${mag.toFixed(1)}%。归因：${rootCause}修正：${fix}`
  }

  // Predicted flat/震荡, actual moved
  const actualLabel = actual === 'up' ? '涨' : '跌'
  let rootCause = ''
  let fix = ''
  if (isMomentumStrong) {
    rootCause = `5日动量${momVal}%表明趋势已经形成，震荡判断低估了趋势强度。`
    fix = '5日动量>3%时，即使综合得分在45-55之间，也偏向趋势方向。'
  } else if (isCombinedHigh || isCombinedLow) {
    rootCause = `综合得分${pred.bullPct}已接近临界值，信号被错误归为震荡。`
    fix = '将震荡区间从45-55收窄至47-53，减少边界误判。'
  } else {
    rootCause = '市场出现模型未捕捉到的驱动力，导致实际波动超过预期。'
    fix = '引入波动率预期：若ATR显著高于均值，扩大方向判定阈值。'
  }
  return `❌ 预测震荡→实际${actualLabel}${mag.toFixed(1)}%。归因：${rootCause}修正：${fix}`
}

// ─── Tracked assets ───────────────────────────────────────────────────────────
interface TrackedAsset {
  ticker: string
  name: string
  type: 'index' | 'stock'
  currency: string
  group: PredGroup
  sectorName?: string
}

const TRACKED: TrackedAsset[] = [
  // ── 持仓股 (portfolio) ──────────────────────────────────────────────────────
  { ticker: '^IXIC',      name: '纳斯达克',  type: 'index',  currency: 'USD', group: 'portfolio' },
  { ticker: '000001.SS',  name: '上证指数',  type: 'index',  currency: 'CNY', group: 'portfolio' },
  { ticker: '^HSI',       name: '恒生指数',  type: 'index',  currency: 'HKD', group: 'portfolio' },
  { ticker: 'NVDA',       name: '英伟达',    type: 'stock',  currency: 'USD', group: 'portfolio' },
  { ticker: '0700.HK',    name: '腾讯控股',  type: 'stock',  currency: 'HKD', group: 'portfolio' },
  { ticker: 'ORCL',       name: '甲骨文',    type: 'stock',  currency: 'USD', group: 'portfolio' },
  { ticker: 'PDD',        name: '拼多多',    type: 'stock',  currency: 'USD', group: 'portfolio' },

  // ── 赛道代表股 (sector) ─────────────────────────────────────────────────────
  { ticker: 'AMD',        name: 'AMD',       type: 'stock',  currency: 'USD', group: 'sector', sectorName: 'AI基础设施' },
  { ticker: 'AVGO',       name: '博通',      type: 'stock',  currency: 'USD', group: 'sector', sectorName: 'AI基础设施' },
  { ticker: 'MSFT',       name: '微软',      type: 'stock',  currency: 'USD', group: 'sector', sectorName: 'AI企业软件' },
  { ticker: 'META',       name: 'Meta',      type: 'stock',  currency: 'USD', group: 'sector', sectorName: 'AI企业软件' },
  { ticker: 'TSLA',       name: '特斯拉',    type: 'stock',  currency: 'USD', group: 'sector', sectorName: '具身智能' },
  { ticker: 'CEG',        name: 'Constellation Energy', type: 'stock', currency: 'USD', group: 'sector', sectorName: 'AI能源/核能' },
  { ticker: 'VST',        name: 'Vistra',    type: 'stock',  currency: 'USD', group: 'sector', sectorName: 'AI能源/核能' },
  { ticker: 'IONQ',       name: 'IonQ',      type: 'stock',  currency: 'USD', group: 'sector', sectorName: '量子计算' },
  { ticker: 'LLY',        name: '礼来',      type: 'stock',  currency: 'USD', group: 'sector', sectorName: 'AI生物医药' },
  { ticker: 'NIO',        name: '蔚来',      type: 'stock',  currency: 'USD', group: 'sector', sectorName: '新能源汽车' },
  { ticker: 'XPEV',       name: '小鹏',      type: 'stock',  currency: 'USD', group: 'sector', sectorName: '新能源汽车' },

  // ── 基金代理ETF (fund) ──────────────────────────────────────────────────────
  // 对应基金工具中的预设基金，通过可交易ETF代理涨跌趋势
  { ticker: 'QQQ',        name: '纳指100 ETF',    type: 'stock', currency: 'USD', group: 'fund', sectorName: '美国成长/科技' },
  { ticker: 'KWEB',       name: '中概互联网 ETF',  type: 'stock', currency: 'USD', group: 'fund', sectorName: '中概互联/港股' },
  { ticker: 'SMH',        name: '半导体 ETF',      type: 'stock', currency: 'USD', group: 'fund', sectorName: 'AI基础设施' },
  { ticker: 'ARKK',       name: '创新成长 ETF',    type: 'stock', currency: 'USD', group: 'fund', sectorName: '创新/颠覆性科技' },
]

// ─── Auto-review past pending predictions ────────────────────────────────────
async function autoReview(store: PredictionStore): Promise<boolean> {
  const today = todayStr()
  const pending = store.daily.filter(p => p.result === 'pending' && p.targetDate <= today)
  if (!pending.length) return false

  // Fetch prices in parallel grouped by ticker
  const tickers = [...new Set(pending.map(p => p.ticker))]
  const priceMap = new Map<string, { d: string; p: number }[]>()
  await Promise.allSettled(
    tickers.map(async t => { priceMap.set(t, await fetchPrices(t)) })
  )

  let changed = false
  for (const pred of pending) {
    const prices = priceMap.get(pred.ticker) ?? []
    if (prices.length < 2) continue

    // Use the most recent price available (target date may not have data yet)
    // Prefer exact date match, then closest after, then most recent
    const exact = prices.find(p => p.d === pred.targetDate)
    const after = prices.filter(p => p.d > pred.targetDate).sort((a, b) => a.d.localeCompare(b.d))[0]
    const last = prices[prices.length - 1]
    const pt = exact || after || last
    if (!pt) continue

    // Skip if the closest data is more than 5 days away from target
    const distDays = Math.abs(new Date(pt.d).getTime() - new Date(pred.targetDate).getTime()) / 86400000
    if (distDays > 5) continue

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
  const pending = store.earnings.filter(e => !e.result && e.earningsDate <= today)
  if (!pending.length) return false

  const tickers = [...new Set(pending.map(e => e.ticker))]
  const priceMap = new Map<string, { d: string; p: number }[]>()
  await Promise.allSettled(
    tickers.map(async t => { priceMap.set(t, await fetchPrices(t)) })
  )

  let changed = false
  for (const ep of pending) {
    const prices = priceMap.get(ep.ticker) ?? []
    if (!prices.length) continue

    const onDay  = prices.find(p => p.d === ep.earningsDate)
    const nextPt = prices.find(p => p.d > ep.earningsDate)
    const refPt  = onDay ?? nextPt
    if (!refPt) continue

    const changeP = +((refPt.p - ep.priceAtCreation) / ep.priceAtCreation * 100).toFixed(2)
    const actual: EarningsPrediction['actualReaction'] =
      changeP > 5 ? 'strong_up' : changeP > 1.5 ? 'up' :
      changeP < -5 ? 'strong_down' : changeP < -1.5 ? 'down' : 'flat'

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

  if (store.daily.some(p => p.createdAt.startsWith(today) && p.targetDate === targetDate)) {
    return NextResponse.json({ message: '今日预测已存在', store }, { status: 200 })
  }

  const macroScore = await getMacroScore()

  // Load self-tuned parameters
  const params = await loadTunedParams()

  // Detect market regime from VIX approximation and recent trend
  const nasdaqPrices = await fetchPrices('^IXIC')
  const nasdaqTech = nasdaqPrices.length >= 14 ? calcTechnicals(nasdaqPrices) : null
  const trendStrength = nasdaqTech ? nasdaqTech.bullPct - 50 : 0
  const regime = detectRegime(20, trendStrength) // VIX ≈ 20 default when FRED down
  const regimeAdj = applyRegimeAdjustments(params, regime)

  // Fetch all prices in parallel to keep latency reasonable
  const priceResults = new Map<string, { d: string; p: number }[]>()
  await Promise.allSettled(
    TRACKED.map(async asset => {
      priceResults.set(asset.ticker, await fetchPrices(asset.ticker))
    })
  )

  const newPreds: DailyPrediction[] = []

  for (const asset of TRACKED) {
    const prices = priceResults.get(asset.ticker) ?? []
    if (!prices.length) continue
    const tech = calcTechnicals(prices)
    if (!tech) continue

    // Use tuned weights and thresholds
    const techW = regimeAdj.techWeight
    const macroW = 1 - techW
    const combined = Math.round(tech.bullPct * techW + macroScore * macroW)

    const dir: PredDir =
      combined > params.bullThreshold ? 'up' :
      combined < params.bearThreshold ? 'down' : 'flat'

    const rawConfidence = Math.round(Math.abs(combined - 50) * params.confidenceScale + params.confidenceBase)
    const confidence = Math.min(params.maxConfidence, rawConfidence) + (regimeAdj.confidenceAdjust)

    const bias = dir === 'up' ? 0.003 : dir === 'down' ? -0.003 : 0
    const center = tech.price * (1 + bias)
    const { reasoning, keyRisks } = buildReasoning(tech, macroScore)

    newPreds.push({
      id: `${today.replace(/-/g, '')}_${asset.ticker.replace(/[^\w]/g, '')}`,
      ticker: asset.ticker, name: asset.name,
      type: asset.type, currency: asset.currency,
      group: asset.group,
      ...(asset.sectorName ? { sectorName: asset.sectorName } : {}),
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

  store.daily.unshift(...newPreds)
  await writeStore(store)

  // Auto-log to review store for continuous accuracy tracking
  for (const pred of newPreds) {
    await logPrediction({
      id: `auto_${pred.id}`,
      type: 'daily_price',
      ticker: pred.ticker,
      name: pred.name,
      group: pred.group === 'portfolio' ? 'portfolio' : pred.group === 'sector' ? 'sector' : 'fund',
      createdAt: pred.createdAt,
      targetDate: pred.targetDate,
      prediction: {
        direction: pred.predictedDirection,
        bullPct: pred.bullPct,
        confidence: pred.confidence,
        targetLow: pred.targetLow,
        targetHigh: pred.targetHigh,
        currentPrice: pred.currentPrice,
        reasoning: pred.reasoning,
        technicalScore: pred.technicalScore,
        macroScore: pred.macroScore,
      },
    }).catch(() => { /* non-critical, don't block */ })
  }

  return NextResponse.json({ generated: newPreds.length, store })
}

// ─── DELETE: clear all predictions (dev/reset) ────────────────────────────────
export async function DELETE() {
  await writeStore({ daily: [], earnings: [] })
  return NextResponse.json({ ok: true })
}
