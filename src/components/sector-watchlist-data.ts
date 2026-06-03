// 十五五（2026-2030）八大战略赛道 — 上市公司清单与投资分析
// 数据来源: 十五五规划纲要、国务院AI+行动意见、工信部、中国信通院
// Generated: 2026-06-03

export interface SectorStock {
  ticker: string
  name: string
  exchange: 'A股' | '港股' | '美股'
  marketCap: string
  currentPrice: string
  buyZone: string
  targetPrice: string
  upside: string
  growthCAGR: string
  catalyst: string
  risk: 'low' | 'med' | 'high'
  note: string
  rank: string         // 行业排名
  upstream: string     // 上游供应商/原材料
  downstream: string   // 下游客户/应用场景
}

export interface SectorGroup {
  name: string
  icon: string
  color: string
  totalMarket: string  // 2030年市场空间
  description: string
  stocks: SectorStock[]
}

export const SECTOR_WATCHLIST: SectorGroup[] = [
  {
    name: 'AI与大模型',
    icon: '🧠',
    color: '#6366f1',
    totalMarket: '5万亿+ (2030E)',
    description: '新质生产力核心引擎，从技术竞赛转向千行百业赋能。CAGR ~35%。',
    stocks: [
      { ticker:'BABA', name:'阿里巴巴(通义千问)', exchange:'美股', marketCap:'$3000亿+', currentPrice:'$180-200', buyZone:'$150-170', targetPrice:'$260', upside:'+40%', growthCAGR:'15-20%', catalyst:'通义千问企业级落地+阿里云AI收入加速', risk:'med', note:'AI+云双轮驱动，估值修复空间大', rank:'国内大模型#2（仅次于DeepSeek开源生态），阿里云亚太#1', upstream:'GPU(NVDA/昇腾)→数据中心→电力', downstream:'企业客户(阿里云AI PaaS)→中小商家(电商AI)→开发者(魔搭社区)' },
      { ticker:'BIDU', name:'百度(文心一言)', exchange:'美股', marketCap:'$600亿+', currentPrice:'$140-160', buyZone:'$120-135', targetPrice:'$200', upside:'+35%', growthCAGR:'12-18%', catalyst:'文心大模型+自动驾驶Robotaxi', risk:'med', note:'搜索+AI+自动驾驶三引擎，但搜索基本盘承压', rank:'国内搜索引擎#1(份额65%+)，自动驾驶Apollo国内#1', upstream:'GPU(NVDA/昇腾)→数据中心→搜索爬虫数据', downstream:'C端(搜索/AI助手)→B端(百度云AI)→萝卜快跑(Robotaxi乘客)' },
      { ticker:'0700.HK', name:'腾讯(混元大模型)', exchange:'港股', marketCap:'HKD 4.5万亿', currentPrice:'HKD 482', buyZone:'HKD 380-420', targetPrice:'HKD 650', upside:'+35%', growthCAGR:'18-22%', catalyst:'混元大模型+微信AI广告+企业微信AI', risk:'low', note:'持仓中，AI广告已贡献实质增量', rank:'国内社交/游戏#1，云计算#3，大模型应用落地最快', upstream:'GPU(NVDA/昇腾)→数据中心→微信生态数据', downstream:'13亿微信用户→小程序商家→企业微信客户→游戏玩家→广告主' },
      { ticker:'000977.SZ', name:'浪潮信息', exchange:'A股', marketCap:'¥800亿+', currentPrice:'¥50-60', buyZone:'¥40-48', targetPrice:'¥80', upside:'+50%', growthCAGR:'30-40%', catalyst:'AI服务器出货量爆发+算力基建国产替代', risk:'med', note:'AI服务器龙头，营收同比+59%，但利润率薄', rank:'国内AI服务器#1(份额35%+)，全球#2(仅次于Dell)', upstream:'CPU(Intel/AMD/海光)→GPU(NVDA/昇腾/寒武纪)→内存(三星/SKHX)→PCB→机箱', downstream:'互联网厂商(阿里/腾讯/字节)→运营商(移动/电信)→政府(政务云)→金融机构' },
      { ticker:'603019.SH', name:'中科曙光', exchange:'A股', marketCap:'¥1200亿+', currentPrice:'¥70-85', buyZone:'¥55-68', targetPrice:'¥110', upside:'+45%', growthCAGR:'25-35%', catalyst:'超节点服务器+国家级算力项目', risk:'med', note:'国家队算力核心供应商，政策确定性高', rank:'国产超算#1，信创服务器#2(仅次于浪潮)', upstream:'CPU(海光/鲲鹏)→GPU(昇腾/寒武纪)→液冷系统→国产OS', downstream:'国家级超算中心→政府信创→科研院所→央企数字化转型' },
      { ticker:'688256.SH', name:'寒武纪', exchange:'A股', marketCap:'¥1500亿+', currentPrice:'¥300-380', buyZone:'¥220-280', targetPrice:'¥480', upside:'+40%', growthCAGR:'50-80%', catalyst:'国产AI芯片规模化出货+昇腾替代预期', risk:'high', note:'A股最纯正AI芯片标的，但盈利路径不清晰', rank:'国产AI推理芯片#2(仅次于昇腾)，A股AI芯片市值#1', upstream:'台积电/中芯国际(代工)→IP授权(ARM/x86)→EDA工具→先进封装', downstream:'服务器厂商(浪潮/曙光)→互联网(推理集群)→运营商→智能驾驶' },
      { ticker:'688041.SH', name:'海光信息', exchange:'A股', marketCap:'¥2000亿+', currentPrice:'¥80-100', buyZone:'¥60-75', targetPrice:'¥135', upside:'+50%', growthCAGR:'40-55%', catalyst:'国产CPU/DCU放量+信创采购加速', risk:'med', note:'x86架构CPU国产替代核心，DCU对标A100', rank:'国产x86 CPU#1(信创服务器CPU份额40%+)，DCU国产AI加速卡#2', upstream:'代工(GlobalFoundries/中芯)→x86授权(AMD)→封装测试', downstream:'服务器厂商(浪潮/曙光/联想)→信创政府/金融/电信→数据中心' },
      { ticker:'002230.SZ', name:'科大讯飞', exchange:'A股', marketCap:'¥1200亿+', currentPrice:'¥50-60', buyZone:'¥40-48', targetPrice:'¥80', upside:'+45%', growthCAGR:'20-30%', catalyst:'星火大模型+AI教育/医疗/政务落地', risk:'med', note:'AI应用最广泛落地，但盈利能力待提升', rank:'国内AI语音#1(份额60%+)，AI教育#1，AI政务#1', upstream:'GPU(NVDA/昇腾)→数据中心→语音数据→教育/医疗行业数据', downstream:'学校(智慧教育)→医院(AI辅助诊疗)→政府(智慧政务)→车企(车载语音)' },
      { ticker:'0020.HK', name:'商汤科技', exchange:'港股', marketCap:'HKD 600亿+', currentPrice:'HKD 1.5-2.0', buyZone:'HKD 1.2-1.6', targetPrice:'HKD 3.0', upside:'+70%', growthCAGR:'25-35%', catalyst:'大模型+AI视觉+自动驾驶三线并进', risk:'high', note:'估值极低但烧钱严重，反转需营收拐点确认', rank:'国内AI视觉#1，AI算力(商汤大装置)亚洲最大之一', upstream:'GPU(NVDA)→自建AIDC算力中心→视觉数据→自动驾驶路测数据', downstream:'智慧城市(政府)→自动驾驶(车企)→医疗(影像AI)→娱乐(AR/特效)' },
      { ticker:'300253.SZ', name:'卫宁健康', exchange:'A股', marketCap:'¥200亿+', currentPrice:'¥10-14', buyZone:'¥8-11', targetPrice:'¥18', upside:'+50%', growthCAGR:'25-35%', catalyst:'AI医疗信息化渗透率提升+政策推动', risk:'med', note:'医疗IT龙头，AI辅助诊疗增量市场', rank:'国内医疗IT#1(三级医院覆盖率60%+份额)', upstream:'服务器/存储硬件→医院信息系统(HIS)→电子病历数据→医保接口', downstream:'医院(HIS/CIS/电子病历)→卫健委(区域医疗)→医保局→患者(互联网医疗)' },
      { ticker:'688111.SH', name:'金山办公', exchange:'A股', marketCap:'¥1500亿+', currentPrice:'¥300-380', buyZone:'¥250-300', targetPrice:'¥480', upside:'+40%', growthCAGR:'25-30%', catalyst:'WPS AI付费率提升+信创办公替代', risk:'low', note:'AI办公最直接受益，付费转化率是关键', rank:'国内办公软件#1(WPS月活6亿+)，全球#2(仅次于Microsoft 365)', upstream:'AI模型(合作方)→云服务(金山云/阿里云)→信创OS适配', downstream:'C端(6亿用户)→B端(政企信创)→教育→WPS AI付费会员' },
      { ticker:'300760.SZ', name:'迈瑞医疗', exchange:'A股', marketCap:'¥3500亿+', currentPrice:'¥280-320', buyZone:'¥230-270', targetPrice:'¥400', upside:'+35%', growthCAGR:'15-20%', catalyst:'AI影像诊断+海外拓展+医疗器械国产替代', risk:'low', note:'存量持仓，AI+医疗双主线', rank:'国内医疗器械#1(全球#30+)，监护仪全球#3，超声国内#1', upstream:'电子元器件(芯片/传感器)→精密机械→医疗级材料→影像探测器', downstream:'医院(监护/麻醉/超声/体外诊断)→科研机构→海外(190+国家)' },
    ],
  },
  {
    name: '集成电路与半导体',
    icon: '💾',
    color: '#8b5cf6',
    totalMarket: '2万亿+ (2030E)',
    description: '六大卡脖子之首，全链条自主攻关。国产化率从20%→60%是核心目标。',
    stocks: [
      { ticker:'688981.SH', name:'中芯国际', exchange:'A股', marketCap:'¥4000亿+', currentPrice:'¥50-60', buyZone:'¥38-48', targetPrice:'¥80', upside:'+50%', growthCAGR:'15-20%', catalyst:'先进制程突破+国产替代订单', risk:'med', note:'国内最先进晶圆代工，14nm/N+1推进', rank:'国内晶圆代工#1(份额50%+)，全球#5', upstream:'硅片(沪硅/SUMCO)→设备(北方华创/ASML/中微)→光刻胶→气体→CMP材料(安集)', downstream:'芯片设计公司(华为海思/寒武纪/兆易)→手机/汽车/工业→AI芯片→消费电子' },
      { ticker:'688347.SH', name:'华虹公司', exchange:'A股', marketCap:'¥800亿+', currentPrice:'¥40-55', buyZone:'¥32-42', targetPrice:'¥72', upside:'+50%', growthCAGR:'15-20%', catalyst:'特色工艺需求爆发+功率半导体', risk:'med', note:'功率器件/模拟芯片特色工艺，与中芯互补', rank:'国内特色工艺晶圆代工#1(功率器件/模拟/嵌入式)', upstream:'硅片→设备→气体→光刻胶(BOM与中芯类似但制程要求更低)', downstream:'功率器件(新能源车/光伏逆变)→模拟芯片(消费电子)→嵌入式(物联网/MCU)→IGBT(新能源车)' },
      { ticker:'002371.SZ', name:'北方华创', exchange:'A股', marketCap:'¥2500亿+', currentPrice:'¥380-460', buyZone:'¥300-370', targetPrice:'¥600', upside:'+45%', growthCAGR:'30-40%', catalyst:'国产设备采购加速+刻蚀CVD突破', risk:'med', note:'国内半导体设备绝对龙头', rank:'国内半导体设备#1(综合品类最全)，刻蚀/CVD/清洗国内前三', upstream:'精密机械零部件→真空系统→电源→气体/化学品→传感器', downstream:'晶圆厂(中芯/华虹/长存)→化合物半导体→先进封装→科研院所' },
      { ticker:'688012.SH', name:'中微公司', exchange:'A股', marketCap:'¥1800亿+', currentPrice:'¥280-340', buyZone:'¥220-280', targetPrice:'¥450', upside:'+45%', growthCAGR:'30-35%', catalyst:'高端刻蚀进入台积电+国产替代深化', risk:'med', note:'5nm刻蚀已商用，全球竞争力最强', rank:'国内刻蚀设备#1，全球刻蚀#4(CCP刻蚀全球前三)', upstream:'精密加工→真空腔体→射频电源→气体系统→陶瓷件', downstream:'台积电/中芯/华虹→3D NAND(长江存储)→DRAM→先进封装' },
      { ticker:'688126.SH', name:'沪硅产业', exchange:'A股', marketCap:'¥400亿+', currentPrice:'¥14-18', buyZone:'¥10-14', targetPrice:'¥25', upside:'+55%', growthCAGR:'35-50%', catalyst:'300mm大硅片国产化率提升', risk:'med', note:'大硅片国产化核心，但盈利在爬坡', rank:'国内300mm大硅片#1(国产份额80%+)，全球份额~3%', upstream:'多晶硅→拉晶炉→切割/研磨/抛光设备→CMP抛光液(安集)', downstream:'晶圆代工厂(中芯/华虹/台积电)→存储厂→功率器件厂' },
      { ticker:'688019.SH', name:'安集科技', exchange:'A股', marketCap:'¥300亿+', currentPrice:'¥180-220', buyZone:'¥140-175', targetPrice:'¥300', upside:'+50%', growthCAGR:'30-40%', catalyst:'CMP抛光液国产化+先进制程导入', risk:'med', note:'材料国产化标杆，小而美', rank:'国内CMP抛光液#1(国产份额50%+)，全球份额~5%', upstream:'化工原料(研磨颗粒/化学添加剂)→纯化设备→包装材料', downstream:'晶圆厂(中芯/华虹/台积电)→硅片厂(沪硅)→先进封装' },
      { ticker:'603986.SH', name:'兆易创新', exchange:'A股', marketCap:'¥600亿+', currentPrice:'¥80-100', buyZone:'¥60-78', targetPrice:'¥140', upside:'+55%', growthCAGR:'25-35%', catalyst:'MCU+存储双轮驱动+物联网需求', risk:'med', note:'存储/MCU国产替代主力', rank:'国内MCU#1(32位ARM MCU份额第一)，NOR Flash全球#3', upstream:'晶圆代工(中芯/华虹)→封装测试→IP授权(ARM)→EDA工具', downstream:'物联网设备→汽车电子→工业控制→消费电子(手机/穿戴)→智能家居' },
    ],
  },
  {
    name: '具身智能与机器人',
    icon: '🤖',
    color: '#06b6d4',
    totalMarket: '1万亿+ (2030E)',
    description: '涉及100+相关产业，CAGR ~80%。2026年工厂量产启动元年。',
    stocks: [
      { ticker:'9880.HK', name:'优必选', exchange:'港股', marketCap:'HKD 300亿+', currentPrice:'HKD 60-80', buyZone:'HKD 40-55', targetPrice:'HKD 120', upside:'+70%', growthCAGR:'60-100%', catalyst:'人形机器人工厂部署+教育机器人', risk:'high', note:'最纯正人形机器人标的，但盈利遥远', rank:'国内人形机器人#1(商业化最早)，全球人形机器人上市公司稀缺标的', upstream:'减速器(绿的谐波)→电机(鸣志)→传感器→AI芯片→电池(宁德)→控制器', downstream:'工厂(汽车制造/3C组装)→教育→服务(酒店/医院/养老)→家庭(长期)' },
      { ticker:'688017.SH', name:'绿的谐波', exchange:'A股', marketCap:'¥250亿+', currentPrice:'¥120-150', buyZone:'¥90-120', targetPrice:'¥200', upside:'+50%', growthCAGR:'40-60%', catalyst:'机器人关节谐波减速器+人形放量', risk:'med', note:'谐波减速器国产替代龙头', rank:'国内谐波减速器#1(国产份额60%+)，全球#2(仅次于日本哈默纳科)', upstream:'特殊钢材(轴承钢)→精密磨床→润滑材料→陶瓷球轴承', downstream:'工业机器人(发那科/ABB/埃斯顿)→人形机器人(优必选/宇树/智元)→协作机器人→机床' },
      { ticker:'002050.SZ', name:'三花智控', exchange:'A股', marketCap:'¥1200亿+', currentPrice:'¥30-38', buyZone:'¥24-30', targetPrice:'¥50', upside:'+45%', growthCAGR:'25-35%', catalyst:'特斯拉Optimus供应链+热管理扩张', risk:'low', note:'确定性最高——无论谁造机器人都需要热管理', rank:'全球热管理#2(仅次于Denso)，汽车热管理国内#1，机器人热管理先行者', upstream:'铜/铝→精密加工→电磁阀→传感器→电子膨胀阀→冷媒', downstream:'新能源车(特斯拉/比亚迪/蔚小理)→机器人(特斯拉Optimus)→空调(格力/美的)→储能温控' },
      { ticker:'601689.SH', name:'拓普集团', exchange:'A股', marketCap:'¥800亿+', currentPrice:'¥55-70', buyZone:'¥42-55', targetPrice:'¥95', upside:'+50%', growthCAGR:'30-40%', catalyst:'机器人执行器+特斯拉供应链+汽车NVH', risk:'med', note:'汽车+机器人双赛道，执行器是关键增量', rank:'国内汽车NVH#1，特斯拉供应链Tier1，机器人执行器国内先行者', upstream:'橡胶→金属冲压→电子元器件→电机→传感器→铝合金', downstream:'特斯拉(底盘/内饰/热管理/执行器)→国内新能源车企→机器人整机厂→底盘/减震' },
      { ticker:'603667.SH', name:'五洲新春', exchange:'A股', marketCap:'¥80亿+', currentPrice:'¥20-28', buyZone:'¥15-20', targetPrice:'¥38', upside:'+60%', growthCAGR:'35-50%', catalyst:'精密轴承国产替代+机器人关节', risk:'med', note:'小市值高弹性，轴承是机器人精密传动核心', rank:'国内精密轴承#5-8(细分领域特色)，机器人关节轴承国产替代先锋', upstream:'轴承钢(特种钢材)→精密锻造→磨削设备→热处理→润滑脂', downstream:'机器人关节(减速器配套)→汽车(变速箱/轮毂)→风电(主轴/变桨)→机床主轴' },
      { ticker:'603728.SH', name:'鸣志电器', exchange:'A股', marketCap:'¥150亿+', currentPrice:'¥35-45', buyZone:'¥25-33', targetPrice:'¥60', upside:'+55%', growthCAGR:'40-55%', catalyst:'步进电机+伺服+机器人运动控制', risk:'med', note:'运动控制小而美，机器人关节电机放量', rank:'国内步进电机#1，伺服电机#5-8(中高端)，机器人关节电机国内前三', upstream:'稀土永磁(钕铁硼)→硅钢片→铜线→编码器→驱动器IC', downstream:'机器人(关节/灵巧手)→医疗设备(手术机器人)→半导体设备→3D打印→工业自动化' },
      { ticker:'002236.SZ', name:'大华股份', exchange:'A股', marketCap:'¥800亿+', currentPrice:'¥22-28', buyZone:'¥17-22', targetPrice:'¥35', upside:'+40%', growthCAGR:'15-20%', catalyst:'AI视觉+工业巡检机器人+智慧城市', risk:'low', note:'估值有安全边际，AI视觉赋能机器人', rank:'全球视频监控#2(仅次于海康)，国内工业巡检机器人#2-3', upstream:'图像传感器(CMOS)→AI芯片(海思/寒武纪)→镜头→存储→云服务', downstream:'智慧城市(公安/交通)→工业(巡检/质检)→企业园区→零售→机器人(视觉感知模块)' },
    ],
  },
  {
    name: '低空经济',
    icon: '🚁',
    color: '#10b981',
    totalMarket: '2~3.5万亿 (2030E)',
    description: '2026商业化运营元年，eVTOL适航证集中发放。CAGR ~70%。',
    stocks: [
      { ticker:'EH', name:'亿航智能', exchange:'美股', marketCap:'$10亿+', currentPrice:'$12-18', buyZone:'$8-13', targetPrice:'$30', upside:'+100%', growthCAGR:'60-100%', catalyst:'全球首家适航三证+载人运营启动', risk:'high', note:'eVTOL全球标杆，但盈利远+监管风险', rank:'全球eVTOL#1(唯一获适航三证)，全球载人无人机绝对龙头', upstream:'电池(宁德/亿纬)→电机→飞控系统→碳纤维复合材料→螺旋桨→航电系统', downstream:'城市空中交通(空中出租车)→低空旅游→物流→应急救援→医疗转运' },
      { ticker:'002389.SZ', name:'航天彩虹', exchange:'A股', marketCap:'¥150亿+', currentPrice:'¥15-20', buyZone:'¥11-15', targetPrice:'¥28', upside:'+60%', growthCAGR:'25-35%', catalyst:'工业无人机+军用无人机双线', risk:'med', note:'无人机国家队', rank:'国内军用无人机#2-3(中大型)，工业无人机#3-5', upstream:'航空发动机→飞控→光电吊舱→复合材料→通信链路→导航(GPS/北斗)', downstream:'军方(侦察/打击)→电力巡检→农业植保→测绘→应急救灾→海洋监测' },
      { ticker:'688631.SH', name:'莱斯信息', exchange:'A股', marketCap:'¥80亿+', currentPrice:'¥40-55', buyZone:'¥30-40', targetPrice:'¥75', upside:'+55%', growthCAGR:'35-50%', catalyst:'低空空管系统龙头+政策刚需', risk:'med', note:'低空经济的基础设施——管飞机航道', rank:'国内低空空管系统#1(民航/通航/低空三大市场)，低空智联网龙头', upstream:'雷达→通信基站→服务器→AI算法→北斗导航→5G/6G模块', downstream:'民航局→机场→通航公司→eVTOL运营商→低空经济园区→城市空中交通管理' },
      { ticker:'000801.SZ', name:'四川九洲', exchange:'A股', marketCap:'¥100亿+', currentPrice:'¥12-16', buyZone:'¥9-12', targetPrice:'¥22', upside:'+55%', growthCAGR:'30-40%', catalyst:'低空导航+空天地一体通信', risk:'med', note:'导航设备国产替代', rank:'国内空管导航设备#2-3，北斗导航终端国内领先', upstream:'芯片(FPGA/DSP)→天线→射频器件→精密机械→北斗芯片', downstream:'民航机场→通航→无人机→军方导航→低空智联网→eVTOL导航' },
      { ticker:'601698.SH', name:'中国卫通', exchange:'A股', marketCap:'¥800亿+', currentPrice:'¥18-24', buyZone:'¥14-18', targetPrice:'¥32', upside:'+50%', growthCAGR:'20-30%', catalyst:'卫星通信+低空连接+6G预期', risk:'low', note:'卫星运营稀缺标的', rank:'国内静止轨道卫星通信运营#1(绝对垄断)，卫星互联网核心运营商之一', upstream:'卫星制造(中国航天/中国卫星)→火箭发射(航天科技)→地面站设备→频率轨位资源', downstream:'广电(卫星电视)→航空(机上WiFi)→海事→应急通信→偏远地区宽带→低空无人机通信' },
      { ticker:'000099.SZ', name:'中信海直', exchange:'A股', marketCap:'¥100亿+', currentPrice:'¥10-14', buyZone:'¥7-10', targetPrice:'¥20', upside:'+70%', growthCAGR:'30-50%', catalyst:'低空旅游+空中摆渡+直升机运营', risk:'med', note:'最直接的低空经济运营商', rank:'国内海上石油直升机服务#1(份额70%+)，通航运营综合#1', upstream:'直升机(空客/贝尔/国产)→航油→机场/起降场→飞行员→维修(MRO)', downstream:'海上石油平台(中海油)→低空旅游→空中摆渡→应急救援→电力巡线→政府服务' },
      { ticker:'002352.SZ', name:'顺丰控股', exchange:'A股', marketCap:'¥2000亿+', currentPrice:'¥40-48', buyZone:'¥32-38', targetPrice:'¥60', upside:'+40%', growthCAGR:'12-18%', catalyst:'无人机末端配送+低空物流网络', risk:'low', note:'低空物流最成熟场景，但低空占比小', rank:'国内快递物流#1(时效件绝对垄断)，货运无人机物流国内#1', upstream:'货运无人机→运输车辆→航空燃油→分拣自动化设备→AI调度系统→机场/中转场', downstream:'C端(快递/冷链/同城)→B端(供应链/合同物流)→跨境电商→低空配送(农村/海岛/山区)' },
    ],
  },
  {
    name: '新能源与绿色低碳',
    icon: '⚡',
    color: '#eab308',
    totalMarket: '10万亿+ (2030E)',
    description: '光储氢核四大赛道，新型能源体系核心。CAGR ~10%，但结构性机会突出。',
    stocks: [
      { ticker:'601012.SH', name:'隆基绿能', exchange:'A股', marketCap:'¥1500亿+', currentPrice:'¥18-24', buyZone:'¥14-18', targetPrice:'¥32', upside:'+55%', growthCAGR:'15-20%', catalyst:'BC电池技术领先+组件出口恢复', risk:'med', note:'光伏龙头估值低位，行业出清后强者恒强', rank:'全球硅片+组件出货#1-2(与晶科争第一)，BC电池技术全球领先', upstream:'多晶硅(通威/协鑫)→银浆→光伏玻璃→EVA胶膜→逆变器(阳光)→边框/支架', downstream:'大型地面电站(国企)→分布式屋顶(工商/户用)→海外(欧洲/中东/拉美)→储能配套' },
      { ticker:'002459.SZ', name:'晶澳科技', exchange:'A股', marketCap:'¥600亿+', currentPrice:'¥18-25', buyZone:'¥14-18', targetPrice:'¥35', upside:'+60%', growthCAGR:'15-20%', catalyst:'N型TOPCon产能释放+海外市占率提升', risk:'med', note:'组件出口领先，估值安全边际充足', rank:'全球组件出货#2-3(与隆基/晶科/天合竞争)，N型TOPCon产能全球前三', upstream:'硅片(自产+外购)→银浆→玻璃→胶膜→接线盒→铝边框', downstream:'海外电站(欧洲/美国/亚太)→国内大型基地→分布式→储能系统' },
      { ticker:'600438.SH', name:'通威股份', exchange:'A股', marketCap:'¥1200亿+', currentPrice:'¥25-32', buyZone:'¥18-24', targetPrice:'¥42', upside:'+50%', growthCAGR:'12-18%', catalyst:'硅料成本优势+电池片新技术', risk:'med', note:'硅料+电池双料冠军', rank:'全球多晶硅#1(成本全行业最低)，电池片出货全球#1', upstream:'工业硅→电力(水电/煤电优惠)→氯碱化工→设备(还原炉)', downstream:'硅片厂(隆基/中环)→组件厂→电站→半导体硅料(高纯度)' },
      { ticker:'300274.SZ', name:'阳光电源', exchange:'A股', marketCap:'¥2000亿+', currentPrice:'¥90-110', buyZone:'¥70-88', targetPrice:'¥145', upside:'+45%', growthCAGR:'25-30%', catalyst:'逆变器+储能双龙头+海外扩张', risk:'low', note:'新能源中储能逻辑最顺的标的', rank:'全球逆变器#2(仅次于华为)，储能系统集成全球#3-5', upstream:'IGBT/碳化硅功率器件→电感/电容→散热系统→结构件→EMS软件', downstream:'光伏电站→储能电站→工商业储能→户用储能(海外)→AI数据中心储能' },
      { ticker:'002202.SZ', name:'金风科技', exchange:'A股', marketCap:'¥500亿+', currentPrice:'¥11-15', buyZone:'¥8-11', targetPrice:'¥20', upside:'+55%', growthCAGR:'15-20%', catalyst:'陆上风机更新周期+海上风电拓展', risk:'med', note:'陆上风机龙头，估值历史低位', rank:'国内陆上风电整机#1(累计装机第一)，海上风电#3-5', upstream:'钢材→稀土永磁→轴承(五洲/进口)→叶片(玻璃纤维/碳纤维)→齿轮箱→发电机→变流器', downstream:'风电开发商(国家能源/华能/中广核)→海上风电→风电场运营→老旧风机改造(以大代小)' },
      { ticker:'601615.SH', name:'明阳智能', exchange:'A股', marketCap:'¥400亿+', currentPrice:'¥18-24', buyZone:'¥13-17', targetPrice:'¥32', upside:'+55%', growthCAGR:'20-30%', catalyst:'海上风电+漂浮式风机突破', risk:'med', note:'海上风电弹性最大标的', rank:'国内海上风电整机#1-2，漂浮式海上风机全球领先', upstream:'钢材→碳纤维叶片→永磁发电机→海工基础(桩基/导管架)→海缆→施工船', downstream:'海上风电开发商→沿海省份(广东/江苏/福建)→漂浮式(深远海)→海外(欧洲/东南亚)' },
      { ticker:'300750.SZ', name:'宁德时代', exchange:'A股', marketCap:'¥8000亿+', currentPrice:'¥180-220', buyZone:'¥150-175', targetPrice:'¥290', upside:'+45%', growthCAGR:'18-25%', catalyst:'固态电池+储能出海+钠离子电池', risk:'low', note:'全球动力电池霸主，但增速放缓', rank:'全球动力电池#1(份额37%)，储能电池#1(份额40%+)，绝对双料冠军', upstream:'锂(天齐/赣锋)→钴→镍→石墨→电解液→隔膜→铜箔→设备→PVDF', downstream:'新能源车企(特斯拉/宝马/蔚小理)→储能电站→换电站→船舶→飞机(长期)' },
      { ticker:'002594.SZ', name:'比亚迪', exchange:'A股', marketCap:'¥7000亿+', currentPrice:'¥240-280', buyZone:'¥200-235', targetPrice:'¥360', upside:'+40%', growthCAGR:'15-20%', catalyst:'刀片电池+海外建厂+高端化', risk:'low', note:'全球新能源车销量第一，垂直整合无敌', rank:'全球新能源车销量#1(份额22%+)，动力电池#2(份额16%)，垂直整合程度全球最高', upstream:'锂矿(自有+外购)→半导体(IGBT自研)→稀土→钢材→玻璃→自产电池→自产芯片→自产电机→自产电控', downstream:'C端消费者(王朝/海洋/方程豹/仰望)→B端(纯电大巴/卡车)→储能→海外(欧洲/东南亚/南美工厂)' },
      { ticker:'300014.SZ', name:'亿纬锂能', exchange:'A股', marketCap:'¥1000亿+', currentPrice:'¥50-62', buyZone:'¥38-48', targetPrice:'¥80', upside:'+45%', growthCAGR:'25-35%', catalyst:'大圆柱电池+储能放量+海外客户', risk:'med', note:'二线电池弹性标的，大圆柱领先', rank:'国内动力电池#4-5，储能电池#3，大圆柱4680国内量产进度最快', upstream:'锂/镍/钴→正极材料→负极→电解液→隔膜→结构件(钢壳/铝壳)', downstream:'新能源车企(宝马/小鹏/蔚来)→储能→电动工具→两轮车→电子烟(思摩尔)' },
      { ticker:'688339.SH', name:'亿华通', exchange:'A股', marketCap:'¥100亿+', currentPrice:'¥30-40', buyZone:'¥20-28', targetPrice:'¥55', upside:'+55%', growthCAGR:'50-80%', catalyst:'氢燃料重卡放量+政策加速', risk:'high', note:'氢能纯正标的但盈利遥远', rank:'国内燃料电池系统#1(装机份额25%+)，商用车燃料电池绝对龙头', upstream:'质子交换膜→催化剂(铂)→碳纸→双极板→空压机→氢气循环泵→储氢瓶', downstream:'商用车(重卡/公交/物流车)→氢能发电站→船舶→轨道交通→氢储能' },
    ],
  },
  {
    name: '商业航天',
    icon: '🛰️',
    color: '#3b82f6',
    totalMarket: '3000亿+ (2030E)',
    description: '2025-2030黄金窗口期，可回收火箭降本50%+。CAGR ~35%。',
    stocks: [
      { ticker:'600118.SH', name:'中国卫星', exchange:'A股', marketCap:'¥300亿+', currentPrice:'¥22-28', buyZone:'¥16-22', targetPrice:'¥38', upside:'+50%', growthCAGR:'20-30%', catalyst:'低轨卫星互联网组网+遥感商业化', risk:'med', note:'卫星制造国家队', rank:'国内小/微卫星制造#1(航天科技集团核心上市平台)，遥感卫星运营#1', upstream:'宇航级芯片(抗辐射)→太阳能电池→推进系统→姿控飞轮→碳纤维结构→星载计算机→发射服务(长征系列)', downstream:'国防(侦查卫星)→政府(遥感/气象/环境)→商业(卫星互联网/物联网)→科研(空间科学)→海外出口' },
      { ticker:'600879.SH', name:'航天电子', exchange:'A股', marketCap:'¥250亿+', currentPrice:'¥8-11', buyZone:'¥6-8', targetPrice:'¥14', upside:'+55%', growthCAGR:'20-25%', catalyst:'卫星测控+导航+航天电子', risk:'med', note:'航天电子配套最全标的', rank:'国内航天电子配套#1(覆盖最全)，无人机测控国内领先', upstream:'宇航级电子元器件→PCB→连接器→电缆→惯导器件→抗辐射IC', downstream:'火箭(长征/快舟)→卫星(中国卫星/星网)→导弹→无人机→飞船/空间站→地面测控站' },
      { ticker:'300045.SZ', name:'华力创通', exchange:'A股', marketCap:'¥100亿+', currentPrice:'¥15-20', buyZone:'¥11-15', targetPrice:'¥28', upside:'+55%', growthCAGR:'30-40%', catalyst:'卫星通信终端+华为产业链', risk:'med', note:'小而美卫星通信标的', rank:'国内卫星通信终端#2-3，北斗导航仿真测试国内#1', upstream:'射频芯片→天线→基带芯片→FPGA→北斗模块→卫星通信模组', downstream:'华为(卫星通信手机)→军方(卫通终端)→应急(救灾通信)→车联网→低空无人机→船载通信' },
    ],
  },
  {
    name: '生物技术与创新药',
    icon: '🧬',
    color: '#ec4899',
    totalMarket: '5万亿+ (2030E)',
    description: 'AI制药+创新药出海+合成生物。国产创新药出海2030年超百亿美元。',
    stocks: [
      { ticker:'688235.SH', name:'百济神州', exchange:'A股', marketCap:'¥2000亿+', currentPrice:'¥140-180', buyZone:'¥110-140', targetPrice:'¥240', upside:'+50%', growthCAGR:'25-35%', catalyst:'泽布替尼全球放量+新药管线', risk:'med', note:'中国唯一全球化生物药公司', rank:'国内创新药出海#1(泽布替尼全球BTK抑制剂#1)，研发投入国内最大', upstream:'CRO(药明康德/康龙化成)→原料药→临床机构→CDMO→生物反应器→培养基→冷链物流', downstream:'全球血液瘤患者(泽布替尼)→PD-1(替雷利珠)→欧美市场(自建销售团队)→中国医保' },
      { ticker:'600276.SH', name:'恒瑞医药', exchange:'A股', marketCap:'¥2500亿+', currentPrice:'¥40-50', buyZone:'¥30-40', targetPrice:'¥65', upside:'+45%', growthCAGR:'18-25%', catalyst:'ADC管线+创新药转型+国际化', risk:'low', note:'国内研发管线最强，仿转创成功', rank:'国内制药企业#1(营收/利润/研发管线综合)，仿转创转型最成功', upstream:'原料药(自产+外购)→CRO/CDMO→临床试验→API中间体→辅料→包材→设备', downstream:'国内医院(肿瘤/麻醉/造影)→医保→药店→出海(仿制药→创新药授权)→ADC全球合作' },
      { ticker:'LEGN', name:'传奇生物', exchange:'美股', marketCap:'$80亿+', currentPrice:'$40-55', buyZone:'$30-40', targetPrice:'$75', upside:'+60%', growthCAGR:'35-50%', catalyst:'CAR-T Carvykti放量+新适应症', risk:'high', note:'全球CAR-T标杆，但单一产品依赖', rank:'全球CAR-T细胞治疗#2(仅次于吉利德Yescarta)，BCMA靶点CAR-T全球#1', upstream:'病毒载体→细胞培养基→基因编辑工具→质粒DNA→冷链(液氮)→GMP生产设施→CDMO(强生合作)', downstream:'多发性骨髓瘤患者(全球)→临床试验(新适应症：早线治疗)→美国(主要收入)→欧洲→中国' },
      { ticker:'688639.SH', name:'华恒生物', exchange:'A股', marketCap:'¥200亿+', currentPrice:'¥80-100', buyZone:'¥60-78', targetPrice:'¥140', upside:'+55%', growthCAGR:'35-50%', catalyst:'合成生物学氨基酸+新材料应用', risk:'med', note:'合成生物学最纯正A股标的', rank:'国内合成生物学氨基酸#1(丙氨酸/缬氨酸全球份额领先)，生物制造A股标杆', upstream:'葡萄糖/淀粉(玉米)→菌种(自建菌种库)→发酵罐→分离纯化设备→能源(蒸汽/电)', downstream:'饲料添加剂→食品(鲜味剂/防腐)→化妆品(保湿剂)→医药中间体→可降解塑料→生物基材料' },
      { ticker:'688065.SH', name:'凯赛生物', exchange:'A股', marketCap:'¥300亿+', currentPrice:'¥50-65', buyZone:'¥38-48', targetPrice:'¥85', upside:'+50%', growthCAGR:'30-40%', catalyst:'生物基尼龙+材料国产替代', risk:'med', note:'生物基材料商业化标杆', rank:'全球生物基长链二元酸#1(份额80%+)，生物基戊二胺/尼龙56全球唯一商业化', upstream:'烷烃(石油基)→菌种→发酵→分离纯化→聚合设备→化工助剂', downstream:'特种尼龙(汽车/电子)→纺织(生物基面料)→工程塑料→涂料→香料→医药中间体' },
      { ticker:'688271.SH', name:'联影医疗', exchange:'A股', marketCap:'¥1200亿+', currentPrice:'¥140-170', buyZone:'¥110-135', targetPrice:'¥220', upside:'+45%', growthCAGR:'25-30%', catalyst:'高端影像设备国产替代+AI辅助诊断', risk:'low', note:'CT/MRI/PET国产替代龙头', rank:'国内高端医学影像#1(CT/MRI/PET-CT国产份额第一)，国内医疗设备综合#2(仅次于迈瑞)', upstream:'超导磁体(液氦)→X射线球管→探测器→射频线圈→AI芯片→影像处理软件→精密机械', downstream:'三甲医院→县级医院(分级诊疗)→民营医院→体检中心→海外(一带一路/新兴市场)→科研院所' },
    ],
  },
  {
    name: '智能网联汽车',
    icon: '🚗',
    color: '#f97316',
    totalMarket: '3万亿+ (2030E)',
    description: '新能源渗透率突破50%，L3自动驾驶规模商用。关注智驾芯片和增量部件。',
    stocks: [
      { ticker:'9660.HK', name:'地平线机器人', exchange:'港股', marketCap:'HKD 500亿+', currentPrice:'HKD 3.5-5', buyZone:'HKD 2.5-3.5', targetPrice:'HKD 7', upside:'+70%', growthCAGR:'40-60%', catalyst:'车规AI芯片放量+国产替代加速', risk:'high', note:'国内车企采购量最大的智驾芯片', rank:'国内自动驾驶芯片#1(征程系列上车最多)，全球车载AI芯片#3(仅次于Mobileye/NVIDIA)', upstream:'晶圆代工(台积电/中芯)→IP授权→封装测试→EDA→算法训练数据→整车厂路测数据', downstream:'整车厂(比亚迪/理想/长安/奇瑞)→Tier1(博世/大陆)→RoboTaxi→商用车→机器人(复用芯片)' },
      { ticker:'2533.HK', name:'黑芝麻智能', exchange:'港股', marketCap:'HKD 100亿+', currentPrice:'HKD 15-25', buyZone:'HKD 10-18', targetPrice:'HKD 35', upside:'+60%', growthCAGR:'50-80%', catalyst:'自动驾驶芯片+华为链+比亚迪链', risk:'high', note:'智驾芯片第二选择，弹性更大', rank:'国内自动驾驶芯片#2(华山系列)，全球车载AI芯片#4-5', upstream:'晶圆代工(台积电/三星)→IP→封装→ADAS算法→感知数据→高精地图', downstream:'整车厂(吉利/一汽/东风)→Tier1→商用车→L2+/L3智驾→泊车/行车一体' },
    ],
  },
]
