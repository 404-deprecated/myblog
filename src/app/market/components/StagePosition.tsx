import StockManager from '@/components/StockManager'
import { PortfolioWatchlist } from '@/components/PortfolioWatchlist'
import { StockStreakDashboard } from '@/components/StockStreakDashboard'
import AttributionPanel from '@/components/AttributionPanel'
import SectionLabel from './SectionLabel'

export default function StagePosition() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <section>
        <SectionLabel>自选股管理中心 · 增删改查 · 激活/停用</SectionLabel>
        <StockManager />
      </section>
      <section>
        <SectionLabel>我的持仓观察（美股/港股/A股/韩股）</SectionLabel>
        <PortfolioWatchlist />
      </section>
      <StockStreakDashboard />
      <section>
        <SectionLabel>±10% 波动归因面板</SectionLabel>
        <AttributionPanel />
      </section>
    </div>
  )
}
