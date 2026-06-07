#!/usr/bin/env python3
"""
Serenity 瓶颈点扫描器 v2 — 十五五全赛道 × 8因子评分 + 惩罚项
完整实现 SKILL.md 工作流:
  1. 确定需求拐点  2. 架构耦合度  3. 瓶颈严重度  4. 供给集中度
  5. 扩产难度      6. 证据质量  7. 估值脱节  8. 催化剂时机
  + 惩罚项: 稀释/治理/地缘/流动性/炒作/会计/周期/替代风险
"""

import json, os, sys, time

for k in list(os.environ.keys()):
    if 'proxy' in k.lower(): del os.environ[k]

# ─── 全量十五五公司数据库 ────────────────────────────────────────
# 每个公司: demand(需求拐点1-5), coupling(架构耦合1-5), chokepoint(瓶颈1-5),
#           suppliers(供给集中度: 越少越高), expansion(扩产难度:月数映射),
#           evidence(证据1-5), valuation(估值脱节1-5), catalyst(催化1-5)
#           + penalties dict + what_could_fail list

STOCK_DB = {
    # ═══════════ 半导体设备 ═══════════
    '002371': {
        'name':'北方华创','sector':'半导体设备','mcap':2500,'biz':'国产半导体设备龙头',
        'demand':5,'coupling':5,'chokepoint':5,'suppliers':2,'expansion':24,
        'evidence':5,'valuation':3,'catalyst':3,
        'penalties':{'dilution':0,'governance':0,'geopolitics':3,'liquidity':0,'hype':2,'accounting':0,'cyclicality':2,'alt_design':1},
        'fail':['美国设备出口管制放松则国产替代逻辑受损','高端产品突破不及预期','估值PE81x偏高'],
    },
    '688012': {
        'name':'中微公司','sector':'半导体设备','mcap':1800,'biz':'5nm刻蚀进台积电',
        'demand':5,'coupling':5,'chokepoint':5,'suppliers':1,'expansion':36,
        'evidence':5,'valuation':3,'catalyst':4,
        'penalties':{'dilution':0,'governance':0,'geopolitics':3,'liquidity':0,'hype':2,'accounting':0,'cyclicality':2,'alt_design':1},
        'fail':['台积电订单波动','美国设备限制升级','5nm以下刻蚀仍需ASML配合'],
    },
    '688019': {
        'name':'安集科技','sector':'半导体设备','mcap':300,'biz':'CMP抛光液国产#1',
        'demand':4,'coupling':4,'chokepoint':4,'suppliers':3,'expansion':18,
        'evidence':4,'valuation':3,'catalyst':4,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':1,'hype':1,'accounting':0,'cyclicality':1,'alt_design':2},
        'fail':['全球份额仅5%','日本对手降价打压','先进制程导入慢于预期'],
    },
    '688126': {
        'name':'沪硅产业','sector':'半导体设备','mcap':400,'biz':'300mm大硅片国产#1',
        'demand':4,'coupling':3,'chokepoint':3,'suppliers':5,'expansion':12,
        'evidence':3,'valuation':2,'catalyst':3,
        'penalties':{'dilution':1,'governance':0,'geopolitics':1,'liquidity':1,'hype':1,'accounting':1,'cyclicality':2,'alt_design':2},
        'fail':['全球份额仅3%','盈利爬坡缓慢','日本信越降价竞争'],
    },
    # ═══════════ 半导体/芯片 ═══════════
    '688981': {
        'name':'中芯国际','sector':'半导体/芯片','mcap':4000,'biz':'国内最先进晶圆代工',
        'demand':5,'coupling':4,'chokepoint':4,'suppliers':2,'expansion':24,
        'evidence':4,'valuation':3,'catalyst':3,
        'penalties':{'dilution':0,'governance':0,'geopolitics':4,'liquidity':0,'hype':1,'accounting':0,'cyclicality':2,'alt_design':1},
        'fail':['先进制程被卡脖子','美国设备禁令升级','台积电竞争压力'],
    },
    '688041': {
        'name':'海光信息','sector':'半导体/芯片','mcap':2000,'biz':'国产CPU/DCU龙头',
        'demand':5,'coupling':4,'chokepoint':4,'suppliers':1,'expansion':24,
        'evidence':4,'valuation':2,'catalyst':4,
        'penalties':{'dilution':0,'governance':0,'geopolitics':3,'liquidity':0,'hype':2,'accounting':0,'cyclicality':1,'alt_design':2},
        'fail':['x86授权可持续性存疑','ARM生态竞争','信创采购节奏波动'],
    },
    '688256': {
        'name':'寒武纪','sector':'半导体/芯片','mcap':8300,'biz':'国产AI芯片',
        'demand':5,'coupling':3,'chokepoint':3,'suppliers':2,'expansion':12,
        'evidence':3,'valuation':1,'catalyst':3,
        'penalties':{'dilution':1,'governance':0,'geopolitics':3,'liquidity':0,'hype':4,'accounting':1,'cyclicality':2,'alt_design':3},
        'fail':['PE 305x估值极高','华为昇腾压制','盈利路径极不清晰'],
    },
    '603986': {
        'name':'兆易创新','sector':'半导体/芯片','mcap':600,'biz':'MCU#1, NOR Flash#3',
        'demand':3,'coupling':3,'chokepoint':3,'suppliers':3,'expansion':12,
        'evidence':4,'valuation':3,'catalyst':3,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':0,'hype':1,'accounting':0,'cyclicality':3,'alt_design':2},
        'fail':['存储周期波动','MCU竞争激烈','物联网需求不达预期'],
    },
    '600584': {
        'name':'长电科技','sector':'半导体/芯片','mcap':600,'biz':'封装测试全球#3',
        'demand':3,'coupling':3,'chokepoint':3,'suppliers':4,'expansion':12,
        'evidence':4,'valuation':4,'catalyst':3,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':0,'hype':1,'accounting':0,'cyclicality':2,'alt_design':1},
        'fail':['先进封装份额被台积电蚕食','封测行业利润率低'],
    },
    # ═══════════ 光通信 ═══════════
    '300308': {
        'name':'中际旭创','sector':'光通信','mcap':2000,'biz':'800G光模块全球#1',
        'demand':5,'coupling':5,'chokepoint':5,'suppliers':2,'expansion':18,
        'evidence':5,'valuation':3,'catalyst':4,
        'penalties':{'dilution':0,'governance':0,'geopolitics':2,'liquidity':0,'hype':2,'accounting':0,'cyclicality':2,'alt_design':2},
        'fail':['CPO替代可插拔光模块','客户集中度高(主要靠NVDA)','1.6T上量不及预期'],
    },
    '300394': {
        'name':'天孚通信','sector':'光通信','mcap':500,'biz':'光器件龙头',
        'demand':5,'coupling':4,'chokepoint':4,'suppliers':3,'expansion':18,
        'evidence':4,'valuation':3,'catalyst':4,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':0,'hype':1,'accounting':0,'cyclicality':1,'alt_design':2},
        'fail':['客户集中风险','技术迭代快'],
    },
    '601869': {
        'name':'长飞光纤','sector':'光通信','mcap':400,'biz':'光纤预制棒全球#1',
        'demand':3,'coupling':3,'chokepoint':3,'suppliers':2,'expansion':24,
        'evidence':4,'valuation':4,'catalyst':2,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':0,'hype':0,'accounting':0,'cyclicality':3,'alt_design':2},
        'fail':['光纤需求周期性','5G建设放缓'],
    },
    '688498': {
        'name':'源杰科技','sector':'光通信','mcap':150,'biz':'光芯片国产替代',
        'demand':4,'coupling':4,'chokepoint':4,'suppliers':2,'expansion':24,
        'evidence':3,'valuation':2,'catalyst':4,
        'penalties':{'dilution':1,'governance':0,'geopolitics':1,'liquidity':1,'hype':2,'accounting':0,'cyclicality':1,'alt_design':2},
        'fail':['光芯片份额极小','进口替代节奏慢','盈利不确定'],
    },
    # ═══════════ 机器人/工控 ═══════════
    '601689': {
        'name':'拓普集团','sector':'机器人/工控','mcap':1400,'biz':'Optimus执行器总成独家',
        'demand':5,'coupling':5,'chokepoint':5,'suppliers':2,'expansion':18,
        'evidence':5,'valuation':3,'catalyst':5,
        'penalties':{'dilution':0,'governance':0,'geopolitics':2,'liquidity':0,'hype':3,'accounting':0,'cyclicality':2,'alt_design':2},
        'fail':['Optimus量产推迟','Tesla自研垂直整合','关税风险'],
    },
    '603667': {
        'name':'五洲新春','sector':'机器人/工控','mcap':320,'biz':'行星滚柱丝杠·轴承',
        'demand':5,'coupling':4,'chokepoint':4,'suppliers':3,'expansion':12,
        'evidence':4,'valuation':3,'catalyst':4,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':1,'hype':2,'accounting':0,'cyclicality':1,'alt_design':2},
        'fail':['拓普自研丝杠','北特同赛道竞争','汽车主业替代风险'],
    },
    '603728': {
        'name':'鸣志电器','sector':'机器人/工控','mcap':300,'biz':'空心杯电机全球前三',
        'demand':5,'coupling':4,'chokepoint':4,'suppliers':2,'expansion':18,
        'evidence':4,'valuation':3,'catalyst':4,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':1,'hype':2,'accounting':0,'cyclicality':1,'alt_design':2},
        'fail':['灵巧手量产慢于执行器','腱绳驱动替代空心杯'],
    },
    '603009': {
        'name':'北特科技','sector':'机器人/工控','mcap':200,'biz':'行星滚柱丝杠·产能激进',
        'demand':4,'coupling':3,'chokepoint':3,'suppliers':3,'expansion':12,
        'evidence':3,'valuation':3,'catalyst':4,
        'penalties':{'dilution':1,'governance':0,'geopolitics':1,'liquidity':2,'hype':3,'accounting':0,'cyclicality':1,'alt_design':2},
        'fail':['未进TR1核心供应商','产能超前建设风险','与五洲差异化不足'],
    },
    '002472': {
        'name':'双环传动','sector':'机器人/工控','mcap':150,'biz':'RV减速器国产龙头',
        'demand':4,'coupling':3,'chokepoint':3,'suppliers':3,'expansion':12,
        'evidence':3,'valuation':4,'catalyst':3,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':1,'hype':1,'accounting':0,'cyclicality':2,'alt_design':2},
        'fail':['RV用量小于谐波','绿的谐波技术压制','工业机器人周期'],
    },
    '002050': {
        'name':'三花智控','sector':'机器人/工控','mcap':2000,'biz':'热管理+旋转执行器',
        'demand':4,'coupling':3,'chokepoint':3,'suppliers':2,'expansion':18,
        'evidence':4,'valuation':3,'catalyst':3,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':0,'hype':3,'accounting':0,'cyclicality':1,'alt_design':2},
        'fail':['市值2000亿认知差归零','年涨163%估值透支','不是最瓶颈的环节'],
    },
    '300124': {
        'name':'汇川技术','sector':'机器人/工控','mcap':2000,'biz':'工业自动化#1',
        'demand':3,'coupling':3,'chokepoint':3,'suppliers':2,'expansion':18,
        'evidence':4,'valuation':3,'catalyst':2,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':0,'hype':1,'accounting':0,'cyclicality':2,'alt_design':2},
        'fail':['工控周期性强','与机器人关联度弱于纯标的'],
    },
    # ═══════════ AI/服务器 ═══════════
    '603019': {
        'name':'中科曙光','sector':'AI/服务器','mcap':1200,'biz':'国产超算#1',
        'demand':4,'coupling':3,'chokepoint':3,'suppliers':2,'expansion':18,
        'evidence':4,'valuation':3,'catalyst':3,
        'penalties':{'dilution':0,'governance':0,'geopolitics':2,'liquidity':0,'hype':2,'accounting':0,'cyclicality':1,'alt_design':2},
        'fail':['信创采购节奏','华为竞争','盈利能力待提升'],
    },
    '601138': {
        'name':'工业富联','sector':'AI/服务器','mcap':4000,'biz':'AI服务器+云计算',
        'demand':4,'coupling':3,'chokepoint':2,'suppliers':3,'expansion':12,
        'evidence':4,'valuation':4,'catalyst':3,
        'penalties':{'dilution':0,'governance':1,'geopolitics':2,'liquidity':0,'hype':1,'accounting':0,'cyclicality':2,'alt_design':2},
        'fail':['利润率极薄','AI服务器份额被ODM蚕食','地缘政治风险'],
    },
    '002837': {
        'name':'英维克','sector':'AI/服务器','mcap':300,'biz':'数据中心精密温控',
        'demand':4,'coupling':4,'chokepoint':3,'suppliers':3,'expansion':18,
        'evidence':4,'valuation':3,'catalyst':4,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':1,'hype':1,'accounting':0,'cyclicality':1,'alt_design':2},
        'fail':['液冷路线竞争','客户集中','毛利率下行'],
    },
    # ═══════════ 新能源/电力 ═══════════
    '300750': {
        'name':'宁德时代','sector':'新能源/电力','mcap':8000,'biz':'全球动力电池#1',
        'demand':4,'coupling':4,'chokepoint':4,'suppliers':2,'expansion':24,
        'evidence':5,'valuation':4,'catalyst':3,
        'penalties':{'dilution':0,'governance':0,'geopolitics':2,'liquidity':0,'hype':1,'accounting':0,'cyclicality':2,'alt_design':2},
        'fail':['增速放缓','固态电池替代风险','海外建厂不确定性'],
    },
    '300274': {
        'name':'阳光电源','sector':'新能源/电力','mcap':2000,'biz':'全球逆变器#2,储能',
        'demand':4,'coupling':3,'chokepoint':3,'suppliers':2,'expansion':18,
        'evidence':4,'valuation':3,'catalyst':3,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':0,'hype':1,'accounting':0,'cyclicality':2,'alt_design':2},
        'fail':['逆变器竞争加剧','储能利润率波动'],
    },
    # ═══════════ 生物医药 ═══════════
    '300760': {
        'name':'迈瑞医疗','sector':'生物医药','mcap':3500,'biz':'国内医疗器械#1',
        'demand':4,'coupling':3,'chokepoint':4,'suppliers':2,'expansion':24,
        'evidence':5,'valuation':3,'catalyst':2,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':0,'hype':1,'accounting':0,'cyclicality':1,'alt_design':1},
        'fail':['集采降价压力','海外拓展慢','AI医疗落地节奏'],
    },
    '688065': {
        'name':'凯赛生物','sector':'生物医药','mcap':300,'biz':'全球唯一生物基尼龙56',
        'demand':4,'coupling':5,'chokepoint':5,'suppliers':1,'expansion':36,
        'evidence':4,'valuation':2,'catalyst':4,
        'penalties':{'dilution':1,'governance':0,'geopolitics':0,'liquidity':1,'hype':2,'accounting':0,'cyclicality':1,'alt_design':2},
        'fail':['成本仍需下降','石油基尼龙降价','产能爬坡不及预期'],
    },
    '688639': {
        'name':'华恒生物','sector':'生物医药','mcap':200,'biz':'合成生物氨基酸#1',
        'demand':4,'coupling':4,'chokepoint':4,'suppliers':2,'expansion':24,
        'evidence':4,'valuation':2,'catalyst':4,
        'penalties':{'dilution':0,'governance':0,'geopolitics':0,'liquidity':1,'hype':2,'accounting':0,'cyclicality':1,'alt_design':2},
        'fail':['玉米价格上涨','海外贸易壁垒','发酵工艺波动'],
    },
    '688271': {
        'name':'联影医疗','sector':'生物医药','mcap':1200,'biz':'CT/MRI/PET国产#1',
        'demand':4,'coupling':3,'chokepoint':4,'suppliers':2,'expansion':24,
        'evidence':4,'valuation':3,'catalyst':3,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':0,'hype':1,'accounting':0,'cyclicality':1,'alt_design':1},
        'fail':['集采降价','GPS三巨头压制','海外认证慢'],
    },
    '600276': {
        'name':'恒瑞医药','sector':'生物医药','mcap':2500,'biz':'国内研发管线最强',
        'demand':3,'coupling':3,'chokepoint':3,'suppliers':2,'expansion':24,
        'evidence':5,'valuation':3,'catalyst':3,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':0,'hype':1,'accounting':0,'cyclicality':1,'alt_design':1},
        'fail':['集采影响仿制药','创新药出海慢','研发回报率下降'],
    },
    # ═══════════ 航天/军工 ═══════════
    '688631': {
        'name':'莱斯信息','sector':'航天/军工','mcap':80,'biz':'低空空管系统垄断',
        'demand':5,'coupling':5,'chokepoint':5,'suppliers':1,'expansion':36,
        'evidence':4,'valuation':2,'catalyst':5,
        'penalties':{'dilution':1,'governance':0,'geopolitics':0,'liquidity':3,'hype':3,'accounting':0,'cyclicality':0,'alt_design':1},
        'fail':['次新股流动性极低','低空政策进度不及预期','业绩释放不确定'],
    },
    '600118': {
        'name':'中国卫星','sector':'航天/军工','mcap':300,'biz':'卫星制造国家队',
        'demand':5,'coupling':4,'chokepoint':5,'suppliers':1,'expansion':36,
        'evidence':4,'valuation':3,'catalyst':4,
        'penalties':{'dilution':0,'governance':0,'geopolitics':2,'liquidity':0,'hype':2,'accounting':0,'cyclicality':0,'alt_design':1},
        'fail':['卫星互联网组网节奏','商业航天盈利模式','国家队效率'],
    },
    '002389': {
        'name':'航天彩虹','sector':'航天/军工','mcap':150,'biz':'军用+工业无人机',
        'demand':4,'coupling':3,'chokepoint':3,'suppliers':3,'expansion':18,
        'evidence':4,'valuation':3,'catalyst':3,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':1,'hype':1,'accounting':0,'cyclicality':1,'alt_design':2},
        'fail':['军用订单波动','民用无人机竞争激烈'],
    },
    '000099': {
        'name':'中信海直','sector':'航天/军工','mcap':100,'biz':'低空直升机运营龙头',
        'demand':5,'coupling':4,'chokepoint':3,'suppliers':2,'expansion':18,
        'evidence':4,'valuation':3,'catalyst':4,
        'penalties':{'dilution':0,'governance':0,'geopolitics':0,'liquidity':1,'hype':2,'accounting':0,'cyclicality':0,'alt_design':1},
        'fail':['低空旅游商业化慢','eVTOL替代传统直升机','政策落地不及预期'],
    },
    # ═══════════ 物理AI (机器人增强) ═══════════
    '300115': {
        'name':'长盈精密','sector':'机器人/工控','mcap':200,'biz':'结构件+指尖传感器',
        'demand':5,'coupling':4,'chokepoint':4,'suppliers':2,'expansion':18,
        'evidence':4,'valuation':3,'catalyst':4,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':1,'hype':3,'accounting':0,'cyclicality':1,'alt_design':2},
        'fail':['创业板(300)买不了','灵巧手量产节奏','单台价值4万但量未确认'],
    },
    '300007': {
        'name':'汉威科技','sector':'机器人/工控','mcap':120,'biz':'六维力传感器国产替代',
        'demand':5,'coupling':4,'chokepoint':4,'suppliers':2,'expansion':18,
        'evidence':3,'valuation':2,'catalyst':5,
        'penalties':{'dilution':0,'governance':0,'geopolitics':0,'liquidity':1,'hype':3,'accounting':0,'cyclicality':0,'alt_design':2},
        'fail':['创业板买不了','六维力尚未大规模量产','竞争对手先发优势'],
    },
    '301076': {
        'name':'新瀚新材','sector':'机器人/工控','mcap':60,'biz':'PEEK原料DFBP全球≤3家',
        'demand':5,'coupling':5,'chokepoint':5,'suppliers':1,'expansion':24,
        'evidence':3,'valuation':2,'catalyst':5,
        'penalties':{'dilution':0,'governance':0,'geopolitics':0,'liquidity':3,'hype':3,'accounting':0,'cyclicality':0,'alt_design':1},
        'fail':['创业板买不了','PEEK需求未爆发','市值极小流动性差'],
    },
    # ═══════════ 物理AI 补充 ────────────────────────────────────
    '688017': {
        'name':'绿的谐波','sector':'机器人/工控','mcap':720,'biz':'谐波减速器全球#2·Serenity推荐',
        'demand':5,'coupling':5,'chokepoint':5,'suppliers':1,'expansion':36,
        'evidence':5,'valuation':2,'catalyst':4,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':0,'hype':3,'accounting':0,'cyclicality':1,'alt_design':2},
        'fail':['科创板买不了','年涨70%认知差收窄','哈默纳科降价竞争'],
    },
    # ═══════════ 低空经济 补充 ──────────────────────────────────
    '002126': {
        'name':'银轮股份','sector':'航天/军工','mcap':200,'biz':'热管理+低空散热',
        'demand':4,'coupling':3,'chokepoint':3,'suppliers':3,'expansion':12,
        'evidence':4,'valuation':3,'catalyst':3,
        'penalties':{'dilution':0,'governance':0,'geopolitics':0,'liquidity':1,'hype':1,'accounting':0,'cyclicality':2,'alt_design':2},
        'fail':['低空收入占比小','热管理主业竞争','eVTOL量产节奏不定'],
    },
    '002179': {
        'name':'中航光电','sector':'航天/军工','mcap':800,'biz':'军工连接器龙头·低空电子',
        'demand':4,'coupling':4,'chokepoint':4,'suppliers':2,'expansion':24,
        'evidence':5,'valuation':3,'catalyst':3,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':0,'hype':1,'accounting':0,'cyclicality':1,'alt_design':1},
        'fail':['军工订单周期性强','低空电子占比仍小','毛利率承压'],
    },
    '300777': {
        'name':'中简科技','sector':'航天/军工','mcap':120,'biz':'碳纤维·低空轻量化材料',
        'demand':5,'coupling':4,'chokepoint':4,'suppliers':2,'expansion':24,
        'evidence':4,'valuation':2,'catalyst':4,
        'penalties':{'dilution':0,'governance':0,'geopolitics':0,'liquidity':1,'hype':2,'accounting':0,'cyclicality':0,'alt_design':2},
        'fail':['创业板买不了','碳纤维降价压力','日本东丽竞争'],
    },
    '600893': {
        'name':'航发动力','sector':'航天/军工','mcap':1500,'biz':'航空发动机龙头·低空动力',
        'demand':5,'coupling':4,'chokepoint':5,'suppliers':1,'expansion':36,
        'evidence':5,'valuation':3,'catalyst':3,
        'penalties':{'dilution':0,'governance':0,'geopolitics':2,'liquidity':0,'hype':1,'accounting':0,'cyclicality':1,'alt_design':1},
        'fail':['军工定价权受限','商用发动机长周期','低空动力适配需时日'],
    },
    '600990': {
        'name':'四创电子','sector':'航天/军工','mcap':100,'biz':'雷达电子·低空监视',
        'demand':5,'coupling':4,'chokepoint':4,'suppliers':2,'expansion':24,
        'evidence':4,'valuation':2,'catalyst':4,
        'penalties':{'dilution':0,'governance':0,'geopolitics':1,'liquidity':1,'hype':2,'accounting':0,'cyclicality':0,'alt_design':2},
        'fail':['低空雷达市场小','军工电子周期','市值小流动性差'],
    },
    '603950': {
        'name':'长源东谷','sector':'航天/军工','mcap':80,'biz':'航空发动机精密铸件',
        'demand':4,'coupling':3,'chokepoint':3,'suppliers':3,'expansion':18,
        'evidence':3,'valuation':3,'catalyst':4,
        'penalties':{'dilution':0,'governance':0,'geopolitics':0,'liquidity':2,'hype':2,'accounting':0,'cyclicality':1,'alt_design':2},
        'fail':['单一客户依赖','航空铸件认证周期长','市值小流动性差'],
    },
    # ═══════════ AI/互联网 ═══════════
    '0700.HK': {
        'name':'腾讯控股','sector':'AI/互联网','mcap':42000,'biz':'微信生态+AI广告',
        'demand':3,'coupling':2,'chokepoint':2,'suppliers':5,'expansion':6,
        'evidence':5,'valuation':3,'catalyst':2,
        'penalties':{'dilution':0,'governance':1,'geopolitics':2,'liquidity':0,'hype':1,'accounting':0,'cyclicality':1,'alt_design':1},
        'fail':['港股流动性风险','监管周期','AI变现慢于预期'],
    },
}

# ─── Serenity 8因子评分引擎 ─────────────────────────────────────
WEIGHTS = {
    'demand': 15,        # 需求拐点
    'coupling': 10,      # 架构耦合度
    'chokepoint': 15,    # 瓶颈严重度
    'suppliers': 12,     # 供给集中度
    'expansion': 12,     # 扩产难度
    'evidence': 15,      # 证据质量
    'valuation': 11,     # 估值脱节(低PE=高分)
    'catalyst': 10,      # 催化剂时机
}

PENALTY_LABELS = {
    'dilution': '稀释/融资', 'governance': '治理', 'geopolitics': '地缘',
    'liquidity': '流动性', 'hype': '炒作风险', 'accounting': '会计质量',
    'cyclicality': '周期性', 'alt_design': '替代方案',
}

def serenity_score(stock):
    """完整8因子评分 + 惩罚项"""
    factor_points = {}
    total = 0.0

    # 8 factors (0-5 each, weighted)
    for key, weight in WEIGHTS.items():
        raw = stock.get(key, 3)
        # Map supplier count to score (fewer=higher)
        if key == 'suppliers':
            raw = 5 if raw <= 1 else (4 if raw <= 2 else (3 if raw <= 3 else (2 if raw <= 4 else 1)))
        # Map expansion months to score (longer=higher)
        if key == 'expansion':
            raw = 5 if raw >= 36 else (4 if raw >= 24 else (3 if raw >= 12 else 1))
        points = raw / 5.0 * weight
        factor_points[key] = {'rating': raw, 'weight': weight, 'points': round(points, 2)}
        total += points

    # 8 penalty items (0-5, ×2 multiplier)
    penalties = stock.get('penalties', {})
    penalty_total = 0.0
    penalty_details = {}
    for key in PENALTY_LABELS:
        val = penalties.get(key, 0)
        pts = val * 2.0
        penalty_details[key] = {'rating': val, 'points': round(pts, 2)}
        penalty_total += pts

    final_score = max(0, min(100, total - penalty_total))
    verdict = 'Top priority' if final_score >= 85 else ('High priority' if final_score >= 70 else ('Track' if final_score >= 55 else 'Low priority'))

    return {
        'factorPoints': round(total, 1), 'penaltyPoints': round(penalty_total, 1),
        'finalScore': round(final_score, 1), 'verdict': verdict,
        'factorDetails': factor_points, 'penaltyDetails': penalty_details,
    }

# 行业别名映射
SECTOR_MAP = {
    '低空经济': '航天/军工',
    '物理ai': '机器人/工控',
    '物理AI': '机器人/工控',
    '半导体': '半导体/芯片',
    '机器人': '机器人/工控',
    '光模块': '光通信',
    'cpo': '光通信',
    '芯片': '半导体/芯片',
    '光伏': '新能源/电力',
    '储能': '新能源/电力',
    '医药': '生物医药',
}

def scan_sector(sector):
    # Apply alias mapping
    sector = SECTOR_MAP.get(sector, sector)
    """扫描所有标的或指定行业"""
    results = []
    for code, stock in STOCK_DB.items():
        if sector != 'all' and stock['sector'] != sector:
            continue
        scored = serenity_score(stock)
        results.append({
            'code': code, 'name': stock['name'], 'sector': stock['sector'],
            'mcap': stock.get('mcap', 0), 'biz': stock.get('biz', ''),
            'demand': stock.get('demand', 3), 'chokepoint': stock.get('chokepoint', 3),
            'suppliers': stock.get('suppliers', 5), 'expansion': stock.get('expansion', 12),
            'evidence': stock.get('evidence', 3), 'valuation': stock.get('valuation', 3),
            **scored,
            'fail': stock.get('fail', []),
        })
    results.sort(key=lambda x: x['finalScore'], reverse=True)
    return results

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: serenity_scan.py <sector> or all or sectors'}, ensure_ascii=False)); sys.exit(1)
    arg = sys.argv[1]
    try:
        if arg == 'sectors':
            sectors = sorted(set(s['sector'] for s in STOCK_DB.values()))
            result = [{'name': s, 'count': sum(1 for v in STOCK_DB.values() if v['sector'] == s)} for s in sectors]
        elif arg == 'all':
            result = scan_sector('all')
        else:
            result = scan_sector(arg)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'error': str(e)}, ensure_ascii=False))

if __name__ == '__main__':
    main()
