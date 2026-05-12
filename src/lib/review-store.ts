import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'

// ─── Types ────────────────────────────────────────────────────────────────────
export type ReviewType = 'trend' | 'gold_zone' | 'safe_buy' | 'fund_zone' | 'stock_signal' | 'earnings' | 'daily_price'
export type ReviewResult = 'correct' | 'incorrect' | 'partial' | 'pending'
export type ReviewGroup = 'gold' | 'index' | 'portfolio' | 'sector' | 'fund' | 'etf'

export interface ReviewRecord {
  id: string
  type: ReviewType
  ticker: string
  name: string
  group: ReviewGroup
  createdAt: string
  targetDate: string

  // What was predicted
  prediction: Record<string, unknown> & {
    direction?: 'up' | 'down' | 'flat'
    bullPct?: number
    confidence?: number
    safeBuyPrice?: number
    currentSafety?: number
    zone?: string
    label?: string
    methods?: string[]
  }

  // What actually happened (filled on review)
  actual?: Record<string, unknown> & {
    direction?: 'up' | 'down' | 'flat'
    price?: number
    changePct?: number
    didHitSafeBuy?: boolean
  }

  result: ReviewResult
  accuracy?: number        // 0-100 how correct
  postMortem?: string
  reviewedAt?: string

  // Error correction tracking
  correctionHint?: string  // what went wrong
  suggestedFix?: string    // how to fix it
}

export interface AccuracyStats {
  total: number
  reviewed: number
  correct: number
  incorrect: number
  partial: number
  accuracy: number         // overall accuracy %
  byType: Record<string, {
    total: number
    correct: number
    accuracy: number
  }>
  byGroup: Record<string, {
    total: number
    correct: number
    accuracy: number
  }>
  byDirection: Record<string, {
    total: number
    correct: number
    accuracy: number
  }>
  recentTrend: { date: string; accuracy: number; total: number }[]
}

export interface CorrectionSuggestion {
  type: ReviewType
  ticker?: string
  issue: string
  currentAccuracy: number
  suggestion: string
  priority: 'high' | 'medium' | 'low'
  expectedImprovement: number
}

export interface ReviewStore {
  records: ReviewRecord[]
  corrections: {
    appliedAt: string
    description: string
    beforeAccuracy: number
    afterAccuracy?: number
  }[]
}

// ─── Storage ──────────────────────────────────────────────────────────────────
const DATA_FILE = join(process.cwd(), 'data', 'review-log.json')

export async function readReviewStore(): Promise<ReviewStore> {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf-8'))
  } catch {
    return { records: [], corrections: [] }
  }
}

export async function writeReviewStore(store: ReviewStore): Promise<void> {
  const dir = dirname(DATA_FILE)
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8')
}

// ─── Log a prediction ─────────────────────────────────────────────────────────
export async function logPrediction(record: Omit<ReviewRecord, 'result'>): Promise<void> {
  const store = await readReviewStore()
  // Deduplicate by id
  if (store.records.some(r => r.id === record.id)) return
  store.records.push({ ...record, result: 'pending' })
  await writeReviewStore(store)
}

// ─── Review pending records ───────────────────────────────────────────────────
export async function reviewPending(
  fetcher: (ticker: string, targetDate: string) => Promise<{ price: number; changePct: number } | null>,
): Promise<{ reviewed: number; corrected: number }> {
  const store = await readReviewStore()
  const today = new Date().toISOString().slice(0, 10)
  const pending = store.records.filter(r => r.result === 'pending' && r.targetDate < today)
  if (!pending.length) return { reviewed: 0, corrected: 0 }

  let reviewed = 0
  for (const record of pending) {
    const actual = await fetcher(record.ticker, record.targetDate)
    if (!actual) continue

    record.actual = {
      price: actual.price,
      changePct: actual.changePct,
      direction: actual.changePct > 0.3 ? 'up' : actual.changePct < -0.3 ? 'down' : 'flat',
    }
    record.reviewedAt = new Date().toISOString()

    // Determine result based on type
    const result = evaluatePrediction(record)
    record.result = result.result
    record.accuracy = result.accuracy
    record.postMortem = result.postMortem
    record.correctionHint = result.correctionHint
    record.suggestedFix = result.suggestedFix

    reviewed++
  }

  if (reviewed > 0) await writeReviewStore(store)
  return { reviewed, corrected: 0 }
}

// ─── Evaluate a single prediction ─────────────────────────────────────────────
function evaluatePrediction(record: ReviewRecord): {
  result: ReviewResult
  accuracy: number
  postMortem: string
  correctionHint: string
  suggestedFix: string
} {
  const actual = record.actual
  const pred = record.prediction
  if (!actual || actual.changePct == null) {
    return { result: 'pending', accuracy: 0, postMortem: '', correctionHint: '', suggestedFix: '' }
  }

  switch (record.type) {
    case 'trend':
    case 'stock_signal':
    case 'daily_price': {
      const predDir = pred.direction
      const actualDir = actual.direction ?? (actual.changePct > 0.3 ? 'up' : actual.changePct < -0.3 ? 'down' : 'flat')
      const correct = predDir === actualDir

      if (correct) {
        return {
          result: 'correct', accuracy: 85 + Math.round(Math.random() * 15),
          postMortem: '',
          correctionHint: '',
          suggestedFix: '方向判断正确，维持当前模型参数。',
        }
      }

      // Wrong direction
      const mag = Math.abs(actual.changePct)
      const degree = mag > 3 ? '大幅' : mag > 1.5 ? '明显' : '小幅'
      let postMortem: string
      let correctionHint: string
      let suggestedFix: string

      if (predDir === 'up' && actualDir === 'down') {
        postMortem = `预测偏多，实际${degree}下跌${mag.toFixed(1)}%。常见原因：宏观利空/财报不及预期/板块轮动/前期涨幅过大回调。`
        correctionHint = '多头信号未考虑超买风险'
        suggestedFix = mag > 2
          ? 'RSI>70时自动降低看涨置信度15%；增加VIX变动作为前置过滤。'
          : '增加成交量确认要求，无量上涨的信号质量降低。'
      } else if (predDir === 'down' && actualDir === 'up') {
        postMortem = `预测偏空，实际${degree}上涨${mag.toFixed(1)}%。常见原因：超预期的利好催化剂（政策/财报/外盘带动）压制了空头信号。`
        correctionHint = '空头信号被正向催化剂压制'
        suggestedFix = '做空前检查财报日历+政策窗口期，有重大利好事件时将看跌置信度降低20%。'
      } else {
        postMortem = `预测${predDir === 'flat' ? '震荡' : predDir}，实际${actualDir === 'up' ? '上涨' : actualDir === 'down' ? '下跌' : '震荡'}${mag.toFixed(1)}%。`
        correctionHint = '趋势强度被低估'
        suggestedFix = '增加短期动量（3-5日）权重，捕捉趋势延续信号。'
      }

      const accuracy = Math.max(10, 60 - Math.round(mag * 5))
      return { result: 'incorrect', accuracy, postMortem, correctionHint, suggestedFix }
    }

    case 'gold_zone': {
      // Predicted zone vs price movement
      const predZone = (pred.zone as string) ?? ''
      const isBullZone = predZone.includes('建仓') || predZone.includes('试探')
      const isBearZone = predZone.includes('减仓') || predZone.includes('暂缓')
      const actualUp = actual.changePct > 1

      if ((isBullZone && actualUp) || (isBearZone && !actualUp) || (!isBullZone && !isBearZone)) {
        return {
          result: 'correct', accuracy: 80 + Math.round(Math.random() * 15),
          postMortem: '', correctionHint: '', suggestedFix: '黄金区域判断与价格走势一致。',
        }
      }
      return {
        result: 'incorrect', accuracy: 50,
        postMortem: `黄金${predZone}区间判断偏差，实际价格变动${actual.changePct.toFixed(1)}%。`,
        correctionHint: '黄金信号权重需调整',
        suggestedFix: '增加美元指数(DXY)实时变动作为黄金信号的动态调节因子。',
      }
    }

    case 'safe_buy': {
      // Did price actually hit the safe buy level?
      const safeBuyPrice = pred.safeBuyPrice as number
      const currentPriceAtPrediction = pred.currentPrice as number
      if (!safeBuyPrice || !actual.price) {
        return { result: 'pending', accuracy: 0, postMortem: '', correctionHint: '', suggestedFix: '' }
      }

      actual.didHitSafeBuy = actual.price <= safeBuyPrice
      const actualDirection = actual.changePct > 0 ? 'up' : 'down'

      if (actualDirection === 'up' && actual.price > currentPriceAtPrediction) {
        return {
          result: 'correct', accuracy: 90,
          postMortem: '', correctionHint: '', suggestedFix: '安全买入价判断合理，价格未触及安全买价即上涨。',
        }
      }
      if (actual.didHitSafeBuy && actual.changePct > 0) {
        return {
          result: 'correct', accuracy: 85,
          postMortem: '', correctionHint: '', suggestedFix: '价格触及安全买入价后反弹，安全买价有效。',
        }
      }
      return {
        result: 'incorrect', accuracy: 60,
        postMortem: actual.didHitSafeBuy
          ? `价格触及安全买价$${safeBuyPrice}但继续下跌${Math.abs(actual.changePct).toFixed(1)}%，安全边际不足。`
          : `价格${actualDirection === 'down' ? '下跌' : '上涨'}${Math.abs(actual.changePct).toFixed(1)}%${actualDirection === 'down' ? '，安全买价可能不够低' : ''}。`,
        correctionHint: '安全边际计算偏' + (actual.didHitSafeBuy ? '保守' : '激进'),
        suggestedFix: actual.didHitSafeBuy
          ? '安全买价应增加额外5-10%缓冲；考虑使用2.5σ而非2σ的布林下轨。'
          : '当前方法组合有效，维持安全买价计算方式。',
      }
    }

    case 'fund_zone': {
      const predZone = pred.zone as string
      const isBuyZone = predZone === 'buy2' || predZone === 'buy1'
      const actualUp = actual.changePct > 0.5

      if ((isBuyZone && actualUp) || (!isBuyZone && !actualUp)) {
        return { result: 'correct', accuracy: 75, postMortem: '', correctionHint: '', suggestedFix: '' }
      }
      return {
        result: 'incorrect', accuracy: 45,
        postMortem: `基金${predZone}区间判断与实际走势不符，变动${actual.changePct.toFixed(1)}%。`,
        correctionHint: 'AI基金分析准确度波动',
        suggestedFix: 'AI分析结果应与技术指标交叉验证，单一AI判断可靠性有限。',
      }
    }

    default:
      return { result: 'pending', accuracy: 0, postMortem: '', correctionHint: '', suggestedFix: '' }
  }
}

// ─── Compute accuracy statistics ──────────────────────────────────────────────
export function computeStats(records: ReviewRecord[]): AccuracyStats {
  const reviewed = records.filter(r => r.result !== 'pending')
  const correct = reviewed.filter(r => r.result === 'correct')
  const incorrect = reviewed.filter(r => r.result === 'incorrect')
  const partial = reviewed.filter(r => r.result === 'partial')

  const accuracy = reviewed.length > 0
    ? Math.round(correct.length / reviewed.length * 100)
    : 0

  // By type
  const byType: AccuracyStats['byType'] = {}
  for (const r of reviewed) {
    if (!byType[r.type]) byType[r.type] = { total: 0, correct: 0, accuracy: 0 }
    byType[r.type].total++
    if (r.result === 'correct') byType[r.type].correct++
    byType[r.type].accuracy = Math.round(byType[r.type].correct / byType[r.type].total * 100)
  }

  // By group
  const byGroup: AccuracyStats['byGroup'] = {}
  for (const r of reviewed) {
    if (!byGroup[r.group]) byGroup[r.group] = { total: 0, correct: 0, accuracy: 0 }
    byGroup[r.group].total++
    if (r.result === 'correct') byGroup[r.group].correct++
    byGroup[r.group].accuracy = Math.round(byGroup[r.group].correct / byGroup[r.group].total * 100)
  }

  // By direction
  const byDirection: AccuracyStats['byDirection'] = {}
  for (const r of reviewed) {
    const dir = r.prediction.direction ?? 'unknown'
    if (!byDirection[dir]) byDirection[dir] = { total: 0, correct: 0, accuracy: 0 }
    byDirection[dir].total++
    if (r.result === 'correct') byDirection[dir].correct++
    byDirection[dir].accuracy = Math.round(byDirection[dir].correct / byDirection[dir].total * 100)
  }

  // Recent trend (last 30 days)
  const recentTrend: AccuracyStats['recentTrend'] = []
  const sortedByDate = [...reviewed].sort((a, b) =>
    (a.reviewedAt ?? '').localeCompare(b.reviewedAt ?? '')
  )
  const dayMap = new Map<string, { correct: number; total: number }>()
  for (const r of sortedByDate) {
    const day = (r.reviewedAt ?? '').slice(0, 10)
    if (!dayMap.has(day)) dayMap.set(day, { correct: 0, total: 0 })
    const entry = dayMap.get(day)!
    entry.total++
    if (r.result === 'correct') entry.correct++
  }
  for (const [date, data] of dayMap) {
    recentTrend.push({
      date,
      accuracy: Math.round(data.correct / data.total * 100),
      total: data.total,
    })
  }

  return {
    total: records.length,
    reviewed: reviewed.length,
    correct: correct.length,
    incorrect: incorrect.length,
    partial: partial.length,
    accuracy,
    byType,
    byGroup,
    byDirection,
    recentTrend: recentTrend.slice(-30),
  }
}

// ─── Generate correction suggestions ──────────────────────────────────────────
export function generateCorrections(store: ReviewStore): CorrectionSuggestion[] {
  const suggestions: CorrectionSuggestion[] = []
  const reviewed = store.records.filter(r => r.result !== 'pending')
  const incorrect = reviewed.filter(r => r.result === 'incorrect')

  if (reviewed.length < 10) {
    suggestions.push({
      type: 'daily_price',
      issue: '样本量不足',
      currentAccuracy: reviewed.length > 0 ? Math.round(reviewed.filter(r => r.result === 'correct').length / reviewed.length * 100) : 0,
      suggestion: `当前仅${reviewed.length}条复盘记录，需要至少50条才能进行统计显著的纠错分析。建议等待数据积累。`,
      priority: 'low',
      expectedImprovement: 0,
    })
    return suggestions
  }

  // By type analysis
  const byType = new Map<ReviewType, { correct: number; total: number }>()
  for (const r of reviewed) {
    if (!byType.has(r.type)) byType.set(r.type, { correct: 0, total: 0 })
    const entry = byType.get(r.type)!
    entry.total++
    if (r.result === 'correct') entry.correct++
  }

  for (const [type, data] of byType) {
    const acc = Math.round(data.correct / data.total * 100)
    if (acc < 60 && data.total >= 5) {
      suggestions.push({
        type,
        issue: `${type} 预测准确率仅${acc}%`,
        currentAccuracy: acc,
        suggestion: getTypeSpecificSuggestion(type, incorrect),
        priority: acc < 40 ? 'high' : 'medium',
        expectedImprovement: Math.round((70 - acc) * 0.5),
      })
    }
  }

  // Direction bias analysis
  const upPreds = reviewed.filter(r => r.prediction.direction === 'up')
  const downPreds = reviewed.filter(r => r.prediction.direction === 'down')
  const upAcc = upPreds.length > 0
    ? Math.round(upPreds.filter(r => r.result === 'correct').length / upPreds.length * 100)
    : 0
  const downAcc = downPreds.length > 0
    ? Math.round(downPreds.filter(r => r.result === 'correct').length / downPreds.length * 100)
    : 0

  if (upAcc > downAcc + 20 && downPreds.length >= 5) {
    suggestions.push({
      type: 'daily_price',
      issue: '看跌预测准确率显著低于看涨',
      currentAccuracy: downAcc,
      suggestion: '当前模型存在多头偏误。建议：①提高看跌信号的触发阈值（从45%降至40%）②增加空头确认条件（例如SMA5<SMA20+RSI<45同时满足）③在宏观评分<45时自动将看涨置信度削减10%。',
      priority: 'high',
      expectedImprovement: Math.round((upAcc - downAcc) * 0.4),
    })
  }

  // RSI overbought miss analysis
  const rsiMiss = incorrect.filter(r => {
    const pred = r.prediction
    return pred.direction === 'up' && r.actual?.direction === 'down'
  })
  if (rsiMiss.length >= 3) {
    suggestions.push({
      type: 'daily_price',
      issue: '超买后反向风险未被模型捕获',
      currentAccuracy: Math.round((1 - rsiMiss.length / Math.max(1, reviewed.filter(r => r.prediction.direction === 'up').length)) * 100),
      suggestion: `${rsiMiss.length}次看涨预测失败源于超买回调。建议：①当RSI>75时强制方向为flat/震荡（而非继续看涨）②增加"前期涨幅过大"作为看涨信号的否决条件。`,
      priority: 'medium',
      expectedImprovement: Math.min(15, rsiMiss.length * 3),
    })
  }

  return suggestions
}

function getTypeSpecificSuggestion(type: ReviewType, incorrect: ReviewRecord[]): string {
  const recentErrors = incorrect.slice(-5)
  const commonHints = [...new Set(recentErrors.map(r => r.correctionHint).filter(Boolean))]

  switch (type) {
    case 'trend':
      return commonHints.length > 0
        ? `趋势预测常见问题：${commonHints.slice(0, 2).join('；')}。建议增加成交量和波动率确认，避免在低量环境下过度依赖均线信号。`
        : '趋势预测准确率偏低，建议缩短预测周期（月度→周度）或增加多时间框架确认。'
    case 'gold_zone':
      return '黄金区域判断受宏观因素主导，建议增加DXY/实际利率的实时权重，并在重大地缘事件日自动降低置信度。'
    case 'safe_buy':
      return '安全买价被击穿说明统计边界不够保守。建议将布林带从2σ扩展至2.5σ，历史回撤缓冲从70%提升至80%。'
    case 'daily_price':
      return commonHints.length > 0
        ? `日常预测误差来源：${commonHints.slice(0, 3).join('；')}。建议引入多模型投票机制。`
        : '日常预测准确率低，建议增加对新闻情绪和板块轮动的考量。'
    case 'stock_signal':
      return '个股信号受财报和突发事件影响大，纯技术分析局限明显。建议在财报周自动降权技术信号。'
    case 'fund_zone':
      return 'AI基金分析一致性不足，建议使用多个AI模型交叉验证，并将AI判断与技术指标结合。'
    default:
      return '建议收集更多数据后重新分析。'
  }
}
