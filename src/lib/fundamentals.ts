import { readFile } from 'fs/promises'
import { join } from 'path'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface StockFundamentals {
  name: string
  sharesOutM: number | null
  forwardPe: number | null
  peg: number | null
  revenueGrowthPct: number | null
  grossMarginPct: number | null
  operatingMarginPct: number | null
  beta: number | null
  fundamentalsDate: string
  nextEarnings: string
  sector: string
}

export interface FundamentalsStore {
  updatedAt: string
  dataSource: string
  stocks: Record<string, StockFundamentals>
}

// ─── Load ─────────────────────────────────────────────────────────────────────
const DATA_FILE = join(process.cwd(), 'data', 'fundamentals.json')

let cached: FundamentalsStore | null = null
let cacheTime = 0
const CACHE_TTL = 300_000 // 5 minutes

export async function loadFundamentals(): Promise<FundamentalsStore> {
  const now = Date.now()
  if (cached && now - cacheTime < CACHE_TTL) return cached

  const raw = await readFile(DATA_FILE, 'utf-8')
  cached = JSON.parse(raw) as FundamentalsStore
  cacheTime = now
  return cached
}

export async function getStockFundamentals(ticker: string): Promise<StockFundamentals | null> {
  const store = await loadFundamentals()
  return store.stocks[ticker] ?? null
}

export async function getLastUpdated(): Promise<string> {
  const store = await loadFundamentals()
  return store.updatedAt
}

// ─── Pre/post earnings action templates ──────────────────────────────────────
export function getEarningsActions(sector: string): { pre: string; post: string } {
  if (sector.includes('AI基础设施') || sector.includes('半导体')) {
    return {
      pre: '财报前5日关注数据中心/AI算力订单指引，近3月涨幅>30%可先减仓1/3锁利',
      post: 'AI营收超预期且毛利率稳定可持有或加仓；指引下调或竞争格局恶化需减仓',
    }
  }
  if (sector.includes('软件')) {
    return {
      pre: '财报前维持正常仓位；云/AI增速是核心指标，已大幅溢价可减仓5-10%控风险',
      post: '云/AI收入增速超预期可持有；增速放缓或营销费用异常攀升应减仓20%',
    }
  }
  if (sector.includes('具身智能') || sector.includes('机器人')) {
    return {
      pre: '关注机器人/自动化订单及部署进度，可轻仓参与财报前博弈',
      post: '自动化营收占比提升是正向信号可加仓；传统业务拖累整体利润应等待更好买点',
    }
  }
  if (sector.includes('能源') || sector.includes('核能')) {
    return {
      pre: '关注数据中心PPA合同及核电审批动态，有新合同公告可提前布局',
      post: '核电/清洁能源合同超预期可加仓；无新合同且利润承压建议止盈减仓',
    }
  }
  if (sector.includes('量子')) {
    return {
      pre: '量子股波动极大，建议仓位不超总仓位5%，以小仓位博弈技术里程碑',
      post: '技术突破可短线参与；商业化不及预期需快速止损，-15%止损线严格执行',
    }
  }
  if (sector.includes('医药') || sector.includes('生物')) {
    return {
      pre: '临床数据窗口风险高，建议财报前减至三成仓，重点关注核心管线进展',
      post: '重磅药物超预期/新适应症获批可加仓；临床失败或竞品获批需果断清仓',
    }
  }
  if (sector.includes('新能源') || sector.includes('汽车')) {
    return {
      pre: '关注月/季交付量数据（往往财报前公布），交付超预期可提前建仓',
      post: '毛利率改善+交付量增长双验证可加仓；毛利率持续亏损无改善迹象应减仓',
    }
  }
  return {
    pre: '暂无数据',
    post: '暂无数据',
  }
}
