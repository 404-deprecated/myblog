import ASharePanel from '@/components/ASharePanel'
import SwingMonitor from '@/components/SwingMonitor'
import StrategyScreener from '@/components/StrategyScreener'
import SevenProverbs from './SevenProverbs'
import SectionLabel from './SectionLabel'

export default function StageTechnical() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SevenProverbs />
      <section>
        <SectionLabel>策略匹配器 · A股短线/中线策略自动筛选</SectionLabel>
        <StrategyScreener />
      </section>
      <section>
        <SectionLabel>A股实时行情 · 盘口 · 技术指标 · 自选信号</SectionLabel>
        <ASharePanel />
      </section>
      <section>
        <SectionLabel>短线盯盘 · 龙头候选 · 主力资金 · 七条口诀信号</SectionLabel>
        <SwingMonitor />
      </section>
    </div>
  )
}
