'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { SectorValuation } from '@/components/SectorValuation'
import { FundImageAnalysis } from '@/components/FundImageAnalysis'
import { PortfolioWatchlist } from '@/components/PortfolioWatchlist'
import MacroScorePanel from '@/components/MacroScorePanel'
import { GoldAnalysis } from '@/components/GoldAnalysis'
import { InteractiveChart, type ChartEvent, type ChartPoint } from '@/components/InteractiveChart'
import { PredictionReview } from '@/components/PredictionReview'
import { SafeBuyAnalysis } from '@/components/SafeBuyAnalysis'
import { ReviewDashboard } from '@/components/ReviewDashboard'

// ─── 纳斯达克综合指数月度收盘（2016-01 ~ 2026-05）────────────────────────────
const NASDAQ_DATA = [
  { m: '2016-01', p: 4614 }, { m: '2016-02', p: 4558 }, { m: '2016-03', p: 4869 },
  { m: '2016-04', p: 4775 }, { m: '2016-05', p: 4948 }, { m: '2016-06', p: 4843 },
  { m: '2016-07', p: 5163 }, { m: '2016-08', p: 5218 }, { m: '2016-09', p: 5312 },
  { m: '2016-10', p: 5189 }, { m: '2016-11', p: 5323 }, { m: '2016-12', p: 5383 },
  { m: '2017-01', p: 5615 }, { m: '2017-02', p: 5825 }, { m: '2017-03', p: 5901 },
  { m: '2017-04', p: 5991 }, { m: '2017-05', p: 6198 }, { m: '2017-06', p: 6140 },
  { m: '2017-07', p: 6374 }, { m: '2017-08', p: 6428 }, { m: '2017-09', p: 6496 },
  { m: '2017-10', p: 6727 }, { m: '2017-11', p: 6875 }, { m: '2017-12', p: 6904 },
  { m: '2018-01', p: 7411 }, { m: '2018-02', p: 7273 }, { m: '2018-03', p: 7063 },
  { m: '2018-04', p: 7066 }, { m: '2018-05', p: 7637 }, { m: '2018-06', p: 7510 },
  { m: '2018-07', p: 7671 }, { m: '2018-08', p: 7904 }, { m: '2018-09', p: 8046 },
  { m: '2018-10', p: 7305 }, { m: '2018-11', p: 6940 }, { m: '2018-12', p: 6635 },
  { m: '2019-01', p: 7282 }, { m: '2019-02', p: 7533 }, { m: '2019-03', p: 7729 },
  { m: '2019-04', p: 7939 }, { m: '2019-05', p: 7453 }, { m: '2019-06', p: 8006 },
  { m: '2019-07', p: 8175 }, { m: '2019-08', p: 7962 }, { m: '2019-09', p: 7939 },
  { m: '2019-10', p: 8243 }, { m: '2019-11', p: 8665 }, { m: '2019-12', p: 8945 },
  { m: '2020-01', p: 9151 }, { m: '2020-02', p: 8567 }, { m: '2020-03', p: 6989 },
  { m: '2020-04', p: 8607 }, { m: '2020-05', p: 9490 }, { m: '2020-06', p: 9874 },
  { m: '2020-07', p: 10745 }, { m: '2020-08', p: 11775 }, { m: '2020-09', p: 11167 },
  { m: '2020-10', p: 10912 }, { m: '2020-11', p: 12198 }, { m: '2020-12', p: 12888 },
  { m: '2021-01', p: 13070 }, { m: '2021-02', p: 13192 }, { m: '2021-03', p: 12920 },
  { m: '2021-04', p: 13962 }, { m: '2021-05', p: 13756 }, { m: '2021-06', p: 14504 },
  { m: '2021-07', p: 14672 }, { m: '2021-08', p: 15259 }, { m: '2021-09', p: 14448 },
  { m: '2021-10', p: 15498 }, { m: '2021-11', p: 15537 }, { m: '2021-12', p: 15645 },
  { m: '2022-01', p: 14239 }, { m: '2022-02', p: 13751 }, { m: '2022-03', p: 14261 },
  { m: '2022-04', p: 12855 }, { m: '2022-05', p: 11834 }, { m: '2022-06', p: 11029 },
  { m: '2022-07', p: 12390 }, { m: '2022-08', p: 11680 }, { m: '2022-09', p: 10575 },
  { m: '2022-10', p: 11241 }, { m: '2022-11', p: 11469 }, { m: '2022-12', p: 10939 },
  { m: '2023-01', p: 11621 }, { m: '2023-02', p: 11926 }, { m: '2023-03', p: 12221 },
  { m: '2023-04', p: 12072 }, { m: '2023-05', p: 13181 }, { m: '2023-06', p: 13591 },
  { m: '2023-07', p: 13974 }, { m: '2023-08', p: 13590 }, { m: '2023-09', p: 13219 },
  { m: '2023-10', p: 12909 }, { m: '2023-11', p: 14226 }, { m: '2023-12', p: 14765 },
  { m: '2024-01', p: 15361 }, { m: '2024-02', p: 15597 }, { m: '2024-03', p: 16379 },
  { m: '2024-04', p: 15657 }, { m: '2024-05', p: 16735 }, { m: '2024-06', p: 17599 },
  { m: '2024-07', p: 17446 }, { m: '2024-08', p: 17713 }, { m: '2024-09', p: 18189 },
  { m: '2024-10', p: 18129 }, { m: '2024-11', p: 19218 }, { m: '2024-12', p: 19311 },
  { m: '2025-01', p: 19627 }, { m: '2025-02', p: 18847 }, { m: '2025-03', p: 17299 },
  { m: '2025-04', p: 17446 }, { m: '2025-05', p: 19114 },
  { m: '2025-06', p: 20370 }, { m: '2025-07', p: 21122 }, { m: '2025-08', p: 21456 },
  { m: '2025-09', p: 22660 }, { m: '2025-10', p: 23725 }, { m: '2025-11', p: 23366 },
  { m: '2025-12', p: 23242 },
  { m: '2026-01', p: 23462 }, { m: '2026-02', p: 22668 }, { m: '2026-03', p: 21591 },
  { m: '2026-04', p: 24892 }, { m: '2026-05', p: 25780 },
]

// ─── 上证综合指数月度收盘（2016-01 ~ 2026-05）────────────────────────────────
const SHANGHAI_DATA = [
  { m: '2016-01', p: 2738 }, { m: '2016-02', p: 2688 }, { m: '2016-03', p: 3003 },
  { m: '2016-04', p: 2939 }, { m: '2016-05', p: 2815 }, { m: '2016-06', p: 2929 },
  { m: '2016-07', p: 2979 }, { m: '2016-08', p: 3085 }, { m: '2016-09', p: 3004 },
  { m: '2016-10', p: 3100 }, { m: '2016-11', p: 3051 }, { m: '2016-12', p: 3104 },
  { m: '2017-01', p: 3159 }, { m: '2017-02', p: 3241 }, { m: '2017-03', p: 3223 },
  { m: '2017-04', p: 3154 }, { m: '2017-05', p: 3110 }, { m: '2017-06', p: 3192 },
  { m: '2017-07', p: 3253 }, { m: '2017-08', p: 3362 }, { m: '2017-09', p: 3348 },
  { m: '2017-10', p: 3394 }, { m: '2017-11', p: 3317 }, { m: '2017-12', p: 3307 },
  { m: '2018-01', p: 3481 }, { m: '2018-02', p: 3259 }, { m: '2018-03', p: 3169 },
  { m: '2018-04', p: 2975 }, { m: '2018-05', p: 3095 }, { m: '2018-06', p: 2847 },
  { m: '2018-07', p: 2827 }, { m: '2018-08', p: 2724 }, { m: '2018-09', p: 2821 },
  { m: '2018-10', p: 2603 }, { m: '2018-11', p: 2588 }, { m: '2018-12', p: 2494 },
  { m: '2019-01', p: 2741 }, { m: '2019-02', p: 2941 }, { m: '2019-03', p: 3091 },
  { m: '2019-04', p: 3078 }, { m: '2019-05', p: 2898 }, { m: '2019-06', p: 2979 },
  { m: '2019-07', p: 2932 }, { m: '2019-08', p: 2886 }, { m: '2019-09', p: 2905 },
  { m: '2019-10', p: 2938 }, { m: '2019-11', p: 2872 }, { m: '2019-12', p: 3050 },
  { m: '2020-01', p: 2977 }, { m: '2020-02', p: 2880 }, { m: '2020-03', p: 2750 },
  { m: '2020-04', p: 2860 }, { m: '2020-05', p: 2852 }, { m: '2020-06', p: 2985 },
  { m: '2020-07', p: 3310 }, { m: '2020-08', p: 3395 }, { m: '2020-09', p: 3218 },
  { m: '2020-10', p: 3224 }, { m: '2020-11', p: 3408 }, { m: '2020-12', p: 3473 },
  { m: '2021-01', p: 3483 }, { m: '2021-02', p: 3696 }, { m: '2021-03', p: 3442 },
  { m: '2021-04', p: 3474 }, { m: '2021-05', p: 3615 }, { m: '2021-06', p: 3591 },
  { m: '2021-07', p: 3397 }, { m: '2021-08', p: 3522 }, { m: '2021-09', p: 3568 },
  { m: '2021-10', p: 3547 }, { m: '2021-11', p: 3563 }, { m: '2021-12', p: 3640 },
  { m: '2022-01', p: 3361 }, { m: '2022-02', p: 3252 }, { m: '2022-03', p: 3212 },
  { m: '2022-04', p: 3047 }, { m: '2022-05', p: 3186 }, { m: '2022-06', p: 3398 },
  { m: '2022-07', p: 3269 }, { m: '2022-08', p: 3202 }, { m: '2022-09', p: 3024 },
  { m: '2022-10', p: 2893 }, { m: '2022-11', p: 3151 }, { m: '2022-12', p: 3090 },
  { m: '2023-01', p: 3284 }, { m: '2023-02', p: 3280 }, { m: '2023-03', p: 3245 },
  { m: '2023-04', p: 3323 }, { m: '2023-05', p: 3205 }, { m: '2023-06', p: 3182 },
  { m: '2023-07', p: 3291 }, { m: '2023-08', p: 3119 }, { m: '2023-09', p: 3110 },
  { m: '2023-10', p: 3018 }, { m: '2023-11', p: 3030 }, { m: '2023-12', p: 2975 },
  { m: '2024-01', p: 2788 }, { m: '2024-02', p: 2998 }, { m: '2024-03', p: 3041 },
  { m: '2024-04', p: 3104 }, { m: '2024-05', p: 3086 }, { m: '2024-06', p: 2967 },
  { m: '2024-07', p: 2938 }, { m: '2024-08', p: 2842 }, { m: '2024-09', p: 3336 },
  { m: '2024-10', p: 3280 }, { m: '2024-11', p: 3310 }, { m: '2024-12', p: 3352 },
  { m: '2025-01', p: 3251 }, { m: '2025-02', p: 3321 }, { m: '2025-03', p: 3336 },
  { m: '2025-04', p: 3279 }, { m: '2025-05', p: 3347 },
  { m: '2025-06', p: 3444 }, { m: '2025-07', p: 3573 }, { m: '2025-08', p: 3858 },
  { m: '2025-09', p: 3883 }, { m: '2025-10', p: 3955 }, { m: '2025-11', p: 3889 },
  { m: '2025-12', p: 3969 },
  { m: '2026-01', p: 4118 }, { m: '2026-02', p: 4163 }, { m: '2026-03', p: 3892 },
  { m: '2026-04', p: 4112 }, { m: '2026-05', p: 4214 },
]

// ─── 恒生指数月度收盘（2016-01 ~ 2026-05）────────────────────────────────────
const HANG_SENG_DATA = [
  { m: '2016-01', p: 19111 }, { m: '2016-02', p: 19112 }, { m: '2016-03', p: 20777 },
  { m: '2016-04', p: 21067 }, { m: '2016-05', p: 20815 }, { m: '2016-06', p: 20794 },
  { m: '2016-07', p: 22001 }, { m: '2016-08', p: 23024 }, { m: '2016-09', p: 23297 },
  { m: '2016-10', p: 23142 }, { m: '2016-11', p: 22790 }, { m: '2016-12', p: 22001 },
  { m: '2017-01', p: 23360 }, { m: '2017-02', p: 23740 }, { m: '2017-03', p: 24112 },
  { m: '2017-04', p: 24616 }, { m: '2017-05', p: 25924 }, { m: '2017-06', p: 25765 },
  { m: '2017-07', p: 27323 }, { m: '2017-08', p: 27917 }, { m: '2017-09', p: 28196 },
  { m: '2017-10', p: 28245 }, { m: '2017-11', p: 29866 }, { m: '2017-12', p: 29919 },
  { m: '2018-01', p: 32887 }, { m: '2018-02', p: 30844 }, { m: '2018-03', p: 30093 },
  { m: '2018-04', p: 30808 }, { m: '2018-05', p: 31064 }, { m: '2018-06', p: 29315 },
  { m: '2018-07', p: 28583 }, { m: '2018-08', p: 27888 }, { m: '2018-09', p: 27789 },
  { m: '2018-10', p: 24979 }, { m: '2018-11', p: 26341 }, { m: '2018-12', p: 25846 },
  { m: '2019-01', p: 27930 }, { m: '2019-02', p: 28963 }, { m: '2019-03', p: 29051 },
  { m: '2019-04', p: 29699 }, { m: '2019-05', p: 27353 }, { m: '2019-06', p: 28542 },
  { m: '2019-07', p: 28189 }, { m: '2019-08', p: 25724 }, { m: '2019-09', p: 26093 },
  { m: '2019-10', p: 27101 }, { m: '2019-11', p: 26346 }, { m: '2019-12', p: 28189 },
  { m: '2020-01', p: 26313 }, { m: '2020-02', p: 26129 }, { m: '2020-03', p: 23603 },
  { m: '2020-04', p: 24644 }, { m: '2020-05', p: 23868 }, { m: '2020-06', p: 24427 },
  { m: '2020-07', p: 25389 }, { m: '2020-08', p: 25178 }, { m: '2020-09', p: 23459 },
  { m: '2020-10', p: 24107 }, { m: '2020-11', p: 26341 }, { m: '2020-12', p: 27231 },
  { m: '2021-01', p: 29103 }, { m: '2021-02', p: 30633 }, { m: '2021-03', p: 28530 },
  { m: '2021-04', p: 28969 }, { m: '2021-05', p: 29151 }, { m: '2021-06', p: 28828 },
  { m: '2021-07', p: 25757 }, { m: '2021-08', p: 25879 }, { m: '2021-09', p: 24099 },
  { m: '2021-10', p: 25377 }, { m: '2021-11', p: 23476 }, { m: '2021-12', p: 23397 },
  { m: '2022-01', p: 24573 }, { m: '2022-02', p: 23021 }, { m: '2022-03', p: 22502 },
  { m: '2022-04', p: 21089 }, { m: '2022-05', p: 21415 }, { m: '2022-06', p: 21859 },
  { m: '2022-07', p: 20165 }, { m: '2022-08', p: 20200 }, { m: '2022-09', p: 17222 },
  { m: '2022-10', p: 14687 }, { m: '2022-11', p: 18204 }, { m: '2022-12', p: 19781 },
  { m: '2023-01', p: 21842 }, { m: '2023-02', p: 20606 }, { m: '2023-03', p: 20401 },
  { m: '2023-04', p: 19895 }, { m: '2023-05', p: 18534 }, { m: '2023-06', p: 18916 },
  { m: '2023-07', p: 19539 }, { m: '2023-08', p: 17956 }, { m: '2023-09', p: 17809 },
  { m: '2023-10', p: 17112 }, { m: '2023-11', p: 17042 }, { m: '2023-12', p: 16982 },
  { m: '2024-01', p: 15485 }, { m: '2024-02', p: 16789 }, { m: '2024-03', p: 16541 },
  { m: '2024-04', p: 17763 }, { m: '2024-05', p: 18079 }, { m: '2024-06', p: 17718 },
  { m: '2024-07', p: 17021 }, { m: '2024-08', p: 17989 }, { m: '2024-09', p: 21134 },
  { m: '2024-10', p: 20318 }, { m: '2024-11', p: 19424 }, { m: '2024-12', p: 19864 },
  { m: '2025-01', p: 20225 }, { m: '2025-02', p: 22941 }, { m: '2025-03', p: 23120 },
  { m: '2025-04', p: 22119 }, { m: '2025-05', p: 23290 },
  { m: '2025-06', p: 24072 }, { m: '2025-07', p: 24773 }, { m: '2025-08', p: 25078 },
  { m: '2025-09', p: 26856 }, { m: '2025-10', p: 25907 }, { m: '2025-11', p: 25859 },
  { m: '2025-12', p: 25631 },
  { m: '2026-01', p: 27387 }, { m: '2026-02', p: 26631 }, { m: '2026-03', p: 24788 },
  { m: '2026-04', p: 25777 }, { m: '2026-05', p: 26348 },
]

const HANG_SENG_EVENTS: ChartEvent[] = [
  { d: '2018-01-29', label: '恒指见顶', impact: 'neg', detail: '恒生指数触及33,484历史高位后急转直下，贸易战忧虑叠加美债利率飙升，港股开始漫长回调。' },
  { d: '2018-10-11', label: '贸易战港股', impact: 'neg', detail: '中美贸易战冲击港股，恒指单月跌超11%，科技股和消费股首当其冲，南向资金大幅回撤。' },
  { d: '2020-03-19', label: 'COVID港股暴跌', impact: 'neg', detail: '全球疫情冲击，港股跌至23,603，腾讯、美团等互联网股跌幅较小，港股跌幅好于欧美。' },
  { d: '2021-02-17', label: '港股牛市高点', impact: 'pos', detail: '恒指升至31,084，科技+消费双轮驱动，南向资金持续涌入，腾讯、美团均创历史新高。' },
  { d: '2021-07-26', label: '监管风暴', impact: 'neg', detail: '教育双减政策+平台经济反垄断+游戏版号停发集中爆发，恒科指单月跌超20%，中概股崩跌。' },
  { d: '2022-10-24', label: '多年新低', impact: 'neg', detail: '恒指跌至14,687，为近13年最低。担忧习近平连任政策不确定性+美联储暴力加息+地产危机三重压制。' },
  { d: '2022-11-04', label: '防疫放开预期', impact: 'pos', detail: '防疫政策转向预期+房地产"三支箭"，恒指单月暴涨+26%，为历史最大单月涨幅之一。' },
  { d: '2024-01-22', label: '港股历史低谷', impact: 'neg', detail: '恒指跌至15,485，外资持续撤离中国资产，中国经济复苏不及预期，恒指估值历史性低估。' },
  { d: '2024-09-24', label: '政策大礼包', impact: 'pos', detail: '国务院一揽子增量政策落地，港股单月涨超+18%，南向资金单日净买入创历史纪录，腾讯、阿里领涨。' },
  { d: '2025-01-27', label: 'DeepSeek颠覆', impact: 'pos', detail: 'DeepSeek R1以低成本实现GPT-4级别能力震惊全球，中国AI重新定价，恒科指持续上行。' },
  { d: '2025-04-22', label: '中美缓和', impact: 'pos', detail: '中美90天关税暂停协议，港股外资回流加速，科技板块估值修复，腾讯、小米屡创新高。' },
]

const NASDAQ_EVENTS: ChartEvent[] = [
  { d:'2018-10-10', label:'贸易战冲击', impact:'neg', detail:'中美贸易战升级，科技股抛售，纳指单月跌-9.2%，FAANG全线下跌。' },
  { d:'2018-12-24', label:'年末暴跌', impact:'neg', detail:'美联储持续加息+贸易战忧虑，纳指全年跌近18%，12月单月跌幅为历史第三大。' },
  { d:'2020-03-20', label:'COVID暴跌', impact:'neg', detail:'新冠疫情全球蔓延+流动性危机，纳指单月跌-10%，为2008年以来最大月跌幅。' },
  { d:'2020-04-06', label:'流动性反弹', impact:'pos', detail:'美联储无限QE+财政刺激，纳指单月涨+15.5%，V形反转起点。' },
  { d:'2020-08-18', label:'疫情新高', impact:'pos', detail:'在家办公+科技需求爆发，纳指创历史新高，苹果首家市值破2万亿美元。' },
  { d:'2022-01-05', label:'加息开始', impact:'neg', detail:'美联储宣布3月开始加息，纳指从峰值开始下跌，全年最终跌33%，科技股重挫。' },
  { d:'2022-09-13', label:'加息最猛', impact:'neg', detail:'美联储连续四次加息75bp，纳指较峰值跌超35%，估值重置最惨烈阶段。' },
  { d:'2023-01-09', label:'AI叙事兴起', impact:'pos', detail:'ChatGPT月活破亿，微软宣布投资OpenAI，AI概念引爆，纳指开始今年涨势。' },
  { d:'2023-05-24', label:'NVDA超级财报', impact:'pos', detail:'英伟达Q1收入指引翻倍至$110亿，单日涨+24%，AI算力超级周期确立，科技股全面反弹。' },
  { d:'2023-11-14', label:'降息预期升温', impact:'pos', detail:'美国通胀降温，市场开始押注2024年降息，纳指11月涨+10.7%，科技股持续上涨。' },
  { d:'2025-03-04', label:'关税"解放日"', impact:'neg', detail:'特朗普对多国征收对等关税，纳指单月跌-8.2%，为2022年以来最大单月跌幅。' },
  { d:'2025-04-22', label:'90天暂停', impact:'pos', detail:'中美宣布90天暂停关税+停火协议，纳指大幅反弹，科技股领涨。' },
  { d:'2026-03-04', label:'美伊冲突', impact:'neg', detail:'中东地缘风险急剧升温，油价飙升+避险情绪，纳指回调约10%。' },
  { d:'2026-04-14', label:'停火创新高', impact:'pos', detail:'美伊停火协议签订，地缘风险溢价消退，叠加AI财报超预期，纳指再破历史新高。' },
]

const SHANGHAI_EVENTS: ChartEvent[] = [
  { d:'2018-06-19', label:'贸易战冲击', impact:'neg', detail:'中美贸易战正式打响，关税清单落地，上证单月跌-8%，外资加速撤离。' },
  { d:'2018-12-26', label:'熊市低点', impact:'neg', detail:'贸易战+去杠杆双重压力，上证跌至2494点，为2014年以来新低，全年跌约24%。' },
  { d:'2019-02-18', label:'贸易战缓和', impact:'pos', detail:'中美贸易谈判取得阶段成果，外资回流，上证单月涨+14%，成交量创历史纪录。' },
  { d:'2020-03-19', label:'疫情暴跌', impact:'neg', detail:'全球疫情蔓延，外需崩塌担忧，上证跌破2700，但A股率先企稳，跌幅小于全球。' },
  { d:'2020-07-06', label:'牛市情绪', impact:'pos', detail:'流动性宽松+经济率先复苏，上证单月涨+11%，市场进入短暂局部牛市行情。' },
  { d:'2021-07-26', label:'监管重拳', impact:'neg', detail:'教育双减+平台经济反垄断+游戏管控集中出台，中概股和互联网板块暴跌。' },
  { d:'2022-04-26', label:'疫情+俄乌', impact:'neg', detail:'上海封城+俄乌冲突油价飙升，上证跌破3000点，为2020年以来新低。' },
  { d:'2022-11-11', label:'防疫放开', impact:'pos', detail:'防疫政策转向+房地产"三支箭"，上证单月涨+8.9%，港股涨超25%。' },
  { d:'2024-02-05', label:'量化打压', impact:'neg', detail:'市场流动性危机，量化策略止损引发螺旋下跌，上证跌至2635点，央行出手托市。' },
  { d:'2024-09-24', label:'政策大礼包', impact:'pos', detail:'国务院一揽子增量政策（降准+降息+地产松绑+央行互换便利），上证单月涨+17.4%，为2008年以来最大月涨幅。' },
  { d:'2025-04-22', label:'中美关税缓和', impact:'pos', detail:'中美90天关税暂停协议，A股跟随全球风险偏好回升，外资净流入加速。' },
  { d:'2026-01-20', label:'DeepSeek行情', impact:'pos', detail:'DeepSeek R1震惊全球，中国AI实力重新定价，A股科技板块持续走强，上证站上3400。' },
]

// Combined + sorted timeline for the events list panel
const TIMELINE_EVENTS = [...NASDAQ_EVENTS, ...SHANGHAI_EVENTS, ...HANG_SENG_EVENTS]
  .sort((a, b) => a.d.localeCompare(b.d))
  .filter((ev, i, arr) => i === 0 || ev.d !== arr[i - 1].d)  // dedupe same date

// Manually maintained — update when market conditions change significantly
// Last updated: 2026-05
const RISK_INDICATORS = [
  { label: '纳指估值 (前向PE)', value: '~30x', status: 'danger', note: '历史均值约23x，AI叙事驱动估值显著扩张，追高需谨慎' },
  { label: '巴菲特指标', value: '~250%', status: 'danger', note: '远超历史均值(~150%)，美股整体估值处于历史高位' },
  { label: 'A股估值 (沪深300PE)', value: '~13x', status: 'safe', note: '历史均值附近，相对美股低估，安全边际更高' },
  { label: '美联储利率', value: '3.5-3.75%', status: 'warn', note: '降息周期进行中，但仍高于中性水平，对成长股有压制' },
  { label: '中美贸易风险', value: '缓和中', status: 'safe', note: '90天关税暂停协议有效，期间不确定性减少' },
  { label: 'AI算力叙事', value: '强劲', status: 'safe', note: 'Blackwell超级周期+数据中心资本开支持续超预期，叙事溢价仍在扩张' },
]

const PRESET_FUNDS = [
  '嘉实美国成长股票', '银河创新成长混合A', '易方达中概互联网ETF',
  '鹏华香港美国互联网', '博时研究精选一年持有', '嘉实沪港深精选股票',
  '诺安成长混合A', '中欧新蓝筹灵活配置',
]

type Range = '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | '10Y'
const RANGES: Range[] = ['1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y']
const RANGE_MONTHS: Record<Range, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '2Y': 24, '5Y': 60, '10Y': 120 }
// 1Y/2Y use Yahoo weekly data; 1M/3M/6M use daily — all live from Yahoo Finance
const MARKET_LIVE_RANGES: Range[] = ['1M', '3M', '6M', '1Y', '2Y']

function filterByRange(data: { m: string; p: number }[], range: Range) {
  const last = data[data.length - 1].m
  const [ly, lm] = last.split('-').map(Number)
  const months = RANGE_MONTHS[range]
  return data.filter(d => {
    const [y, m] = d.m.split('-').map(Number)
    return (ly - y) * 12 + (lm - m) <= months
  })
}

// ─── 趋势预测（基于静态月度数据的技术分析）───────────────────────────────────
function predictTrend(data: { m: string; p: number }[]) {
  const vals = data.map(d => d.p)
  if (vals.length < 13) return null

  const sma = (n: number) => vals.slice(-n).reduce((a, b) => a + b, 0) / n
  const sma3 = sma(3); const sma6 = sma(6); const sma12 = vals.length >= 12 ? sma(12) : null

  // RSI-like momentum
  const rsiWin = Math.min(14, vals.length - 1)
  let gains = 0, losses = 0
  for (let i = vals.length - rsiWin; i < vals.length; i++) {
    const d = vals[i] - vals[i - 1]
    if (d > 0) gains += d; else losses += Math.abs(d)
  }
  const avgG = gains / rsiWin; const avgL = losses / rsiWin
  const rsi = avgL === 0 ? 100 : +(100 - 100 / (1 + avgG / avgL)).toFixed(1)

  const mom3 = +((vals[vals.length - 1] / vals[vals.length - 4] - 1) * 100).toFixed(1)

  const signals = [
    { name: 'SMA3 vs SMA6', bullish: sma3 > sma6, detail: sma3 > sma6 ? '短期均线在长期均线上方（多头）' : '短期均线跌破长期均线（空头）' },
    ...(sma12 ? [{ name: 'SMA6 vs SMA12', bullish: sma6 > sma12, detail: sma6 > sma12 ? '中期趋势向上' : '中期趋势向下' }] : []),
    { name: 'RSI(14月)', bullish: rsi < 65, detail: rsi < 30 ? `${rsi} 超卖区间，反弹概率高` : rsi > 70 ? `${rsi} 超买，回调压力大` : `${rsi} 中性偏${rsi < 50 ? '空' : '多'}` },
    { name: '3月动量', bullish: mom3 > 0, detail: `近3月${mom3 >= 0 ? '+' : ''}${mom3}%，动量${mom3 > 5 ? '强劲' : mom3 > 0 ? '温和' : '偏弱'}` },
  ]

  const bullCount = signals.filter(s => s.bullish).length
  const bullPct = Math.round(bullCount / signals.length * 100)

  // Backtest: SMA3/SMA6 crossover, last 36 months
  let correct = 0, total = 0
  for (let i = 8; i < vals.length - 1; i++) {
    const s3 = vals.slice(i - 2, i + 1).reduce((a, b) => a + b, 0) / 3
    const s6 = vals.slice(i - 5, i + 1).reduce((a, b) => a + b, 0) / 6
    const pred = s3 > s6 ? 'up' : 'down'
    const actual = vals[i + 1] > vals[i] ? 'up' : 'down'
    if (pred === actual) correct++; total++
  }
  const accuracy = total > 0 ? Math.round(correct / total * 100) : 0

  const label = bullPct >= 60 ? `📈 看涨 ${bullPct}%` : bullPct <= 40 ? `📉 看跌 ${100 - bullPct}%` : `➡️ 震荡整理`
  const color = bullPct >= 60 ? '#16a34a' : bullPct <= 40 ? '#dc2626' : '#d97706'

  // Generate reason text
  const bullSignals = signals.filter(s => s.bullish).map(s => s.detail)
  const bearSignals = signals.filter(s => !s.bullish).map(s => s.detail)
  const reason = bullPct >= 60
    ? `多头信号占优：${bullSignals.slice(0, 2).join('；')}${bearSignals.length ? `。需注意：${bearSignals[0]}` : ''}`
    : bullPct <= 40
    ? `空头信号占优：${bearSignals.slice(0, 2).join('；')}${bullSignals.length ? `。支撑因素：${bullSignals[0]}` : ''}`
    : `多空信号分歧，${bullSignals[0] ?? ''}${bearSignals[0] ? '，但 ' + bearSignals[0] : ''}，建议观望。`

  return { bullPct, label, color, signals, accuracy, samples: total, reason, rsi, mom3 }
}

interface FundResult {
  fund_name: string; category: string; price_desc: string
  from_high_pct: number; from_low_pct: number
  zone: 'buy2' | 'buy1' | 'hold' | 'warn' | 'sell'
  zone_label: string; monthly_action: string
  buy_condition: string; sell_condition: string
  key_risk: string; key_opportunity: string
  confidence: 'high' | 'medium' | 'low'; note: string
}

const RISK_STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  safe:   { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
  warn:   { bg: '#fffbeb', border: '#fcd34d', text: '#92400e' },
  danger: { bg: '#fff1f2', border: '#fca5a5', text: '#991b1b' },
}

const ZONE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string; badgeText: string }> = {
  buy2: { bg: '#f0fdf4', border: '#86efac', text: '#166534', badge: '#dcfce7', badgeText: '#15803d' },
  buy1: { bg: '#f0fdfa', border: '#99f6e4', text: '#134e4a', badge: '#ccfbf1', badgeText: '#0f766e' },
  hold: { bg: 'transparent', border: 'var(--border)', text: 'var(--text)', badge: 'var(--bg-secondary)', badgeText: 'var(--text-muted)' },
  warn: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', badge: '#fef3c7', badgeText: '#b45309' },
  sell: { bg: '#fff1f2', border: '#fca5a5', text: '#991b1b', badge: '#fee2e2', badgeText: '#dc2626' },
}

// Map { m, p } → { d, p } for InteractiveChart
function toChartPts(arr: { m: string; p: number }[]) {
  return arr.map(pt => ({ d: pt.m, p: pt.p }))
}

function TrendPredictionPanel({ nasdaqData, shanghaiData, hangSengData }: {
  nasdaqData: { m: string; p: number }[]
  shanghaiData: { m: string; p: number }[]
  hangSengData: { m: string; p: number }[]
}) {
  const nasdaq = predictTrend(nasdaqData)
  const shanghai = predictTrend(shanghaiData)
  const hangSeng = predictTrend(hangSengData)

  if (!nasdaq || !shanghai) return null

  const markets = [
    { name: '纳斯达克', ticker: 'NASDAQ', pred: nasdaq, color: '#2563eb' },
    { name: '上证指数', ticker: 'SSE', pred: shanghai, color: '#d97706' },
    ...(hangSeng ? [{ name: '恒生指数', ticker: 'HSI', pred: hangSeng, color: '#7c3aed' }] : []),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {markets.map(({ name, ticker, pred, color }) => (
        <div key={ticker} style={{ borderRadius: '10px', border: `1px solid ${pred.color}40`, backgroundColor: 'var(--surface)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{name}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: '20px', backgroundColor: pred.color + '18', color: pred.color, border: `1px solid ${pred.color}40` }}>
                {pred.label}
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                历史准确率 {pred.accuracy}% / {pred.samples}次
              </span>
            </div>
          </div>

          <div style={{ padding: '0.875rem 1rem' }}>
            {/* Bull/bear bar */}
            <div style={{ marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#fee2e2' }}>
                <div style={{ width: `${pred.bullPct}%`, backgroundColor: pred.bullPct >= 60 ? '#16a34a' : pred.bullPct >= 50 ? '#d97706' : '#6b7280', transition: 'width 0.5s ease', borderRadius: '4px 0 0 4px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                <span>看跌</span><span>看涨 {pred.bullPct}%</span>
              </div>
            </div>

            {/* Reason */}
            <p style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.6, marginBottom: '0.75rem', borderLeft: `3px solid ${pred.color}`, paddingLeft: '0.625rem' }}>
              {pred.reason}
            </p>

            {/* Signals grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.375rem' }}>
              {pred.signals.map(s => (
                <div key={s.name} style={{ padding: '0.375rem 0.5rem', borderRadius: '6px', backgroundColor: s.bullish ? '#f0fdf4' : '#fff1f2', border: `1px solid ${s.bullish ? '#86efac' : '#fca5a5'}` }}>
                  <div style={{ fontSize: '0.6rem', color: s.bullish ? '#15803d' : '#991b1b', marginBottom: '0.15rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: '0.72rem', color: s.bullish ? '#166534' : '#7f1d1d', lineHeight: 1.4 }}>{s.detail}</div>
                </div>
              ))}
            </div>

            <p style={{ marginTop: '0.5rem', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              基于月度静态数据 · SMA + RSI + 动量模型 · 仅供参考
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.875rem', fontFamily: 'var(--font-mono)' }}>
      {children}
    </div>
  )
}

type TabId = 'market' | 'stocks' | 'sectors' | 'fund' | 'gold' | 'review' | 'safebuy'
const TABS: { id: TabId; label: string }[] = [
  { id: 'market',  label: '大盘分析' },
  { id: 'stocks',  label: '个股分析' },
  { id: 'sectors', label: '赛道估值' },
  { id: 'fund',    label: '基金工具' },
  { id: 'gold',    label: '黄金分析' },
  { id: 'review',  label: '预测复盘' },
  { id: 'safebuy', label: '安全买入' },
]

// ─── 主组件 ────────────────────────────────────────────────────────────────────
export default function MarketDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('market')
  const [range, setRange] = useState<Range>('2Y')
  const [fundInput, setFundInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FundResult | null>(null)
  const [error, setError] = useState('')

  // Live daily data for index charts (1M/3M/6M)
  const [indexDaily, setIndexDaily] = useState<{ nasdaq: ChartPoint[]; shanghai: ChartPoint[]; hangSeng: ChartPoint[] } | null>(null)
  const [indexDailyLoading, setIndexDailyLoading] = useState(false)
  const [indexDailyUpdated, setIndexDailyUpdated] = useState<string | null>(null)

  const fetchIndexDaily = useCallback(async (r: Range) => {
    setIndexDailyLoading(true)
    setIndexDaily(null)
    try {
      const [nRes, sRes, hRes] = await Promise.all([
        fetch(`/api/stock-daily?ticker=^IXIC&range=${r}`, { cache: 'no-store' }),
        fetch(`/api/stock-daily?ticker=000001.SS&range=${r}`, { cache: 'no-store' }),
        fetch(`/api/stock-daily?ticker=^HSI&range=${r}`, { cache: 'no-store' }),
      ])
      const [nJson, sJson, hJson] = await Promise.all([nRes.json(), sRes.json(), hRes.json()])
      setIndexDaily({
        nasdaq:   (nJson.prices ?? []) as ChartPoint[],
        shanghai: (sJson.prices ?? []) as ChartPoint[],
        hangSeng: (hJson.prices ?? []) as ChartPoint[],
      })
      if (nJson.fetchedAt) setIndexDailyUpdated(
        new Date(nJson.fetchedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      )
    } catch { /* fall back to monthly */ }
    finally { setIndexDailyLoading(false) }
  }, [])

  useEffect(() => {
    if (MARKET_LIVE_RANGES.includes(range)) {
      fetchIndexDaily(range)
    } else {
      setIndexDaily(null)
      setIndexDailyUpdated(null)
    }
  }, [range, fetchIndexDaily])

  const isLiveRange = MARKET_LIVE_RANGES.includes(range)
  // TrendPredictionPanel always uses 5Y of static monthly data (needs 13+ points for SMA)
  const nasdaqFiltered  = filterByRange(NASDAQ_DATA,    '5Y')
  const shanghaiFiltered = filterByRange(SHANGHAI_DATA, '5Y')
  const hangSengFiltered = filterByRange(HANG_SENG_DATA, '5Y')
  // Charts: live Yahoo data when available, else static monthly
  const nasdaqChartData: ChartPoint[]  = isLiveRange && indexDaily
    ? indexDaily.nasdaq   : toChartPts(filterByRange(NASDAQ_DATA,    range))
  const shanghaiChartData: ChartPoint[] = isLiveRange && indexDaily
    ? indexDaily.shanghai : toChartPts(filterByRange(SHANGHAI_DATA,  range))
  const hangSengChartData: ChartPoint[] = isLiveRange && indexDaily
    ? indexDaily.hangSeng : toChartPts(filterByRange(HANG_SENG_DATA, range))

  const analyze = useCallback(async (name?: string) => {
    const fund = (name ?? fundInput).trim()
    if (!fund) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/fund-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fund }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [fundInput])

  const zc = result ? (ZONE_COLORS[result.zone] ?? ZONE_COLORS.hold) : null
  const needlePct = result ? Math.max(4, Math.min(96,
    result.from_high_pct <= -25 ? 8 : result.from_high_pct <= -15 ? 20 :
    result.from_low_pct >= 80 ? 90 : result.from_low_pct >= 50 ? 72 : 50
  )) : 50

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

      {/* 页头 */}
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
          $ market --watch
        </p>
        <h1 style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
          市场仪表盘
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          宏观因子 · 指数走势 · 赛道估值 · 持仓观察 · AI 基金择时
        </p>
      </div>

      {/* Tab 导航 */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.55rem 1.1rem',
              fontSize: '0.88rem',
              fontWeight: activeTab === tab.id ? 700 : 400,
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`,
              background: 'none',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginBottom: '-1px',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1：大盘分析 ─────────────────────────────────────────────────── */}
      {activeTab === 'market' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* 宏观评分面板 */}
          <section>
            <SectionLabel>宏观/中观/情绪三层评分（每小时更新）</SectionLabel>
            <MacroScorePanel />
          </section>

          {/* 指数走势 */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <SectionLabel>指数走势</SectionLabel>
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {RANGES.map(r => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    style={{
                      padding: '0.2rem 0.6rem', fontSize: '0.72rem', borderRadius: '6px',
                      border: '1px solid',
                      borderColor: r === range ? 'var(--accent)' : 'var(--border)',
                      backgroundColor: r === range ? 'var(--accent)' : 'transparent',
                      color: r === range ? '#fff' : 'var(--text-muted)',
                      cursor: 'pointer', fontFamily: 'var(--font-mono)', fontWeight: r === range ? 700 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    {r}
                  </button>
                ))}
                {isLiveRange && indexDailyUpdated && (
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                    更新 {indexDailyUpdated}
                  </span>
                )}
              </div>
            </div>

            {indexDailyLoading && (
              <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px solid var(--border)', borderRadius: 10 }}>
                加载日线数据中…
              </div>
            )}

            {!indexDailyLoading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                <div style={{ borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', padding: '0.875rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>纳斯达克综合指数</div>
                  <InteractiveChart
                    data={nasdaqChartData}
                    color="#2563eb"
                    height={150}
                    events={NASDAQ_EVENTS}
                    isDaily={isLiveRange && !!indexDaily}
                    allowFullscreen={true}
                    title="纳斯达克综合指数"
                  />
                </div>
                <div style={{ borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', padding: '0.875rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>上证综合指数</div>
                  <InteractiveChart
                    data={shanghaiChartData}
                    color="#d97706"
                    height={150}
                    events={SHANGHAI_EVENTS}
                    isDaily={isLiveRange && !!indexDaily}
                    allowFullscreen={true}
                    title="上证综合指数"
                  />
                </div>
                <div style={{ borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', padding: '0.875rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>恒生指数</div>
                  <InteractiveChart
                    data={hangSengChartData}
                    color="#7c3aed"
                    height={150}
                    events={HANG_SENG_EVENTS}
                    isDaily={isLiveRange && !!indexDaily}
                    allowFullscreen={true}
                    title="恒生指数"
                  />
                </div>
              </div>
            )}

            <p style={{ marginTop: '0.5rem', fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {isLiveRange
                ? (range === '1Y' || range === '2Y' ? '周线实时数据 (Yahoo Finance)' : '日线实时数据 (Yahoo Finance)')
                : '月度静态数据（截至 2025-05）'} · 滚轮缩放 · 拖拽平移 · 双击复原 · 悬停查看数据 · 菱形 = 重大事件
            </p>
          </section>

          {/* 趋势预测 */}
          <section>
            <SectionLabel>趋势预测（技术分析模型）</SectionLabel>
            <TrendPredictionPanel nasdaqData={nasdaqFiltered} shanghaiData={shanghaiFiltered} hangSengData={hangSengFiltered} />
          </section>

          {/* 风险指标 */}
          <section>
            <SectionLabel>当前风险指标</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.625rem' }}>
              {RISK_INDICATORS.map(r => {
                const s = RISK_STATUS_STYLES[r.status]
                return (
                  <div key={r.label} style={{ borderRadius: '10px', border: `1px solid ${s.border}`, backgroundColor: s.bg, padding: '0.875rem' }}>
                    <div style={{ fontSize: '0.7rem', color: s.text, opacity: 0.7, marginBottom: '0.25rem' }}>{r.label}</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: s.text, marginBottom: '0.2rem' }}>{r.value}</div>
                    <div style={{ fontSize: '0.7rem', color: s.text, opacity: 0.6, lineHeight: 1.4 }}>{r.note}</div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* 大事件时间线 */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <SectionLabel>影响市场的重大事件</SectionLabel>
              <MarketEventsFreshness />
            </div>
            <div style={{ borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', padding: '1rem 1.25rem' }}>
              {TIMELINE_EVENTS.map((ev, i) => (
                <div key={`${ev.d}-${ev.label}`} style={{ display: 'flex', gap: '1rem', paddingTop: i === 0 ? 0 : '0.875rem', paddingBottom: i === TIMELINE_EVENTS.length - 1 ? 0 : '0.875rem', borderBottom: i < TIMELINE_EVENTS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: ev.impact === 'pos' ? '#22c55e' : '#ef4444', flexShrink: 0, marginTop: '5px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ev.d}</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{ev.label}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{ev.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── Tab 2：个股分析 ─────────────────────────────────────────────────── */}
      {activeTab === 'stocks' && (
        <section>
          <SectionLabel>我的持仓观察</SectionLabel>
          <PortfolioWatchlist />
        </section>
      )}

      {/* ── Tab 3：赛道估值 ─────────────────────────────────────────────────── */}
      {activeTab === 'sectors' && (
        <section>
          <SectionLabel>赛道估值 &amp; 财报日历</SectionLabel>
          <SectorValuation />
        </section>
      )}

      {/* ── Tab 4：基金工具 ─────────────────────────────────────────────────── */}
      {activeTab === 'fund' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <section>
            <SectionLabel>持仓截图 AI 分析</SectionLabel>
            <FundImageAnalysis />
          </section>

          <div style={{ borderTop: '1px solid var(--border)' }} />

          <section>
            <SectionLabel>基金择时分析（AI 驱动）</SectionLabel>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.875rem' }}>
              {PRESET_FUNDS.map(f => (
                <button
                  key={f}
                  onClick={() => { setFundInput(f); analyze(f) }}
                  style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem', borderRadius: '20px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                  onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--accent)'; b.style.color = 'var(--accent)' }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--border)'; b.style.color = 'var(--text-muted)' }}
                >
                  {f.length > 8 ? f.slice(0, 8) + '…' : f}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={fundInput}
                onChange={e => setFundInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') analyze() }}
                placeholder="输入基金名称，按 Enter 分析…"
                style={{ flex: 1, fontSize: '0.9rem', padding: '0.55rem 0.875rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-sans)', transition: 'border-color 0.15s' }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent)' }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)' }}
              />
              <button
                onClick={() => analyze()}
                disabled={loading || !fundInput.trim()}
                style={{ padding: '0.55rem 1.125rem', fontSize: '0.875rem', borderRadius: '8px', border: 'none', backgroundColor: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: loading || !fundInput.trim() ? 'not-allowed' : 'pointer', opacity: loading || !fundInput.trim() ? 0.45 : 1, transition: 'opacity 0.15s', whiteSpace: 'nowrap' }}
              >
                {loading ? '分析中…' : '分析'}
              </button>
            </div>

            {error && (
              <div style={{ marginTop: '0.875rem', fontSize: '0.8rem', color: '#991b1b', backgroundColor: '#fff1f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.625rem 0.875rem' }}>
                分析失败：{error}
              </div>
            )}

            {loading && (
              <div style={{ marginTop: '1rem', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[75, 50, 65, 40].map((w, i) => (
                  <div key={i} style={{ height: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', width: `${w}%`, animation: 'pulse 1.5s ease-in-out infinite' }} />
                ))}
              </div>
            )}

            {result && zc && (
              <div style={{ marginTop: '1rem', borderRadius: '10px', border: `1px solid ${zc.border}`, backgroundColor: zc.bg, padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: zc.text }}>{result.fund_name}</div>
                    <div style={{ fontSize: '0.78rem', color: zc.text, opacity: 0.65, marginTop: '0.2rem' }}>{result.category}</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '20px', fontWeight: 600, backgroundColor: zc.badge, color: zc.badgeText, flexShrink: 0 }}>{result.zone_label}</span>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
                    <div style={{ flex: 1, backgroundColor: '#4ade80', opacity: 0.8 }} />
                    <div style={{ flex: 1, backgroundColor: '#2dd4bf', opacity: 0.8 }} />
                    <div style={{ flex: 2, backgroundColor: 'var(--border)' }} />
                    <div style={{ flex: 1, backgroundColor: '#fbbf24', opacity: 0.8 }} />
                    <div style={{ flex: 1, backgroundColor: '#f87171', opacity: 0.8 }} />
                  </div>
                  <div style={{ position: 'relative', height: '10px' }}>
                    <div style={{ position: 'absolute', top: 0, left: `${needlePct}%`, transform: 'translateX(-50%)', width: '2px', height: '10px', backgroundColor: zc.text, borderRadius: '1px', transition: 'left 0.5s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: zc.text, opacity: 0.55, marginTop: '4px' }}>
                    <span>重仓买</span><span>轻仓买</span><span>持有</span><span>减仓</span><span>大减</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.875rem' }}>
                  {[
                    { label: '距近期高点', value: `${result.from_high_pct > 0 ? '+' : ''}${result.from_high_pct}%`, red: result.from_high_pct > -5 },
                    { label: '距近期低点', value: `+${result.from_low_pct}%`, red: result.from_low_pct > 60 },
                  ].map(item => (
                    <div key={item.label} style={{ borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.4)', padding: '0.625rem 0.75rem' }}>
                      <div style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.2rem', color: zc.text }}>{item.label}</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: item.red ? '#dc2626' : '#16a34a' }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: zc.text, marginBottom: '0.875rem', lineHeight: 1.5 }}>{result.monthly_action}</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.875rem' }}>
                  {[
                    { label: '买入条件', value: result.buy_condition, color: '#16a34a' },
                    { label: '减仓条件', value: result.sell_condition, color: '#dc2626' },
                    { label: '主要风险', value: result.key_risk, color: '#b45309' },
                    { label: '主要机会', value: result.key_opportunity, color: '#1d4ed8' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
                      <span style={{ color: zc.text, opacity: 0.5, flexShrink: 0, width: '4rem' }}>{row.label}</span>
                      <span style={{ color: row.color, lineHeight: 1.5 }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', paddingTop: '0.75rem', borderTop: `1px solid ${zc.border}` }}>
                  <span style={{ fontSize: '0.75rem', color: zc.text, opacity: 0.45 }}>数据充分度</span>
                  <span style={{
                    fontSize: '0.72rem', padding: '0.2rem 0.625rem', borderRadius: '20px', fontWeight: 600,
                    ...(result.confidence === 'high' ? { backgroundColor: '#dcfce7', color: '#15803d' } :
                       result.confidence === 'medium' ? { backgroundColor: '#fef3c7', color: '#b45309' } :
                       { backgroundColor: '#fee2e2', color: '#dc2626' }),
                  }}>
                    {{ high: '充分', medium: '一般', low: '有限' }[result.confidence]}
                  </span>
                  {result.note && <span style={{ fontSize: '0.72rem', color: zc.text, opacity: 0.4, flex: 1, textAlign: 'right' }}>{result.note}</span>}
                </div>
              </div>
            )}

            <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              由 AI 实时分析 · 仅供参考，不构成投资建议
            </p>
          </section>
        </div>
      )}

      {/* ── Tab 5：黄金分析 ─────────────────────────────────────────────────── */}
      {activeTab === 'gold' && (
        <section>
          <SectionLabel>黄金 · 价格 · 宏观驱动因子 · 配置建议</SectionLabel>
          <GoldAnalysis />
        </section>
      )}

      {/* ── Tab 6：预测复盘 ─────────────────────────────────────────────────── */}
      {activeTab === 'review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <section>
            <SectionLabel>复盘仪表盘 · 准确率统计 · 纠错建议 · 趋势追踪</SectionLabel>
            <ReviewDashboard />
          </section>

          <div style={{ borderTop: '1px solid var(--border)' }} />

          <section>
            <SectionLabel>每日预测 · 生成 & 管理</SectionLabel>
            <PredictionReview />
          </section>
        </div>
      )}

      {/* ── Tab 7：安全买入 ─────────────────────────────────────────────────── */}
      {activeTab === 'safebuy' && (
        <section>
          <SectionLabel>安全买入价格分析 · 多方法交叉验证 · 回测准确率</SectionLabel>
          <SafeBuyAnalysis />
        </section>
      )}

{/* ── 数据源说明 ── */}
      <div style={{
        marginTop: '3rem', padding: '1rem 1.25rem', borderRadius: '10px',
        border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)',
        fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.7,
      }}>
        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
          数据源与准确性说明
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.5rem' }}>
          <div>
            <strong style={{ color: 'var(--text)' }}>实时行情</strong> — Yahoo Finance（美股/港股/A股/ETF/黄金GLD）<br/>
            <span style={{ opacity: 0.6 }}>延迟约15分钟，仅交易时段更新。黄金价格由GLD ETF换算（1份≈0.094盎司）。</span>
          </div>
          <div>
            <strong style={{ color: 'var(--text)' }}>宏观经济数据</strong> — FRED（美联储经济数据库）<br/>
            <span style={{ opacity: 0.6 }}>部分指标可能有1-2周滞后。FRED不可用时自动降级为静态估算值。</span>
          </div>
          <div>
            <strong style={{ color: 'var(--text)' }}>股票基本面</strong> — 手动维护<br/>
            <span style={{ opacity: 0.6 }}>PE/PEG/增速/财报日期来自公开财报，不定期更新，可能有滞后。</span>
          </div>
          <div>
            <strong style={{ color: 'var(--text)' }}>历史月度数据</strong> — 手动估算<br/>
            <span style={{ opacity: 0.6 }}>用于长期趋势和SMA计算。近1年由Yahoo实时数据覆盖。</span>
          </div>
          <div>
            <strong style={{ color: 'var(--text)' }}>AI分析</strong> — MiniMax API<br/>
            <span style={{ opacity: 0.6 }}>基金分析和截图分析由AI生成，不保证准确性。</span>
          </div>
          <div>
            <strong style={{ color: 'var(--text)' }}>预测模型</strong> — 统计模型 + 技术指标<br/>
            <span style={{ opacity: 0.6 }}>基于SMA/RSI/布林带等指标，历史回测准确率供参考，不构成投资建议。</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}

function MarketEventsFreshness() {
  const [status, setStatus] = useState<{ updatedAt: string; autoCheckedAt: string | null; hasPending: boolean; pendingCount: number } | null>(null)

  useEffect(() => {
    fetch('/api/market-events', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setStatus({
        updatedAt: d.updatedAt,
        autoCheckedAt: d.autoCheckedAt,
        hasPending: d.hasPending,
        pendingCount: d.pendingFlags?.length ?? 0,
      }))
      .catch(() => {})
  }, [])

  if (!status) return null

  const daysSinceUpdate = Math.floor((Date.now() - new Date(status.updatedAt).getTime()) / 86400000)
  const isStale = daysSinceUpdate > 30
  const hasGaps = status.hasPending

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>
      <span style={{
        padding: '2px 8px', borderRadius: '10px',
        backgroundColor: isStale ? '#fff1f2' : '#f0fdf4',
        color: isStale ? '#991b1b' : '#166534',
        border: '1px solid ' + (isStale ? '#fca5a5' : '#86efac'),
      }}>
        {isStale ? '⚠ 已' + daysSinceUpdate + '天未更新' : '✓ ' + daysSinceUpdate + '天前更新'}
      </span>
      {hasGaps && (
        <span style={{
          padding: '2px 8px', borderRadius: '10px',
          backgroundColor: '#fffbeb', color: '#92400e',
          border: '1px solid #fcd34d',
        }}>
          ⚡ {status.pendingCount}次异动待标注
        </span>
      )}
      {status.autoCheckedAt && (
        <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
          自动检测 {new Date(status.autoCheckedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  )
}
