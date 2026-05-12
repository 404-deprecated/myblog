'use client'

import { useState, useEffect, useCallback } from 'react'
import { InteractiveChart, type ChartPoint, type ChartEvent } from './InteractiveChart'

// ─── Static monthly gold price (USD/oz) ───────────────────────────────────────
const GOLD_DATA: { m: string; p: number }[] = [
  { m:'2016-01',p:1118 },{ m:'2016-03',p:1228 },{ m:'2016-06',p:1321 },{ m:'2016-09',p:1317 },{ m:'2016-12',p:1152 },
  { m:'2017-01',p:1209 },{ m:'2017-03',p:1249 },{ m:'2017-06',p:1241 },{ m:'2017-09',p:1287 },{ m:'2017-12',p:1309 },
  { m:'2018-01',p:1345 },{ m:'2018-03',p:1325 },{ m:'2018-06',p:1252 },{ m:'2018-09',p:1194 },{ m:'2018-12',p:1282 },
  { m:'2019-01',p:1321 },{ m:'2019-03',p:1295 },{ m:'2019-06',p:1413 },{ m:'2019-09',p:1498 },{ m:'2019-12',p:1523 },
  { m:'2020-01',p:1590 },{ m:'2020-03',p:1577 },{ m:'2020-05',p:1728 },{ m:'2020-07',p:1975 },
  { m:'2020-08',p:2028 },{ m:'2020-10',p:1880 },{ m:'2020-12',p:1898 },
  { m:'2021-01',p:1847 },{ m:'2021-03',p:1707 },{ m:'2021-06',p:1763 },{ m:'2021-09',p:1755 },{ m:'2021-12',p:1806 },
  { m:'2022-01',p:1796 },{ m:'2022-03',p:1937 },{ m:'2022-06',p:1807 },{ m:'2022-09',p:1671 },{ m:'2022-12',p:1824 },
  { m:'2023-01',p:1924 },{ m:'2023-03',p:1969 },{ m:'2023-06',p:1912 },{ m:'2023-09',p:1848 },{ m:'2023-12',p:2063 },
  { m:'2024-01',p:2033 },{ m:'2024-03',p:2229 },{ m:'2024-05',p:2327 },{ m:'2024-07',p:2426 },
  { m:'2024-09',p:2634 },{ m:'2024-11',p:2650 },{ m:'2024-12',p:2625 },
  { m:'2025-01',p:3350 },{ m:'2025-02',p:3480 },{ m:'2025-03',p:3780 },
  { m:'2025-04',p:3950 },{ m:'2025-05',p:3800 },
  // 2025 H2: post-tariff-pause consolidation, then renewed run
  { m:'2025-06',p:3750 },{ m:'2025-07',p:3680 },{ m:'2025-08',p:3850 },
  { m:'2025-09',p:3920 },{ m:'2025-10',p:4050 },{ m:'2025-11',p:4120 },
  { m:'2025-12',p:3980 },
  // 2026: dollar weakness + central bank buying drives new highs
  { m:'2026-01',p:4100 },{ m:'2026-02',p:4250 },{ m:'2026-03',p:4180 },
  { m:'2026-04',p:4400 },{ m:'2026-05',p:4560 },
]

// ─── Key events ───────────────────────────────────────────────────────────────
const GOLD_EVENTS: ChartEvent[] = [
  { d:'2020-08-07', label:'COVID新高$2028', impact:'pos',
    detail:'新冠疫情+美联储无限QE推动黄金突破$2000，创当时历史新高。避险需求+通胀预期双重驱动。' },
  { d:'2022-03-08', label:'乌克兰战争', impact:'pos',
    detail:'俄乌冲突爆发，黄金急涨至$1937。但随后美联储激进加息令持有黄金机会成本骤升，黄金承压。' },
  { d:'2022-09-27', label:'加息最猛低点', impact:'neg',
    detail:'美联储连续4次75bp加息，实际利率快速上升，黄金跌至$1620三年低点。' },
  { d:'2023-12-04', label:'降息预期破$2000', impact:'pos',
    detail:'美联储降息预期确立，实际利率回落，黄金重新站稳$2000，本轮牛市起点。' },
  { d:'2024-03-21', label:'破$2200历史新高', impact:'pos',
    detail:'央行购金创历史纪录+降息预期+美元走弱三重驱动，黄金突破2011年前高$1921区间。' },
  { d:'2024-09-17', label:'美联储首次降息', impact:'pos',
    detail:'美联储首次降息50bp，黄金升至$2600+。降息周期是黄金最重要的系统性正向催化剂。' },
  { d:'2025-03-31', label:'历史首破$3000', impact:'pos',
    detail:'贸易战避险+央行购金持续+美元信用担忧，黄金历史上首次突破$3000心理大关。' },
  { d:'2025-04-22', label:'$3300+ 新高', impact:'pos',
    detail:'中美关税暂停期间，黄金维持高位创新高，反映市场对全球经济秩序重构的结构性担忧。' },
]

// ─── Macro indicators (manually maintained) ──────────────────────────────────
// Manually maintained — last updated 2026-05
const GOLD_MACRO: {
  key: string; label: string; value: string; trend: string
  impact: 'bullish' | 'bearish' | 'neutral'; note: string
}[] = [
  { key: 'real_rate', label: '实际利率', value: '~0%', trend: '↓ 下降中', impact: 'bullish',
    note: '10年期国债~4.3% 减去 CPI~3.0%+ 降息通道 ≈ 接近0甚至负值，是本轮黄金飙涨的核心驱动力。实际利率越负，黄金越强。' },
  { key: 'dxy', label: '美元指数 (DXY)', value: '~98-100', trend: '↓ 持续走弱', impact: 'bullish',
    note: '美国关税政策损伤美元信用+降息周期，DXY跌破100心理关口。美元持续走弱是金价突破$4000+的关键催化剂。' },
  { key: 'cb', label: '全球央行购金', value: '1200+吨/年', trend: '↑ 历史新高', impact: 'bullish',
    note: '中、印、土、波兰等央行连续4年大规模增持创纪录，"去美元化"加速。这是黄金与利率"脱钩"的结构性原因。' },
  { key: 'cpi', label: '通胀预期 (TIPS)', value: '~3.0%', trend: '→ 平稳偏高', impact: 'neutral',
    note: '关税驱动二次通胀风险存在，通胀预期温和偏高，对黄金有温和支撑。若CPI再破3.5%将进一步催化买盘。' },
  { key: 'vix', label: '系统性风险溢价', value: '结构性偏高', trend: '↑ 上升', impact: 'bullish',
    note: '美元信用质疑+去全球化+地缘碎片化，市场对"黑天鹅"的结构性担忧托底黄金需求，不再只是恐慌性买盘。' },
  { key: 'fed', label: '美联储政策', value: '3.5–3.75%', trend: '↓ 降息中', impact: 'bullish',
    note: '处于明确降息周期，持有黄金的机会成本持续下降。历史上每次完整降息周期黄金平均上涨30%+。' },
]

// ─── Risk factors ─────────────────────────────────────────────────────────────
const GOLD_RISKS = [
  { title: '实际利率急升', detail: '若美联储重启加息或通胀骤降，实际利率飙升将严重压制黄金（2022年此场景导致黄金跌约20%）。是最大下行风险。' },
  { title: '美元强势逆转', detail: 'DXY若回升至108+，将直接压制黄金价格。通常由美国经济数据持续超预期或其他央行加息引发。' },
  { title: '央行政策转向', detail: '若主要央行（尤其中国/印度）集中减持黄金储备，将打破当前供需格局。概率低但影响持续时间长。' },
  { title: '地缘风险骤然消退', detail: '若中东+俄乌局势全面和解，地缘避险溢价消退，黄金可能短期快速回调10-15%。' },
  { title: '加密资产竞争', detail: '比特币被部分机构定位为"数字黄金"，大规模机构资金流入加密可能分流黄金的避险配置需求。' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function smaN(arr: number[], n: number) {
  if (arr.length < n) return null
  return arr.slice(-n).reduce((a, b) => a + b, 0) / n
}

function computeSignals(data: { m: string; p: number }[]) {
  const vals = data.map(d => d.p)
  if (vals.length < 6) return null

  const s3 = smaN(vals, 3), s6 = smaN(vals, 6)
  const s12 = vals.length >= 12 ? smaN(vals, 12) : null
  const s24 = vals.length >= 24 ? smaN(vals, 24) : null

  const win = Math.min(14, vals.length - 1)
  let g = 0, lo = 0
  for (let i = vals.length - win; i < vals.length; i++) {
    const diff = vals[i] - vals[i - 1]
    if (diff > 0) g += diff; else lo += Math.abs(diff)
  }
  const rsi = lo === 0 ? 100 : +(100 - 100 / (1 + g / win / (lo / win))).toFixed(1)
  const mom3 = vals.length >= 4 ? +((vals[vals.length - 1] / vals[vals.length - 4] - 1) * 100).toFixed(1) : 0
  const mom6 = vals.length >= 7 ? +((vals[vals.length - 1] / vals[vals.length - 7] - 1) * 100).toFixed(1) : 0

  const sigs: { name: string; value: string; bullish: boolean }[] = []
  if (s3 && s6) sigs.push({ name: '短期均线 3月/6月', value: s3 > s6 ? '金叉 — 短期多头' : '死叉 — 短期空头', bullish: s3 > s6 })
  if (s6 && s12) sigs.push({ name: '中期均线 6月/1年', value: (s6 ?? 0) > (s12 ?? 0) ? '中线上升趋势' : '中线下降趋势', bullish: (s6 ?? 0) > (s12 ?? 0) })
  if (s12 && s24) sigs.push({ name: '长期均线 1年/2年', value: (s12 ?? 0) > (s24 ?? 0) ? '长线多头排列' : '长线空头排列', bullish: (s12 ?? 0) > (s24 ?? 0) })
  sigs.push({
    name: 'RSI(14月)',
    value: rsi < 30 ? `${rsi} 超卖（强买入）` : rsi > 75 ? `${rsi} 超买，谨慎追高` : `${rsi} 中性`,
    bullish: rsi < 75,
  })
  sigs.push({ name: '3月动量', value: `${mom3 >= 0 ? '+' : ''}${mom3}%`, bullish: mom3 > 0 })
  sigs.push({ name: '6月动量', value: `${mom6 >= 0 ? '+' : ''}${mom6}%`, bullish: mom6 > 0 })

  let correct = 0, total = 0
  for (let i = 8; i < vals.length - 1; i++) {
    const fast = vals.slice(i - 2, i + 1).reduce((a, b) => a + b, 0) / 3
    const slow = vals.slice(i - 5, i + 1).reduce((a, b) => a + b, 0) / 6
    if ((fast > slow ? 'up' : 'down') === (vals[i + 1] > vals[i] ? 'up' : 'down')) correct++
    total++
  }
  const accuracy = total > 0 ? Math.round(correct / total * 100) : 0
  const bullPct = Math.round(sigs.filter(s => s.bullish).length / sigs.length * 100)

  return { bullPct, sigs, accuracy, total, rsi, mom3, mom6 }
}

type GRange = '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | '10Y'
const G_RANGES: GRange[] = ['1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y']
const G_MONTHS: Record<GRange, number> = { '1M':1,'3M':3,'6M':6,'1Y':12,'2Y':24,'5Y':60,'10Y':120 }
// 1Y/2Y use Yahoo weekly data; 1M/3M/6M use daily — all live
const G_LIVE: GRange[] = ['1M','3M','6M','1Y','2Y']

function filterGold(range: GRange): { m: string; p: number }[] {
  const last = GOLD_DATA[GOLD_DATA.length - 1]
  const [ly, lm] = last.m.split('-').map(Number)
  const months = G_MONTHS[range]
  return GOLD_DATA.filter(d => {
    const [y, m] = d.m.split('-').map(Number)
    return (ly - y) * 12 + (lm - m) <= months
  })
}

const GOLD_SMA_LINES = [
  { n: 6,  color: '#f59e0b99' },
  { n: 12, color: '#3b82f699' },
  { n: 24, color: '#8b5cf699' },
]

const GOLD_COLOR = '#d97706'

// ─── Component ────────────────────────────────────────────────────────────────
export function GoldAnalysis() {
  const [range, setRange] = useState<GRange>('1Y')
  const [dailyData, setDailyData] = useState<ChartPoint[] | null>(null)
  const [livePrice, setLivePrice] = useState<number | null>(null)
  const [dailyLoading, setDailyLoading] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  // GLD ETF → approximate gold spot: 1 share ≈ 0.094 troy ounces
  const GLD_TO_OUNCE = 1 / 0.094

  const fetchDaily = useCallback(async (r: GRange) => {
    setDailyLoading(true); setDailyData(null)
    try {
      const res = await fetch(`/api/stock-daily?ticker=GLD&range=${r}`, { cache: 'no-store' })
      const json = await res.json()
      if (!json.error && json.prices?.length) {
        const pts = (json.prices as ChartPoint[]).map(pt => ({
          d: pt.d,
          p: +(pt.p * GLD_TO_OUNCE).toFixed(2),
        }))
        setDailyData(pts)
        setLivePrice(pts[pts.length - 1].p)
        if (json.fetchedAt) setUpdatedAt(
          new Date(json.fetchedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        )
      }
    } catch { /* fall back to monthly */ }
    finally { setDailyLoading(false) }
  }, [])

  useEffect(() => {
    if (G_LIVE.includes(range)) fetchDaily(range)
    else { setDailyData(null); setUpdatedAt(null) }
  }, [range, fetchDaily])

  const isLive = G_LIVE.includes(range)
  const monthly = filterGold('2Y')  // always enough data for SMA
  const chartData: ChartPoint[] = isLive && dailyData
    ? dailyData
    : filterGold(range).map(d => ({ d: d.m, p: d.p }))

  const analysis = computeSignals(monthly)
  const macroBull = Math.round(GOLD_MACRO.filter(m => m.impact === 'bullish').length / GOLD_MACRO.length * 100)
  const combinedBull = analysis ? Math.round((analysis.bullPct + macroBull) / 2) : macroBull

  const isOverheated = (analysis?.rsi ?? 0) > 80
  const buyZone =
    isOverheated
      ? { zone: '过热减仓区', color: '#dc2626', bg: '#fff1f2', text: 'RSI超买（>80），短期追高风险高。建议等待5-10%回调后再加仓，可对持仓做适当减仓止盈。' }
    : combinedBull >= 68 && (analysis?.rsi ?? 99) < 75
      ? { zone: '分批建仓', color: '#16a34a', bg: '#f0fdf4', text: '宏观与技术信号共振偏多，可分2-3批建仓，单次3-5%，合计不超过目标仓位上限。' }
    : combinedBull >= 55
      ? { zone: '轻仓试探', color: '#0ea5e9', bg: '#f0f9ff', text: '信号偏多但力度中等，可先建小仓位（目标仓的1/3），等回调确认后加仓。' }
    : combinedBull >= 45
      ? { zone: '持有观望', color: '#d97706', bg: '#fffbeb', text: '多空分歧，维持现有仓位，不追高也不减仓，等待方向明朗。' }
    : { zone: '暂缓买入', color: '#dc2626', bg: '#fff1f2', text: '技术+宏观双空，等SMA金叉+宏观改善后再介入，避免接飞刀。' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── 价格图表 ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: '0.2rem' }}>
              黄金现货 · USD/oz (GLD推算) {updatedAt ? `· 更新 ${updatedAt}` : ''}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: GOLD_COLOR, lineHeight: 1 }}>
              ${(livePrice ?? GOLD_DATA[GOLD_DATA.length - 1].p).toLocaleString()}
              {livePrice && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '0.5rem', fontWeight: 400 }}>实时</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {G_RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)} style={{
                padding: '0.2rem 0.6rem', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid',
                borderColor: r === range ? GOLD_COLOR : 'var(--border)',
                backgroundColor: r === range ? GOLD_COLOR : 'transparent',
                color: r === range ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'var(--font-mono)', fontWeight: r === range ? 700 : 400,
                transition: 'all 0.15s',
              }}>{r}</button>
            ))}
            {isLive && updatedAt && (
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginLeft: '0.125rem' }}>更新 {updatedAt}</span>
            )}
          </div>
        </div>

        {dailyLoading ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px solid var(--border)', borderRadius: 10 }}>
            加载日线数据中…
          </div>
        ) : (
          <div style={{ borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', padding: '0.875rem' }}>
            <InteractiveChart
              data={chartData}
              color={GOLD_COLOR}
              height={220}
              events={GOLD_EVENTS}
              smaLines={isLive ? [] : GOLD_SMA_LINES}
              isDaily={isLive && !!dailyData}
              currencySymbol="$"
              allowFullscreen={true}
              title="黄金现货价格 (USD/oz)"
            />
          </div>
        )}
        <p style={{ marginTop: '0.4rem', fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {isLive
            ? (range === '1Y' || range === '2Y' ? '周线实时数据 (Yahoo Finance)' : '日线实时数据 (Yahoo Finance)')
            : '月度静态数据'} · 均线：<span style={{ color: '#f59e0b' }}>6月</span> · <span style={{ color: '#3b82f6' }}>1年</span> · <span style={{ color: '#8b5cf6' }}>2年</span> · 菱形 = 重大事件
        </p>
      </section>

      {/* ── 宏观指标 ── */}
      <section>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.875rem', fontFamily: 'var(--font-mono)' }}>
          影响黄金价格的核心指标
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.625rem' }}>
          {GOLD_MACRO.map(ind => {
            const isBull = ind.impact === 'bullish'
            const isBear = ind.impact === 'bearish'
            const c = isBull ? '#16a34a' : isBear ? '#dc2626' : '#d97706'
            const bg = isBull ? '#f0fdf4' : isBear ? '#fff1f2' : '#fffbeb'
            const bd = isBull ? '#86efac' : isBear ? '#fca5a5' : '#fcd34d'
            return (
              <div key={ind.key} style={{ borderRadius: '10px', border: `1px solid ${bd}`, backgroundColor: bg, padding: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: c, opacity: 0.7, marginBottom: '0.1rem' }}>{ind.label}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: c }}>{ind.value}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: '0.62rem', color: c, fontFamily: 'var(--font-mono)' }}>{ind.trend}</span>
                    <span style={{ fontSize: '0.6rem', padding: '1px 7px', borderRadius: 8, background: c + '18', color: c, fontWeight: 700, border: `1px solid ${c}33` }}>
                      {isBull ? '✓ 利好' : isBear ? '✕ 利空' : '→ 中性'}
                    </span>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.68rem', color: c, opacity: 0.8, lineHeight: 1.5 }}>{ind.note}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 技术信号 + 综合预测 ── */}
      {analysis && (
        <section>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)' }}>
            技术信号（月度数据）
          </div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '0.625rem', lineHeight: 1.5 }}>
            均线(MA)交叉、RSI超买超卖、动量强弱。均线金叉/死叉历史回测准确率 <strong style={{ color: 'var(--text)' }}>{analysis.accuracy}%</strong>（{analysis.total} 次样本）
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.3rem', marginBottom: '1rem' }}>
            {analysis.sigs.map(s => (
              <div key={s.name} style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.35rem 0.5rem',
                borderRadius: '6px',
                backgroundColor: s.bullish ? '#f0fdf4' : '#fff1f2',
                border: `1px solid ${s.bullish ? '#86efac' : '#fca5a5'}`,
              }}>
                <span style={{ fontSize: '0.65rem', color: s.bullish ? '#16a34a' : '#dc2626', marginTop: 1, flexShrink: 0 }}>{s.bullish ? '▲' : '▼'}</span>
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: s.bullish ? '#14532d' : '#7f1d1d', fontFamily: 'var(--font-mono)' }}>{s.name}</div>
                  <div style={{ fontSize: '0.7rem', color: s.bullish ? '#166534' : '#991b1b', lineHeight: 1.4 }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 综合评分 + 买入建议 */}
          <div style={{ borderRadius: '10px', border: `1px solid ${buyZone.color}40`, backgroundColor: buyZone.bg, padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontFamily: 'var(--font-mono)' }}>综合评分（技术 × 宏观各50%）</div>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: buyZone.color }}>
                  {combinedBull >= 60 ? `📈 偏多 ${combinedBull}%` : combinedBull <= 40 ? `📉 偏空 ${100 - combinedBull}%` : '➡️ 震荡整理'}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: 20, background: buyZone.color + '18', color: buyZone.color, fontWeight: 700, border: `1px solid ${buyZone.color}40` }}>
                {buyZone.zone}
              </span>
            </div>
            <div style={{ height: '7px', borderRadius: 4, overflow: 'hidden', backgroundColor: '#fee2e2', marginBottom: '0.3rem' }}>
              <div style={{ width: `${combinedBull}%`, height: '100%', backgroundColor: combinedBull >= 60 ? '#16a34a' : combinedBull >= 50 ? GOLD_COLOR : '#6b7280', borderRadius: '4px 0 0 4px', transition: 'width 0.5s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: '0.625rem' }}>
              <span>空 0%</span><span>中性 50%</span><span>多 100%</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: buyZone.color, lineHeight: 1.6 }}>{buyZone.text}</p>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <span>技术得分: {analysis.bullPct}%</span>
              <span>宏观得分: {macroBull}%</span>
              <span>RSI: {analysis.rsi}</span>
              <span>3月涨幅: {analysis.mom3 >= 0 ? '+' : ''}{analysis.mom3}%</span>
            </div>
          </div>
        </section>
      )}

      {/* ── 仓位配置建议 ── */}
      <section>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.875rem', fontFamily: 'var(--font-mono)' }}>
          仓位配置 &amp; 操作策略
        </div>
        <div style={{ borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', padding: '1rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.65 }}>
            黄金在组合中的角色是<strong>防御性对冲资产</strong>，而非进攻性收益来源。核心价值在于：
            与美股负相关（降低整体波动率）、对冲通胀尾部风险、美元信用危机时的最终避险。
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {[
              { type: '保守型', pct: '5–8%', note: '主要配实物黄金或黄金ETF（沪金、GLD），对冲通胀+尾部风险' },
              { type: '平衡型', pct: '8–15%', note: '与美股/科技股负相关特性最有价值，降低组合整体波动率' },
              { type: '激进型', pct: '5–10%', note: '平衡高风险仓位，避免过度集中科技股或单一资产' },
            ].map(r => (
              <div key={r.type} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 8, backgroundColor: 'var(--bg-secondary)' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: GOLD_COLOR, width: 50, flexShrink: 0 }}>{r.type}</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: GOLD_COLOR, width: 56, flexShrink: 0 }}>{r.pct}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.note}</span>
              </div>
            ))}
          </div>

          <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, backgroundColor: GOLD_COLOR + '10', borderLeft: `3px solid ${GOLD_COLOR}` }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text)', lineHeight: 1.6 }}>
              <strong>操作策略：</strong>分批进入，每次不超过目标仓位的1/3。回调5-10%时加仓。避免在 RSI &gt; 75 且短期涨幅超15%时追高，此时风险回报比明显恶化。<br/>
              <strong>止损参考：</strong>跌破200日均线（约5-8%跌幅时）可减仓50%等待确认；跌破后若收回则补回仓位。
            </p>
          </div>
        </div>
      </section>

      {/* ── 风险提示 ── */}
      <section>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.875rem', fontFamily: 'var(--font-mono)' }}>
          主要下行风险
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {GOLD_RISKS.map(r => (
            <div key={r.title} style={{ padding: '0.625rem 0.875rem', borderRadius: 8, backgroundColor: 'var(--surface)', border: '1px solid #fca5a599' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.2rem' }}>⚠ {r.title}</div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{r.detail}</p>
            </div>
          ))}
        </div>
        <p style={{ marginTop: '0.75rem', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
          历史数据与静态模型分析 · 宏观指标每周人工更新 · 仅供参考，不构成投资建议
        </p>
      </section>

    </div>
  )
}
