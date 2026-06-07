'use client'

import MacroScorePanel from '@/components/MacroScorePanel'
import { InteractiveChart, type ChartEvent, type ChartPoint } from '@/components/InteractiveChart'
import SectionLabel from './SectionLabel'
import TrendPredictionPanel from './TrendPredictionPanel'
import MarketEventsFreshness from './MarketEventsFreshness'
import { TIMELINE_EVENTS, RISK_INDICATORS, RISK_STATUS_STYLES, type Range } from '../market-data'

interface Props {
  range: Range
  setRange: (r: Range) => void
  nasdaqChartData: ChartPoint[]
  shanghaiChartData: ChartPoint[]
  hangSengChartData: ChartPoint[]
  nasdaqFiltered: { m: string; p: number }[]
  shanghaiFiltered: { m: string; p: number }[]
  hangSengFiltered: { m: string; p: number }[]
  isLiveRange: boolean
  indexDailyUpdated: string | null
  indexDailyLoading: boolean
  nasdaqEvents: ChartEvent[]
  shanghaiEvents: ChartEvent[]
  hangSengEvents: ChartEvent[]
  RANGES: { key: Range; label: string }[]
}

export default function StageMacro(props: Props) {
  const { range, setRange, nasdaqChartData, shanghaiChartData, hangSengChartData,
    nasdaqFiltered, shanghaiFiltered, hangSengFiltered, isLiveRange, indexDailyUpdated,
    indexDailyLoading, nasdaqEvents, shanghaiEvents, hangSengEvents, RANGES } = props

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <section>
        <SectionLabel>宏观/中观/情绪三层评分</SectionLabel>
        <MacroScorePanel />
      </section>
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <SectionLabel>指数走势</SectionLabel>
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            {RANGES.map(r => (
              <button key={r.key} onClick={() => setRange(r.key)} style={{
                padding: '0.2rem 0.6rem', fontSize: '0.72rem', borderRadius: '6px',
                border: '1px solid', borderColor: r.key === range ? 'var(--accent)' : '#d1d5db',
                backgroundColor: r.key === range ? 'var(--accent)' : 'transparent',
                color: r.key === range ? '#fff' : '#6b7280', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontWeight: r.key === range ? 700 : 400,
              }}>{r.label}</button>
            ))}
            {isLiveRange && indexDailyUpdated && <span style={{ fontSize: '0.62rem', color: '#6b7280' }}>更新 {indexDailyUpdated}</span>}
          </div>
        </div>
        {indexDailyLoading && <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '0.8rem', border: '1px solid #d1d5db', borderRadius: 10 }}>加载日线数据…</div>}
        {!indexDailyLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
            {[
              { label: '纳斯达克综合指数', data: nasdaqChartData, color: '#2563eb', events: nasdaqEvents, title: '纳斯达克综合指数' },
              { label: '上证综合指数', data: shanghaiChartData, color: '#d97706', events: shanghaiEvents, title: '上证综合指数' },
              { label: '恒生指数', data: hangSengChartData, color: '#7c3aed', events: hangSengEvents, title: '恒生指数' },
            ].map(chart => (
              <div key={chart.label} style={{ borderRadius: '10px', border: '1px solid #d1d5db', backgroundColor: '#fff', padding: '0.875rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.375rem' }}>{chart.label}</div>
                <InteractiveChart data={chart.data} color={chart.color} height={150} events={chart.events} isDaily={isLiveRange} allowFullscreen={true} title={chart.title} />
              </div>
            ))}
          </div>
        )}
      </section>
      <section>
        <SectionLabel>趋势预测（技术分析模型）</SectionLabel>
        <TrendPredictionPanel nasdaqData={nasdaqFiltered} shanghaiData={shanghaiFiltered} hangSengData={hangSengFiltered} />
      </section>
      <section>
        <SectionLabel>当前风险指标</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.625rem' }}>
          {RISK_INDICATORS.map(r => {
            const s = RISK_STATUS_STYLES[r.status]
            return (
              <div key={r.label} style={{ borderRadius: '10px', border: `1px solid ${s.border}`, backgroundColor: s.bg, padding: '0.875rem' }}>
                <div style={{ fontSize: '0.7rem', color: s.text, opacity: 0.7, marginBottom: '0.25rem' }}>{r.label}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: s.text }}>{r.value}</div>
                <div style={{ fontSize: '0.7rem', color: s.text, opacity: 0.6, lineHeight: 1.4 }}>{r.note}</div>
              </div>
            )
          })}
        </div>
      </section>
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <SectionLabel>影响市场的重大事件</SectionLabel>
          <MarketEventsFreshness />
        </div>
        <div style={{ borderRadius: '10px', border: '1px solid #d1d5db', backgroundColor: '#fff', padding: '1rem 1.25rem' }}>
          {TIMELINE_EVENTS.map((ev, i) => (
            <div key={`${ev.d}-${ev.label}`} style={{ display: 'flex', gap: '1rem', paddingTop: i === 0 ? 0 : '0.875rem', paddingBottom: i === TIMELINE_EVENTS.length - 1 ? 0 : '0.875rem', borderBottom: i < TIMELINE_EVENTS.length - 1 ? '1px solid #d1d5db' : 'none' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: ev.impact === 'pos' ? '#22c55e' : '#ef4444', flexShrink: 0, marginTop: '5px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#6b7280' }}>{ev.d}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1f2937' }}>{ev.label}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.5 }}>{ev.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
