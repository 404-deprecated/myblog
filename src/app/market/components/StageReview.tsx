import { ReviewDashboard } from '@/components/ReviewDashboard'
import { PredictionReview } from '@/components/PredictionReview'
import SectionLabel from './SectionLabel'

export default function StageReview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <section>
        <SectionLabel>复盘仪表盘 · 准确率统计 · 纠错建议 · 趋势追踪</SectionLabel>
        <ReviewDashboard />
      </section>
      <section>
        <SectionLabel>每日预测 · 生成与管理</SectionLabel>
        <PredictionReview />
      </section>
    </div>
  )
}
