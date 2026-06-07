// Serenity 瓶颈点投资法 — 15家公司买入策略矩阵
// 免责声明: 基于公开信息的框架分析，不构成实质性投资建议。投资有风险，需结合自身情况独立判断。
// Last updated: 2026-06-04

export interface BuyStrategy {
  ticker: string
  name: string
  sector: string
  serenityScore: number       // 瓶颈得分 1-10
  urgency: 'now' | 'dip' | 'wait' | 'limit'  // 行动优先级
  urgencyLabel: string
  maxPosition: string         // 最大仓位
  entryZone: string           // 买入区间
  currentEstimate: string     // 当前估算价
  target12m: string           // 12个月目标
  upside: string              // 上涨空间
  keyCatalyst: string         // 核心催化剂
  riskFlags: string[]         // 风险信号
  serenityNote: string        // Serenity视角点评
  positionAdvice: string      // 具体操作建议
}

// 15家精选标的
export const BUY_STRATEGY_MATRIX: BuyStrategy[] = [
  // ── 第一梯队: 立刻可以分批建仓 ──
  {
    ticker: '002050.SZ', name: '三花智控', sector: '具身智能/机器人',
    serenityScore: 7, urgency: 'now', urgencyLabel: '🟢 立刻分批买入',
    maxPosition: '8-10%', entryZone: '¥24-30', currentEstimate: '¥30-38',
    target12m: '¥50', upside: '+40-50%',
    keyCatalyst: '特斯拉Optimus量产→热管理订单爆发；汽车热管理稳健增长提供安全垫',
    riskFlags: ['Optimus量产再推迟', '特斯拉供应链多元化风险'],
    serenityNote: '不是紫苏叶（竞争者多），但是「确定性的铲子」——不管谁造机器人都需要热管理。当前估值合理，有汽车业务安全垫，下行风险有限。',
    positionAdvice: '分3-4批，每跌5%加一仓。第一批现在可建2-3%，后续等¥28以下加仓。长期持有到Optimus百万台级别出货。',
  },
  {
    ticker: '688639.SH', name: '华恒生物', sector: '生物技术/合成生物',
    serenityScore: 8, urgency: 'now', urgencyLabel: '🟢 立刻分批买入',
    maxPosition: '5-7%', entryZone: '¥60-78', currentEstimate: '¥80-100',
    target12m: '¥140', upside: '+55-75%',
    keyCatalyst: '合成生物学氨基酸全球份额扩张；生物制造替代石化路线成本拐点临近；新增产能2026H2释放',
    riskFlags: ['发酵工艺波动', '原材料玉米价格上涨', '海外贸易壁垒'],
    serenityNote: '⭐ 紫苏叶：全球氨基酸合成生物学#1，技术上绕不开。菌种库是真正的护城河——别人复制不了。但估值不低，分批买。',
    positionAdvice: '小市值(¥200亿)，流动性有限。第一批建1-2%，等季报验证后再加至5%。止损-15%。',
  },
  {
    ticker: '688065.SH', name: '凯赛生物', sector: '生物技术/合成生物',
    serenityScore: 8, urgency: 'now', urgencyLabel: '🟢 立刻分批买入',
    maxPosition: '5-7%', entryZone: '¥38-48', currentEstimate: '¥50-65',
    target12m: '¥85', upside: '+50-70%',
    keyCatalyst: '全球唯一生物基戊二胺/尼龙56商业化；生物基材料替代石油基尼龙大市场；产能扩张2026-2027',
    riskFlags: ['生物基尼龙成本仍需下降', '石油基尼龙降价竞争', '产能爬坡不及预期'],
    serenityNote: '⭐ 紫苏叶：全球长链二元酸份额80%+，全球唯一生物基尼龙56——这两个都是物理上的「只能找我买」。但成本竞争力仍需验证。',
    positionAdvice: '类似华恒——小市值分批建仓。第一批建1-2%，¥45以下加仓。两个合成生物标的合计不超12%。',
  },
  {
    ticker: '002371.SZ', name: '北方华创', sector: '集成电路/设备',
    serenityScore: 8, urgency: 'now', urgencyLabel: '🟡 可建观察仓',
    maxPosition: '8-10%', entryZone: '¥300-370', currentEstimate: '¥380-460',
    target12m: '¥600', upside: '+35-50%',
    keyCatalyst: '国产半导体设备采购加速；Wind预测2026-28年净利润80/110/140亿；刻蚀/CVD/清洗全品类扩张',
    riskFlags: ['年内已涨50-80%，部分预期透支', '美国设备出口管制放松(小概率但致命)', '高端产品突破不及预期'],
    serenityNote: '国产设备龙头，品类最全=确定性最高。当前PE 81x不便宜，但Wind预测2028年PE仅32x——35-45%净利润增速可消化。不是最性感的紫苏叶，但是「确定性最高的铲子」。',
    positionAdvice: '先建2-3%观察仓。后续每回调8-10%加一次。若跌破¥330需重新评估基本面。核心仓位长期持有。',
  },

  // ── 第二梯队: 等回调再买 ──
  {
    ticker: '688017.SH', name: '绿的谐波', sector: '具身智能/机器人',
    serenityScore: 9, urgency: 'dip', urgencyLabel: '🟡 等回调买入',
    maxPosition: '5-8%', entryZone: '¥90-120', currentEstimate: '¥120-150',
    target12m: '¥200', upside: '+45-65%',
    keyCatalyst: '全球仅2家谐波减速器供应商；人形机器人每台14-28个谐波减速器；2026年人形量产元年',
    riskFlags: ['年内已涨50-80%，部分预期已定价', '哈默纳科降价竞争', '人形落地低于预期'],
    serenityNote: '⭐⭐ 终极紫苏叶：全球双寡头之一，机器人关节绕不开。但年内50-80%涨幅后不追高——等一个「业绩不及预期导致错杀」的黄金坑。',
    positionAdvice: '当前不追。设¥110以下限价单。若跌破¥100（PE回归40x），重仓5%。保留现金等这个机会。',
  },
  {
    ticker: '688012.SH', name: '中微公司', sector: '集成电路/设备',
    serenityScore: 8, urgency: 'dip', urgencyLabel: '🟡 等回调买入',
    maxPosition: '5-7%', entryZone: '¥220-280', currentEstimate: '¥280-340',
    target12m: '¥450', upside: '+45-65%',
    keyCatalyst: '5nm刻蚀已进台积电；国产替代深化；CCP刻蚀全球前三',
    riskFlags: ['年内涨幅大', '台积电订单波动', '美国对华设备限制升级'],
    serenityNote: '全球竞争力最强的中国半导体设备公司——5nm刻蚀进台积电就说明了一切。但同北方华创一样，涨幅已大。等回调。',
    positionAdvice: '与绿的谐波类似——等¥250以下的回调机会。若台积电砍单传闻导致大跌，是加仓良机。',
  },
  {
    ticker: '688631.SH', name: '莱斯信息', sector: '低空经济',
    serenityScore: 9, urgency: 'dip', urgencyLabel: '🟡 等回调或建观察仓',
    maxPosition: '3-5%', entryZone: '¥30-40', currentEstimate: '¥40-55',
    target12m: '¥75', upside: '+55-90%',
    keyCatalyst: '国内低空空管实质独家；eVTOL适航证2026集中发放；低空经济从0到1',
    riskFlags: ['次新股流动性极低', '业绩释放不确定', '低空政策进度不及预期'],
    serenityNote: '⭐⭐ 紫苏叶中的紫苏叶：全国低空飞行都归它管——这是政策垄断型瓶颈。但市值太小(¥80亿)，流动性是大问题。Serenity会买的标的，但仓位必须极小。',
    positionAdvice: '最多3%仓位。限价单¥35以下。这是「期权型」持仓——赌低空经济从0到1。不要重仓。',
  },
  {
    ticker: '688126.SH', name: '沪硅产业', sector: '集成电路/材料',
    serenityScore: 7, urgency: 'dip', urgencyLabel: '🟡 等回调买入',
    maxPosition: '3-5%', entryZone: '¥10-14', currentEstimate: '¥14-18',
    target12m: '¥25', upside: '+55-80%',
    keyCatalyst: '300mm大硅片国产化率从20%→60%是十五五硬指标；中芯/华虹扩产直接拉动',
    riskFlags: ['全球份额仅3%，技术差距大', '盈利仍在爬坡', '日本信越/SUMCO降价打压'],
    serenityNote: '晶圆厂必须品，但技术差距意味着它还不是真正的垄断者。国产替代逻辑是对的，但时机可能尚早——等它证明能稳定盈利再重仓。',
    positionAdvice: '轻仓(1-2%)观察。等连续两个季度盈利后再加仓。',
  },

  // ── 第三梯队: 严格限仓 ──
  {
    ticker: '688256.SH', name: '寒武纪', sector: 'AI芯片',
    serenityScore: 6, urgency: 'limit', urgencyLabel: '🔴 严格限仓≤2-3%',
    maxPosition: '2-3%', entryZone: '¥220-280(仅限深度回调)', currentEstimate: '¥300-380',
    target12m: '¥480(高不确定性)', upside: '+40-60%但风险极大',
    keyCatalyst: '国产AI芯片替代华为昇腾的「第二选择」价值；推理芯片规模化出货预期',
    riskFlags: ['PE(TTM)305x!', '市值8288亿远超营收', '华为昇腾压制', '盈利路径极不清晰', '客户订单节奏不确定'],
    serenityNote: '逻辑是对的（国产AI芯片需要第二供应商），但市场提前透支了三年预期。PE 305x意味着未来两年每年都需翻倍增长。一旦客户订单放缓，估值腰斩都不意外。Serenity绝不会碰这种已被充分定价的标的。',
    positionAdvice: '绝对不超过总仓位的2-3%。仅在深度回调(-40%以上)且基本面未恶化时考虑。设止损-20%。这是「信仰仓位」不是「投资仓位」。',
  },
  {
    ticker: '688339.SH', name: '亿华通', sector: '新能源/氢能',
    serenityScore: 6, urgency: 'limit', urgencyLabel: '🔴 严格限仓≤2%',
    maxPosition: '2%', entryZone: '¥20-28(仅限深度回调)', currentEstimate: '¥30-40',
    target12m: '¥55(取决于政策)', upside: '+40-80%但路线风险大',
    keyCatalyst: '国内燃料电池系统#1；氢燃料重卡政策加码；十五五氢能列入新增长点',
    riskFlags: ['技术路线不确定(纯电vs氢)', '盈利遥远', '政策依赖度高', '纯电重卡替代威胁'],
    serenityNote: '氢能可能是对的，也可能像2010年的太阳能——逻辑通但时机早了十年。Serenity会等氢燃料重卡真正大规模上路后再介入，而不是赌政策。',
    positionAdvice: '最多2%，当「彩票」配置。只在氢能政策超预期时考虑加仓。',
  },

  // ── 已持有的大盘标的：持有/调整 ──
  {
    ticker: 'NVDA', name: 'NVIDIA', sector: 'AI芯片/核心持仓',
    serenityScore: 7, urgency: 'wait', urgencyLabel: '🔵 持有不加仓',
    maxPosition: '10-15%', entryZone: '不设新买入', currentEstimate: '$225',
    target12m: '$300', upside: '+33%但弹性下降',
    keyCatalyst: 'Blackwell Ultra量产；Rubin架构2027；机器人+自动驾驶新市场',
    riskFlags: ['市值$5T增速必然放缓', '出口管制升级', 'ASIC/AMD替代', 'CAPEX可持续性'],
    serenityNote: '2023年是紫苏叶，2026年是金枪鱼。逻辑没变但赔率变了。持有是合理的（确定性仍在），但不要加仓。真正的机会在NVDA的上游——HBM、光模块、CoWoS。',
    positionAdvice: '维持现有仓位。若占比>20%，减至15%以下。用减仓资金配置紫苏叶标的。',
  },
  {
    ticker: 'GEV', name: 'GE Vernova', sector: '电力/电网',
    serenityScore: 8, urgency: 'wait', urgencyLabel: '🔵 持有等回调加仓',
    maxPosition: '10-12%', entryZone: '$900-1000(加仓区间)', currentEstimate: '$1149',
    target12m: '$1400', upside: '+22%',
    keyCatalyst: '$163B积压→4年订单可见性；变压器交期36-60月→定价权持续；数据中心电网订单超2025全年',
    riskFlags: ['年内+70%，短期超买', '37x PE不便宜', '关税$250-350M影响'],
    serenityNote: '电网设备是AI最确定的物理瓶颈之一——不管你用核电还是天然气，都需要变压器。$163B积压=4年确定性收入。但+70%后应等回调加仓，而不是追高。',
    positionAdvice: '持有现有仓位。$1000以下每次跌5%加一仓。这是可以拿3-5年的核心仓位。',
  },
  {
    ticker: 'BE', name: 'Bloom Energy', sector: '电力/燃料电池',
    serenityScore: 7, urgency: 'wait', urgencyLabel: '🔵 持有不加仓(仓位≤5%)',
    maxPosition: '5%', entryZone: '$200-230(加仓区间)', currentEstimate: '$290',
    target12m: '$400', upside: '+38%但波动极大',
    keyCatalyst: 'Oracle 2.8GW合同持续落地；90天部署速度 vs 电网3-8年；首个盈利季度验证商业模式',
    riskFlags: ['+240% YTD，任何miss都致命', '天然气标签影响绿色认证', '技术路线竞争', '90x forward PE'],
    serenityNote: 'BE是Serenity会喜欢的标的——小市值、唯一性、速度垄断。但+240%后已经不是「低关注度」了。市场已经发现了它。现在的赔率不如半年前。',
    positionAdvice: '现有仓位若>5%需减仓。若<3%可持有不加。等$200以下再考虑加仓。',
  },
  {
    ticker: 'MU', name: 'Micron Technology', sector: 'HBM存储',
    serenityScore: 8, urgency: 'wait', urgencyLabel: '🔵 持有不加仓',
    maxPosition: '8-10%', entryZone: '不设新买入', currentEstimate: '$131',
    target12m: '$180', upside: '+37%',
    keyCatalyst: 'HBM3E 12层量产；HBM4路线图2027；AI存储需求刚性',
    riskFlags: ['HBM份额#3落后海力士', '传统存储周期性波动', '地缘政治'],
    serenityNote: 'HBM是GPU的紫苏叶，但MU是HBM的#3玩家。如果你已经持有SK海力士，MU更多是「行业配置」而非紫苏叶逻辑。',
    positionAdvice: 'MU+SK海力士合计不超15%。优先加仓SK海力士(垄断性更强)。',
  },
  {
    ticker: 'ORCL', name: 'Oracle', sector: 'AI云基础设施',
    serenityScore: 6, urgency: 'wait', urgencyLabel: '🔵 持有不加仓',
    maxPosition: '8-10%', entryZone: '不设新买入', currentEstimate: '$197',
    target12m: '$260', upside: '+32%',
    keyCatalyst: 'OCI AI合同积压创新高(RPO $553B)；Stargate项目推进；AI数据库差异化',
    riskFlags: ['50%收入仍为非AI传统业务', 'AWS/Azure/GCP压制云市场份额', '估值修复后空间收窄'],
    serenityNote: 'ORCL的AI叙事最强部分是OCI的AI算力租赁——但不是物理瓶颈。AWS/Azure/GCP都能提供类似服务。Stargate是加分项但不是垄断。',
    positionAdvice: '持有不加仓。OCI增速若连续两个季度放缓需减仓。',
  },
]

// 全局策略摘要
export const STRATEGY_SUMMARY = {
  disclaimer: '基于公开信息的框架分析，不构成实质性投资建议。投资有风险，需结合自身情况独立判断。',
  cashReserve: '20%',
  cashReserveNote: 'Serenity最关键的提醒：保留20%现金等市场回调。北方华创、中微、绿的谐波年内涨幅已达50-80%，部分预期已被定价。真正的买入时机往往是市场因短期业绩不及预期而错杀时。',
  positionRules: [
    '单只紫苏叶标的(瓶颈≥8分)最大仓位不超过总仓位的10%',
    '寒武纪/亿华通等高不确定性标的合计不超过5%',
    'NVDA/MU/ORCL等大盘金枪鱼合计不超过40%',
    '保留20%现金等深度回调机会',
  ],
  priorityOrder: [
    { tier: 1, label: '立刻分批建仓', stocks: ['三花智控', '华恒生物', '凯赛生物'], note: '估值合理、有安全垫，不需要等回调' },
    { tier: 2, label: '等回调买入', stocks: ['绿的谐波', '中微公司', '莱斯信息', '沪硅产业', '北方华创(观察仓)'], note: '逻辑完美但涨幅已大，等错杀机会' },
    { tier: 3, label: '严格限仓', stocks: ['寒武纪(≤3%)', '亿华通(≤2%)'], note: '逻辑通但估值透支或路线不确定' },
    { tier: 4, label: '持有不操作', stocks: ['NVDA', 'GEV', 'BE', 'MU', 'ORCL'], note: '核心仓位继续持有，不加仓不减仓' },
  ],
}
