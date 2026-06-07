'use client'

import { useEffect, useState, useCallback } from 'react'
import { InteractiveChart, type ChartPoint } from '@/components/InteractiveChart'
import { GoldAnalysis } from '@/components/GoldAnalysis'
import MacroScorePanel from '@/components/MacroScorePanel'
import StageMacro from './components/StageMacro'
import StageFundamental from './components/StageFundamental'
import StageTechnical from './components/StageTechnical'
import StageExecution from './components/StageExecution'
import StagePosition from './components/StagePosition'
import StageReview from './components/StageReview'
import FundAnalysisTab from './components/FundAnalysisTab'
import SectionLabel from './components/SectionLabel'
import {
  NASDAQ_DATA, SHANGHAI_DATA, HANG_SENG_DATA,
  NASDAQ_EVENTS, SHANGHAI_EVENTS, HANG_SENG_EVENTS,
  type Range, RANGES, RANGE_MONTHS, MARKET_LIVE_RANGES,
  filterByRange, toChartPts,
} from './market-data'

// ─── 8-Tab Trading Workflow ────────────────────────────────────────
type TabId = 'macro' | 'fundamental' | 'technical' | 'execute' | 'position' | 'review' | 'fund' | 'gold'
const TABS: { id: TabId; label: string }[] = [
  { id: 'macro',       label: '① 宏观' },
  { id: 'fundamental', label: '② 选股' },
  { id: 'technical',   label: '③ 择时' },
  { id: 'execute',     label: '④ 执行' },
  { id: 'position',    label: '⑤ 持仓' },
  { id: 'review',      label: '⑥ 复盘' },
  { id: 'fund',        label: '基金' },
  { id: 'gold',        label: '黄金' },
]

export default function MarketDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('macro')
  const [range, setRange] = useState<Range>('2Y')

  // Index chart state
  const [indexDaily, setIndexDaily] = useState<{ nasdaq: ChartPoint[]; shanghai: ChartPoint[]; hangSeng: ChartPoint[] } | null>(null)
  const [indexDailyLoading, setIndexDailyLoading] = useState(false)
  const [indexDailyUpdated, setIndexDailyUpdated] = useState<string | null>(null)

  const fetchIndexDaily = useCallback(async (r: Range) => {
    setIndexDailyLoading(true); setIndexDaily(null)
    try {
      const [nRes, sRes, hRes] = await Promise.all([
        fetch(`/api/stock-daily?ticker=^IXIC&range=${r}`, { cache: 'no-store' }),
        fetch(`/api/stock-daily?ticker=000001.SS&range=${r}`, { cache: 'no-store' }),
        fetch(`/api/stock-daily?ticker=^HSI&range=${r}`, { cache: 'no-store' }),
      ])
      const [nJson, sJson, hJson] = await Promise.all([nRes.json(), sRes.json(), hRes.json()])
      setIndexDaily({ nasdaq: (nJson.prices ?? []) as ChartPoint[], shanghai: (sJson.prices ?? []) as ChartPoint[], hangSeng: (hJson.prices ?? []) as ChartPoint[] })
      if (nJson.fetchedAt) setIndexDailyUpdated(new Date(nJson.fetchedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
    } catch {} finally { setIndexDailyLoading(false) }
  }, [])

  useEffect(() => {
    if (MARKET_LIVE_RANGES.includes(range)) fetchIndexDaily(range)
    else { setIndexDaily(null); setIndexDailyUpdated(null) }
  }, [range, fetchIndexDaily])

  // Chart data
  const isLiveRange = MARKET_LIVE_RANGES.includes(range)
  const nasdaqFiltered = filterByRange(NASDAQ_DATA, '5Y')
  const shanghaiFiltered = filterByRange(SHANGHAI_DATA, '5Y')
  const hangSengFiltered = filterByRange(HANG_SENG_DATA, '5Y')
  const nasdaqChartData: ChartPoint[] = isLiveRange && indexDaily ? indexDaily.nasdaq : toChartPts(filterByRange(NASDAQ_DATA, range))
  const shanghaiChartData: ChartPoint[] = isLiveRange && indexDaily ? indexDaily.shanghai : toChartPts(filterByRange(SHANGHAI_DATA, range))
  const hangSengChartData: ChartPoint[] = isLiveRange && indexDaily ? indexDaily.hangSeng : toChartPts(filterByRange(HANG_SENG_DATA, range))

  const RANGE_BTNS = [
    { key: '1M' as Range, label: '1M' }, { key: '3M' as Range, label: '3M' }, { key: '6M' as Range, label: '6M' },
    { key: '1Y' as Range, label: '1Y' }, { key: '2Y' as Range, label: '2Y' }, { key: '5Y' as Range, label: '5Y' }, { key: '10Y' as Range, label: '10Y' },
  ]

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
          $ market --trade
        </p>
        <h1 style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
          市场仪表盘
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
          宏观→选股→择时→执行→持仓→复盘 · 六步专业操盘流程
        </p>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '2rem', borderBottom: '1px solid #d1d5db', paddingBottom: '0' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '0.55rem 1.1rem', fontSize: '0.88rem', fontWeight: activeTab === tab.id ? 700 : 400,
            border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`,
            background: 'none', color: activeTab === tab.id ? 'var(--accent)' : '#6b7280',
            cursor: 'pointer', transition: 'all 0.15s', marginBottom: '-1px', whiteSpace: 'nowrap',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ═══════ ① 宏观研究 ═══════ */}
      {activeTab === 'macro' && (
        <StageMacro
          range={range} setRange={setRange}
          nasdaqChartData={nasdaqChartData} shanghaiChartData={shanghaiChartData} hangSengChartData={hangSengChartData}
          nasdaqFiltered={nasdaqFiltered} shanghaiFiltered={shanghaiFiltered} hangSengFiltered={hangSengFiltered}
          isLiveRange={isLiveRange} indexDailyUpdated={indexDailyUpdated} indexDailyLoading={indexDailyLoading}
          nasdaqEvents={NASDAQ_EVENTS} shanghaiEvents={SHANGHAI_EVENTS} hangSengEvents={HANG_SENG_EVENTS}
          RANGES={RANGE_BTNS}
        />
      )}
      {/* ═══════ ② 基本面选股 ═══════ */}
      {activeTab === 'fundamental' && <StageFundamental />}
      {/* ═══════ ③ 技术面择时 ═══════ */}
      {activeTab === 'technical' && <StageTechnical />}
      {/* ═══════ ④ 交易执行 ═══════ */}
      {activeTab === 'execute' && <StageExecution />}
      {/* ═══════ ⑤ 持仓管理 ═══════ */}
      {activeTab === 'position' && <StagePosition />}
      {/* ═══════ ⑥ 复盘优化 ═══════ */}
      {activeTab === 'review' && <StageReview />}
      {/* ═══════ 基金工具 ═══════ */}
      {activeTab === 'fund' && <FundAnalysisTab />}
      {/* ═══════ 黄金分析 ═══════ */}
      {activeTab === 'gold' && (
        <section>
          <SectionLabel>黄金 · 价格 · 宏观驱动因子 · 配置建议</SectionLabel>
          <GoldAnalysis />
        </section>
      )}

      {/* Footer */}
      <div style={{ marginTop: '3rem', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', fontSize: '0.7rem', color: '#6b7280', lineHeight: 1.7 }}>
        <div style={{ fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem', fontSize: '0.75rem' }}>数据源与准确性说明</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.5rem' }}>
          {[
            ['实时行情', 'Yahoo Finance（美股/港股/A股/ETF/黄金GLD）', '延迟约15分钟，仅交易时段更新。'],
            ['宏观经济数据', 'FRED（美联储经济数据库）', '部分指标可能有1-2周滞后。'],
            ['股票基本面', '手动维护', 'PE/PEG/增速/财报日期来自公开财报，不定期更新。'],
            ['A股实时盘口', '新浪财经 + 东方财富', '5档买卖盘口/技术指标/资金流向。'],
            ['AI分析', 'MiniMax API', '基金分析和截图分析由AI生成，不保证准确性。'],
            ['预测模型', '统计模型 + 技术指标', '基于SMA/RSI/布林带等指标，历史回测准确率供参考。'],
          ].map(([title, source, note]) => (
            <div key={title}><strong style={{ color: '#1f2937' }}>{title}</strong> — {source}<br/><span style={{ opacity: 0.6 }}>{note}</span></div>
          ))}
        </div>
      </div>
    </div>
  )
}
