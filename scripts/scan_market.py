#!/usr/bin/env python3
"""A股短线盯盘 — 龙头识别 + 板块 + 信号 (EM失败→新浪兜底)"""

import json, os, sys, time
for k in list(os.environ.keys()):
    if 'proxy' in k.lower(): del os.environ[k]
import requests

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

def req(url, params=None, referer='https://quote.eastmoney.com/'):
    for i in range(3):
        try:
            return requests.get(url, params=params,
                headers={'User-Agent':UA,'Referer':referer},
                timeout=15, proxies={'http':None,'https':None})
        except: time.sleep(1.5)
    raise RuntimeError(f"Failed: {url}")

# ─── 十五五核心标的静态数据 ───────────────────────────────
STOCK_INFO = {
    '600036':{'industry':'银行','mcap':'9600亿','biz':'零售银行之王','pe':'6.4'},
    '000725':{'industry':'面板','mcap':'2200亿','biz':'全球LCD面板#1,玻璃基载板新赛道','pe':'--'},
    '688256':{'industry':'AI芯片','mcap':'8300亿','biz':'国产AI芯片纯正标的','pe':'305'},
    '002371':{'industry':'半导体设备','mcap':'2500亿','biz':'国产半导体设备绝对龙头','pe':'81'},
    '688017':{'industry':'机器人','mcap':'720亿','biz':'谐波减速器全球#2,人形机器人关节','pe':'85'},
    '002050':{'industry':'热管理','mcap':'1200亿','biz':'特斯拉Optimus热管理+汽车热管理','pe':'35'},
    '300750':{'industry':'电池','mcap':'8000亿','biz':'全球动力电池#1,储能#1','pe':'22'},
    '601012':{'industry':'光伏','mcap':'1500亿','biz':'全球硅片组件龙头,BC电池领先','pe':'18'},
    '688981':{'industry':'晶圆代工','mcap':'4000亿','biz':'国内最先进晶圆代工,14nm+','pe':'55'},
    '688012':{'industry':'半导体设备','mcap':'1800亿','biz':'5nm刻蚀进台积电,全球CCP前三','pe':'65'},
    '688041':{'industry':'AI芯片','mcap':'2000亿','biz':'国产CPU/DCU,x86授权','pe':'88'},
    '603019':{'industry':'服务器','mcap':'1200亿','biz':'国产超算#1,信创服务器','pe':'45'},
    '688126':{'industry':'半导体材料','mcap':'400亿','biz':'300mm大硅片国产#1','pe':'--'},
    '002594':{'industry':'新能源车','mcap':'7000亿','biz':'全球新能源车销量#1,垂直整合','pe':'20'},
    '600438':{'industry':'光伏','mcap':'1200亿','biz':'全球多晶硅#1,成本最低','pe':'15'},
    '300274':{'industry':'逆变器','mcap':'2000亿','biz':'全球逆变器#2,储能系统集成','pe':'30'},
    '002230':{'industry':'AI应用','mcap':'1200亿','biz':'AI语音#1,星火大模型','pe':'--'},
    '688111':{'industry':'软件','mcap':'1500亿','biz':'WPS AI办公,月活6亿+','pe':'55'},
    '300760':{'industry':'医疗器械','mcap':'3500亿','biz':'国内医疗器械#1,全球监护#3','pe':'32'},
    '688235':{'industry':'创新药','mcap':'2000亿','biz':'中国唯一全球化生物药公司','pe':'--'},
    '600276':{'industry':'制药','mcap':'2500亿','biz':'国内研发管线最强,仿转创','pe':'42'},
    '688639':{'industry':'合成生物','mcap':'200亿','biz':'合成生物学氨基酸全球#1','pe':'65'},
    '688065':{'industry':'合成生物','mcap':'300亿','biz':'全球唯一生物基尼龙56','pe':'78'},
    '688271':{'industry':'医疗器械','mcap':'1200亿','biz':'CT/MRI/PET国产替代龙头','pe':'48'},
    '601689':{'industry':'汽车零部件','mcap':'800亿','biz':'特斯拉Tier1+机器人执行器','pe':'32'},
    '603728':{'industry':'运动控制','mcap':'150亿','biz':'步进电机#1,机器人关节','pe':'42'},
    '002236':{'industry':'AI视觉','mcap':'800亿','biz':'全球视频监控#2','pe':'18'},
    '002142':{'industry':'银行','mcap':'2000亿','biz':'长三角城商行标杆','pe':'6.1'},
    '002389':{'industry':'无人机','mcap':'150亿','biz':'军用+工业无人机','pe':'55'},
    '688339':{'industry':'氢能','mcap':'100亿','biz':'燃料电池系统#1','pe':'--'},
    '600118':{'industry':'航天','mcap':'300亿','biz':'卫星制造国家队','pe':'60'},
    '002459':{'industry':'光伏','mcap':'600亿','biz':'全球组件出货#2-3','pe':'12'},
    '688019':{'industry':'半导体材料','mcap':'300亿','biz':'CMP抛光液国产#1','pe':'55'},
    '603986':{'industry':'芯片设计','mcap':'600亿','biz':'MCU#1,NOR Flash全球#3','pe':'35'},
    '300014':{'industry':'电池','mcap':'1000亿','biz':'大圆柱4680国内量产最快','pe':'28'},
    '002202':{'industry':'风电','mcap':'500亿','biz':'陆上风电整机#1','pe':'15'},
    '601615':{'industry':'风电','mcap':'400亿','biz':'海上风电整机#1-2','pe':'20'},
    '600879':{'industry':'航天电子','mcap':'250亿','biz':'航天电子配套最全','pe':'40'},
    '300045':{'industry':'卫星通信','mcap':'100亿','biz':'卫星通信终端#2-3','pe':'55'},
    '603667':{'industry':'精密制造','mcap':'80亿','biz':'精密轴承机器人关节','pe':'40'},
    # ── 新增加 70+ 标的 ──
    '600667':{'industry':'半导体','mcap':'150亿','biz':'太极实业-半导体封装洁净工程','pe':'30'},
    '688271':{'industry':'医疗器械','mcap':'1200亿','biz':'联影医疗-CT/MRI/PET国产#1','pe':'48'},
    '600028':{'industry':'石化','mcap':'8000亿','biz':'中国石化-最大制氢企业','pe':'12'},
    '300014':{'industry':'电池','mcap':'1000亿','biz':'亿纬锂能-大圆柱4680领先','pe':'28'},
    '002459':{'industry':'光伏','mcap':'600亿','biz':'晶澳科技-全球组件#2-3','pe':'12'},
    '003039':{'industry':'公用事业','mcap':'80亿','biz':'顺控发展-水务+固废','pe':'25'},
    '688347':{'industry':'晶圆代工','mcap':'800亿','biz':'华虹公司-特色工艺晶圆代工','pe':'40'},
    '601578':{'industry':'电力','mcap':'300亿','biz':'京能电力-京津冀火电龙头','pe':'18'},
    '600688':{'industry':'石化','mcap':'500亿','biz':'上海石化-炼化一体化','pe':'20'},
    '600011':{'industry':'电力','mcap':'1000亿','biz':'华能国际-火电+新能源转型','pe':'15'},
    '000543':{'industry':'电力','mcap':'200亿','biz':'皖能电力-安徽火电龙头','pe':'12'},
    '000938':{'industry':'IT设备','mcap':'600亿','biz':'紫光股份-ICT基础设施#1','pe':'28'},
    '300308':{'industry':'光模块','mcap':'2000亿','biz':'中际旭创-800G光模块全球#1','pe':'35'},
    '300394':{'industry':'光器件','mcap':'500亿','biz':'天孚通信-光器件龙头','pe':'40'},
    '600522':{'industry':'光通信','mcap':'500亿','biz':'中天科技-光纤+海缆','pe':'18'},
    '601869':{'industry':'光纤','mcap':'400亿','biz':'长飞光纤-光纤预制棒全球#1','pe':'22'},
    '688498':{'industry':'光芯片','mcap':'150亿','biz':'源杰科技-光芯片国产替代','pe':'60'},
    '002837':{'industry':'温控','mcap':'300亿','biz':'英维克-数据中心精密温控','pe':'35'},
    '603773':{'industry':'面板玻璃','mcap':'80亿','biz':'沃格光电-玻璃基板加工','pe':'--'},
    '600584':{'industry':'封测','mcap':'600亿','biz':'长电科技-封装测试全球#3','pe':'22'},
    '688525':{'industry':'存储模组','mcap':'200亿','biz':'佰维存储-NAND模组','pe':'40'},
    '300474':{'industry':'GPU','mcap':'400亿','biz':'景嘉微-国产GPU军用+民用','pe':'80'},
    '603893':{'industry':'AIoT芯片','mcap':'400亿','biz':'瑞芯微-AIoT SoC芯片龙头','pe':'45'},
    '002273':{'industry':'光学','mcap':'300亿','biz':'水晶光电-光学镀膜龙头','pe':'28'},
    '002600':{'industry':'精密制造','mcap':'400亿','biz':'领益智造-消费电子精密件','pe':'22'},
    '300790':{'industry':'光学镜头','mcap':'100亿','biz':'宇瞳光学-安防镜头#2','pe':'35'},
    '601138':{'industry':'服务器','mcap':'4000亿','biz':'工业富联-AI服务器+云计算','pe':'18'},
    '002241':{'industry':'声学','mcap':'800亿','biz':'歌尔股份-声学+VR代工','pe':'22'},
    '002475':{'industry':'连接器','mcap':'2500亿','biz':'立讯精密-精密制造龙头','pe':'25'},
    '300736':{'industry':'存储分销','mcap':'100亿','biz':'香农芯创-存储芯片分销','pe':'30'},
    '300124':{'industry':'工控','mcap':'2000亿','biz':'汇川技术-工业自动化#1','pe':'32'},
    '600919':{'industry':'银行','mcap':'1500亿','biz':'江苏银行-江苏省最大城商行','pe':'5.5'},
    '601166':{'industry':'银行','mcap':'4000亿','biz':'兴业银行-绿色金融领先','pe':'5.0'},
    '300033':{'industry':'金融IT','mcap':'1500亿','biz':'同花顺-炒股软件#1','pe':'35'},
    '300736':{'industry':'存储分销','mcap':'100亿','biz':'香农芯创-存储芯片分销','pe':'30'},
    # ── 物理AI 新加入 ──
    '601689':{'industry':'机器人/工控','mcap':'1400亿','biz':'Optimus执行器总成独家供应商','pe':'32'},
    '603009':{'industry':'机器人/工控','mcap':'200亿','biz':'行星滚柱丝杠-产能最激进','pe':'45'},
    '002472':{'industry':'机器人/工控','mcap':'150亿','biz':'RV减速器国产龙头-绿的谐波替代','pe':'35'},
    '603662':{'industry':'机器人/工控','mcap':'80亿','biz':'力传感器-主板可买替代','pe':'40'},
    '300115':{'industry':'机器人/工控','mcap':'200亿','biz':'结构件+指尖传感器-单台价值4万','pe':'30'},
    '300007':{'industry':'机器人/工控','mcap':'120亿','biz':'六维力传感器国产替代','pe':'50'},
    '301076':{'industry':'机器人/工控','mcap':'60亿','biz':'PEEK原料DFBP全球≤3家','pe':'--'},
    '002475':{'industry':'消费电子','mcap':'2500亿','biz':'立讯精密-精密制造龙头','pe':'25'},
}

# ─── 自选股(新浪实时行情) ─────────────────────────────────
def fetch_sina_quotes(codes):
    """批量获取行情,自动分批(每批20只)避免URL过长"""
    results = {}
    batch_size = 20
    for batch_start in range(0, len(codes), batch_size):
        batch = codes[batch_start:batch_start+batch_size]
        symbols = [f'sh{c}' if c.startswith('6') else f'sz{c}' for c in batch]
        try:
            r = req('https://hq.sinajs.cn/list=' + ','.join(symbols), referer='https://finance.sina.com.cn')
            text = r.content.decode('gbk')
            for line, code in zip(text.strip().split('\n'), batch):
                if '=' not in line: continue
                parts = line.split('"')[1].split(',')
                if len(parts) < 10: continue
                results[code] = {
                    'name': parts[0], 'open': float(parts[1] or 0), 'preClose': float(parts[2] or 0),
                    'price': float(parts[3] or 0), 'high': float(parts[4] or 0), 'low': float(parts[5] or 0),
                    'volume': float(parts[8] or 0), 'amount': float(parts[9] or 0),
                }
        except: pass
        if batch_start + batch_size < len(codes):
            time.sleep(0.3)
    return results

# ─── 新浪K线(日线) ────────────────────────────────────────
def fetch_sina_daily(codes, days=30):
    results = {}
    for code in codes:
        try:
            prefix = 'sh' if code.startswith('6') else 'sz'
            r = req(f'https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol={prefix}{code}&scale=240&ma=no&datalen={days}',
                    referer='https://finance.sina.com.cn')
            data = json.loads(r.text)
            klines = []
            for item in data:
                klines.append({'close':float(item.get('close',0)),'volume':float(item.get('volume',0)),
                               'high':float(item.get('high',0)),'low':float(item.get('low',0))})
            results[code] = [k for k in klines if k['close']>0][-days:]
        except: results[code] = []
        time.sleep(0.2)
    return results

# ─── 龙头扫描(新浪兜底) ───────────────────────────────────
def fetch_leaders():
    """扫描涨幅前30只十五五标的"""
    codes = list(STOCK_INFO.keys())
    quotes = fetch_sina_quotes(codes)
    leaders = []
    for code, q in quotes.items():
        pct = (q['price']-q['preClose'])/q['preClose']*100 if q['preClose']>0 else 0
        info = STOCK_INFO.get(code, {})
        if pct >= 3:
            leaders.append({
                'code':code,'name':q['name'],'price':q['price'],'changePct':round(pct,2),
                'amount':q['amount'],'high':q['high'],'low':q['low'],
                'turnover':0,'volumeRatio':0,
                'industry':info.get('industry',''),'marketCap':info.get('mcap',''),
                'mainBusiness':info.get('biz',''),'pe':info.get('pe',''),
            })
    leaders.sort(key=lambda x: x['changePct'], reverse=True)
    return leaders[:15]

# ─── 市场热度(涨跌统计+热点板块+头部公司) ──────────────────────
def fetch_market_heat():
    """市场涨跌统计 + 热点板块 + 头部公司"""
    try:
        r = req('https://push2.eastmoney.com/api/qt/clist/get', {
            'pn':'1','pz':'20','po':'1','np':'1','fltt':'2','invt':'2','fid':'f3',
            'fs':'m:90+t:2','fields':'f2,f3,f4,f12,f14,f104,f105'})
        data = r.json()
        hot_sectors = []
        for x in (data.get('data',{}).get('diff') or [])[:8]:
            hot_sectors.append({
                'name':x.get('f14',''),'changePct':float(x.get('f3',0)or 0),
                'upCount':int(float(x.get('f104',0)or 0)),'totalCount':int(float(x.get('f105',0)or 0)),
            })
    except: hot_sectors = []

    # 涨跌统计 (45只十五五标的本地采样)
    try:
        codes = list(STOCK_INFO.keys())
        quotes = fetch_sina_quotes(codes)
        up=down=flat=limit_up=0
        for q in quotes.values():
            pct=(q['price']-q['preClose'])/q['preClose']*100 if q.get('preClose',0)>0 else 0
            if pct>0: up+=1
            elif pct<0: down+=1
            else: flat+=1
            if pct>=9.9: limit_up+=1
        total=up+down+flat
        breadth={'up':up,'down':down,'flat':flat,'limitUp':limit_up,'total':total,
                 'upRatio':round(up/total*100,1) if total>0 else 0}
    except: breadth={'up':0,'down':0,'flat':0,'limitUp':0,'total':0,'upRatio':0}

    # ── 主力资金估算: 成交额 × 涨跌方向 → 净流入估算 ──
    fund_flow_stocks = []
    fund_flow_sectors = {}
    for code, q in quotes.items():
        info = STOCK_INFO.get(code, {})
        ind = info.get('industry', '')
        pct = (q['price'] - q['preClose']) / q['preClose'] * 100 if q.get('preClose', 0) > 0 else 0
        amt = q.get('amount', 0)
        # 估算净流入: 涨=流入, 跌=流出, 量=成交额×涨跌幅的sigmoid
        est_inflow = amt * (pct / 100) * 0.3  # 粗略估算30%成交额是主动买卖
        fund_flow_stocks.append({
            'code': code, 'name': q['name'], 'industry': ind,
            'price': q['price'], 'changePct': round(pct, 2),
            'amount': amt, 'estInflow': round(est_inflow / 1e8, 2),  # 亿
        })
        if ind:
            if ind not in fund_flow_sectors:
                fund_flow_sectors[ind] = {'totalInflow': 0, 'totalAmount': 0, 'stockCount': 0, 'upCount': 0}
            fs = fund_flow_sectors[ind]
            fs['totalInflow'] += est_inflow
            fs['totalAmount'] += amt
            fs['stockCount'] += 1
            if pct > 0: fs['upCount'] += 1

    # Top inflow stocks
    top_inflow_stocks = sorted(fund_flow_stocks, key=lambda x: x['estInflow'], reverse=True)[:10]
    top_outflow_stocks = sorted(fund_flow_stocks, key=lambda x: x['estInflow'])[:5]

    # Top inflow sectors
    top_inflow_sectors = sorted(
        [{'name': k, 'totalInflow': round(v['totalInflow'] / 1e8, 2), 'totalAmount': v['totalAmount'],
          'stockCount': v['stockCount'], 'upRatio': round(v['upCount'] / v['stockCount'] * 100)}
         for k, v in fund_flow_sectors.items()],
        key=lambda x: x['totalInflow'], reverse=True)[:8]

    # ── 各板块 TOP3 流入/流出个股 ──
    sector_top_stocks = {}
    for code, q in quotes.items():
        info = STOCK_INFO.get(code, {})
        ind = info.get('industry', '')
        if not ind: continue
        pct = (q['price'] - q['preClose']) / q['preClose'] * 100 if q.get('preClose', 0) > 0 else 0
        amt = q.get('amount', 0)
        est_inflow = amt * (pct / 100) * 0.3
        if ind not in sector_top_stocks:
            sector_top_stocks[ind] = []
        sector_top_stocks[ind].append({
            'code': code, 'name': q['name'],
            'price': q['price'], 'changePct': round(pct, 2),
            'amount': amt, 'estInflow': round(est_inflow / 1e8, 2),
            'biz': info.get('biz', ''), 'pe': info.get('pe', ''),
        })
    # Sort each sector by estInflow desc
    for ind in sector_top_stocks:
        sector_top_stocks[ind].sort(key=lambda x: x['estInflow'], reverse=True)
    industry_heat = {}
    codes=list(STOCK_INFO.keys())
    quotes=fetch_sina_quotes(codes)
    for code,q in quotes.items():
        info=STOCK_INFO.get(code,{})
        ind=info.get('industry','')
        if not ind: continue
        pct=(q['price']-q['preClose'])/q['preClose']*100 if q.get('preClose',0)>0 else 0
        if ind not in industry_heat: industry_heat[ind]={'up':0,'total':0,'sumPct':0,'topStock':None,'topPct':-999}
        h=industry_heat[ind]; h['total']+=1; h['sumPct']+=pct
        if pct>0: h['up']+=1
        if pct>h['topPct']: h['topPct']=pct; h['topStock']=q['name']
    computed_sectors=[]
    for ind,h in sorted(industry_heat.items(),key=lambda x:x[1]['sumPct']/max(x[1]['total'],1),reverse=True):
        if h['total']>=2:
            computed_sectors.append({
                'name':ind,'changePct':round(h['sumPct']/h['total'],1),
                'upCount':h['up'],'totalCount':h['total'],
                'topStock':h.get('topStock',''),'topPct':round(h['topPct'],1),
            })
    # Merge: use computed sectors if EM hot_sectors is empty
    if not hot_sectors: hot_sectors=computed_sectors
    return {'hotSectors':hot_sectors,'breadth':breadth,
            'topInflowStocks':top_inflow_stocks,'topOutflowStocks':top_outflow_stocks,
            'topInflowSectors':top_inflow_sectors,
            'sectorTopStocks':sector_top_stocks}

# ─── 热门板块(十五五八大方向) ─────────────────────────────────
def fetch_sectors():
    """返回十五五八大战略方向+简要描述"""
    return [
        {'name':'AI与大模型','changePct':0,'upCount':0,'totalCount':0},
        {'name':'集成电路','changePct':0,'upCount':0,'totalCount':0},
        {'name':'具身智能/机器人','changePct':0,'upCount':0,'totalCount':0},
        {'name':'低空经济','changePct':0,'upCount':0,'totalCount':0},
        {'name':'新能源/储能','changePct':0,'upCount':0,'totalCount':0},
        {'name':'商业航天','changePct':0,'upCount':0,'totalCount':0},
        {'name':'生物技术','changePct':0,'upCount':0,'totalCount':0},
        {'name':'智能网联汽车','changePct':0,'upCount':0,'totalCount':0},
    ]

# ─── 自选股信号分析 ───────────────────────────────────────
def analyze_watchlist(codes, cost_map=None):
    if not cost_map: cost_map = {}
    quotes = fetch_sina_quotes(codes)
    dailies = fetch_sina_daily(codes, 30)
    results = []
    for code in codes:
        q = quotes.get(code)
        if not q: continue
        price = q['price']; pct = (price-q['preClose'])/q['preClose']*100 if q['preClose']>0 else 0
        high = q['high']; low = q['low']; vol = q['volume']; amt = q['amount']
        klines = dailies.get(code, [])
        ma5 = sum(k['close'] for k in klines[-5:])/5 if len(klines)>=5 else price
        ma20 = sum(k['close'] for k in klines[-20:])/20 if len(klines)>=20 else price
        vol5_avg = sum(k['volume'] for k in klines[-6:-1])/5 if len(klines)>=6 else vol
        vol_ratio = vol/vol5_avg if vol5_avg>0 else 1
        trend_up = price > ma5 > ma20
        trend_down = price < ma5 < ma20
        ma_structure = '多头' if trend_up else ('空头' if trend_down else '整理')
        cost = cost_map.get(code); cost_pct = ((price-cost)/cost*100) if cost else None

        signals = []; level = 'normal'
        # 口诀信号
        if pct >= 9.9: signals.append('🚀涨停'); level='limit_up'
        elif vol_ratio>=1.5 and abs(pct)<1: signals.append('⚠️放量滞涨'); level='warn'
        upper_shadow = (high-price)/price*100 if price>0 else 0
        if vol_ratio>=1.3 and upper_shadow>2 and pct<3: signals.append('⚠️上影出货'); level='warn'
        if pct>=5 and vol_ratio>=1.2: signals.append('📈量价配合'); level='bullish' if level=='normal' else level
        elif pct>=3: signals.append('↑上涨')
        elif pct<=-3: signals.append('↓下跌'); level='bearish' if level=='normal' else level
        # 口诀②: 连续小涨是真涨，连续大涨要离场
        if len(klines)>=5:
            chgs=[(klines[-i]['close']-klines[-i-1]['close'])/klines[-i-1]['close']*100 for i in range(1,4) if klines[-i-1]['close']>0]
            if len(chgs)>=3:
                if all(0<c<3 for c in chgs) and trend_up:
                    signals.append('📜②连续小涨✅')
                    level='bullish' if level=='normal' else level
                if all(c>4 for c in chgs) or sum(chgs)>15:
                    signals.append('📜②连续大涨⚠️')
                    level='warn'
        # 口诀⑤: 缩量新低是底部，缩量回升是问题
        if len(klines)>=5:
            v5l=min(k['volume'] for k in klines[-5:]); p5l=min(k['low'] for k in klines[-5:])
            vol_decline = vol <= v5l * 1.05  # 今日缩量
            price_new_low = price <= p5l * 1.01  # 价格新低
            # 缩量新低→底部信号
            if vol_decline and price_new_low:
                signals.append('📜⑤缩量新低→底✅')
                level='opportunity' if level=='normal' else level
            # 缩量回升→问题信号(缩量反弹=派发)
            if vol_decline and pct > 1 and price > ma5 and not trend_up:
                signals.append('📜⑤缩量回升⚠️')
                if level=='normal': level='warn'
            streak_up = sum(1 for i in range(1,min(6,len(klines))) if klines[-i]['close']>klines[-i-1]['close'])
            if streak_up>=4: signals.append('🔄连涨多日')
        # 口诀3: 高位横盘冲高/低位新低
        if len(klines)>=5:
            rh=[k['high'] for k in klines[-5:]]; rl=[k['low'] for k in klines[-5:]]
            rng=(max(rh)-min(rl))/min(rl)*100
            if rng<3:
                if price>ma20 and pct>3: signals.append('⚠️高位横盘冲高→抛'); level='warn' if level!='limit_up' else level
                elif price<ma20 and pct<-2: signals.append('💡低位新低→买'); level='opportunity'
        # 成本信号
        if cost_pct is not None:
            if cost_pct<=-5: signals.append('🔴止损'); level='stop_loss'
            elif cost_pct>=20: signals.append('💰二档止盈'); level='profit2'
            elif cost_pct>=10: signals.append('💰一档止盈'); level='profit1'
        if level=='warn' and (cost_pct is None or cost_pct<5): signals.append('🟡轻仓')
        results.append({
            'code':code,'name':q['name'],'price':price,'changePct':round(pct,2),
            'volume':vol,'amount':amt,'high':high,'low':low,'turnover':0,'volumeRatio':round(vol_ratio,1),
            'ma5':round(ma5,2),'ma20':round(ma20,2),'maStructure':ma_structure,'trendUp':trend_up,
            'cost':cost,'costPct':round(cost_pct,1) if cost_pct else None,
            'signals':signals,'signalLevel':level,
        })
    return results

# ─── Main ────────────────────────────────────────────────────
def main():
    if len(sys.argv)<2:
        print(json.dumps({'error':'Usage: scan_market.py <cmd> [codes]'})); sys.exit(1)
    cmd=sys.argv[1]
    try:
        if cmd=='leaders': result=fetch_leaders()
        elif cmd=='sectors': result=fetch_sectors()
        elif cmd=='watchlist':
            codes=sys.argv[2].split(',') if len(sys.argv)>2 else []
            result=analyze_watchlist(codes)
        elif cmd=='all':
            codes=sys.argv[2].split(',') if len(sys.argv)>2 else []
            errors=[]
            try: wl=analyze_watchlist(codes)
            except Exception as e: wl=[]; errors.append(f'watchlist:{e}')
            try: ld=fetch_leaders()
            except Exception as e: ld=[]; errors.append(f'leaders:{e}')
            try: sc=fetch_sectors()
            except Exception as e: sc=[]; errors.append(f'sectors:{e}')
            try: heat=fetch_market_heat()
            except Exception as e: heat={'hotSectors':[],'breadth':{}}; errors.append(f'heat:{e}')
            result={'watchlist':wl,'leaders':ld,'sectors':sc,'marketHeat':heat,
                    'updatedAt':time.strftime('%Y-%m-%d %H:%M:%S')}
            if errors: result['warnings']=errors
        else: result={'error':f'Unknown: {cmd}'}
    except Exception as e: result={'error':str(e)}
    print(json.dumps(result, ensure_ascii=False))

if __name__=='__main__': main()
