import { NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { logPrediction } from '@/lib/review-store'
import { loadTunedParams, detectRegime, applyRegimeAdjustments } from '@/lib/auto-tune'
import { fetchYahooChart, fetchPrices } from '@/lib/yahoo-finance'

export const dynamic = 'force-dynamic'

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

// ─── Price fetch (native fetch, zero subprocess overhead) ───────────────────
async function fetchPredictionPrices(ticker: string): Promise<{ d: string; p: number }[]> {
  return fetchPrices(ticker, '3mo')
}

async function fetchPredictionData(ticker: string): Promise<{ prices: { d: string; p: number }[]; volumes: number[] }> {
  const { ts, closes, volumes } = await fetchYahooChart(ticker, '3mo', '1d')
  const prices = ts
    .map((t, i) => ({ d: new Date(t * 1000).toISOString().slice(0, 10), p: closes[i] }))
    .filter(x => x.p != null && !isNaN(x.p) && x.p > 0)
  const validVolumes = volumes.filter(v => v != null && !isNaN(v) && v >= 0)
  return { prices, volumes: validVolumes }
}

let vixCache: { value: number; fetchedAt: number } | null = null

async function getVIX(): Promise<number> {
  const now = Date.now()
  if (vixCache && now - vixCache.fetchedAt < 30 * 60 * 1000) return vixCache.value
  try {
    const pts = await fetchPrices('^VIX', '1mo', '1d')
    if (pts.length > 0) {
      vixCache = { value: pts[pts.length - 1].p, fetchedAt: now }
      return vixCache.value
    }
  } catch { /* ignore */ }
  return 20 // default VIX
}

// ─── Technical signals (enhanced with volume + support/resistance) ────────────
function calcTechnicals(
  prices: { d: string; p: number }[],
  volumes: number[],
  vix: number,
) {
  const v = prices.map(p => p.p)
  if (v.length < 10) return null

  const sma = (n: number) => v.slice(-n).reduce((a, b) => a + b, 0) / n
  const s5 = sma(5)
  const s20 = v.length >= 20 ? sma(20) : null
  const s60 = v.length >= 60 ? sma(60) : null

  const win = Math.min(14, v.length - 1)
  let g = 0, lo = 0
  for (let i = v.length - win; i < v.length; i++) {
    const diff = v[i] - v[i - 1]
    diff > 0 ? (g += diff) : (lo -= diff)
  }
  const rsi = lo === 0 ? 100 : +(100 - 100 / (1 + (g / win) / (lo / win))).toFixed(1)
  const mom5  = v.length >= 6  ? +((v[v.length-1]/v[v.length-6]  - 1)*100).toFixed(2) : 0
  const mom20 = v.length >= 21 ? +((v[v.length-1]/v[v.length-21] - 1)*100).toFixed(2) : 0

  const r10 = v.slice(-10)
  const atrAbs = r10.reduce((s, x, i) => i === 0 ? 0 : s + Math.abs(x - r10[i-1]), 0) / 9

  // ── Volume analysis ──────────────────────────────────────────────────────────
  const validVols = volumes.filter(x => x > 0)
  const vol5 = validVols.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, validVols.slice(-5).length)
  const vol20 = validVols.length >= 20
    ? validVols.slice(-20).reduce((a, b) => a + b, 0) / 20
    : vol5
  const volRatio = vol20 > 0 ? vol5 / vol20 : 1 // >1 = increasing volume
  const volSurging = volRatio > 1.5

  // Volume-price confirmation: rising on high volume = bullish, falling on high volume = bearish
  const recentVolPriceDirection = mom5 > 0 ? 'up' : 'down'
  const volConfirmsPrice = (recentVolPriceDirection === 'up' && volRatio > 1.0) ||
    (recentVolPriceDirection === 'down' && volRatio > 1.0)

  // ── Support / resistance proximity ───────────────────────────────────────────
  const currentPrice = v[v.length - 1]
  const ma20 = s20 ?? currentPrice
  const recent20 = v.slice(-20)
  const recentLow = recent20.length ? Math.min(...recent20) : currentPrice
  const recentHigh = recent20.length ? Math.max(...recent20) : currentPrice
  const distFromSupport = ((currentPrice - recentLow) / recentLow) * 100
  const distFromResist = ((recentHigh - currentPrice) / currentPrice) * 100

  // Near support (<2% away) → mild bullish bias
  // Near resistance (<2% away) → mild bearish bias (resistance likely holds)
  const nearSupport = distFromSupport < 2
  const nearResist = distFromResist < 2

  // ── VIX-based risk ───────────────────────────────────────────────────────────
  const vixHigh = vix > 28
  const vixElevated = vix > 22
  const vixLow = vix < 14

  // ── Weighted signal scoring ──────────────────────────────────────────────────
  let signals: { bull: boolean; w: number }[] = [
    { bull: s5 > (s20 ?? s5 - 1), w: 0.25 },
    ...(s20 ? [{ bull: s20 > (s60 ?? s20 - 1), w: 0.20 }] : []),
  ]

  // RSI signal: neutralize in overbought/oversold zones (don't blindly follow momentum)
  if (rsi < 32) {
    signals.push({ bull: true, w: 0.18 }) // oversold → potential bounce
  } else if (rsi > 72) {
    signals.push({ bull: false, w: 0.18 }) // overbought → likely pullback
  } else {
    signals.push({ bull: rsi > 50, w: 0.18 })
  }

  // Momentum signals with diminishing weight in extremes
  const momWeight = Math.abs(mom5) > 4 ? 0.08 : 0.12
  signals.push({ bull: mom5 > 0, w: momWeight })
  signals.push({ bull: mom20 > 0, w: 0.08 })

  // Volume confirmation (new)
  if (volRatio > 1.0 && !volSurging) {
    signals.push({ bull: mom5 > 0, w: 0.06 }) // moderate volume confirms trend
  }

  // VIX signal (new)
  if (vixHigh) {
    signals.push({ bull: false, w: 0.06 }) // high fear → downward pressure
  } else if (vixLow) {
    signals.push({ bull: true, w: 0.04 }) // complacency → mild tailwind
  }

  // Support/resistance proximity (new)
  if (nearSupport && !vixHigh) {
    signals.push({ bull: true, w: 0.05 })
  } else if (nearResist) {
    signals.push({ bull: false, w: 0.05 })
  }

  const tw = signals.reduce((a, s) => a + s.w, 0)
  const bullPct = Math.round(signals.reduce((a, s) => a + (s.bull ? s.w : 0), 0) / tw * 100)

  return {
    price: currentPrice, s5, s20, s60, rsi, mom5, mom20, bullPct, atrAbs,
    volRatio, volSurging, volConfirmsPrice,
    vixHigh, vixElevated,
    nearSupport, nearResist, distFromSupport, distFromResist,
    ma20, recentLow, recentHigh,
  }
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
  const dir = combined > 58 ? '看涨' : combined < 42 ? '看跌' : '震荡'
  const smaMsg = tech.s5 > (tech.s20 ?? tech.s5 - 1) ? 'SMA5在SMA20上方（多头排列）' : 'SMA5跌破SMA20（空头排列）'
  const rsiMsg = tech.rsi > 72 ? `RSI ${tech.rsi} 超买警告` : tech.rsi < 32 ? `RSI ${tech.rsi} 超卖反弹` : `RSI ${tech.rsi} 中性`
  const momMsg = tech.mom5 >= 0 ? `5日动量 +${tech.mom5}%` : `5日动量 ${tech.mom5}%`
  const macroMsg = macroScore >= 60 ? `宏观 ${macroScore}%（偏多）` : macroScore <= 40 ? `宏观 ${macroScore}%（偏空）` : `宏观 ${macroScore}%（中性）`
  const volMsg = tech.volSurging ? `成交量激增${tech.volRatio.toFixed(1)}x` : `成交量${tech.volRatio > 1.05 ? '略增' : tech.volRatio < 0.95 ? '萎缩' : '正常'}`
  const vixMsg = tech.vixHigh ? `VIX ${tech.vixHigh ? '高危' : '正常'}` : ''

  const reasoning = `${dir}${combined}%：${smaMsg}；${rsiMsg}；${momMsg}；${volMsg}；${macroMsg}。技术×60% + 宏观×40% = ${combined}%`

  const risks: string[] = []
  if (tech.rsi > 70) risks.push(`RSI ${tech.rsi} 超买，回调压力存在`)
  if (tech.rsi < 32) risks.push(`RSI ${tech.rsi} 超卖，可能继续探底`)
  if (Math.abs(tech.mom5) > 3) risks.push(`5日累涨跌幅 ${tech.mom5}%，均值回归压力`)
  if (tech.volSurging) risks.push('成交量异常放大，波动可能加剧')
  if (tech.vixHigh) risks.push('VIX高位，系统性风险上升')
  if (macroScore < 45) risks.push('宏观偏弱，系统性风险高于均值')
  risks.push('突发新闻/数据公布可能令预测失效')

  return { reasoning, keyRisks: risks.slice(0, 4) }
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

  // ── Case 1: predicted up, actual down (reversal) ─────────────────────────
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

  // ── Case 2: predicted up, actual flat (stalled) ──────────────────────────
  if (pred.predictedDirection === 'up' && actual === 'flat') {
    let rootCause = ''
    let fix = ''
    if (isOverbought) {
      rootCause = `RSI${rsiVal}超买，上涨动能衰竭进入横盘，多头力量不足以推动继续上涨。`
      fix = 'RSI>70时即使均线多头排列，也需下调置信度15-20%。'
    } else if (isMomentumStrong) {
      rootCause = `5日累涨${momVal}%，前期涨幅过大后市场进入消化期，短期获利了结与买盘力量均衡。`
      fix = '5日涨幅>4%时，次日预测应自动降为震荡，给市场消化时间。'
    } else {
      rootCause = `技术面偏多(${pred.technicalScore}分)但市场缺乏新催化剂，上涨动力不足，多空力量暂时均衡。`
      fix = '综合得分在55-65时降低看涨判定标准，避免在边缘区域生成过度乐观信号。'
    }
    return `❌ 预测偏多→实际${degree}横盘（${mag > 0 ? '+' : ''}${changeP.toFixed(1)}%）。归因：${rootCause}修正：${fix}`
  }

  // ── Case 3: predicted down, actual up (reversal) ─────────────────────────
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

  // ── Case 4: predicted down, actual flat (stalled) ────────────────────────
  if (pred.predictedDirection === 'down' && actual === 'flat') {
    let rootCause = ''
    let fix = ''
    if (isOversold) {
      rootCause = `RSI${rsiVal}深度超卖，但抄底资金介入形成支撑，多空力量在低位均衡，未继续下跌。`
      fix = 'RSI<30时看跌预测自动降为震荡，超卖区间的下跌空间有限。'
    } else {
      rootCause = `技术面偏空(${pred.technicalScore}分)但市场抛压不重，${pred.macroScore > 50 ? '宏观偏多提供支撑' : '缺乏新的利空催化剂'}，价格在当前位置获得支撑。`
      fix = '技术面偏空但宏观不弱时，将看跌置信度削减25%，避免过度悲观。'
    }
    return `❌ 预测偏空→实际${degree}横盘（${changeP >= 0 ? '+' : ''}${changeP.toFixed(1)}%）。归因：${rootCause}修正：${fix}`
  }

  // ── Case 5 & 6: predicted flat, actual up or down ────────────────────────
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
  { ticker: '600036.SS',  name: '招商银行',  type: 'stock',  currency: 'CNY', group: 'portfolio' },
  { ticker: '002142.SZ',  name: '宁波银行',  type: 'stock',  currency: 'CNY', group: 'portfolio' },

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

  // Fetch prices + volumes in parallel grouped by ticker
  const tickers = [...new Set(pending.map(p => p.ticker))]
  const priceMap = new Map<string, { d: string; p: number }[]>()
  await Promise.allSettled(
    tickers.map(async t => {
      const data = await fetchPredictionData(t)
      priceMap.set(t, data.prices)
    })
  )

  let changed = false
  for (const pred of pending) {
    const prices = priceMap.get(pred.ticker) ?? []
    if (prices.length < 2) {
      // Try fetching with a longer range for stubborn tickers
      const retry = await fetchPredictionPrices(pred.ticker).catch(() => [] as { d: string; p: number }[])
      if (retry.length < 2) continue
    }

    // Use actual prices from the map or retry
    const pts = (priceMap.get(pred.ticker)?.length ?? 0) >= 2
      ? (priceMap.get(pred.ticker) ?? [])
      : (await fetchPredictionPrices(pred.ticker).catch(() => [] as { d: string; p: number }[]))

    if (pts.length < 2) continue

    // Prefer exact date match, then closest after, then most recent
    const exact = pts.find(p => p.d === pred.targetDate)
    const after = pts.filter(p => p.d > pred.targetDate).sort((a, b) => a.d.localeCompare(b.d))[0]
    const last = pts[pts.length - 1]
    const pt = exact || after || last
    if (!pt) continue

    // Relaxed: allow up to 10 days distance for review (was 5)
    const distDays = Math.abs(new Date(pt.d).getTime() - new Date(pred.targetDate).getTime()) / 86400000
    if (distDays > 10) continue

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
    tickers.map(async t => { priceMap.set(t, await fetchPredictionPrices(t)) })
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

  const [macroScore, vix] = await Promise.all([getMacroScore(), getVIX()])

  // Load self-tuned parameters
  const params = await loadTunedParams()

  // Detect market regime from VIX and recent trend
  const nasdaqData = await fetchPredictionData('^IXIC')
  const nasdaqTech = nasdaqData.prices.length >= 14 ? calcTechnicals(nasdaqData.prices, nasdaqData.volumes, vix) : null
  const trendStrength = nasdaqTech ? nasdaqTech.bullPct - 50 : 0
  const regime = detectRegime(vix, trendStrength)
  const regimeAdj = applyRegimeAdjustments(params, regime)

  // Fetch all prices + volumes in parallel
  const priceResults = new Map<string, { prices: { d: string; p: number }[]; volumes: number[] }>()
  await Promise.allSettled(
    TRACKED.map(async asset => {
      priceResults.set(asset.ticker, await fetchPredictionData(asset.ticker))
    })
  )

  const newPreds: DailyPrediction[] = []

  for (const asset of TRACKED) {
    const result = priceResults.get(asset.ticker)
    const prices = result?.prices ?? []
    const volumes = result?.volumes ?? []
    if (!prices.length) continue
    const tech = calcTechnicals(prices, volumes, vix)
    if (!tech) continue

    // ── Guard rails: prevent known failure patterns ──────────────────────────
    let adjustedBullPct = tech.bullPct
    let forceDir: PredDir | null = null

    // Guard 1: RSI deep overbought (>75) + positive momentum → force flat/down
    if (tech.rsi > 75 && tech.mom5 > 0) {
      const penalty = Math.round((tech.rsi - 70) * 1.2)
      adjustedBullPct = Math.max(35, adjustedBullPct - penalty)
    } else if (tech.rsi > 72) {
      adjustedBullPct = Math.max(40, adjustedBullPct - Math.round((tech.rsi - 70) * 0.8))
    }

    // Guard 2: RSI deep oversold (<28) → force flat/up (mean reversion)
    if (tech.rsi < 28 && tech.mom5 < 0) {
      adjustedBullPct = Math.min(60, adjustedBullPct + 15)
    } else if (tech.rsi < 30) {
      adjustedBullPct = Math.min(55, adjustedBullPct + 8)
    }

    // Guard 3: Extreme momentum exhaustion — almost certain to reverse
    if (tech.mom5 > 6) {
      forceDir = 'flat'
    } else if (tech.mom5 > 4.5 && tech.rsi > 62) {
      adjustedBullPct = Math.max(40, adjustedBullPct - 15)
    } else if (tech.mom5 < -6) {
      forceDir = 'flat'
    } else if (tech.mom5 < -4.5 && tech.rsi < 40) {
      adjustedBullPct = Math.min(60, adjustedBullPct + 15)
    }

    // Guard 4: Volume surge without clear direction → high uncertainty, reduce score
    if (tech.volSurging && !tech.volConfirmsPrice) {
      adjustedBullPct = 50 + Math.round((adjustedBullPct - 50) * 0.6)
    }

    // Guard 5: VIX > 28 → fear dominates, cap bullish signals
    if (tech.vixHigh && adjustedBullPct > 55) {
      adjustedBullPct = Math.max(50, adjustedBullPct - 10)
    }

    // Guard 6: Fighting macro trend — predicting down while macro > 58
    if (adjustedBullPct < 45 && macroScore >= 58) {
      adjustedBullPct = Math.min(52, adjustedBullPct + 10)
    }
    // Predicting up while macro < 38
    if (adjustedBullPct > 55 && macroScore <= 38) {
      adjustedBullPct = Math.max(48, adjustedBullPct - 10)
    }

    // Guard 7: Near strong support (<1% away) → don't short
    if (tech.distFromSupport < 1 && adjustedBullPct < 45) {
      adjustedBullPct = Math.max(45, adjustedBullPct + 5)
    }
    // Near strong resistance (<1% away) → don't buy
    if (tech.distFromResist < 1 && adjustedBullPct > 55) {
      adjustedBullPct = Math.min(55, adjustedBullPct - 5)
    }

    // ── Normalize adjusted score to 0-100 range ────────────────────────────
    adjustedBullPct = Math.max(10, Math.min(90, adjustedBullPct))

    const techW = regimeAdj.techWeight
    const macroW = 1 - techW
    const combined = Math.round(adjustedBullPct * techW + macroScore * macroW)

    // Widen flat zone: 58-42 (was 55-45)
    const bullThresh = Math.max(58, params.bullThreshold)
    const bearThresh = Math.min(42, params.bearThreshold)
    const dir: PredDir = forceDir ?? (
      combined > bullThresh ? 'up' :
      combined < bearThresh ? 'down' : 'flat'
    )

    const rawConfidence = Math.round(Math.abs(combined - 50) * params.confidenceScale + params.confidenceBase)
    const confidence = Math.min(params.maxConfidence, rawConfidence) + (regimeAdj.confidenceAdjust)

    // Volatility-adjusted target range
    const rsiVol = tech.rsi > 72 || tech.rsi < 28 ? 1.5 : tech.rsi > 62 || tech.rsi < 38 ? 1.25 : 1.0
    const vixVol = tech.vixHigh ? 1.3 : tech.vixElevated ? 1.1 : 1.0
    const volatilityMultiplier = Math.max(rsiVol, vixVol)
    const bias = dir === 'up' ? 0.004 : dir === 'down' ? -0.004 : 0
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
      targetLow:  +(center - tech.atrAbs * 0.9 * volatilityMultiplier).toFixed(2),
      targetHigh: +(center + tech.atrAbs * 0.9 * volatilityMultiplier).toFixed(2),
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
