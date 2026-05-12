'use client'

import { useState } from 'react'

interface Term {
  term: string
  abbr?: string
  plain: string
  example?: string
  tag?: 'bullish' | 'bearish' | 'neutral'
}

interface Section {
  title: string
  emoji: string
  terms: Term[]
}

const SECTIONS: Section[] = [
  {
    title: '技术分析基础',
    emoji: '📊',
    terms: [
      {
        term: '移动平均线',
        abbr: 'SMA（Simple Moving Average）',
        plain: '把过去 N 天/月的收盘价加起来除以 N，得到一条"平滑"的曲线。数字越小代表越短期，数字越大代表越长期。比如 SMA5 = 过去5天平均价，SMA60 = 过去60天平均价。',
        example: '📌 SMA5 在 SMA20 上方，说明短期价格比中期更高，通常是上涨趋势的信号（称为"多头排列"）。',
      },
      {
        term: '相对强弱指数',
        abbr: 'RSI（Relative Strength Index）',
        plain: '衡量一段时间内上涨天数的"力度"相对于下跌天数。数值在 0–100 之间。高于 70 表示"涨太多了可能要回调"（超买），低于 30 表示"跌太多了可能要反弹"（超卖）。',
        example: '📌 RSI = 82：已经连续大涨，可能快要"累了"开始回调，需要谨慎追高。',
        tag: 'neutral',
      },
      {
        term: '动量',
        abbr: 'Momentum / mom5 / mom20',
        plain: '衡量价格在一段时间内的变化幅度。"5日动量 +10%" 就是说过去5天涨了10%。动量为正说明在上涨趋势中，为负说明在下跌趋势中。',
        example: '📌 mom5 = +4.8%：过去5个交易日累计上涨4.8%，短期趋势偏强。',
      },
      {
        term: '平均真实波幅',
        abbr: 'ATR（Average True Range）',
        plain: '衡量一只股票/指数"每天平均波动多少钱"。ATR 越大说明波动越剧烈。我们用它来估算"明天价格大概会在哪个范围内"，也就是预测中的"目标区间"。',
        example: '📌 NVDA 的 ATR = $6：说明平均每天涨跌约6美元，预测目标区间就是当天价格 ±6美元左右。',
      },
      {
        term: '多头排列',
        plain: '短期均线 > 中期均线 > 长期均线，三条均线从上到下排列整齐。说明短期、中期、长期都在上涨，趋势向上。',
        tag: 'bullish',
      },
      {
        term: '空头排列',
        plain: '短期均线 < 中期均线 < 长期均线，与多头排列相反。说明短期、中期、长期都在下跌，趋势向下。',
        tag: 'bearish',
      },
      {
        term: '超买',
        plain: 'RSI > 70，说明最近一段时间持续上涨、买盘过于集中，可能短期内会有回调。不代表一定会跌，只是提示风险。',
        tag: 'bearish',
      },
      {
        term: '超卖',
        plain: 'RSI < 30，说明最近一段时间持续下跌、卖盘过于集中，可能短期内会有反弹。不代表一定会涨，只是提示机会。',
        tag: 'bullish',
      },
    ],
  },
  {
    title: '宏观经济指标',
    emoji: '🌍',
    terms: [
      {
        term: '联邦基金利率',
        abbr: 'FEDFUNDS',
        plain: '美联储（美国的"央行"）设定的基准利率。利率越低，借钱越便宜，企业扩张越容易，股市通常受益。利率越高，借钱越贵，科技/成长股估值会被压制。',
        example: '📌 利率从 5.5% 降到 3.75%：降息周期，对股市尤其是科技股是利好。',
        tag: 'bullish',
      },
      {
        term: '消费者价格指数',
        abbr: 'CPI（Consumer Price Index）通货膨胀',
        plain: '衡量日常商品和服务价格涨幅的指标。CPI 越高说明通胀越严重，美联储可能加息来压制通胀，对股市不利。CPI 接近 2% 是美联储的目标，被视为"健康"状态。',
        example: '📌 CPI 同比 2.7%：接近目标区间，美联储降息压力减小，股市友好。',
      },
      {
        term: '10年期美债收益率',
        abbr: 'DGS10 / 十年期国债',
        plain: '借钱给美国政府10年，每年能得到多少利息回报。这个数字会影响所有资产的估值——收益率越高，持有股票的吸引力相对越低；收益率越低，资金更愿意流入股市。',
        example: '📌 10年期国债收益率 = 4.5%：利率偏高，会压制成长股估值，尤其是高PE科技股。',
        tag: 'neutral',
      },
      {
        term: '收益率曲线（10Y-2Y）',
        abbr: 'T10Y2Y / 利差',
        plain: '10年期国债收益率减去2年期国债收益率的差值。正常情况下这个差值应该是正的（长期收益率更高）。如果是负数（称为"倒挂"），历史上往往预示经济衰退即将来临。',
        example: '📌 利差 = +0.5：曲线恢复正常，经济扩张信号。若 = -0.3 则处于倒挂，需警惕。',
        tag: 'neutral',
      },
      {
        term: '恐慌指数',
        abbr: 'VIX（Volatility Index）',
        plain: '衡量市场对未来30天波动性的预期。VIX < 15 说明市场平静乐观，VIX > 30 说明市场非常紧张恐慌。VIX 急剧上升通常对应市场大跌。',
        example: '📌 VIX = 17：正常偏低，市场情绪健康。VIX = 45（如2020年3月疫情）：极度恐慌。',
        tag: 'neutral',
      },
      {
        term: 'WTI 原油价格',
        abbr: 'DCOILWTICO / 布伦特原油',
        plain: '西德克萨斯轻质原油的价格，是全球石油价格的重要基准。油价高推升通胀，给科技/消费股带来压力；油价适中（$60–80）对股市中性偏正面。',
        example: '📌 WTI = $70：低位，抑制通胀，利好科技和消费板块。',
      },
      {
        term: '美元贸易加权指数',
        abbr: 'DTWEXBGS（注意：不等于 DXY）',
        plain: '衡量美元对一篮子主要贸易伙伴货币的综合强弱。美元走弱通常利好大宗商品（黄金、石油）和新兴市场股市；美元走强则相反。DTWEXBGS 的数值范围约在 110–125，与常说的 DXY（约 95–105）不同。',
        example: '📌 DTWEXBGS = 118 且下行：美元走弱，海外营收企业（如苹果、微软）受益，金价上涨。',
      },
    ],
  },
  {
    title: '估值指标',
    emoji: '💰',
    terms: [
      {
        term: '市盈率（前向）',
        abbr: 'Forward P/E（Price-to-Earnings）',
        plain: '股价除以"预期未来12个月的每股盈利"。PE 越高说明市场愿意为这家公司的成长支付更高溢价。纳指整体前向 PE 约 30x，历史均值约 23x，现在偏贵。',
        example: '📌 NVDA 前向 PE = 45x：市场预期其未来盈利会大幅增长，愿意付出高溢价。',
        tag: 'neutral',
      },
      {
        term: '巴菲特指标',
        abbr: 'Buffett Indicator = 股市总市值 / GDP',
        plain: '美国股市总市值除以美国 GDP。巴菲特认为这个比值超过100%就偏贵，超过150%就非常贵。目前约 250%，处于历史极高位，说明美股整体估值偏高。',
        example: '📌 巴菲特指标 250%：历史均值约 150%，远超历史平均，系统性风险较高。',
        tag: 'bearish',
      },
      {
        term: '市净率',
        abbr: 'P/B（Price-to-Book）',
        plain: '股价除以每股净资产（账面价值）。反映市场愿意为公司资产支付多少溢价。银行、地产等传统行业常用。PB < 1 说明股价低于公司账面价值，可能存在低估机会。',
      },
      {
        term: '营收增速',
        abbr: 'Revenue Growth %',
        plain: '公司营业收入相比去年同期增长了多少百分比。AI 相关公司通常有 20%–100%+ 的高增速，这也是支撑其高 PE 的理由。',
        example: '📌 NVDA 营收同比增速 +122%：超高速增长，是 AI 算力需求爆发的直接体现。',
        tag: 'bullish',
      },
      {
        term: '毛利率',
        abbr: 'Gross Margin %',
        plain: '收入减去直接成本后剩余的比例。毛利率越高，说明产品竞争力越强、定价权越高。软件公司毛利率通常 70%+，硬件公司 40%–60%。',
        example: '📌 NVDA 毛利率 ~75%：芯片业中极高，说明其产品几乎无可替代。',
        tag: 'bullish',
      },
    ],
  },
  {
    title: '宏观评分体系（本站专用）',
    emoji: '🧭',
    terms: [
      {
        term: '宏观层',
        plain: '分析利率、通胀、国债收益率、油价、美元等宏观经济数据，判断整体经济环境是否对股市友好。在综合评分中占 40% 权重。',
      },
      {
        term: '中观层（赛道层）',
        plain: '分析行业景气度、技术变革叙事强度、竞争格局等。比如"AI 算力超级周期"就是一个强烈的中观层多头信号。在综合评分中占 30% 权重。',
        tag: 'bullish',
      },
      {
        term: '情绪层',
        plain: '分析市场情绪指标，包括 VIX 恐慌指数、地缘政治风险、市场宽度（多少股票在上涨）。在综合评分中占 30% 权重。',
      },
      {
        term: '综合得分（牛市百分比）',
        plain: '将宏观层、中观层、情绪层三个评分加权合并，映射到 0–100%。60% 以上偏多（看涨），40% 以下偏空（看跌），40%–60% 中性震荡。',
        example: '📌 综合得分 68%：偏多，整体环境利好股市，但仍有32%的不确定性。',
      },
      {
        term: '技术得分 × 60% + 宏观得分 × 40%',
        plain: '本站预测每日股价方向的计算公式。技术分析（当前价格走势信号）占六成，宏观环境判断占四成，两者加权得出"明日看涨概率"。',
        example: '📌 技术 80% × 0.6 + 宏观 69% × 0.4 = 75.6%，四舍五入后显示看涨 76%。',
      },
    ],
  },
  {
    title: '预测与复盘系统',
    emoji: '🔮',
    terms: [
      {
        term: '看涨 / 看跌 / 震荡',
        plain: '预测明天价格走势的三种方向。看涨（up）= 预测上涨超过0.3%；看跌（down）= 预测下跌超过0.3%；震荡（flat）= 预测涨跌幅在0.3%以内。',
      },
      {
        term: '置信度',
        plain: '模型对这次预测有多大把握，0–100%。置信度越高，说明多头/空头信号越集中一致。置信度低（<55%）的预测参考价值有限。',
        example: '📌 置信度 88%：技术信号和宏观方向高度一致，预测把握较大。',
      },
      {
        term: '目标区间',
        plain: '基于近10天的平均日波幅（ATR）估算出的"明天价格最可能的范围"。上下限 = 当日收盘价 ± ATR × 0.9。',
        example: '📌 目标区间 $216–$224：预测明天 NVDA 价格大概率在这个区间内收盘。',
      },
      {
        term: '复盘 / 事后分析',
        plain: '预测日期过后，系统自动拉取实际收盘价，对比预测方向，判断预测正确或错误。若错误，系统会生成一段分析文字说明"为什么猜错了"（称为 Post-Mortem）。',
      },
      {
        term: '财报预测',
        plain: '在公司公布财报前，预测财报发布后股价会上涨、下跌还是震荡。财报后系统自动对比实际价格变化，标记预测准确率。',
        example: '📌 NVDA 财报预测"大涨"，置信72%：基于 Blackwell 芯片超预期出货的逻辑。',
      },
    ],
  },
  {
    title: '黄金指标',
    emoji: '🥇',
    terms: [
      {
        term: '实际利率',
        plain: '名义利率（国债收益率）减去通货膨胀率。实际利率越低甚至为负，黄金越有吸引力（因为持有现金会"缩水"）。2020–2021年实际利率为负，黄金大涨至$2,000+。',
        tag: 'bullish',
      },
      {
        term: '央行购金',
        plain: '各国央行增加黄金储备的行为。过去几年全球央行（尤其是中国、印度、俄罗斯）大量购买黄金，每年购金量超过1000吨，是金价的重要支撑力量。',
        tag: 'bullish',
      },
      {
        term: '美元与黄金的关系',
        plain: '黄金以美元计价，美元走强通常意味着黄金价格承压（因为其他货币持有者购买成本更高）；美元走弱通常利好金价。但近年这一关系有所弱化。',
      },
      {
        term: '重仓建仓区 / 分批建仓 / 减仓区',
        plain: '本站根据金价距离历史高低点的位置给出的操作建议区间。距离近期高点跌幅超过15%时视为低位，可考虑重仓；距离近期低点涨幅超过60%时视为高位，建议减仓。',
      },
    ],
  },
  {
    title: '基金与 ETF',
    emoji: '📦',
    terms: [
      {
        term: 'ETF',
        abbr: '（Exchange-Traded Fund）交易所交易基金',
        plain: '像股票一样在证券交易所买卖的基金。追踪某个指数或行业的涨跌，一次买入就等于买入了一篮子股票，分散风险。',
      },
      {
        term: 'QQQ',
        plain: '追踪纳斯达克100指数（100家最大的非金融科技公司）的 ETF。买 QQQ ≈ 买入苹果+微软+英伟达+谷歌等科技巨头的组合。是"美国成长股/科技股"的最佳代理。',
        tag: 'bullish',
      },
      {
        term: 'KWEB',
        plain: '追踪中国互联网公司的 ETF，主要成分股是腾讯、阿里、美团、京东等。是"中概互联网"板块的代理指标，港股和A股中概互联基金走势与其高度相关。',
      },
      {
        term: 'SMH',
        plain: '追踪全球最大半导体公司的 ETF，成分股包括 NVDA、英特尔、博通、台积电等。是 AI 基础设施/芯片行业的代理指标。',
      },
      {
        term: 'ARKK',
        plain: '由 ARK Investment 管理的主动型创新科技 ETF，重仓特斯拉、Palantir、Roku 等颠覆性科技公司。高风险高弹性，与"创新成长"类基金走势相关。',
      },
      {
        term: '择时',
        plain: '判断什么时候买入、什么时候卖出。基金择时分析是通过分析基金的历史高低点位置、宏观环境等，给出当前是否适合买入的建议。',
      },
    ],
  },
  {
    title: '股票与财报',
    emoji: '📋',
    terms: [
      {
        term: '财报季',
        plain: '上市公司每季度公布一次财务结果（收入、利润、下季度指引）。美股主要财报季在每年的1月、4月、7月、10月。财报超预期通常股价大涨，低于预期则大跌。',
      },
      {
        term: 'EPS',
        abbr: '（Earnings Per Share）每股盈利',
        plain: '公司净利润除以总股本，每股赚了多少钱。财报核心指标之一。实际 EPS 高于分析师预期称为"超预期"（Beat），低于预期称为"不及预期"（Miss）。',
      },
      {
        term: '指引 / Guidance',
        plain: '公司管理层在财报中对下个季度/年度收入和利润的预测。市场有时更关注"指引"而非当季结果——就算当季超预期，若指引保守也可能股价下跌。',
      },
      {
        term: 'RPO',
        abbr: '（Remaining Performance Obligation）积压订单',
        plain: '已签合同但尚未确认为收入的订单总额，代表公司未来的"锁定收入"。RPO 越高说明业务能见度越好。甲骨文（ORCL）的 RPO 持续创历史新高是其股价上涨的重要逻辑。',
        tag: 'bullish',
      },
      {
        term: 'ARPU',
        abbr: '（Average Revenue Per User）每用户平均收入',
        plain: '平台每个活跃用户贡献多少收入。微信、抖音等社交/内容平台常用此指标。ARPU 提升说明变现效率在提高，即使用户数增速放缓也能保持收入增长。',
      },
    ],
  },
]

// ─── Term card ────────────────────────────────────────────────────────────────
function TermCard({ term }: { term: Term }) {
  const [open, setOpen] = useState(false)
  const tagColor = term.tag === 'bullish' ? '#16a34a' : term.tag === 'bearish' ? '#dc2626' : undefined

  return (
    <div style={{
      borderRadius: 8,
      border: '1px solid var(--border)',
      backgroundColor: 'var(--surface)',
      overflow: 'hidden',
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '0.625rem 0.875rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
        }}
      >
        {tagColor && (
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: tagColor, flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>{term.term}</span>
          {term.abbr && (
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 6, fontFamily: 'var(--font-mono)' }}>
              {term.abbr}
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{
          padding: '0 0.875rem 0.875rem',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--bg-secondary)',
        }}>
          <p style={{ margin: '0.625rem 0 0', fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.7 }}>
            {term.plain}
          </p>
          {term.example && (
            <p style={{
              margin: '0.5rem 0 0',
              fontSize: '0.77rem',
              color: '#1e40af',
              lineHeight: 1.6,
              backgroundColor: '#eff6ff',
              borderLeft: '3px solid #93c5fd',
              padding: '0.375rem 0.625rem',
              borderRadius: '0 4px 4px 0',
            }}>
              {term.example}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function GlossaryPanel() {
  const [search, setSearch] = useState('')
  const [openSection, setOpenSection] = useState<string | null>(null)

  const q = search.trim().toLowerCase()

  // When searching, show all matched terms flat; otherwise show by section
  const matchedSections = SECTIONS.map(s => ({
    ...s,
    terms: q
      ? s.terms.filter(t =>
          t.term.toLowerCase().includes(q) ||
          (t.abbr ?? '').toLowerCase().includes(q) ||
          t.plain.toLowerCase().includes(q)
        )
      : s.terms,
  })).filter(s => s.terms.length > 0)

  const totalTerms = SECTIONS.reduce((n, s) => n + s.terms.length, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.125rem',
        borderRadius: 10,
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.375rem' }}>
          📖 投资术语小白词典
        </div>
        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          收录本站所有专业名词的通俗解释，共 {totalTerms} 个术语。
          点击任意词条展开详细说明，蓝色框是具体举例。
          <span style={{ color: '#16a34a', fontWeight: 600 }}> 绿点</span> = 偏利好，
          <span style={{ color: '#dc2626', fontWeight: 600 }}> 红点</span> = 偏利空。
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="搜索术语，例如：RSI、VIX、ETF、财报…"
        style={{
          width: '100%',
          fontSize: '0.875rem',
          padding: '0.6rem 0.875rem',
          borderRadius: 8,
          border: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          color: 'var(--text)',
          outline: 'none',
          fontFamily: 'var(--font-sans)',
          boxSizing: 'border-box',
        }}
      />

      {q && matchedSections.length === 0 && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem',
          border: '1px dashed var(--border)', borderRadius: 10 }}>
          没有找到"<strong>{search}</strong>"相关术语
        </div>
      )}

      {/* Sections */}
      {matchedSections.map(section => (
        <div key={section.title}>
          <button
            onClick={() => setOpenSection(openSection === section.title ? null : section.title)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 0.875rem',
              borderRadius: q ? 0 : 8,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              marginBottom: '0.375rem',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '1rem' }}>{section.emoji}</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', flex: 1, letterSpacing: '0.02em' }}>
              {section.title}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {section.terms.length} 个词条
            </span>
            {!q && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {openSection === section.title ? '▲' : '▼'}
              </span>
            )}
          </button>

          {(q || openSection === section.title) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {section.terms.map(term => (
                <TermCard key={term.term} term={term} />
              ))}
            </div>
          )}
        </div>
      ))}

      <p style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        仅供学习参考 · 不构成投资建议 · 术语解释以通俗易懂为目标，非严格学术定义
      </p>
    </div>
  )
}
