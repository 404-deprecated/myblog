import ZuotHelper from '@/components/ZuotHelper'
import PositionSizingCalculator from './PositionSizingCalculator'
import SectionLabel from './SectionLabel'

export default function StageExecution() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <section>
        <SectionLabel>仓位计算 · 2%原则 · 止损止盈</SectionLabel>
        <PositionSizingCalculator />
      </section>
      <section>
        <SectionLabel>卖出规则（强制纪律）</SectionLabel>
        <div style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #fca5a5', backgroundColor: '#fff1f2', fontSize: '0.65rem', lineHeight: 1.7, color: '#991b1b' }}>
          <strong>📋 执行规则</strong><br/>
          🔴 卖出：-5%硬止损 / 放量滞涨立即卖 / 跌破5日线 / 板块连续2日无涨停<br/>
          🟡 止盈：+10%卖一半 +20%全清 持仓≤3个交易日<br/>
          🟢 买入：上升趋势+连续小涨+缩量新低+低位横盘新低<br/>
          ⚖️ 宁可少进勿多买 · 单笔亏损≤总资金2%
        </div>
      </section>
      <section>
        <SectionLabel>京东方A 做T助手（示例）</SectionLabel>
        <ZuotHelper />
      </section>
    </div>
  )
}
