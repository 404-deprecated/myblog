export default function SevenProverbs() {
  return (
    <div style={{ padding: '0.625rem 0.875rem', borderRadius: '10px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1f2937' }}>📜 七条短线口诀</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.4rem' }}>
        {[
          { icon: '🔔', rule: '不冲高不卖，不跳水不买，横盘不交易', color: '#6366f1' },
          { icon: '📈', rule: '连续小涨是真涨，连续大涨要离场', color: '#16a34a' },
          { icon: '🏔️', rule: '高位横盘再冲高→赶紧抛 | 低位横盘又新低→重仓买', color: '#dc2626' },
          { icon: '⚖️', rule: '下手买票先准备，宁可少进勿多买', color: '#d97706' },
          { icon: '📉', rule: '缩量新低是底部，缩量回升是问题', color: '#0891b2' },
          { icon: '🔄', rule: '热股不留恋，持股要换新，从头拿到尾一场空', color: '#7c3aed' },
          { icon: '⬆️', rule: '永远只做上升趋势的股票', color: '#059669' },
        ].map(({ icon, rule, color }) => (
          <div key={rule} style={{
            padding: '0.3rem 0.5rem', borderRadius: '6px',
            backgroundColor: `${color}08`, border: `1px solid ${color}30`,
            fontSize: '0.62rem', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.35rem',
          }}>
            <span style={{ fontSize: '0.75rem', flexShrink: 0 }}>{icon}</span>
            <span style={{ lineHeight: 1.4 }}>{rule}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
