import { NextRequest, NextResponse } from 'next/server'

export interface StockQuote {
  ticker: string
  name: string
  price: number
  prevClose: number
  change: number
  changePct: number
  high52w: number | null
  low52w: number | null
  marketCapB: number | null
  sharesOutM: number | null
  forwardPe: number | null
  peg: number | null
  revenueGrowthPct: number | null
  grossMarginPct: number | null
  operatingMarginPct: number | null
  beta: number | null
  fundamentalsDate: string
  nextEarnings: string
  preEarningsAction: string
  postEarningsAction: string
  error?: boolean
}

type FundamentalsEntry = Omit<StockQuote,
  'ticker'|'name'|'price'|'prevClose'|'change'|'changePct'|'high52w'|'low52w'|'marketCapB'|'error'>

// pre/post earnings action templates
const A_SEMI = {
  preEarningsAction: '财报前5日关注数据中心/AI算力订单指引，近3月涨幅>30%可先减仓1/3锁利',
  postEarningsAction: 'AI营收超预期且毛利率稳定可持有或加仓；指引下调或竞争格局恶化需减仓',
}
const A_SOFT = {
  preEarningsAction: '财报前维持正常仓位；云/AI增速是核心指标，已大幅溢价可减仓5-10%控风险',
  postEarningsAction: '云/AI收入增速超预期可持有；增速放缓或营销费用异常攀升应减仓20%',
}
const A_ROBOT = {
  preEarningsAction: '关注机器人/自动化订单及部署进度，可轻仓参与财报前博弈',
  postEarningsAction: '自动化营收占比提升是正向信号可加仓；传统业务拖累整体利润应等待更好买点',
}
const A_ENERGY = {
  preEarningsAction: '关注数据中心PPA合同及核电审批动态，有新合同公告可提前布局',
  postEarningsAction: '核电/清洁能源合同超预期可加仓；无新合同且利润承压建议止盈减仓',
}
const A_QUANTUM = {
  preEarningsAction: '量子股波动极大，建议仓位不超总仓位5%，以小仓位博弈技术里程碑',
  postEarningsAction: '技术突破可短线参与；商业化不及预期需快速止损，-15%止损线严格执行',
}
const A_BIO = {
  preEarningsAction: '临床数据窗口风险高，建议财报前减至三成仓，重点关注核心管线进展',
  postEarningsAction: '重磅药物超预期/新适应症获批可加仓；临床失败或竞品获批需果断清仓',
}
const A_EV = {
  preEarningsAction: '关注月/季交付量数据（往往财报前公布），交付超预期可提前建仓',
  postEarningsAction: '毛利率改善+交付量增长双验证可加仓；毛利率持续亏损无改善迹象应减仓',
}

const FUNDAMENTALS: Record<string, FundamentalsEntry> = {
  // ── AI 基础设施 ──────────────────────────────────────
  NVDA: { sharesOutM: 24330, forwardPe: 28,  peg: 0.66, revenueGrowthPct: 65,  grossMarginPct: 75,  operatingMarginPct: 62,  beta: 1.98, fundamentalsDate: 'FY2026 Q4', nextEarnings: '2026-05-28', ...A_SEMI },
  AMD:  { sharesOutM: 1620,  forwardPe: 22,  peg: 0.8,  revenueGrowthPct: 24,  grossMarginPct: 53,  operatingMarginPct: 22,  beta: 1.72, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-07-29', ...A_SEMI },
  AVGO: { sharesOutM: 4700,  forwardPe: 24,  peg: 1.5,  revenueGrowthPct: 44,  grossMarginPct: 64,  operatingMarginPct: 36,  beta: 1.12, fundamentalsDate: 'FY2026 Q2', nextEarnings: '2026-06-12', ...A_SEMI },
  ANET: { sharesOutM: 315,   forwardPe: 38,  peg: 2.0,  revenueGrowthPct: 20,  grossMarginPct: 65,  operatingMarginPct: 40,  beta: 1.15, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-07-29', ...A_SEMI },
  SMCI: { sharesOutM: 585,   forwardPe: 12,  peg: 0.8,  revenueGrowthPct: 20,  grossMarginPct: 13,  operatingMarginPct: 6,   beta: 1.60, fundamentalsDate: 'FY2026 Q3', nextEarnings: '2026-08-12', ...A_SEMI },
  ARM:  { sharesOutM: 1050,  forwardPe: 75,  peg: 3.5,  revenueGrowthPct: 34,  grossMarginPct: 97,  operatingMarginPct: 28,  beta: 1.35, fundamentalsDate: 'FY2027 Q1', nextEarnings: '2026-07-30', ...A_SEMI },
  TSM:  { sharesOutM: 5180,  forwardPe: 20,  peg: 1.0,  revenueGrowthPct: 35,  grossMarginPct: 58,  operatingMarginPct: 44,  beta: 0.95, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-07-17', ...A_SEMI },
  MRVL: { sharesOutM: 860,   forwardPe: 32,  peg: 1.8,  revenueGrowthPct: 61,  grossMarginPct: 60,  operatingMarginPct: 15,  beta: 1.45, fundamentalsDate: 'FY2027 Q1', nextEarnings: '2026-06-05', ...A_SEMI },
  INTC: { sharesOutM: 4280,  forwardPe: 20,  peg: null, revenueGrowthPct: -2,  grossMarginPct: 40,  operatingMarginPct: -5,  beta: 1.02, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-07-24', ...A_SEMI },
  QCOM: { sharesOutM: 1130,  forwardPe: 15,  peg: 1.2,  revenueGrowthPct: 17,  grossMarginPct: 56,  operatingMarginPct: 28,  beta: 1.20, fundamentalsDate: 'FY2026 Q3', nextEarnings: '2026-07-30', ...A_SEMI },

  // ── AI 企业软件重构 ───────────────────────────────────
  MSFT: { sharesOutM: 7440,  forwardPe: 31,  peg: 2.1,  revenueGrowthPct: 17,  grossMarginPct: 69,  operatingMarginPct: 46,  beta: 0.90, fundamentalsDate: 'FY2026 Q3', nextEarnings: '2026-07-23', ...A_SOFT },
  GOOGL:{ sharesOutM: 12100, forwardPe: 19,  peg: 1.2,  revenueGrowthPct: 12,  grossMarginPct: 58,  operatingMarginPct: 32,  beta: 1.05, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-07-29', ...A_SOFT },
  AMZN: { sharesOutM: 10600, forwardPe: 33,  peg: 1.8,  revenueGrowthPct: 11,  grossMarginPct: 50,  operatingMarginPct: 11,  beta: 1.15, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-01', ...A_SOFT },
  META: { sharesOutM: 2540,  forwardPe: 22,  peg: 1.1,  revenueGrowthPct: 16,  grossMarginPct: 82,  operatingMarginPct: 48,  beta: 1.28, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-07-29', ...A_SOFT },
  ORCL: { sharesOutM: 2760,  forwardPe: 27,  peg: 2.0,  revenueGrowthPct: 12,  grossMarginPct: 72,  operatingMarginPct: 24,  beta: 0.85, fundamentalsDate: 'FY2026 Q4', nextEarnings: '2026-06-10', ...A_SOFT },
  NOW:  { sharesOutM: 204,   forwardPe: 58,  peg: 2.8,  revenueGrowthPct: 21,  grossMarginPct: 79,  operatingMarginPct: 18,  beta: 1.05, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-07-23', ...A_SOFT },
  CRM:  { sharesOutM: 966,   forwardPe: 27,  peg: 2.5,  revenueGrowthPct: 9,   grossMarginPct: 77,  operatingMarginPct: 20,  beta: 1.12, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-06-04', ...A_SOFT },
  ADBE: { sharesOutM: 435,   forwardPe: 21,  peg: 2.2,  revenueGrowthPct: 10,  grossMarginPct: 89,  operatingMarginPct: 36,  beta: 1.18, fundamentalsDate: 'FY2026 Q2', nextEarnings: '2026-06-18', ...A_SOFT },
  PLTR: { sharesOutM: 2150,  forwardPe: 105, peg: null, revenueGrowthPct: 36,  grossMarginPct: 81,  operatingMarginPct: 16,  beta: 2.45, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-04', ...A_SOFT },
  SNOW: { sharesOutM: 335,   forwardPe: 95,  peg: null, revenueGrowthPct: 26,  grossMarginPct: 70,  operatingMarginPct: -15, beta: 1.52, fundamentalsDate: 'FY2027 Q1', nextEarnings: '2026-05-21', ...A_SOFT },

  // ── 具身智能 ─────────────────────────────────────────
  TSLA: { sharesOutM: 3210,  forwardPe: 88,  peg: 2.5,  revenueGrowthPct: -1,  grossMarginPct: 18,  operatingMarginPct: 3,   beta: 2.50, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-07-22', ...A_EV   },
  ISRG: { sharesOutM: 356,   forwardPe: 55,  peg: 3.2,  revenueGrowthPct: 17,  grossMarginPct: 67,  operatingMarginPct: 28,  beta: 0.88, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-07-17', ...A_ROBOT },
  SYM:  { sharesOutM: 575,   forwardPe: null,peg: null, revenueGrowthPct: 32,  grossMarginPct: 12,  operatingMarginPct: -15, beta: 1.65, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-11-10', ...A_ROBOT },
  ABB:  { sharesOutM: 1950,  forwardPe: 22,  peg: 1.8,  revenueGrowthPct: 7,   grossMarginPct: 34,  operatingMarginPct: 15,  beta: 0.80, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-07-24', ...A_ROBOT },
  HON:  { sharesOutM: 660,   forwardPe: 20,  peg: 1.8,  revenueGrowthPct: 6,   grossMarginPct: 34,  operatingMarginPct: 18,  beta: 0.78, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-07-24', ...A_ROBOT },
  APP:  { sharesOutM: 680,   forwardPe: 46,  peg: null, revenueGrowthPct: 43,  grossMarginPct: 75,  operatingMarginPct: 30,  beta: 1.82, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-06', ...A_SOFT },
  BRKS: { sharesOutM: 76,    forwardPe: 30,  peg: null, revenueGrowthPct: 8,   grossMarginPct: 50,  operatingMarginPct: 5,   beta: 1.10, fundamentalsDate: 'FY2026 Q2', nextEarnings: '2026-08-05', ...A_ROBOT },

  // ── AI 能源 / 核能 ────────────────────────────────────
  CEG:  { sharesOutM: 315,   forwardPe: 19,  peg: 1.8,  revenueGrowthPct: 6,   grossMarginPct: 30,  operatingMarginPct: 18,  beta: 0.65, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-05', ...A_ENERGY },
  VST:  { sharesOutM: 340,   forwardPe: 14,  peg: 0.7,  revenueGrowthPct: 20,  grossMarginPct: 35,  operatingMarginPct: 22,  beta: 1.35, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-07', ...A_ENERGY },
  GEV:  { sharesOutM: 1370,  forwardPe: 30,  peg: 1.5,  revenueGrowthPct: 25,  grossMarginPct: 18,  operatingMarginPct: 10,  beta: 1.20, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-07-23', ...A_ENERGY },
  NNE:  { sharesOutM: 45,    forwardPe: null,peg: null, revenueGrowthPct: null,grossMarginPct: null,operatingMarginPct: null,beta: 2.80, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-12', ...A_ENERGY },
  CCJ:  { sharesOutM: 415,   forwardPe: 35,  peg: 2.0,  revenueGrowthPct: 18,  grossMarginPct: 35,  operatingMarginPct: 18,  beta: 1.05, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-04', ...A_ENERGY },
  SMR:  { sharesOutM: 380,   forwardPe: null,peg: null, revenueGrowthPct: null,grossMarginPct: null,operatingMarginPct: null,beta: 2.50, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-12', ...A_ENERGY },
  BWX:  { sharesOutM: 92,    forwardPe: 22,  peg: 1.8,  revenueGrowthPct: 12,  grossMarginPct: 25,  operatingMarginPct: 14,  beta: 0.72, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-05', ...A_ENERGY },
  OKLO: { sharesOutM: 215,   forwardPe: null,peg: null, revenueGrowthPct: null,grossMarginPct: null,operatingMarginPct: null,beta: 2.80, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-08', ...A_ENERGY },
  NEE:  { sharesOutM: 2040,  forwardPe: 19,  peg: 1.6,  revenueGrowthPct: 8,   grossMarginPct: 55,  operatingMarginPct: 22,  beta: 0.58, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-07-23', ...A_ENERGY },
  AES:  { sharesOutM: 670,   forwardPe: 10,  peg: 1.0,  revenueGrowthPct: 5,   grossMarginPct: 22,  operatingMarginPct: 8,   beta: 0.82, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-05', ...A_ENERGY },

  // ── 量子计算 ──────────────────────────────────────────
  IONQ: { sharesOutM: 320,   forwardPe: null,peg: null, revenueGrowthPct: 95,  grossMarginPct: 50,  operatingMarginPct: -200,beta: 2.10, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-11', ...A_QUANTUM },
  RGTI: { sharesOutM: 590,   forwardPe: null,peg: null, revenueGrowthPct: 120, grossMarginPct: 45,  operatingMarginPct: -250,beta: 3.20, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-06', ...A_QUANTUM },
  QBTS: { sharesOutM: 260,   forwardPe: null,peg: null, revenueGrowthPct: 80,  grossMarginPct: 60,  operatingMarginPct: -300,beta: 2.90, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-13', ...A_QUANTUM },
  IBM:  { sharesOutM: 903,   forwardPe: 20,  peg: 2.2,  revenueGrowthPct: 3,   grossMarginPct: 56,  operatingMarginPct: 14,  beta: 0.72, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-07-22', ...A_QUANTUM },
  QUBT: { sharesOutM: 145,   forwardPe: null,peg: null, revenueGrowthPct: 60,  grossMarginPct: 40,  operatingMarginPct: -400,beta: 3.50, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-14', ...A_QUANTUM },

  // ── AI 生物医药 ───────────────────────────────────────
  LLY:  { sharesOutM: 950,   forwardPe: 30,  peg: 1.4,  revenueGrowthPct: 32,  grossMarginPct: 80,  operatingMarginPct: 40,  beta: 0.48, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-05', ...A_BIO },
  MRNA: { sharesOutM: 380,   forwardPe: null,peg: null, revenueGrowthPct: -50, grossMarginPct: 40,  operatingMarginPct: -60, beta: 1.38, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-01', ...A_BIO },
  RXRX: { sharesOutM: 518,   forwardPe: null,peg: null, revenueGrowthPct: 50,  grossMarginPct: 80,  operatingMarginPct: -150,beta: 1.85, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-12', ...A_BIO },
  CRSP: { sharesOutM: 83,    forwardPe: null,peg: null, revenueGrowthPct: -20, grossMarginPct: null,operatingMarginPct: null,beta: 1.60, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-05', ...A_BIO },
  EDIT: { sharesOutM: 73,    forwardPe: null,peg: null, revenueGrowthPct: null,grossMarginPct: null,operatingMarginPct: null,beta: 1.72, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-12', ...A_BIO },
  BEAM: { sharesOutM: 63,    forwardPe: null,peg: null, revenueGrowthPct: null,grossMarginPct: null,operatingMarginPct: null,beta: 1.65, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-06', ...A_BIO },
  NTLA: { sharesOutM: 62,    forwardPe: null,peg: null, revenueGrowthPct: null,grossMarginPct: null,operatingMarginPct: null,beta: 1.58, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-12', ...A_BIO },
  SANA: { sharesOutM: 105,   forwardPe: null,peg: null, revenueGrowthPct: null,grossMarginPct: null,operatingMarginPct: null,beta: 1.45, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-11', ...A_BIO },
  REGN: { sharesOutM: 102,   forwardPe: 15,  peg: 1.0,  revenueGrowthPct: 8,   grossMarginPct: 85,  operatingMarginPct: 38,  beta: 0.52, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-01', ...A_BIO },

  // ── 新能源汽车 ────────────────────────────────────────
  NIO:  { sharesOutM: 1940,  forwardPe: null,peg: null, revenueGrowthPct: 18,  grossMarginPct: 10,  operatingMarginPct: -25, beta: 1.85, fundamentalsDate: 'Q4 2025',   nextEarnings: '2026-06-05', ...A_EV },
  XPEV: { sharesOutM: 1720,  forwardPe: null,peg: null, revenueGrowthPct: 35,  grossMarginPct: 14,  operatingMarginPct: -18, beta: 1.72, fundamentalsDate: 'Q4 2025',   nextEarnings: '2026-06-10', ...A_EV },
  LI:   { sharesOutM: 1045,  forwardPe: 18,  peg: null, revenueGrowthPct: 25,  grossMarginPct: 20,  operatingMarginPct: 5,   beta: 1.60, fundamentalsDate: 'Q4 2025',   nextEarnings: '2026-06-05', ...A_EV },
  RIVN: { sharesOutM: 1040,  forwardPe: null,peg: null, revenueGrowthPct: 40,  grossMarginPct: -10, operatingMarginPct: -30, beta: 1.95, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-06', ...A_EV },
  LCID: { sharesOutM: 3100,  forwardPe: null,peg: null, revenueGrowthPct: 65,  grossMarginPct: -80, operatingMarginPct: -120,beta: 1.80, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-05', ...A_EV },
  F:    { sharesOutM: 4000,  forwardPe: 8,   peg: 0.8,  revenueGrowthPct: 5,   grossMarginPct: 10,  operatingMarginPct: 3,   beta: 1.05, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-07-28', ...A_EV },
  GM:   { sharesOutM: 1100,  forwardPe: 6,   peg: 0.5,  revenueGrowthPct: 2,   grossMarginPct: 14,  operatingMarginPct: 7,   beta: 0.95, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-07-22', ...A_EV },
  STLA: { sharesOutM: 2900,  forwardPe: 5,   peg: null, revenueGrowthPct: -15, grossMarginPct: 12,  operatingMarginPct: 2,   beta: 0.90, fundamentalsDate: 'H1 2025',   nextEarnings: '2026-07-31', ...A_EV },
  BLNK: { sharesOutM: 52,    forwardPe: null,peg: null, revenueGrowthPct: 15,  grossMarginPct: 20,  operatingMarginPct: -80, beta: 2.20, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-08-07', ...A_EV },

  // ── 其他 (网络安全 / 原有) ────────────────────────────
  CRWD: { sharesOutM: 258,   forwardPe: 58,  peg: 2.2,  revenueGrowthPct: 30,  grossMarginPct: 78,  operatingMarginPct: 18,  beta: 1.28, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-06-03', ...A_SOFT },
  PANW: { sharesOutM: 328,   forwardPe: 53,  peg: 2.8,  revenueGrowthPct: 14,  grossMarginPct: 75,  operatingMarginPct: 14,  beta: 1.06, fundamentalsDate: 'Q1 2026',   nextEarnings: '2026-05-20', ...A_SOFT },
}

const NAMES: Record<string, string> = {
  NVDA: 'NVIDIA', AMD: 'AMD', AVGO: 'Broadcom', ANET: 'Arista Networks',
  SMCI: 'Super Micro', ARM: 'Arm Holdings', TSM: 'TSMC', MRVL: 'Marvell',
  INTC: 'Intel', QCOM: 'Qualcomm',
  MSFT: 'Microsoft', GOOGL: 'Alphabet', AMZN: 'Amazon', META: 'Meta',
  ORCL: 'Oracle', NOW: 'ServiceNow', CRM: 'Salesforce', ADBE: 'Adobe',
  PLTR: 'Palantir', SNOW: 'Snowflake',
  TSLA: 'Tesla', ISRG: 'Intuitive Surgical', SYM: 'Symbotic',
  ABB: 'ABB', HON: 'Honeywell', APP: 'AppLovin', BRKS: 'Azenta',
  CEG: 'Constellation Energy', VST: 'Vistra', GEV: 'GE Vernova',
  NNE: 'Nano Nuclear', CCJ: 'Cameco', SMR: 'NuScale Power',
  BWX: 'BWX Technologies', OKLO: 'Oklo', NEE: 'NextEra Energy', AES: 'AES Corp',
  IONQ: 'IonQ', RGTI: 'Rigetti', QBTS: 'D-Wave', IBM: 'IBM', QUBT: 'Quantum Computing',
  LLY: 'Eli Lilly', MRNA: 'Moderna', RXRX: 'Recursion', CRSP: 'CRISPR Tx',
  EDIT: 'Editas', BEAM: 'Beam Tx', NTLA: 'Intellia', SANA: 'Sana Bio', REGN: 'Regeneron',
  NIO: 'NIO', XPEV: 'XPeng', LI: 'Li Auto', RIVN: 'Rivian',
  LCID: 'Lucid', F: 'Ford', GM: 'General Motors', STLA: 'Stellantis', BLNK: 'Blink Charging',
  CRWD: 'CrowdStrike', PANW: 'Palo Alto',
}

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
}

async function fetchPrice(ticker: string): Promise<Pick<StockQuote, 'price'|'prevClose'|'change'|'changePct'|'high52w'|'low52w'|'name'>> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
  const res = await fetch(url, { headers: YF_HEADERS, signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const meta = json?.chart?.result?.[0]?.meta
  if (!meta) throw new Error('no meta')
  const price: number = meta.regularMarketPrice ?? 0
  const prevClose: number = meta.chartPreviousClose ?? meta.regularMarketPrice ?? 0
  return {
    name: meta.longName ?? meta.shortName ?? ticker,
    price,
    prevClose,
    change: price - prevClose,
    changePct: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
    high52w: meta.fiftyTwoWeekHigh ?? null,
    low52w: meta.fiftyTwoWeekLow ?? null,
  }
}

export async function GET(req: NextRequest) {
  const raw = new URL(req.url).searchParams.get('tickers') ?? ''
  const tickers = raw.split(',').map(t => t.trim().toUpperCase()).filter(Boolean).slice(0, 50)
  if (!tickers.length) return NextResponse.json({ error: 'no tickers' }, { status: 400 })

  const results = await Promise.allSettled(tickers.map(fetchPrice))

  const stocks: StockQuote[] = tickers.map((ticker, i) => {
    const fund = FUNDAMENTALS[ticker] ?? {
      sharesOutM: null, forwardPe: null, peg: null,
      revenueGrowthPct: null, grossMarginPct: null, operatingMarginPct: null,
      beta: null, fundamentalsDate: '—',
      nextEarnings: '—', preEarningsAction: '暂无数据', postEarningsAction: '暂无数据',
    }
    const r = results[i]
    if (r.status === 'fulfilled') {
      const { price, ...priceRest } = r.value
      const marketCapB = fund.sharesOutM ? (fund.sharesOutM * price) / 1000 : null
      return { ticker, ...priceRest, price, marketCapB, ...fund }
    }
    return {
      ticker,
      name: NAMES[ticker] ?? ticker,
      price: 0, prevClose: 0, change: 0, changePct: 0,
      high52w: null, low52w: null, marketCapB: null,
      ...fund, error: true,
    }
  })

  return NextResponse.json(stocks, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
