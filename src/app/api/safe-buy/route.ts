import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { logPrediction } from '@/lib/review-store'
import { getStockFundamentals } from '@/lib/fundamentals'

export const dynamic = 'force-dynamic'
const execAsync = promisify(exec)

// ─── Types ────────────────────────────────────────────────────────────────────
interface PricePoint { d: string; p: number }

interface MethodResult {
  price: number
  weight: number
  probability: number
  label: string
  detail: string
}

interface SafeBuyResult {
  ticker: string
  name: string
  type: 'gold' | 'index' | 'stock' | 'etf'
  currency: string
  currentPrice: number
  safeBuyPrice: number
  discountPct: number
  safetyProbability: number
  currentSafety: number           // safety probability if buying at CURRENT price (0-100)
  currentSafetyReasoning: string  // explanation for current price safety
  methods: MethodResult[]
  reasoning: string
  backtest: {
    accuracy3m: number
    accuracy6m: number
    accuracy12m: number
    samples: number
  }
}

// ─── Tracked assets ───────────────────────────────────────────────────────────
interface TrackedAsset {
  ticker: string
  yfTicker: string
  name: string
  type: SafeBuyResult['type']
  currency: string
  forwardPE?: number | null
  revenueGrowthPct?: number | null
}

const ASSETS: TrackedAsset[] = [
  // Gold
  { ticker: 'GOLD', yfTicker: 'GLD', name: '黄金现货', type: 'gold', currency: 'USD' },
  // Indices
  { ticker: '^IXIC', yfTicker: '^IXIC', name: '纳斯达克', type: 'index', currency: 'USD' },
  { ticker: '000001.SS', yfTicker: '000001.SS', name: '上证指数', type: 'index', currency: 'CNY' },
  { ticker: '^HSI', yfTicker: '^HSI', name: '恒生指数', type: 'index', currency: 'HKD' },
  // Portfolio stocks
  { ticker: 'NVDA', yfTicker: 'NVDA', name: '英伟达', type: 'stock', currency: 'USD', forwardPE: 28, revenueGrowthPct: 65 },
  { ticker: '0700.HK', yfTicker: '0700.HK', name: '腾讯控股', type: 'stock', currency: 'HKD', forwardPE: 18, revenueGrowthPct: 10 },
  { ticker: 'ORCL', yfTicker: 'ORCL', name: '甲骨文', type: 'stock', currency: 'USD', forwardPE: 27, revenueGrowthPct: 12 },
  { ticker: 'PDD', yfTicker: 'PDD', name: '拼多多', type: 'stock', currency: 'USD', forwardPE: 10, revenueGrowthPct: 20 },
  // Sector key stocks
  { ticker: 'AMD', yfTicker: 'AMD', name: 'AMD', type: 'stock', currency: 'USD', forwardPE: 22, revenueGrowthPct: 24 },
  { ticker: 'AVGO', yfTicker: 'AVGO', name: '博通', type: 'stock', currency: 'USD', forwardPE: 24, revenueGrowthPct: 44 },
  { ticker: 'MSFT', yfTicker: 'MSFT', name: '微软', type: 'stock', currency: 'USD', forwardPE: 31, revenueGrowthPct: 17 },
  { ticker: 'META', yfTicker: 'META', name: 'Meta', type: 'stock', currency: 'USD', forwardPE: 22, revenueGrowthPct: 16 },
  { ticker: 'TSLA', yfTicker: 'TSLA', name: '特斯拉', type: 'stock', currency: 'USD', forwardPE: 88, revenueGrowthPct: -1 },
  { ticker: 'CEG', yfTicker: 'CEG', name: 'Constellation Energy', type: 'stock', currency: 'USD', forwardPE: 19, revenueGrowthPct: 6 },
  { ticker: 'IONQ', yfTicker: 'IONQ', name: 'IonQ', type: 'stock', currency: 'USD', forwardPE: null, revenueGrowthPct: 95 },
  { ticker: 'LLY', yfTicker: 'LLY', name: '礼来', type: 'stock', currency: 'USD', forwardPE: 30, revenueGrowthPct: 32 },
  { ticker: 'NIO', yfTicker: 'NIO', name: '蔚来', type: 'stock', currency: 'USD', forwardPE: null, revenueGrowthPct: 18 },
  { ticker: 'XPEV', yfTicker: 'XPEV', name: '小鹏', type: 'stock', currency: 'USD', forwardPE: null, revenueGrowthPct: 35 },
  { ticker: 'VST', yfTicker: 'VST', name: 'Vistra', type: 'stock', currency: 'USD', forwardPE: 14, revenueGrowthPct: 20 },
  // ETFs
  { ticker: 'QQQ', yfTicker: 'QQQ', name: '纳指100 ETF', type: 'etf', currency: 'USD' },
  { ticker: 'KWEB', yfTicker: 'KWEB', name: '中概互联ETF', type: 'etf', currency: 'USD' },
  { ticker: 'SMH', yfTicker: 'SMH', name: '半导体ETF', type: 'etf', currency: 'USD' },
  { ticker: 'ARKK', yfTicker: 'ARKK', name: '创新成长ETF', type: 'etf', currency: 'USD' },
]

// ─── Yahoo Finance price fetch ─────────────────────────────────────────────────
async function fetchPrices(ticker: string, range: string): Promise<PricePoint[]> {
  const enc = encodeURIComponent(ticker)
  for (const host of ['query2', 'query1']) {
    const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${enc}?range=${range}&interval=1d&includePrePost=false`
    try {
      const { stdout } = await execAsync(
        `curl -s --max-time 12 -H "User-Agent: Mozilla/5.0" "${url}"`
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
      if (pts.length > 20) return pts
    } catch { /* try next host */ }
  }
  return []
}

// ─── Statistical helpers ───────────────────────────────────────────────────────
function mean(arr: number[]): number { return arr.reduce((a, b) => a + b, 0) / arr.length }
function std(arr: number[]): number {
  const m = mean(arr)
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1))
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.ceil(p / 100 * sorted.length) - 1
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))]
}

// ─── Method 1: Bollinger Band Statistical Support ──────────────────────────────
function calcBollingerSafe(prices: PricePoint[]): MethodResult | null {
  const vals = prices.map(p => p.p)
  if (vals.length < 20) return null

  const recent20 = vals.slice(-20)
  const sma20 = mean(recent20)
  const sigma = std(recent20)
  const lower2Sigma = sma20 - 2.0 * sigma
  const safePrice = lower2Sigma * 0.97 // additional 3% safety margin

  // Probability: based on normal dist, ~95.4% above 2σ, but financial data has fat tails
  // Use a more conservative estimate: ~90% for 2σ lower band + 3% extra margin = ~93%
  const baseProb = 90
  const extraMargin = Math.max(0, (vals[vals.length - 1] - safePrice) / vals[vals.length - 1] * 100)
  const prob = Math.min(95, baseProb + extraMargin * 0.5)

  const detail = `布林带下轨(2σ): $${lower2Sigma.toFixed(0)}，外加3%安全边际 → $${safePrice.toFixed(0)}。统计上约${Math.round(prob)}%的价格在此之上。`

  return { price: +safePrice.toFixed(2), weight: 0.35, probability: +prob.toFixed(1), label: '布林带统计支撑', detail }
}

// ─── Method 2: Historical Drawdown Analysis ────────────────────────────────────
function calcDrawdownSafe(prices: PricePoint[]): MethodResult | null {
  const vals = prices.map(p => p.p)
  if (vals.length < 60) return null

  // Find all major drawdowns (>5%) from rolling peaks
  const drawdowns: number[] = []
  let peak = vals[0]
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] > peak) {
      peak = vals[i]
    } else {
      const dd = (peak - vals[i]) / peak
      if (dd > 0.05) drawdowns.push(dd)
    }
  }

  if (drawdowns.length < 3) {
    // fallback: use 52-week range
    const maxVal = Math.max(...vals)
    const minVal = Math.min(...vals)
    const range = (maxVal - minVal) / maxVal
    const safePrice = vals[vals.length - 1] * (1 - range * 0.6)
    return {
      price: +safePrice.toFixed(2),
      weight: 0.30,
      probability: 85,
      label: '历史波动区间支撑',
      detail: `52周波动区间幅度约${(range * 100).toFixed(0)}%，取其60%作为安全边际。历史跌幅在此范围内的概率约85%。`,
    }
  }

  // Use the 80th percentile of drawdowns as the "typical major drawdown" level
  const typicalDD = percentile(drawdowns, 80)
  // Safe buy = current price - typical major drawdown * 0.7 (conservative, use 70% of historical)
  const currentPrice = vals[vals.length - 1]
  const safePrice = currentPrice * (1 - typicalDD * 0.7)

  // Probability: what % of drawdowns were smaller than typicalDD * 0.7
  const smallerCount = drawdowns.filter(d => d <= typicalDD * 0.7).length
  const prob = Math.min(95, Math.round(smallerCount / drawdowns.length * 100))

  const detail = `历史重大回撤80分位: ${(typicalDD * 100).toFixed(1)}%，取70%作为安全缓冲 → $${safePrice.toFixed(0)}。${drawdowns.length}次回撤样本中${prob}%在此范围内。`

  return { price: +safePrice.toFixed(2), weight: 0.30, probability: prob, label: '历史回撤支撑', detail }
}

// ─── Method 3: RSI-Normalized Fair Price ───────────────────────────────────────
function calcRsiSafe(prices: PricePoint[]): MethodResult | null {
  const vals = prices.map(p => p.p)
  if (vals.length < 14) return null

  // Calculate RSI(14)
  const period = 14
  let gains = 0, losses = 0
  for (let i = vals.length - period; i < vals.length; i++) {
    const d = vals[i] - vals[i - 1]
    if (d > 0) gains += d; else losses += Math.abs(d)
  }
  const avgG = gains / period; const avgL = losses / period
  const rsi = avgL === 0 ? 100 : +(100 - 100 / (1 + avgG / avgL)).toFixed(1)

  // Calculate average daily range (volatility proxy)
  const dailyChanges = vals.slice(-20).map((v, i, arr) => i > 0 ? Math.abs(v - arr[i - 1]) / arr[i - 1] : 0).filter(c => c > 0)
  const avgDailyVol = dailyChanges.length > 0 ? mean(dailyChanges) : 0.015

  // RSI target: 30 (classic oversold buy zone)
  // If RSI is high (>60), the safe buy price needs to be significantly lower
  // If RSI is already low (<40), the safe buy is close to current price
  const rsiExcess = Math.max(0, rsi - 30)
  const volAdjustment = rsiExcess / 100 * avgDailyVol * 12 // scale to ~3 months of daily moves
  const safePrice = vals[vals.length - 1] * (1 - volAdjustment)

  // Probability based on RSI mean-reversion tendency
  // RSI >70: ~90% probability it will come down (safe buy requires bigger drop)
  // RSI 50-70: ~80% probability
  // RSI 30-50: ~65% (less room to fall, closer to safe buy)
  // RSI <30: ~95% (already at safe buy or below)
  const prob = rsi > 70 ? 92 : rsi > 50 ? 80 : rsi > 30 ? 68 : 93

  const detail = `当前RSI(14)=${rsi}，日均波幅${(avgDailyVol * 100).toFixed(2)}%。为回到RSI=30买入区域，需回调约${(volAdjustment * 100).toFixed(1)}% → $${safePrice.toFixed(0)}。`

  return { price: +safePrice.toFixed(2), weight: 0.15, probability: +prob.toFixed(1), label: 'RSI标准化价格', detail }
}

// ─── Method 4: Valuation-Based Floor (stocks with fundamentals) ────────────────
function calcValuationSafe(asset: TrackedAsset, currentPrice: number): MethodResult | null {
  if (asset.type === 'gold' || asset.type === 'index' || asset.type === 'etf') return null
  if (!asset.forwardPE && !asset.revenueGrowthPct) return null

  // For stocks with fundamentals, use a grading approach
  const pe = asset.forwardPE ?? null
  const growth = asset.revenueGrowthPct ?? null

  let fairPe: number
  let prob: number
  let detail: string

  if (pe && growth) {
    // PEG-based fair PE: PEG of 1.0 is fair value
    // Fair PE = growth rate * 1.0 (PEG=1)
    const growthPct = Math.max(5, Math.min(growth, 60)) // cap at 5-60%
    fairPe = growthPct * 1.0

    if (pe < fairPe * 0.8) {
      // Currently undervalued
      const safePrice = currentPrice * 0.92 // small discount, already cheap
      prob = 92
      detail = `当前PE ${pe}x 已低于公平PE ${fairPe.toFixed(0)}x（基于${growth}%增速），估值已有安全边际。安全买价=现价×0.92 → $${safePrice.toFixed(0)}。`
      return { price: +safePrice.toFixed(2), weight: 0.20, probability: prob, label: '估值支撑', detail }
    } else if (pe < fairPe * 1.3) {
      // Fairly valued
      const safePrice = currentPrice * (fairPe / pe) * 0.90
      prob = 85
      detail = `当前PE ${pe}x，公平PE约${fairPe.toFixed(0)}x（PEG=1）。回归公平估值需回调${((1 - fairPe / pe) * 100).toFixed(0)}%，再打9折 → $${safePrice.toFixed(0)}。`
      return { price: +safePrice.toFixed(2), weight: 0.20, probability: prob, label: '估值回归支撑', detail }
    } else {
      // Overvalued
      const safePrice = currentPrice * (fairPe / pe) * 0.85
      prob = Math.max(60, Math.round(100 - (pe / fairPe - 1) * 40))
      detail = `当前PE ${pe}x 显著高于公平PE ${fairPe.toFixed(0)}x（溢价${((pe / fairPe - 1) * 100).toFixed(0)}%）。回到公平估值再打85折 → $${safePrice.toFixed(0)}。安全概率${prob}%。`
      return { price: +safePrice.toFixed(2), weight: 0.20, probability: prob, label: '估值回归支撑', detail }
    }
  }

  if (pe && !growth) {
    fairPe = 15 // default fair PE
    if (pe < fairPe) {
      return { price: +(currentPrice * 0.90).toFixed(2), weight: 0.20, probability: 88, label: '估值支撑',
        detail: `当前PE ${pe}x 低于市场平均15x，已有安全边际。安全买价=现价×0.90。` }
    }
    const safePrice = currentPrice * (fairPe / pe) * 0.85
    return { price: +safePrice.toFixed(2), weight: 0.20, probability: 78, label: '估值回归支撑',
      detail: `当前PE ${pe}x，回归15x公平PE需${((1 - fairPe / pe) * 100).toFixed(0)}%回调，再打85折 → $${safePrice.toFixed(0)}。` }
  }

  return null
}

// ─── Method 5 (Gold specific): Macro-Fair Value ────────────────────────────────
function calcGoldMacroFair(prices: PricePoint[]): MethodResult | null {
  const vals = prices.map(p => p.p)
  if (vals.length < 24) return null

  // For gold, use SMA24 (2-year trend) as fair value reference
  // Gold tends to mean-revert to its 2-year moving average
  const sma24 = mean(vals.slice(-24))
  const currentPrice = vals[vals.length - 1]

  // Safe buy = SMA24 * 0.92 (buy below 2-year trend)
  const safePrice = sma24 * 0.92

  // Probability: check historical % of time price was above SMA24*0.92
  let aboveCount = 0
  for (let i = 24; i < vals.length; i++) {
    const sma = mean(vals.slice(i - 24, i))
    if (vals[i] > sma * 0.92) aboveCount++
  }
  const prob = vals.length > 24 ? Math.round(aboveCount / (vals.length - 24) * 100) : 85

  const premium = ((currentPrice / safePrice - 1) * 100).toFixed(0)
  const detail = `2年均线 $${sma24.toFixed(0)}，作为黄金长期公允价值参考。安全买价=2年均线×0.92 → $${safePrice.toFixed(0)}（现价溢价${premium}%）。`

  return { price: +safePrice.toFixed(2), weight: 0.20, probability: Math.min(95, prob), label: '均线公允价值', detail }
}

// ─── Current Price Safety Assessment ──────────────────────────────────────────
function calcCurrentPriceSafety(
  prices: PricePoint[],
  asset: TrackedAsset,
  currentPrice: number,
): { safety: number; reasoning: string } {
  const vals = prices.map(p => p.p)
  if (vals.length < 14) return { safety: 50, reasoning: '数据不足，默认中性评估' }

  const factors: { label: string; score: number; detail: string }[] = []

  // Factor 1: Bollinger Band position (weight 0.30)
  const recent20 = vals.slice(-20)
  const sma20 = mean(recent20)
  const sigma = std(recent20)
  const zScore = sigma > 0 ? (currentPrice - sma20) / sigma : 0
  let bollScore: number
  let bollDetail: string
  if (zScore < -2) {
    bollScore = 92
    bollDetail = `价格在布林下轨以下(${zScore.toFixed(1)}σ)，极度超卖，当前买入安全概率高`
  } else if (zScore < -1) {
    bollScore = 78
    bollDetail = `价格在布林下轨附近(${zScore.toFixed(1)}σ)，偏低位，买入安全性较好`
  } else if (zScore < 0) {
    bollScore = 62
    bollDetail = `价格在均线下方(${zScore.toFixed(1)}σ)，中性偏低位`
  } else if (zScore < 1) {
    bollScore = 48
    bollDetail = `价格在均线上方(${zScore.toFixed(1)}σ)，中性偏高位，追高有回调风险`
  } else if (zScore < 2) {
    bollScore = 32
    bollDetail = `价格接近布林上轨(${zScore.toFixed(1)}σ)，偏高，买入安全概率较低`
  } else {
    bollScore = 18
    bollDetail = `价格突破布林上轨(${zScore.toFixed(1)}σ)，极度超买，追高风险极大`
  }
  factors.push({ label: '布林带位置', score: bollScore, detail: bollDetail })

  // Factor 2: RSI assessment (weight 0.25)
  const period = 14
  let gains = 0, losses = 0
  for (let i = vals.length - period; i < vals.length; i++) {
    const d = vals[i] - vals[i - 1]
    if (d > 0) gains += d; else losses += Math.abs(d)
  }
  const rsi = losses === 0 ? 100 : +(100 - 100 / (1 + (gains / period) / (losses / period || 0.001))).toFixed(1)
  let rsiScore: number
  let rsiDetail: string
  if (rsi < 25) {
    rsiScore = 88
    rsiDetail = `RSI=${rsi} 深度超卖，统计上反弹概率高，当前买入安全性较好`
  } else if (rsi < 35) {
    rsiScore = 74
    rsiDetail = `RSI=${rsi} 超卖区间，历史均值回归倾向强`
  } else if (rsi < 50) {
    rsiScore = 58
    rsiDetail = `RSI=${rsi} 中性偏低，无过热风险`
  } else if (rsi < 65) {
    rsiScore = 45
    rsiDetail = `RSI=${rsi} 中性偏高，有一定回调压力`
  } else if (rsi < 80) {
    rsiScore = 30
    rsiDetail = `RSI=${rsi} 超买区间，回调概率较高，当前买入风险偏大`
  } else {
    rsiScore = 15
    rsiDetail = `RSI=${rsi} 极度超买，均值回归压力很大，追高危险`
  }
  factors.push({ label: 'RSI动量', score: rsiScore, detail: rsiDetail })

  // Factor 3: Drawdown from recent high (weight 0.25)
  const maxIdx = vals.length >= 60 ? 60 : vals.length
  const recentMax = Math.max(...vals.slice(-maxIdx))
  const drawdownPct = ((recentMax - currentPrice) / recentMax) * 100
  let ddScore: number
  let ddDetail: string
  if (drawdownPct > 20) {
    ddScore = 85
    ddDetail = `距近期高点已回调${drawdownPct.toFixed(0)}%，深度回调后安全边际充足`
  } else if (drawdownPct > 10) {
    ddScore = 72
    ddDetail = `距近期高点回调${drawdownPct.toFixed(0)}%，有一定安全边际`
  } else if (drawdownPct > 5) {
    ddScore = 55
    ddDetail = `距近期高点回调${drawdownPct.toFixed(0)}%，小幅回调，安全边际一般`
  } else if (drawdownPct > 2) {
    ddScore = 40
    ddDetail = `距近期高点仅${drawdownPct.toFixed(0)}%，接近高位，回调风险存在`
  } else {
    ddScore = 25
    ddDetail = '价格在近期高位附近，追高风险较大'
  }
  factors.push({ label: '回撤位置', score: ddScore, detail: ddDetail })

  // Factor 4: Valuation (weight 0.20, stocks only; for gold/index use momentum instead)
  if (asset.type === 'stock' && asset.forwardPE) {
    const pe = asset.forwardPE
    const growth = asset.revenueGrowthPct ?? 10
    const fairPe = Math.max(5, Math.min(growth, 60)) * 1.0 // PEG=1 fair PE
    let valScore: number
    let valDetail: string
    if (pe < fairPe * 0.7) {
      valScore = 88
      valDetail = `PE ${pe}x 远低于公平PE ${fairPe.toFixed(0)}x，估值有充足安全边际`
    } else if (pe < fairPe) {
      valScore = 70
      valDetail = `PE ${pe}x 低于公平PE ${fairPe.toFixed(0)}x，估值合理偏低`
    } else if (pe < fairPe * 1.3) {
      valScore = 52
      valDetail = `PE ${pe}x 略高于公平PE ${fairPe.toFixed(0)}x，估值中性`
    } else if (pe < fairPe * 2) {
      valScore = 35
      valDetail = `PE ${pe}x 明显高于公平PE ${fairPe.toFixed(0)}x，估值偏贵，溢价风险`
    } else {
      valScore = 18
      valDetail = `PE ${pe}x 远超公平PE ${fairPe.toFixed(0)}x，估值泡沫风险，买入安全概率低`
    }
    factors.push({ label: '估值水平', score: valScore, detail: valDetail })
  } else if (asset.type === 'gold') {
    // Gold: premium to 2Y SMA
    const sma24 = vals.length >= 24 ? mean(vals.slice(-24)) : sma20
    const premium = ((currentPrice - sma24) / sma24) * 100
    let goldScore: number
    let goldDetail: string
    if (premium < 0) {
      goldScore = 82
      goldDetail = `金价低于2年均线${Math.abs(premium).toFixed(0)}%，相对低估，买入安全性较高`
    } else if (premium < 10) {
      goldScore = 60
      goldDetail = `金价高于2年均线${premium.toFixed(0)}%，温和溢价，安全性中等`
    } else if (premium < 20) {
      goldScore = 45
      goldDetail = `金价高于2年均线${premium.toFixed(0)}%，溢价扩大，买入安全概率降低`
    } else {
      goldScore = 28
      goldDetail = `金价高于2年均线${premium.toFixed(0)}%，高溢价区间，追高风险显著`
    }
    factors.push({ label: '黄金溢价', score: goldScore, detail: goldDetail })
  } else {
    // Index/ETF: use 5-day momentum as the 4th factor
    const mom5 = vals.length >= 6 ? ((vals[vals.length - 1] / vals[vals.length - 6] - 1) * 100) : 0
    let momScore: number
    let momDetail: string
    if (mom5 < -5) {
      momScore = 78; momDetail = `5日动量${mom5.toFixed(1)}%，短期超跌，反弹概率较高`
    } else if (mom5 < -2) {
      momScore = 62; momDetail = `5日动量${mom5.toFixed(1)}%，温和下跌，有一定反弹动力`
    } else if (mom5 < 2) {
      momScore = 50; momDetail = `5日动量${mom5.toFixed(1)}%，横盘整理`
    } else if (mom5 < 5) {
      momScore = 38; momDetail = `5日动量+${mom5.toFixed(1)}%，短期涨幅温和，追高性价比一般`
    } else {
      momScore = 22; momDetail = `5日动量+${mom5.toFixed(1)}%，短期涨幅过大，追高风险高`
    }
    factors.push({ label: '短期动量', score: momScore, detail: momDetail })
  }

  // Weighted composite
  const weights = [0.30, 0.25, 0.25, 0.20]
  const totalW = weights.reduce((s, w) => s + w, 0)
  const safety = factors.reduce((s, f, i) => s + f.score * weights[i], 0) / totalW

  // Build reasoning
  const bestFactor = factors.reduce((best, f) => f.score > best.score ? f : best, factors[0])
  const worstFactor = factors.reduce((worst, f) => f.score < worst.score ? f : worst, factors[0])
  const reasoning = factors.map(f => `${f.label}: ${f.score}分（${f.detail}）`).join('；') +
    `。综合评分${safety.toFixed(0)}分，${safety >= 70 ? '当前价位有一定安全边际' : safety >= 50 ? '当前价位安全边际一般' : '当前价位风险偏高，建议等待回调'}。` +
    `最强支撑：${bestFactor.label}(${bestFactor.score}分)；最大风险：${worstFactor.label}(${worstFactor.score}分)。`

  return { safety: +safety.toFixed(1), reasoning }
}
function computeComposite(
  methods: MethodResult[],
  assetType: SafeBuyResult['type'],
): { safePrice: number; safetyProb: number; reasoning: string } {
  const valid = methods.filter(m => m.price > 0 && !isNaN(m.price) && m.price < 1e9)
  if (valid.length === 0) return { safePrice: 0, safetyProb: 50, reasoning: '数据不足，无法计算' }

  const totalWeight = valid.reduce((s, m) => s + m.weight, 0)
  const safePrice = valid.reduce((s, m) => s + m.price * m.weight, 0) / totalWeight
  const safetyProb = valid.reduce((s, m) => s + m.probability * m.weight, 0) / totalWeight

  // Build reasoning text
  const methodNames = valid.map(m => m.label).join(' + ')
  const probDesc = safetyProb >= 90 ? '极高安全性' : safetyProb >= 80 ? '高安全性' : safetyProb >= 70 ? '中等安全性' : '偏低安全性'

  const reasoning = `${probDesc}（${safetyProb.toFixed(0)}%概率买入安全）。综合${valid.length}种方法：${methodNames}，加权计算得安全买入价。`

  return { safePrice: +safePrice.toFixed(2), safetyProb: +safetyProb.toFixed(1), reasoning }
}

// ─── Backtest ──────────────────────────────────────────────────────────────────
function backtest(prices: PricePoint[], methods: MethodResult[], assetType: SafeBuyResult['type']): { accuracy3m: number; accuracy6m: number; accuracy12m: number; samples: number } {
  const vals = prices.map(p => p.p)
  if (vals.length < 80) {
    // Need at least ~1 year of daily data for meaningful backtest
    return { accuracy3m: 0, accuracy6m: 0, accuracy12m: 0, samples: 0 }
  }

  // Walk through historical data, at each point calculate the safe buy price
  // Then check if buying at that hypothetical price would have been profitable
  // We simulate knowing only data up to that point
  const minWindow = 40 // minimum data points needed for calculation (Bollinger needs 20, RSI needs 14, etc.)
  const horizon3m = 63  // ~63 trading days in 3 months
  const horizon6m = 126
  const horizon12m = 252

  let correct3m = 0, correct6m = 0, correct12m = 0, samples = 0

  for (let i = minWindow; i < vals.length - horizon12m; i += 5) {
    // Simulate the state at time i
    const pastPrices = prices.slice(0, i + 1).map((pt, idx) => ({ d: pt.d, p: vals[idx] }))

    // Calculate safe buy using the methods that would have been available then
    const bollinger = calcBollingerSafe(pastPrices)
    const drawdown = calcDrawdownSafe(pastPrices)
    const rsi = calcRsiSafe(pastPrices)

    const histMethods: MethodResult[] = [bollinger, drawdown, rsi].filter(Boolean) as MethodResult[]
    if (assetType === 'gold') {
      const goldMacro = calcGoldMacroFair(pastPrices)
      if (goldMacro) histMethods.push(goldMacro)
    }

    if (histMethods.length < 2) continue

    const totalW = histMethods.reduce((s, m) => s + m.weight, 0)
    const safeBuy = histMethods.reduce((s, m) => s + m.price * m.weight, 0) / totalW

    // The "safe buy" only triggers if current price <= safeBuy (i.e., price has dropped to safe level)
    // But for backtesting purposes, we want to know: if someone bought at the safe buy price,
    // would they have been profitable? We check if the price ever reached the safe buy level
    // within the next month, and if so, whether holding from that point was profitable.

    // Simplified: assume buy happens when price reaches or is below safeBuy
    // Check future returns from that entry point
    const futureVals = vals.slice(i + 1)

    // Find the first point where price <= safeBuy (within next 20 days)
    let entryIdx = -1
    for (let j = 0; j < Math.min(20, futureVals.length); j++) {
      if (futureVals[j] <= safeBuy) {
        entryIdx = j
        break
      }
    }
    if (entryIdx === -1) continue // safe buy was never triggered, skip this sample

    const entryPrice = Math.min(futureVals[entryIdx], safeBuy) // actual entry at or below safe buy
    const remainingVals = futureVals.slice(entryIdx + 1)

    // Check each horizon
    if (remainingVals.length > horizon3m) {
      if (remainingVals[horizon3m - 1] > entryPrice) correct3m++
    }
    if (remainingVals.length > horizon6m) {
      if (remainingVals[horizon6m - 1] > entryPrice) correct6m++
    }
    if (remainingVals.length > horizon12m) {
      if (remainingVals[horizon12m - 1] > entryPrice) correct12m++
    }
    samples++
  }

  return {
    accuracy3m: samples > 0 ? Math.round(correct3m / samples * 100) : 0,
    accuracy6m: samples > 0 ? Math.round(correct6m / samples * 100) : 0,
    accuracy12m: samples > 0 ? Math.round(correct12m / samples * 100) : 0,
    samples,
  }
}

// ─── GET handler ───────────────────────────────────────────────────────────────
export async function GET() {
  const results: SafeBuyResult[] = []

  // Fetch all prices in parallel
  const priceResults = new Map<string, PricePoint[]>()
  await Promise.allSettled(
    ASSETS.map(async (asset) => {
      // Gold and indices use 2Y for better SMA/backtest; stocks use 1Y
      const range = asset.type === 'gold' || asset.type === 'index' ? '2y' : '1y'
      const prices = await fetchPrices(asset.yfTicker, range)
      priceResults.set(asset.ticker, prices)
    })
  )

  // GLD ETF → approximate gold spot (USD/oz): 1 GLD share ≈ 0.094 troy ounces
  const GLD_TO_OUNCE = 1 / 0.094  // ≈ 10.64

  for (const asset of ASSETS) {
    let prices = priceResults.get(asset.ticker) ?? []

    // Convert GLD prices to approximate USD/oz for display
    if (asset.ticker === 'GOLD') {
      prices = prices.map(pt => ({ d: pt.d, p: +(pt.p * GLD_TO_OUNCE).toFixed(2) }))
    }

    if (prices.length < 14) {
      // Insufficient data — still include with partial analysis
      if (prices.length >= 2) {
        const currentPrice = prices[prices.length - 1].p
        results.push({
          ticker: asset.ticker,
          name: asset.name,
          type: asset.type,
          currency: asset.currency,
          currentPrice: +currentPrice.toFixed(2),
          safeBuyPrice: +(currentPrice * 0.90).toFixed(2),
          discountPct: 10,
          safetyProbability: 60,
          currentSafety: 50,
          currentSafetyReasoning: '历史数据不足，默认中性评估',
          methods: [{ price: +(currentPrice * 0.90).toFixed(2), weight: 1, probability: 60, label: '数据不足估算', detail: '历史数据不足，使用默认10%安全边际估算。' }],
          reasoning: '历史数据不足（<14个交易日），使用保守的10%折扣价作为临时安全买入参考。',
          backtest: { accuracy3m: 0, accuracy6m: 0, accuracy12m: 0, samples: 0 },
        })
      }
      continue
    }

    const currentPrice = prices[prices.length - 1].p

    // Calculate all applicable methods
    const methods: MethodResult[] = []
    const bollinger = calcBollingerSafe(prices)
    if (bollinger) methods.push(bollinger)

    const drawdown = calcDrawdownSafe(prices)
    if (drawdown) methods.push(drawdown)

    const rsi = calcRsiSafe(prices)
    if (rsi) methods.push(rsi)

    if (asset.type === 'gold') {
      const goldMacro = calcGoldMacroFair(prices)
      if (goldMacro) methods.push(goldMacro)
      // For gold: redistribute weights
      if (methods.length === 4) {
        methods[0].weight = 0.30 // bollinger
        methods[1].weight = 0.25 // drawdown
        methods[2].weight = 0.25 // gold macro fair
        methods[3].weight = 0.20 // rsi
      }
    } else if (asset.type === 'stock') {
      // Enrich with live fundamentals from data store
      const liveFund = await getStockFundamentals(asset.ticker).catch(() => null)
      if (liveFund) {
        asset.forwardPE = liveFund.forwardPe ?? asset.forwardPE
        asset.revenueGrowthPct = liveFund.revenueGrowthPct ?? asset.revenueGrowthPct
      }
      const valuation = calcValuationSafe(asset, currentPrice)
      if (valuation) methods.push(valuation)
    }

    // Compute composite
    const composite = computeComposite(methods, asset.type)

    // Current price safety assessment
    const currentSafety = calcCurrentPriceSafety(prices, asset, currentPrice)

    // Backtest
    const bt = backtest(prices, methods, asset.type)

    // Discount from current price
    const discountPct = composite.safePrice > 0
      ? +((currentPrice - composite.safePrice) / currentPrice * 100).toFixed(1)
      : 0

    // Adjust probability based on backtest if available
    let finalProb = composite.safetyProb
    if (bt.samples >= 5 && bt.accuracy3m > 0) {
      // Blend model probability with backtest accuracy
      finalProb = +(composite.safetyProb * 0.6 + bt.accuracy3m * 0.4).toFixed(1)
    }

    results.push({
      ticker: asset.ticker,
      name: asset.name,
      type: asset.type,
      currency: asset.currency,
      currentPrice: +currentPrice.toFixed(2),
      safeBuyPrice: composite.safePrice,
      discountPct: Math.max(0, discountPct),
      safetyProbability: +finalProb.toFixed(1),
      currentSafety: currentSafety.safety,
      currentSafetyReasoning: currentSafety.reasoning,
      methods,
      reasoning: composite.reasoning,
      backtest: bt,
    })
  }

  // Auto-log safe buy predictions for review
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  for (const r of results) {
    await logPrediction({
      id: `safebuy_${today.replace(/-/g, '')}_${r.ticker.replace(/[^\w]/g, '')}`,
      type: 'safe_buy',
      ticker: r.ticker,
      name: r.name,
      group: r.type === 'gold' ? 'gold' : r.type === 'index' ? 'index' : r.type === 'etf' ? 'etf' : 'portfolio',
      createdAt: new Date().toISOString(),
      targetDate: tomorrow,
      prediction: {
        direction: (r.discountPct > 8 ? 'down' : r.discountPct > 3 ? 'flat' : 'up') as 'up' | 'down' | 'flat',
        currentPrice: r.currentPrice,
        safeBuyPrice: r.safeBuyPrice,
        currentSafety: r.currentSafety,
        discountPct: r.discountPct,
        safetyProbability: r.safetyProbability,
        methods: r.methods.map(m => m.label),
        reasoning: r.reasoning,
      },
    }).catch(() => { /* non-critical */ })
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    count: results.length,
    results,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
  })
}
