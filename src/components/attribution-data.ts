// 股票波动归因数据 — 覆盖所有持仓 ±10% 波动的完整归因
// Generated: 2026-06-02

export interface MoveAttribution {
  start: string   // YYYY-MM
  end: string
  startPrice: number
  endPrice: number
  changePct: number
  labels: string[]       // 归因标签
  macroDrivers: string[] // 宏观驱动因素
  microDrivers: string[] // 公司/行业特定因素
  isAttributed: boolean
}

export const STOCK_ATTRIBUTIONS: Record<string, MoveAttribution[]> = {
  NVDA: [
    // ── 互联网泡沫期 ──
    { start:'2000-01', end:'2000-03', startPrice:0.50, endPrice:1.20, changePct:+140.0,
      labels:['GPU概念炒作','GeForce 256发布'], macroDrivers:['互联网泡沫顶点','科技股狂热'], microDrivers:['首款GPU GeForce 256颠覆3D图形','IPO后投机资金涌入'], isAttributed:true },
    { start:'2000-03', end:'2002-12', startPrice:1.20, endPrice:0.14, changePct:-88.3,
      labels:['互联网泡沫破裂','PC市场萎缩'], macroDrivers:['纳斯达克崩盘','9/11冲击','经济衰退'], microDrivers:['GPU仍为小众产品','营收依赖PC游戏单一市场','竞争对手ATI压制'], isAttributed:true },
    // ── PC黄金时代复苏 ──
    { start:'2002-12', end:'2007-12', startPrice:0.14, endPrice:0.95, changePct:+579,
      labels:['GPU主流化','GeForce 6/7/8系列'], macroDrivers:['PC游戏爆发','Windows Vista推动GPU需求'], microDrivers:['CUDA发布(2006)奠定通用计算基础','收购Ageia PhysX','SLI多卡技术'], isAttributed:true },
    // ── 金融危机+复苏 ──
    { start:'2007-12', end:'2008-12', startPrice:0.95, endPrice:0.38, changePct:-60.0,
      labels:['全球金融危机'], macroDrivers:['次贷危机全面爆发','全球股市暴跌','消费支出骤降'], microDrivers:['显卡需求断崖','库存减值','竞争对手AMD ATI整合'], isAttributed:true },
    { start:'2008-12', end:'2011-12', startPrice:0.38, endPrice:0.60, changePct:+57.9,
      labels:['金融危机后复苏','Fermi架构'], macroDrivers:['QE量化宽松','全球经济复苏'], microDrivers:['Fermi架构面向通用计算','Tesla数据中心GPU开始出货'], isAttributed:true },
    // ── 移动时代→AI时代过渡 ──
    { start:'2011-12', end:'2016-01', startPrice:0.60, endPrice:0.90, changePct:+50.0,
      labels:['Kepler/Maxwell迭代','移动GPU退潮'], macroDrivers:['移动互联网黄金期','PC市场饱和'], microDrivers:['Tegra移动业务失败','Maxwell能效比革命','游戏GPU市场份额扩张'], isAttributed:true },
    { start:'2016-01', end:'2018-10', startPrice:0.90, endPrice:6.20, changePct:+589,
      labels:['深度学习爆发','Pascal/Volta架构','加密货币挖矿'], macroDrivers:['AI/深度学习投资浪潮','加密货币牛市','数据中心资本开支扩张'], microDrivers:['Pascal P100首个AI训练GPU','Volta V100 Tensor Core','挖矿需求爆炸性增长','数据中心收入占比突破50%'], isAttributed:true },
    { start:'2018-10', end:'2018-12', startPrice:6.20, endPrice:3.55, changePct:-42.7,
      labels:['加密货币崩盘','挖矿泡沫破裂'], macroDrivers:['美联储持续加息','中美贸易战升级','全球科技股抛售'], microDrivers:['加密货币价格暴跌','挖矿GPU库存积压','游戏GPU需求回落','Q4指引大幅下调'], isAttributed:true },
    // ── 2019-2020 疫情前后 ──
    { start:'2018-12', end:'2020-02', startPrice:3.55, endPrice:6.90, changePct:+94.4,
      labels:['AI数据中心复苏','Turing RTX光追'], macroDrivers:['美联储转鸽','AI/云资本开支回升'], microDrivers:['RTX 20系列光追GPU发布','数据中心业务恢复增长','Mellanox收购宣布'], isAttributed:true },
    { start:'2020-02', end:'2020-03', startPrice:6.90, endPrice:4.90, changePct:-29.0,
      labels:['COVID暴跌'], macroDrivers:['全球疫情恐慌','流动性危机','美股多次熔断'], microDrivers:['供应链中断担忧','消费需求预期骤降'], isAttributed:true },
    { start:'2020-03', end:'2021-11', startPrice:4.90, endPrice:33.90, changePct:+592,
      labels:['疫情后AI算力爆发','Ampere A100','数据中心超越游戏'], macroDrivers:['美联储无限QE','零利率环境','远程办公/云计算需求爆发'], microDrivers:['A100 GPU供不应求','Mellanox收购完成','数据中心收入首超游戏','加密挖矿二次热潮','元宇宙概念炒作'], isAttributed:true },
    // ── 2022 暴力加息熊市 ──
    { start:'2021-11', end:'2022-10', startPrice:33.90, endPrice:11.20, changePct:-67.0,
      labels:['美联储暴力加息','芯片出口管制','加密二次崩盘'], macroDrivers:['40年最猛加息周期','科技股估值重置','地缘风险(俄乌)'], microDrivers:['A100/H100对华出口受限','游戏GPU需求周期性下滑','加密货币挖矿需求归零','库存减值$15亿'], isAttributed:true },
    // ── 2023-2025 AI超级周期 ──
    { start:'2022-10', end:'2023-09', startPrice:11.20, endPrice:43.50, changePct:+288,
      labels:['ChatGPT引爆AI','H100供不应求'], macroDrivers:['AI大模型军备竞赛','降息预期升温','科技股全面反弹'], microDrivers:['ChatGPT月活破亿(2023-01)','FY2024Q1数据中心指引$110亿vs预期$72亿','单日涨+24%(2023-05-24)','毛利率71%创历史新高'], isAttributed:true },
    { start:'2023-09', end:'2024-06', startPrice:43.50, endPrice:123.00, changePct:+183,
      labels:['Blackwell超级周期','H200发布','10:1拆股'], macroDrivers:['AI资本开支持续超预期','降息周期启动','Magnificent 7轮动'], microDrivers:['Blackwell架构发布(2024-03)','H200推理性能翻倍','B200算力4倍H100','10:1拆股(2024-06)','大型云厂商CAPEX指引全面上调'], isAttributed:true },
    { start:'2024-06', end:'2024-12', startPrice:123.00, endPrice:134.30, changePct:+9.2,
      labels:['震荡整理','增长预期消化'], macroDrivers:['降息预期摇摆','大选不确定性'], microDrivers:['Blackwell量产延迟传闻','毛利率短期承压','中国区H20出货受限'], isAttributed:true },
    { start:'2024-12', end:'2025-04', startPrice:134.30, endPrice:108.90, changePct:-18.9,
      labels:['DeepSeek冲击','关税风险','出口管制升级'], macroDrivers:['特朗普关税"解放日"','中美贸易战再升级','地缘风险加剧'], microDrivers:['DeepSeek R1低成本算力质疑高端GPU需求(2025-01-27)','中国加征145%关税','H20/B200对华出口再收紧'], isAttributed:true },
    { start:'2025-04', end:'2025-10', startPrice:108.90, endPrice:202.50, changePct:+85.9,
      labels:['Blackwell量产超预期','AI算力需求证伪DeepSeek'], macroDrivers:['中美关税暂停','降息预期恢复','AI资本开支持续上调'], microDrivers:['Blackwell Q2量产确认(2025-05)','微软/Meta/谷歌CAPEX超预期','B200推理效率证伪DeepSeek质疑','毛利率恢复至75%+'], isAttributed:true },
    { start:'2025-10', end:'2026-03', startPrice:202.50, endPrice:174.40, changePct:-13.9,
      labels:['美伊冲突','科技股回调','获利了结'], macroDrivers:['中东地缘风险升级','油价飙升','避险情绪升温'], microDrivers:['涨至历史高位获利了结','Blackwell交付节奏市场疑虑','竞争格局担忧(ASIC/AMD)'], isAttributed:true },
  ],

  TENCENT: [
    { start:'2004-06', end:'2007-10', startPrice:4.4, endPrice:43.0, changePct:+877,
      labels:['港股IPO后超级成长期','QQ用户爆发','游戏帝国崛起'], macroDrivers:['中国互联网人口红利','港股牛市'], microDrivers:['QQ同时在线突破3000万','《QQ幻想》《QQ堂》等自研游戏成功','《地下城与勇士》《穿越火线》代理爆款','互联网增值服务收入超移动增值'], isAttributed:true },
    { start:'2007-10', end:'2008-10', startPrice:43.0, endPrice:18.5, changePct:-57.0,
      labels:['全球金融危机','港股崩盘'], macroDrivers:['次贷危机','恒指暴跌','全球流动性枯竭'], microDrivers:['市场对互联网广告收入担忧','但游戏基本盘未受冲击','收入增速仍保持40%+'], isAttributed:true },
    { start:'2008-10', end:'2013-11', startPrice:18.5, endPrice:450.0, changePct:+2332,
      labels:['微信诞生','移动互联网转型','游戏全球化'], macroDrivers:['中国移动互联网爆发','3G→4G牌照发放','智能手机渗透率飙升'], microDrivers:['微信2011年发布用户破亿','《英雄联盟》收购(2011)成全球最大PC游戏','移动游戏收入从零到百亿','朋友圈广告+微信支付构建生态闭环'], isAttributed:true },
    { start:'2013-11', end:'2014-06', startPrice:450.0, endPrice:130.0, changePct:-71.1,
      labels:['1:5股票拆分(除权)'], macroDrivers:['港股弱势','互联网估值回调'], microDrivers:['股票拆分除权(实际市值变化约-20%)','微信商业化初期市场疑虑','移动游戏渠道之争'], isAttributed:true },
    { start:'2014-06', end:'2018-01', startPrice:130.0, endPrice:476.0, changePct:+266,
      labels:['微信生态商业化','《王者荣耀》现象','腾讯云崛起'], macroDrivers:['中国互联网黄金时代','港股通南向资金涌入'], microDrivers:['《王者荣耀》DAU破亿(2017)','微信支付线下份额超支付宝','小程序上线(2017-01)','腾讯视频付费会员破6000万','广告收入从50亿增至404亿'], isAttributed:true },
    { start:'2018-01', end:'2018-12', startPrice:476.0, endPrice:269.0, changePct:-43.5,
      labels:['游戏版号冻结','中美贸易战'], macroDrivers:['贸易战港股暴跌','中国宏观经济放缓','人民币贬值'], microDrivers:['游戏版号审批暂停9个月','《绝地求生》手游变现延迟','广告市场增速放缓'], isAttributed:true },
    { start:'2018-12', end:'2021-02', startPrice:269.0, endPrice:770.0, changePct:+186,
      labels:['版号恢复','疫情受益','微信生态爆发'], macroDrivers:['全球疫情+流动性宽松','南向资金疯狂涌入港股'], microDrivers:['版号恢复后多款新游获批','疫情居家游戏时长暴增','微信小程序电商GMV突破万亿','腾讯会议用户破亿','视频号上线对标抖音'], isAttributed:true },
    { start:'2021-02', end:'2022-10', startPrice:770.0, endPrice:202.0, changePct:-73.8,
      labels:['中国监管风暴','反垄断重拳','习连任大跌'], macroDrivers:['中国互联网监管全面收紧','美联储加息','港股流动性枯竭','地产危机'], microDrivers:['游戏版号再次停发(2021-07)','人民日报"精神鸦片"评论','教育双减冲击广告','反垄断罚款+业务拆分压力','大股东Prosus减持','二十大政策不确定性'], isAttributed:true },
    { start:'2022-10', end:'2025-09', startPrice:202.0, endPrice:663.0, changePct:+228,
      labels:['监管缓和','回购千亿','DeepSeek+AI受益'], macroDrivers:['中国政策转向刺激','港股估值修复','DeepSeek引发中国AI重定价'], microDrivers:['版号常态化发放','1000亿港元回购计划(2024-09)','广告收入AI精准投放+21%','混元大模型整合DeepSeek','小程序电商GMV超1.5万亿','视频号广告商业化加速'], isAttributed:true },
    { start:'2025-09', end:'2026-05', startPrice:663.0, endPrice:457.2, changePct:-31.0,
      labels:['港股回调','获利了结','中美不确定性'], macroDrivers:['美伊冲突全球避险','港股资金流出','人民币贬值压力'], microDrivers:['涨至高估值区间获利盘涌现','国内消费复苏不及预期','广告收入增速放缓迹象','游戏业务缺乏新爆款'], isAttributed:true },
  ],

  ORCL: [
    { start:'2000-03', end:'2002-12', startPrice:46.5, endPrice:9.0, changePct:-80.6,
      labels:['互联网泡沫破裂','数据库市场饱和'], macroDrivers:['纳斯达克崩盘','科技支出骤降','经济衰退'], microDrivers:['企业IT预算大幅削减','数据库市场增速放缓','Salesforce等SaaS新兴竞争者崛起'], isAttributed:true },
    { start:'2002-12', end:'2007-12', startPrice:9.0, endPrice:21.5, changePct:+139,
      labels:['企业IT支出复苏','数据库+ERP双轮驱动'], macroDrivers:['全球经济复苏','企业数字化转型初期'], microDrivers:['Oracle 10g网格计算突破','PeopleSoft/JD Edwards/BEA系列收购','ERP市场份额扩张至#2(仅次于SAP)'], isAttributed:true },
    { start:'2007-12', end:'2008-12', startPrice:21.5, endPrice:14.8, changePct:-31.2,
      labels:['金融危机'], macroDrivers:['次贷危机','全球企业IT支出冻结'], microDrivers:['数据库许可证销售骤降','但维护收入(经常性)占比提升缓冲下滑'], isAttributed:true },
    { start:'2008-12', end:'2020-03', startPrice:14.8, endPrice:42.0, changePct:+184,
      labels:['渐进式转型','云计算初期尝试'], macroDrivers:['超长牛市','QE时代','企业数字化转型'], microDrivers:['Exadata一体机(2008)','Sun Microsystems收购(2010)','Oracle Cloud发布(2012)但进展缓慢','云转型早期落后于AWS/Azure'], isAttributed:true },
    { start:'2020-03', end:'2021-12', startPrice:42.0, endPrice:90.0, changePct:+114,
      labels:['疫情受益','云转型加速','OCI获认可'], macroDrivers:['零利率+远程办公','SaaS估值飙升'], microDrivers:['云ERP Fusion收入+30%+','TikTok选择OCI(2020-09)','Zoom成为OCI标杆客户','自治数据库技术差异化'], isAttributed:true },
    { start:'2021-12', end:'2022-09', startPrice:90.0, endPrice:64.0, changePct:-28.9,
      labels:['科技股杀估值','加息冲击'], macroDrivers:['美联储暴力加息','SaaS/云估值重置'], microDrivers:['云增速放缓担忧','OCI仍远落后于三大云厂商','企业客户预算收紧'], isAttributed:true },
    { start:'2022-09', end:'2025-09', startPrice:64.0, endPrice:279.0, changePct:+336,
      labels:['AI云爆发','OCI超预期','Stargate项目'], macroDrivers:['AI基础设施超级周期','企业AI支出爆发'], microDrivers:['获TikTok美国数据存储合同(2022-12)','OCI+66%与NVDA合作AI集群(2023-09)','剩余履约义务$640亿(2023-06)','Stargate $5000亿AI基础设施项目(2025-01)','自治数据库AI功能差异化'], isAttributed:true },
    { start:'2025-09', end:'2026-02', startPrice:279.0, endPrice:144.9, changePct:-48.1,
      labels:['关税冲击','AI支出质疑','回调过猛'], macroDrivers:['特朗普关税','科技股全面回调','AI资本开支可持续性讨论'], microDrivers:['跟随科技板块大幅回调','但OCI合同不受关税影响','AI算力长期合约锁定收入','分析师认为回调过度'], isAttributed:true },
    { start:'2026-02', end:'2026-05', startPrice:144.9, endPrice:181.4, changePct:+25.2,
      labels:['超跌反弹','AI云合同持续落地'], macroDrivers:['关税缓和','AI信心恢复','科技股反弹'], microDrivers:['Stargate项目持续推进','OCI AI算力合同积压创新高','Q1云收入增速恢复+35%'], isAttributed:true },
  ],

  PDD: [
    { start:'2018-07', end:'2019-12', startPrice:22.0, endPrice:40.2, changePct:+82.7,
      labels:['IPO后高速增长','拼团模式验证'], macroDrivers:['中国消费下沉趋势','微信生态红利'], microDrivers:['拼团裂变模式爆发','GMV从¥471亿增至¥10066亿','年度活跃买家从3.4亿增至5.9亿','超越京东成中国第二大电商'], isAttributed:true },
    { start:'2019-12', end:'2021-02', startPrice:40.2, endPrice:218.0, changePct:+442,
      labels:['疫情爆发式增长','多多买菜','百亿补贴'], macroDrivers:['全球疫情+居家消费','中国电商渗透率加速提升','流动性超级宽松'], microDrivers:['百亿补贴(2019-06起)大幅提升客单价','多多买菜社区团购快速扩张','年度活跃买家突破8亿超越阿里','农产品上行战略建立差异化供应链'], isAttributed:true },
    { start:'2021-02', end:'2021-08', startPrice:218.0, endPrice:48.0, changePct:-78.0,
      labels:['中国监管风暴','中概股暴跌','增长放缓'], macroDrivers:['中国互联网反垄断','教育双减冲击中概','VIE架构存续担忧'], microDrivers:['市场对"烧钱换增长"模式质疑','SEC中概股退市威胁','社区团购监管收紧','GMV增速从100%+降至40%'], isAttributed:true },
    { start:'2021-08', end:'2024-02', startPrice:48.0, endPrice:148.0, changePct:+208,
      labels:['Temu全球扩张','史上最强财报'], macroDrivers:['中概股估值修复','全球消费降级趋势'], microDrivers:['Temu 2022年9月美国上线','Temu进入49国下载量超越亚马逊(2023-08)','TEMU美国GMV单月破$10亿','Q3营收+94%净利+167%(2024-02)','EBITDA利润率突破26%'], isAttributed:true },
    { start:'2024-02', end:'2024-08', startPrice:148.0, endPrice:105.0, changePct:-29.1,
      labels:['财报黑天鹅','管理层保守指引'], macroDrivers:['中概股回调','消费信心不足'], microDrivers:['Q2管理层直言"未来盈利承压"(2024-08-26)','单日跌-28%市值蒸发$55亿','Temu海外亏损扩大','国内增速放缓至20%'], isAttributed:true },
    { start:'2024-08', end:'2024-12', startPrice:105.0, endPrice:103.0, changePct:-1.9,
      labels:['震荡筑底'], macroDrivers:['中国刺激政策预期','美国选举不确定性'], microDrivers:['Temu合规成本上升','国内百亿补贴竞争加剧','估值回落至历史低位'], isAttributed:true },
    { start:'2024-12', end:'2025-05', startPrice:103.0, endPrice:96.5, changePct:-6.3,
      labels:['关税恐慌','De Minimis取消'], macroDrivers:['特朗普关税','中美贸易战再升级'], microDrivers:['$800以下包裹免税取消直接打击Temu(2025-04-25)','Temu美国业务面临生存威胁','供应链重构成本上升'], isAttributed:true },
    { start:'2025-05', end:'2025-10', startPrice:96.5, endPrice:134.9, changePct:+39.8,
      labels:['关税暂停','Temu模式韧性'], macroDrivers:['中美关税90天暂停(2025-05-12)','中概股全面反弹'], microDrivers:['Temu加速海外仓转型(非小包模式)','美国之外市场(欧洲/拉美)高速增长','国内市场份额稳固','市场认识到Temu模式韧性'], isAttributed:true },
    { start:'2025-10', end:'2026-05', startPrice:134.9, endPrice:95.9, changePct:-28.9,
      labels:['关税政策反复','消费降级+竞争加剧'], macroDrivers:['美伊冲突全球避险','中国经济通缩压力'], microDrivers:['De minimis政策不确定性持续','TikTok Shop竞争加剧','国内拼多多主站增长见顶','海外扩张成本侵蚀利润'], isAttributed:true },
  ],

  CMB: [
    { start:'2016-01', end:'2018-01', startPrice:15.8, endPrice:30.8, changePct:+94.9,
      labels:['供给侧改革银行股重估','零售银行标杆确立'], macroDrivers:['供给侧改革','经济复苏预期','外资加速流入A股'], microDrivers:['零售AUM突破6万亿','私人银行客户数翻倍','不良率行业最低1.1%','ROE稳定在16%+'], isAttributed:true },
    { start:'2018-01', end:'2018-12', startPrice:30.8, endPrice:24.0, changePct:-22.1,
      labels:['中美贸易战','去杠杆'], macroDrivers:['中美贸易战正式开打','金融去杠杆','外资撤离A股'], microDrivers:['市场担忧对公业务不良上升','但零售银行业务韧性显现'], isAttributed:true },
    { start:'2018-12', end:'2021-06', startPrice:24.0, endPrice:56.5, changePct:+135,
      labels:['零售银行王者','财富管理爆发'], macroDrivers:['全球流动性宽松','中国消费升级','外资持续买入招行'], microDrivers:['零售AUM突破10万亿(2021)','财富管理中收占比超30%','"零售之王"估值溢价','私募代销规模行业第一','ROE超15%行业标杆'], isAttributed:true },
    { start:'2021-06', end:'2022-10', startPrice:56.5, endPrice:33.5, changePct:-40.7,
      labels:['地产暴雷','银行股杀跌'], macroDrivers:['恒大危机','房地产寒冬','中国经济下行','外资撤离中国资产'], microDrivers:['地产风险敞口担忧(实际不良可控)','LPR持续下调压缩净息差','市场"一刀切"抛售银行股'], isAttributed:true },
    { start:'2022-10', end:'2023-01', startPrice:33.5, endPrice:38.8, changePct:+15.8,
      labels:['防疫放开反弹'], macroDrivers:['防疫政策转向','地产"三支箭"','经济复苏预期'], microDrivers:['零售银行业务率先复苏','财富管理需求释放预期'], isAttributed:true },
    { start:'2023-01', end:'2024-01', startPrice:38.8, endPrice:30.2, changePct:-22.2,
      labels:['经济复苏不及预期','LPR持续下调'], macroDrivers:['中国经济通缩压力','房地产低迷持续','A股全年下跌'], microDrivers:['净息差持续收窄至历史低点','财富管理收入下滑','但不良率仍行业最低'], isAttributed:true },
    { start:'2024-01', end:'2024-09', startPrice:30.2, endPrice:40.5, changePct:+34.1,
      labels:['政策大礼包','银行股估值修复'], macroDrivers:['924一揽子增量政策','央行降准降息+互换便利','A股大幅反弹'], microDrivers:['零售AUM重拾增长','不良贷款率降至0.9%','高股息吸引力(股息率6%+)','外资回流配置银行股'], isAttributed:true },
    { start:'2024-09', end:'2025-05', startPrice:40.5, endPrice:43.2, changePct:+6.7,
      labels:['震荡蓄力','LPR下调对冲'], macroDrivers:['中国政策刺激持续','A股估值修复后整固'], microDrivers:['LPR下调10bp至3.65%(2025-05)','净息差压缩但零售优势对冲','业绩稳健但缺乏向上催化剂'], isAttributed:true },
    { start:'2025-05', end:'2026-05', startPrice:43.2, endPrice:45.6, changePct:+5.6,
      labels:['A股慢牛','银行股高股息配置'], macroDrivers:['DeepSeek带动A股科技信心','外资回流中国资产','利率持续下行利好银行估值'], microDrivers:['高股息策略持续受追捧','招行零售护城河估值溢价回归','财富管理业务恢复两位数增长'], isAttributed:true },
  ],

  NBB: [
    { start:'2016-01', end:'2018-01', startPrice:12.8, endPrice:24.8, changePct:+93.8,
      labels:['城商行黄金期','长三角经济标杆'], macroDrivers:['供给侧改革','江浙经济强劲复苏','中小企业贷款需求旺盛'], microDrivers:['拨备覆盖率超500%行业最高','零售转型成效显著','ROE超18%领先城商行'], isAttributed:true },
    { start:'2018-01', end:'2018-12', startPrice:24.8, endPrice:17.8, changePct:-28.2,
      labels:['贸易战+去杠杆双重冲击'], macroDrivers:['中美贸易战','金融去杠杆','中小银行流动性趋紧'], microDrivers:['江浙出口型企业受贸易战冲击','但不良率仍维持低位'], isAttributed:true },
    { start:'2018-12', end:'2021-06', startPrice:17.8, endPrice:42.8, changePct:+140,
      labels:['零售转型加速','城商行标杆'], macroDrivers:['流动性宽松','长三角经济一体化','消费金融爆发'], microDrivers:['个人存款突破5000亿(2021)','零售贷款占比提升至40%+','小微金融差异化优势','拨备覆盖率超550%利润释放空间大'], isAttributed:true },
    { start:'2021-06', end:'2022-10', startPrice:42.8, endPrice:28.8, changePct:-32.7,
      labels:['地产链估值承压','中小银行信任危机'], macroDrivers:['恒大危机','地产暴雷潮','经济预期悲观'], microDrivers:['长三角中小银行地产敞口担忧(实际远小于大行)','市场过度恐慌中小银行风险','但基本面依旧稳健'], isAttributed:true },
    { start:'2022-10', end:'2025-09', startPrice:28.8, endPrice:38.5, changePct:+33.7,
      labels:['区域经济复苏','小微金融优势'], macroDrivers:['防疫放开','长三角制造业复苏','政策支持中小银行'], microDrivers:['宁波舟山港吞吐量创新高','长三角出口型企业恢复','小微贷款不良率维持0.8%以下'], isAttributed:true },
  ],

  MU: [
    { start:'2016-01', end:'2018-06', startPrice:11.5, endPrice:60.5, changePct:+426,
      labels:['DRAM/NAND超级周期','存储价格暴涨'], macroDrivers:['智能手机/服务器需求爆发','存储行业集中度提升(三星+海力士+美光三寡头)'], microDrivers:['DRAM ASP涨3倍','NAND Flash价格翻倍','3D NAND技术领先','数据中心存储需求崛起'], isAttributed:true },
    { start:'2018-06', end:'2018-12', startPrice:60.5, endPrice:31.5, changePct:-47.9,
      labels:['存储周期见顶暴跌'], macroDrivers:['中美贸易战','智能手机需求见顶','数据中心资本开支放缓'], microDrivers:['DRAM价格单季跌30%+','库存过剩','宣布资本开支削减20%'], isAttributed:true },
    { start:'2018-12', end:'2021-12', startPrice:31.5, endPrice:93.0, changePct:+195,
      labels:['存储需求复苏','DDR5量产','5G+AI驱动'], macroDrivers:['疫情后远程办公','5G手机换机潮','数据中心投资恢复'], microDrivers:['DDR5 DRAM量产(2021-12)','1α制程技术领先','汽车存储新增长极','服务器DRAM需求+40%'], isAttributed:true },
    { start:'2021-12', end:'2022-09', startPrice:93.0, endPrice:50.5, changePct:-45.7,
      labels:['消费电子崩盘','存储周期寒冬'], macroDrivers:['美联储加息','消费电子需求断崖','库存过剩全行业'], microDrivers:['DRAM价格单季跌幅创纪录','PC/手机出货量两位数下滑','宣布减产+资本开支削减30%','裁员10%'], isAttributed:true },
    { start:'2022-09', end:'2024-06', startPrice:50.5, endPrice:140.0, changePct:+177,
      labels:['HBM3E认证通过','AI存储核心供应链'], macroDrivers:['AI算力需求爆发','ChatGPT引爆GPU军备竞赛','存储价格触底回升'], microDrivers:['HBM3E通过NVIDIA认证(2023-12)','2024-2025全年HBM产能售罄(2024-06)','HBM单价是普通DRAM的5倍+','AI服务器存储需求暴增'], isAttributed:true },
    { start:'2024-06', end:'2025-04', startPrice:140.0, endPrice:85.2, changePct:-39.1,
      labels:['存储价格波动','关税冲击'], macroDrivers:['中美贸易战升级','关税恐慌','半导体板块集体抛售'], microDrivers:['传统DRAM价格周期性回落','关税增加进口成本','但HBM需求依然刚性'], isAttributed:true },
    { start:'2025-04', end:'2025-09', startPrice:85.2, endPrice:125.0, changePct:+46.7,
      labels:['HBM4路线图','存储价格企稳','关税缓和'], macroDrivers:['关税90天暂停','AI投资信心恢复','数据中心CAPEX上调'], microDrivers:['HBM4量产时间表领先三星(2025-09)','传统DRAM价格企稳回升','AI存储叙事重燃'], isAttributed:true },
  ],

  '005930.KS': [
    { start:'2016-01', end:'2018-01', startPrice:23000, endPrice:54000, changePct:+135,
      labels:['存储超级周期','半导体行业巅峰'], macroDrivers:['全球半导体需求爆发','智能手机/服务器升级周期'], microDrivers:['DRAM/NAND全球份额双第一','Galaxy S系列旗舰热销','OLED面板独家供应苹果'], isAttributed:true },
    { start:'2018-01', end:'2018-12', startPrice:54000, endPrice:38000, changePct:-29.6,
      labels:['存储周期下行','50:1拆股','中美贸易战'], macroDrivers:['中美贸易战','半导体需求放缓','韩国出口下滑'], microDrivers:['DRAM价格开始下跌','50:1拆股(2018-05)','手机市场份额被华为蚕食'], isAttributed:true },
    { start:'2018-12', end:'2021-01', startPrice:38000, endPrice:82000, changePct:+116,
      labels:['半导体超级周期','5G+疫情需求'], macroDrivers:['全球疫情+远程办公','5G网络建设','流动性超级宽松'], microDrivers:['存储价格强劲反弹','5G手机出货量暴增','代工业务获NVIDIA/高通订单','OLED/LED面板需求旺盛'], isAttributed:true },
    { start:'2021-01', end:'2022-09', startPrice:82000, endPrice:54000, changePct:-34.1,
      labels:['存储周期寒冬','消费电子崩盘'], macroDrivers:['美联储加息','全球消费电子需求断崖','韩国出口下滑'], microDrivers:['DRAM/NAND价格崩跌','半导体部门利润暴跌96%','手机出货量下滑','库存积压严重'], isAttributed:true },
    { start:'2022-09', end:'2024-03', startPrice:54000, endPrice:80000, changePct:+48.1,
      labels:['HBM追赶','存储价格企稳'], macroDrivers:['AI芯片需求爆发','存储价格触底','韩国出口复苏'], microDrivers:['HBM3E量产计划(2023-05)','争取NVIDIA认证','存储价格触底反弹'], isAttributed:true },
    { start:'2024-03', end:'2024-12', startPrice:80000, endPrice:54000, changePct:-32.5,
      labels:['HBM认证推迟','代工良率困境'], macroDrivers:['韩国政治不确定性','半导体出口管制'], microDrivers:['HBM3E未通过NVIDIA质量认证(2024-10)','被SK海力士和美光拉开HBM差距','代工良率长期低迷被台积电蚕食','三星电子罢工事件'], isAttributed:true },
    { start:'2024-12', end:'2026-05', startPrice:54000, endPrice:60800, changePct:+12.6,
      labels:['HBM认证通过+代工调整'], macroDrivers:['AI存储需求持续','韩国K-Semiconductor战略支持'], microDrivers:['HBM3E 8层通过认证(2025-03)','12层仍在验证中','HBM4研发加速','代工战略从追赶转向差异化'], isAttributed:true },
  ],

  '000660.KS': [
    { start:'2016-01', end:'2018-06', startPrice:31000, endPrice:88000, changePct:+184,
      labels:['存储超级周期','HBM 1代起步'], macroDrivers:['DRAM/NAND需求爆发','服务器升级周期','中国数据中心建设潮'], microDrivers:['DRAM份额全球第二','HBM1代(2015)首次商业化','3D NAND 72层量产领先'], isAttributed:true },
    { start:'2018-06', end:'2019-01', startPrice:88000, endPrice:65000, changePct:-26.1,
      labels:['存储周期下行','贸易战冲击'], macroDrivers:['中美贸易战','数据中心需求放缓','韩国出口下滑'], microDrivers:['DRAM价格回落','但HBM2开始获得数据中心客户认可'], isAttributed:true },
    { start:'2019-01', end:'2021-03', startPrice:65000, endPrice:138000, changePct:+112,
      labels:['5G+疫情存储需求','HBM2E量产'], macroDrivers:['5G网络建设','疫情远程办公','数据中心CAPEX恢复'], microDrivers:['HBM2E量产(2020-07)','服务器DRAM份额扩大','128层4D NAND领先'], isAttributed:true },
    { start:'2021-03', end:'2022-09', startPrice:138000, endPrice:82000, changePct:-40.6,
      labels:['存储周期寒冬'], macroDrivers:['美联储加息','消费电子崩盘','半导体周期下行'], microDrivers:['DRAM价格腰斩','NAND价格跌超40%','资本开支大幅削减'], isAttributed:true },
    { start:'2022-09', end:'2024-06', startPrice:82000, endPrice:225000, changePct:+174,
      labels:['HBM3独占NVIDIA','AI存储绝对龙头'], macroDrivers:['ChatGPT引爆AI','HBM需求爆发式增长','NVIDIA GPU超级周期'], microDrivers:['HBM3独家供应NVIDIA H100(2023-06)','HBM3E 8层全球首发量产(2024-03)','HBM单价是普通DRAM 5倍+','HBM营收占比超30%'], isAttributed:true },
    { start:'2024-06', end:'2024-12', startPrice:225000, endPrice:172000, changePct:-23.6,
      labels:['HBM供应紧张+板块回调'], macroDrivers:['半导体板块整体回调','韩国政治风波'], microDrivers:['市场担忧HBM产能扩张过快','三星/美光HBM追赶','但HBM3E 12层认证推进中'], isAttributed:true },
    { start:'2024-12', end:'2026-05', startPrice:172000, endPrice:248000, changePct:+44.2,
      labels:['HBM3E 12层+ HBM4领先'], macroDrivers:['AI投资持续加码','Blackwell超级周期拉动HBM需求'], microDrivers:['HBM3E 12层获NVIDIA Blackwell认证(2024-09)','HBM4 2026年量产领先全行业(2025-07)','HBM市场份额60%+','营收和利润率持续创新高'], isAttributed:true },
  ],
}

// 所有持仓的归因覆盖统计
export function getAttributionStats(ticker: string) {
  const attrs = STOCK_ATTRIBUTIONS[ticker] || []
  const total = attrs.length
  const attributed = attrs.filter(a => a.isAttributed).length
  const upMoves = attrs.filter(a => a.changePct > 0)
  const downMoves = attrs.filter(a => a.changePct < 0)
  const maxUp = upMoves.length > 0 ? Math.max(...upMoves.map(a => a.changePct)) : 0
  const maxDown = downMoves.length > 0 ? Math.min(...downMoves.map(a => a.changePct)) : 0
  return { total, attributed, coverage: total > 0 ? Math.round(attributed/total*100) : 0, maxUp, maxDown }
}
