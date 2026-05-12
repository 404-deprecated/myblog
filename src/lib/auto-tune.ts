import { readReviewStore, computeStats, type AccuracyStats } from '@/lib/review-store'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TunedParameters {
  tunedAt: string
  basedOnSamples: number
  overallAccuracy: number

  // Prediction engine
  techWeight: number       // tech vs macro blend (default 0.6)
  macroWeight: number      // 1 - techWeight
  confidenceBase: number   // base confidence (default 52)
  confidenceScale: number  // scale factor (default 2)
  maxConfidence: number    // cap (default 88)

  // SMA windows
  smaFast: number          // fast SMA (default 5)
  smaSlow: number          // slow SMA (default 20)

  // RSI thresholds
  rsiMin: number           // min for bullish (default 45)
  rsiMax: number           // max for bullish (default 72)

  // Direction thresholds
  bullThreshold: number    // combined > this = up (default 55)
  bearThreshold: number    // combined < this = down (default 45)

  // Momentum weights (relative to SMA weights)
  momentumWeight: number   // default 0.15
  rsiWeight: number        // default 0.20

  // Regime-specific adjustments
  regimeAdjustments: {
    bull: { techDelta: number; confDelta: number }
    bear: { techDelta: number; confDelta: number }
    volatile: { techDelta: number; confDelta: number }
    sideways: { techDelta: number; confDelta: number }
  }

  // Method weights for safe-buy
  safeBuyWeights: {
    bollinger: number      // default 0.35
    drawdown: number       // default 0.30
    rsi: number            // default 0.15
    valuation: number      // default 0.20
    goldMacro: number      // default 0.20
  }

  // Performance history
  previousAccuracy: number
  improvement: number
  adjustmentLog: string[]
}

const DEFAULTS: TunedParameters = {
  tunedAt: new Date().toISOString(),
  basedOnSamples: 0,
  overallAccuracy: 0,
  techWeight: 0.60,
  macroWeight: 0.40,
  confidenceBase: 52,
  confidenceScale: 2,
  maxConfidence: 88,
  smaFast: 5,
  smaSlow: 20,
  rsiMin: 45,
  rsiMax: 72,
  bullThreshold: 55,
  bearThreshold: 45,
  momentumWeight: 0.15,
  rsiWeight: 0.20,
  regimeAdjustments: {
    bull: { techDelta: 0, confDelta: -5 },
    bear: { techDelta: 0, confDelta: -10 },
    volatile: { techDelta: -0.05, confDelta: -15 },
    sideways: { techDelta: 0, confDelta: 0 },
  },
  safeBuyWeights: {
    bollinger: 0.35,
    drawdown: 0.30,
    rsi: 0.15,
    valuation: 0.20,
    goldMacro: 0.20,
  },
  previousAccuracy: 0,
  improvement: 0,
  adjustmentLog: [],
}

const TUNE_FILE = join(process.cwd(), 'data', 'tuned-params.json')

// ─── Load/Save ────────────────────────────────────────────────────────────────
export async function loadTunedParams(): Promise<TunedParameters> {
  try {
    const raw = await readFile(TUNE_FILE, 'utf-8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

async function saveTunedParams(params: TunedParameters): Promise<void> {
  const dir = dirname(TUNE_FILE)
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  await writeFile(TUNE_FILE, JSON.stringify(params, null, 2), 'utf-8')
}

// ─── Tuning logic ─────────────────────────────────────────────────────────────
export async function autoTune(): Promise<TunedParameters> {
  const store = await readReviewStore()
  const stats = computeStats(store.records)
  const params = await loadTunedParams()

  // Need minimum sample size for meaningful tuning
  const dailyReviewed = store.records.filter(
    r => r.type === 'daily_price' && r.result !== 'pending'
  )
  if (dailyReviewed.length < 10) {
    return { ...params, adjustmentLog: ['样本不足（<10条已复盘），跳过调参'] }
  }

  const adjustments: string[] = []
  let changed = false
  params.previousAccuracy = stats.accuracy
  params.basedOnSamples = stats.reviewed
  params.overallAccuracy = stats.accuracy

  // ── 1. Direction bias correction ──────────────────────────────────────────
  const upPreds = dailyReviewed.filter(r => r.prediction.direction === 'up')
  const downPreds = dailyReviewed.filter(r => r.prediction.direction === 'down')
  const upAcc = upPreds.length > 3
    ? Math.round(upPreds.filter(r => r.result === 'correct').length / upPreds.length * 100)
    : null
  const downAcc = downPreds.length > 3
    ? Math.round(downPreds.filter(r => r.result === 'correct').length / downPreds.length * 100)
    : null

  // If bullish predictions are significantly more accurate than bearish,
  // the model has a bullish bias — adjust thresholds to be more selective on bulls
  if (upAcc !== null && downAcc !== null) {
    const bias = upAcc - downAcc
    if (bias > 15) {
      // Too bullish: raise bull threshold, lower bear threshold
      const oldBull = params.bullThreshold
      params.bullThreshold = Math.min(65, oldBull + Math.round(bias * 0.15))
      adjustments.push(
        `看涨偏误+${bias}%：看涨阈值 ${oldBull}→${params.bullThreshold}（更谨慎做多）`
      )
      changed = true
    } else if (bias < -15) {
      // Too bearish: lower bull threshold, raise bear threshold
      const oldBear = params.bearThreshold
      params.bearThreshold = Math.max(35, oldBear - Math.round(Math.abs(bias) * 0.15))
      adjustments.push(
        `看跌偏误${bias}%：看跌阈值 ${oldBear}→${params.bearThreshold}（减少误报空头）`
      )
      changed = true
    }
  }

  // ── 2. RSI overbought correction ──────────────────────────────────────────
  const rsiErrors = dailyReviewed.filter(r => {
    return r.result === 'incorrect'
      && r.prediction.direction === 'up'
      && r.actual?.direction === 'down'
      && r.correctionHint?.includes('超买')
  })
  if (rsiErrors.length >= 3) {
    const oldMax = params.rsiMax
    params.rsiMax = Math.max(60, oldMax - rsiErrors.length)
    params.maxConfidence = Math.max(75, params.maxConfidence - rsiErrors.length * 2)
    adjustments.push(
      `${rsiErrors.length}次超买误判：RSI上限 ${oldMax}→${params.rsiMax}，置信度上限-${rsiErrors.length * 2}`
    )
    changed = true
  }

  // ── 3. Tech vs macro weight adjustment ────────────────────────────────────
  // If macro signals are unreliable (FRED often down), reduce macro weight
  const macroErrors = dailyReviewed.filter(r => {
    return r.result === 'incorrect' && (r.prediction.macroScore as number) > 55
  })
  if (macroErrors.length > dailyReviewed.length * 0.4) {
    const oldTech = params.techWeight
    params.techWeight = Math.min(0.80, oldTech + 0.05)
    params.macroWeight = 1 - params.techWeight
    adjustments.push(
      `宏观信号噪声大：技术权重 ${oldTech.toFixed(2)}→${params.techWeight.toFixed(2)}`
    )
    changed = true
  }

  // ── 4. Confidence calibration ─────────────────────────────────────────────
  // If overall accuracy is below 55%, confidence is overestimated — scale back
  if (stats.accuracy > 0 && stats.accuracy < 55 && stats.reviewed >= 10) {
    const oldScale = params.confidenceScale
    params.confidenceScale = Math.max(1.0, oldScale - 0.3)
    params.maxConfidence = Math.max(65, params.maxConfidence - 5)
    adjustments.push(
      `准确率${stats.accuracy}%偏低：缩减置信度 scale ${oldScale}→${params.confidenceScale}`
    )
    changed = true
  } else if (stats.accuracy >= 65 && stats.reviewed >= 15) {
    // Good performance — slightly expand confidence range
    params.confidenceScale = Math.min(2.5, params.confidenceScale + 0.1)
    adjustments.push(`准确率${stats.accuracy}%良好：微调置信度范围`)
    changed = true
  }

  // ── 5. Safe-buy weight optimization ────────────────────────────────────────
  const sbReviewed = store.records.filter(
    r => r.type === 'safe_buy' && r.result !== 'pending'
  )
  if (sbReviewed.length >= 5) {
    const sbAcc = Math.round(
      sbReviewed.filter(r => r.result === 'correct').length / sbReviewed.length * 100
    )
    if (sbAcc < 60) {
      // Increase Bollinger weight (most reliable method)
      params.safeBuyWeights.bollinger = Math.min(0.45, params.safeBuyWeights.bollinger + 0.05)
      params.safeBuyWeights.rsi = Math.max(0.10, params.safeBuyWeights.rsi - 0.03)
      adjustments.push(`安全买价准确率${sbAcc}%偏低：增加布林带权重`)
      changed = true
    }
  }

  // ── Save if changed ────────────────────────────────────────────────────────
  if (changed) {
    params.tunedAt = new Date().toISOString()
    params.adjustmentLog = [
      ...params.adjustmentLog.slice(-20),
      `[${new Date().toISOString().slice(0, 10)}] ${adjustments.join('; ')}`,
    ]
    await saveTunedParams(params)

    // Log correction to review store
    const { readReviewStore, writeReviewStore } = await import('@/lib/review-store')
    const reviewStore = await readReviewStore()
    reviewStore.corrections.push({
      appliedAt: new Date().toISOString(),
      description: adjustments.join('; '),
      beforeAccuracy: params.previousAccuracy,
    })
    await writeReviewStore(reviewStore)
  }

  return params
}

// ─── Get current market regime ────────────────────────────────────────────────
export function detectRegime(
  vixValue: number | null,
  trendStrength: number,
): 'bull' | 'bear' | 'volatile' | 'sideways' {
  if (vixValue !== null && vixValue > 25) return 'volatile'
  if (vixValue !== null && vixValue > 20) {
    return trendStrength > 20 ? 'bull' : trendStrength < -10 ? 'bear' : 'volatile'
  }
  if (trendStrength > 25) return 'bull'
  if (trendStrength < -15) return 'bear'
  if (Math.abs(trendStrength) < 8) return 'sideways'
  return 'bull'
}

// ─── Apply regime adjustments ─────────────────────────────────────────────────
export function applyRegimeAdjustments(
  params: TunedParameters,
  regime: ReturnType<typeof detectRegime>,
): { techWeight: number; confidenceAdjust: number } {
  const adj = params.regimeAdjustments[regime]
  return {
    techWeight: params.techWeight + (adj?.techDelta ?? 0),
    confidenceAdjust: adj?.confDelta ?? 0,
  }
}
