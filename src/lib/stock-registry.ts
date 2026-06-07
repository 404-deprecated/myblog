'use client'

import { useState, useEffect, useCallback } from 'react'

export interface StockEntry {
  code: string       // 纯代码,如 "000725"
  name: string
  exchange: 'A股' | '港股' | '美股'
  sector: string     // 行业分类
  tags: string[]     // 标签,如 ["十五五","短线","持仓"]
  active: boolean    // 是否激活(显示在盯盘/分析中)
  notes: string
}

// 全量股票主数据 — 从所有Tab合并
const ALL_STOCKS: StockEntry[] = [
  // ── 面板/光电 ──
  {code:'000725',name:'京东方A',exchange:'A股',sector:'面板/光电',tags:['短线','持仓','十五五'],active:true,notes:'全球LCD面板#1+玻璃基载板新赛道'},
  {code:'603773',name:'沃格光电',exchange:'A股',sector:'面板/光电',tags:['短线'],active:true,notes:'玻璃基板加工'},
  {code:'002273',name:'水晶光电',exchange:'A股',sector:'面板/光电',tags:['短线'],active:true,notes:'光学镀膜龙头'},
  {code:'300790',name:'宇瞳光学',exchange:'A股',sector:'面板/光电',tags:['短线'],active:true,notes:'安防镜头#2'},
  // ── 半导体/芯片 ──
  {code:'688256',name:'寒武纪',exchange:'A股',sector:'半导体/芯片',tags:['短线','十五五'],active:true,notes:'国产AI芯片纯正标的'},
  {code:'688981',name:'中芯国际',exchange:'A股',sector:'半导体/芯片',tags:['短线','持仓','十五五'],active:true,notes:'国内最先进晶圆代工'},
  {code:'688347',name:'华虹公司',exchange:'A股',sector:'半导体/芯片',tags:['短线','十五五'],active:true,notes:'特色工艺晶圆代工'},
  {code:'002371',name:'北方华创',exchange:'A股',sector:'半导体/芯片',tags:['短线','持仓','十五五'],active:true,notes:'国产半导体设备龙头'},
  {code:'688012',name:'中微公司',exchange:'A股',sector:'半导体/芯片',tags:['短线','十五五'],active:true,notes:'5nm刻蚀进台积电'},
  {code:'688019',name:'安集科技',exchange:'A股',sector:'半导体/芯片',tags:['短线','十五五'],active:true,notes:'CMP抛光液国产#1'},
  {code:'688041',name:'海光信息',exchange:'A股',sector:'半导体/芯片',tags:['短线','十五五'],active:true,notes:'国产CPU/DCU'},
  {code:'603986',name:'兆易创新',exchange:'A股',sector:'半导体/芯片',tags:['短线','十五五'],active:true,notes:'MCU#1,NOR Flash#3'},
  {code:'600667',name:'太极实业',exchange:'A股',sector:'半导体/芯片',tags:['短线'],active:true,notes:'半导体封装洁净工程'},
  {code:'600584',name:'长电科技',exchange:'A股',sector:'半导体/芯片',tags:['短线'],active:true,notes:'封装测试全球#3'},
  {code:'688525',name:'佰维存储',exchange:'A股',sector:'半导体/芯片',tags:['短线'],active:true,notes:'NAND模组'},
  {code:'300474',name:'景嘉微',exchange:'A股',sector:'半导体/芯片',tags:['短线'],active:true,notes:'国产GPU军用+民用'},
  {code:'603893',name:'瑞芯微',exchange:'A股',sector:'半导体/芯片',tags:['短线'],active:true,notes:'AIoT SoC芯片龙头'},
  {code:'688126',name:'沪硅产业',exchange:'A股',sector:'半导体/芯片',tags:['短线','十五五'],active:true,notes:'300mm大硅片国产#1'},
  // ── AI/服务器/软件 ──
  {code:'603019',name:'中科曙光',exchange:'A股',sector:'AI/服务器',tags:['短线','十五五'],active:true,notes:'国产超算#1'},
  {code:'000938',name:'紫光股份',exchange:'A股',sector:'AI/服务器',tags:['短线'],active:true,notes:'ICT基础设施#1'},
  {code:'601138',name:'工业富联',exchange:'A股',sector:'AI/服务器',tags:['短线'],active:true,notes:'AI服务器+云计算'},
  {code:'002837',name:'英维克',exchange:'A股',sector:'AI/服务器',tags:['短线'],active:true,notes:'数据中心精密温控'},
  {code:'002230',name:'科大讯飞',exchange:'A股',sector:'AI/服务器',tags:['短线','十五五'],active:true,notes:'AI语音#1'},
  {code:'688111',name:'金山办公',exchange:'A股',sector:'AI/服务器',tags:['短线','十五五'],active:true,notes:'WPS AI办公'},
  {code:'300033',name:'同花顺',exchange:'A股',sector:'AI/服务器',tags:['短线'],active:true,notes:'炒股软件#1'},
  // ── 光通信/光模块 ──
  {code:'300308',name:'中际旭创',exchange:'A股',sector:'光通信',tags:['短线'],active:true,notes:'800G光模块全球#1'},
  {code:'300394',name:'天孚通信',exchange:'A股',sector:'光通信',tags:['短线'],active:true,notes:'光器件龙头'},
  {code:'600522',name:'中天科技',exchange:'A股',sector:'光通信',tags:['短线'],active:true,notes:'光纤+海缆'},
  {code:'601869',name:'长飞光纤',exchange:'A股',sector:'光通信',tags:['短线'],active:true,notes:'光纤预制棒全球#1'},
  {code:'688498',name:'源杰科技',exchange:'A股',sector:'光通信',tags:['短线'],active:true,notes:'光芯片国产替代'},
  // ── 机器人/工控 ──
  {code:'688017',name:'绿的谐波',exchange:'A股',sector:'机器人/工控',tags:['短线','持仓','十五五'],active:true,notes:'谐波减速器全球#2'},
  {code:'002050',name:'三花智控',exchange:'A股',sector:'机器人/工控',tags:['短线','持仓','十五五'],active:true,notes:'特斯拉Optimus热管理'},
  {code:'601689',name:'拓普集团',exchange:'A股',sector:'机器人/工控',tags:['短线','十五五'],active:true,notes:'特斯拉Tier1+机器人执行器'},
  {code:'603728',name:'鸣志电器',exchange:'A股',sector:'机器人/工控',tags:['短线','十五五'],active:true,notes:'步进电机#1'},
  {code:'300124',name:'汇川技术',exchange:'A股',sector:'机器人/工控',tags:['短线'],active:true,notes:'工业自动化#1'},
  {code:'603667',name:'五洲新春',exchange:'A股',sector:'机器人/工控',tags:['短线','十五五'],active:true,notes:'精密轴承机器人关节'},
  // ── 消费电子/精密制造 ──
  {code:'002475',name:'立讯精密',exchange:'A股',sector:'消费电子',tags:['短线'],active:true,notes:'精密制造龙头'},
  {code:'002241',name:'歌尔股份',exchange:'A股',sector:'消费电子',tags:['短线'],active:true,notes:'声学+VR代工'},
  {code:'002600',name:'领益智造',exchange:'A股',sector:'消费电子',tags:['短线'],active:true,notes:'消费电子精密件'},
  // ── 新能源/电池/光伏/风电 ──
  {code:'300750',name:'宁德时代',exchange:'A股',sector:'新能源/电力',tags:['短线','持仓','十五五'],active:true,notes:'全球动力电池#1'},
  {code:'300014',name:'亿纬锂能',exchange:'A股',sector:'新能源/电力',tags:['短线','十五五'],active:true,notes:'大圆柱4680领先'},
  {code:'002594',name:'比亚迪',exchange:'A股',sector:'新能源/电力',tags:['短线','十五五'],active:true,notes:'全球新能源车销量#1'},
  {code:'601012',name:'隆基绿能',exchange:'A股',sector:'新能源/电力',tags:['短线','持仓','十五五'],active:true,notes:'全球硅片组件龙头'},
  {code:'600438',name:'通威股份',exchange:'A股',sector:'新能源/电力',tags:['短线','十五五'],active:true,notes:'全球多晶硅#1'},
  {code:'002459',name:'晶澳科技',exchange:'A股',sector:'新能源/电力',tags:['短线','十五五'],active:true,notes:'全球组件#2-3'},
  {code:'300274',name:'阳光电源',exchange:'A股',sector:'新能源/电力',tags:['短线','十五五'],active:true,notes:'全球逆变器#2'},
  {code:'002202',name:'金风科技',exchange:'A股',sector:'新能源/电力',tags:['短线','十五五'],active:true,notes:'陆上风电整机#1'},
  {code:'601615',name:'明阳智能',exchange:'A股',sector:'新能源/电力',tags:['短线','十五五'],active:true,notes:'海上风电整机#1-2'},
  {code:'688339',name:'亿华通',exchange:'A股',sector:'新能源/电力',tags:['短线','十五五'],active:true,notes:'燃料电池系统#1'},
  {code:'600028',name:'中国石化',exchange:'A股',sector:'新能源/电力',tags:['短线'],active:true,notes:'最大制氢企业'},
  {code:'601578',name:'京能电力',exchange:'A股',sector:'新能源/电力',tags:['短线'],active:true,notes:'京津冀火电龙头'},
  {code:'600011',name:'华能国际',exchange:'A股',sector:'新能源/电力',tags:['短线'],active:true,notes:'火电+新能源转型'},
  {code:'000543',name:'皖能电力',exchange:'A股',sector:'新能源/电力',tags:['短线'],active:true,notes:'安徽火电龙头'},
  {code:'600688',name:'上海石化',exchange:'A股',sector:'新能源/电力',tags:['短线'],active:true,notes:'炼化一体化'},
  {code:'003039',name:'顺控发展',exchange:'A股',sector:'新能源/电力',tags:['短线'],active:true,notes:'水务+固废'},
  // ── 银行 ──
  {code:'600036',name:'招商银行',exchange:'A股',sector:'银行',tags:['短线','持仓','十五五'],active:true,notes:'零售银行之王'},
  {code:'002142',name:'宁波银行',exchange:'A股',sector:'银行',tags:['短线','持仓','十五五'],active:true,notes:'长三角城商行标杆'},
  {code:'600919',name:'江苏银行',exchange:'A股',sector:'银行',tags:['短线'],active:true,notes:'江苏省最大城商行'},
  {code:'601166',name:'兴业银行',exchange:'A股',sector:'银行',tags:['短线'],active:true,notes:'绿色金融领先'},
  // ── 生物医药 ──
  {code:'300760',name:'迈瑞医疗',exchange:'A股',sector:'生物医药',tags:['短线','十五五'],active:true,notes:'国内医疗器械#1'},
  {code:'688271',name:'联影医疗',exchange:'A股',sector:'生物医药',tags:['短线','十五五'],active:true,notes:'CT/MRI/PET国产#1'},
  {code:'688235',name:'百济神州',exchange:'A股',sector:'生物医药',tags:['短线','十五五'],active:true,notes:'中国唯一全球化生物药'},
  {code:'600276',name:'恒瑞医药',exchange:'A股',sector:'生物医药',tags:['短线','十五五'],active:true,notes:'国内研发管线最强'},
  {code:'688065',name:'凯赛生物',exchange:'A股',sector:'生物医药',tags:['短线','十五五'],active:true,notes:'全球唯一生物基尼龙56'},
  {code:'688639',name:'华恒生物',exchange:'A股',sector:'生物医药',tags:['短线','十五五'],active:true,notes:'合成生物学氨基酸#1'},
  {code:'300253',name:'卫宁健康',exchange:'A股',sector:'生物医药',tags:['短线','十五五'],active:true,notes:'医疗IT龙头'},
  // ── 航天/低空/军工 ──
  {code:'002389',name:'航天彩虹',exchange:'A股',sector:'航天/军工',tags:['短线','十五五'],active:true,notes:'军用+工业无人机'},
  {code:'600118',name:'中国卫星',exchange:'A股',sector:'航天/军工',tags:['短线','十五五'],active:true,notes:'卫星制造国家队'},
  {code:'600879',name:'航天电子',exchange:'A股',sector:'航天/军工',tags:['短线','十五五'],active:true,notes:'航天电子配套最全'},
  {code:'300045',name:'华力创通',exchange:'A股',sector:'航天/军工',tags:['短线','十五五'],active:true,notes:'卫星通信终端#2-3'},
  {code:'601698',name:'中国卫通',exchange:'A股',sector:'航天/军工',tags:['短线','十五五'],active:true,notes:'卫星运营稀缺标的'},
  {code:'688631',name:'莱斯信息',exchange:'A股',sector:'航天/军工',tags:['短线','十五五'],active:true,notes:'低空空管系统龙头'},
  {code:'002236',name:'大华股份',exchange:'A股',sector:'航天/军工',tags:['短线','十五五'],active:true,notes:'全球视频监控#2'},
  // ── 存储/分销 ──
  {code:'300736',name:'香农芯创',exchange:'A股',sector:'半导体/芯片',tags:['短线'],active:true,notes:'存储芯片分销'},
  // ── 港股 ──
  {code:'0700.HK',name:'腾讯控股',exchange:'港股',sector:'互联网',tags:['持仓','十五五'],active:true,notes:'微信生态+AI广告'},
  {code:'9880.HK',name:'优必选',exchange:'港股',sector:'机器人/工控',tags:['十五五'],active:true,notes:'人形机器人#1'},
  {code:'0013.HK',name:'和黄医药',exchange:'港股',sector:'生物医药',tags:['短线'],active:true,notes:'肿瘤靶向药'},
  {code:'9660.HK',name:'地平线机器人',exchange:'港股',sector:'AI/服务器',tags:['十五五'],active:true,notes:'车规AI芯片#1'},
  {code:'2382.HK',name:'舜宇光学',exchange:'港股',sector:'消费电子',tags:['短线'],active:true,notes:'手机镜头#1'},
  // ── 美股 ──
  {code:'NVDA',name:'英伟达',exchange:'美股',sector:'AI/服务器',tags:['持仓'],active:true,notes:'GPU/AI算力垄断'},
  {code:'BABA',name:'阿里巴巴',exchange:'美股',sector:'互联网',tags:['短线'],active:true,notes:'通义千问+阿里云AI'},
  {code:'ORCL',name:'甲骨文',exchange:'美股',sector:'AI/服务器',tags:['持仓'],active:true,notes:'OCI+AI云基础设施'},
  {code:'PDD',name:'拼多多',exchange:'美股',sector:'互联网',tags:['持仓'],active:true,notes:'Temu+国内电商'},
  {code:'MU',name:'美光科技',exchange:'美股',sector:'半导体/芯片',tags:['持仓'],active:true,notes:'HBM存储#3'},
  {code:'GEV',name:'GE Vernova',exchange:'美股',sector:'新能源/电力',tags:['持仓'],active:true,notes:'电网设备之王'},
  {code:'CEG',name:'Constellation能源',exchange:'美股',sector:'新能源/电力',tags:['持仓'],active:true,notes:'美国最大核电运营商'},
  {code:'BE',name:'Bloom能源',exchange:'美股',sector:'新能源/电力',tags:['持仓'],active:true,notes:'燃料电池90天部署'},
  {code:'VST',name:'Vistra能源',exchange:'美股',sector:'新能源/电力',tags:['持仓'],active:true,notes:'Meta 2.6GW核PPA'},
  {code:'005930.KS',name:'三星电子',exchange:'港股',sector:'半导体/芯片',tags:['持仓'],active:true,notes:'全球存储#1'},
  {code:'000660.KS',name:'SK海力士',exchange:'港股',sector:'半导体/芯片',tags:['持仓'],active:true,notes:'HBM全球#1'},
]

const STORAGE_KEY = 'stock-registry'

export function useStockRegistry() {
  const [stocks, setStocks] = useState<StockEntry[]>([])

  // Load from localStorage or default
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Merge with default (add new stocks, keep user prefs)
        const merged = ALL_STOCKS.map(s => {
          const savedStock = parsed.find((p: StockEntry) => p.code === s.code && p.exchange === s.exchange)
          return savedStock ? { ...s, ...savedStock, tags: savedStock.tags || s.tags } : s
        })
        // Add user-added stocks not in defaults
        const extraStocks = parsed.filter((p: StockEntry) =>
          !ALL_STOCKS.some(s => s.code === p.code && s.exchange === p.exchange))
        setStocks([...merged, ...extraStocks])
      } else {
        setStocks(ALL_STOCKS)
      }
    } catch { setStocks(ALL_STOCKS) }
  }, [])

  // Persist to localStorage
  const save = useCallback((newStocks: StockEntry[]) => {
    setStocks(newStocks)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newStocks))
  }, [])

  const toggleActive = useCallback((code: string, exchange: string) => {
    setStocks(prev => {
      const next = prev.map(s => s.code === code && s.exchange === exchange ? { ...s, active: !s.active } : s)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const updateStock = useCallback((code: string, exchange: string, updates: Partial<StockEntry>) => {
    setStocks(prev => {
      const next = prev.map(s => s.code === code && s.exchange === exchange ? { ...s, ...updates } : s)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const addStock = useCallback((stock: StockEntry) => {
    setStocks(prev => {
      if (prev.some(s => s.code === stock.code && s.exchange === stock.exchange)) return prev
      const next = [...prev, { ...stock, active: true }]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const deleteStock = useCallback((code: string, exchange: string) => {
    setStocks(prev => {
      const next = prev.filter(s => !(s.code === code && s.exchange === exchange))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const getActiveCodes = useCallback((exchange?: string) => {
    return stocks.filter(s => s.active && (!exchange || s.exchange === exchange)).map(s => s.code)
  }, [stocks])

  const getSectors = useCallback(() => {
    const sectors = new Map<string, StockEntry[]>()
    stocks.forEach(s => {
      if (!sectors.has(s.sector)) sectors.set(s.sector, [])
      sectors.get(s.sector)!.push(s)
    })
    return Array.from(sectors.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [stocks])

  return { stocks, toggleActive, updateStock, addStock, deleteStock, getActiveCodes, getSectors }
}
