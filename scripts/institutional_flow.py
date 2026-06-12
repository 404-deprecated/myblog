#!/usr/bin/env python3
"""主力走势判断 — A股量价/资金/换手率/均线综合分析"""
import json, os, sys, time
for k in list(os.environ.keys()):
    if 'proxy' in k.lower(): del os.environ[k]
import requests

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

def req(url, params=None, referer='https://quote.eastmoney.com/'):
    for i in range(3):
        try:
            return requests.get(url, params=params, headers={'User-Agent':UA,'Referer':referer},
                                timeout=15, proxies={'http':None,'https':None})
        except: time.sleep(1.5)
    raise RuntimeError(f"Failed: {url}")

def fetch_sina_quotes(codes):
    results = {}
    for i in range(0, len(codes), 20):
        batch = codes[i:i+20]
        symbols = [f'sh{c}' if c.startswith('6') else f'sz{c}' for c in batch]
        try:
            r = req('https://hq.sinajs.cn/list='+','.join(symbols), referer='https://finance.sina.com.cn')
            text = r.content.decode('gbk')
            for line, code in zip(text.strip().split('\n'), batch):
                if '=' not in line: continue
                parts = line.split('"')[1].split(',')
                if len(parts) < 10: continue
                results[code] = {
                    'name':parts[0],'open':float(parts[1]or 0),'preClose':float(parts[2]or 0),
                    'price':float(parts[3]or 0),'high':float(parts[4]or 0),'low':float(parts[5]or 0),
                    'volume':float(parts[8]or 0),'amount':float(parts[9]or 0),
                }
        except: pass
        if i+20 < len(codes): time.sleep(0.3)
    return results

def fetch_daily(codes, days=60):
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


sector_map = {
    '000725':'面板/光电','600036':'银行','002142':'银行','601689':'机器人/工控','603667':'机器人/工控',
    '603728':'机器人/工控','002050':'机器人/工控','300750':'新能源/电力','002371':'半导体设备',
    '688017':'机器人/工控','601012':'新能源/电力','002475':'消费电子','601138':'AI/服务器',
    '300308':'光通信','300274':'新能源/电力','002241':'消费电子','688256':'半导体/芯片',
    '688981':'半导体/芯片','603019':'AI/服务器','600276':'生物医药','300760':'生物医药',
    '600028':'新能源/电力','688065':'生物医药','688639':'生物医药','002459':'新能源/电力',
    '600438':'新能源/电力','688012':'半导体设备','300014':'新能源/电力','002202':'新能源/电力',
    '601615':'新能源/电力','300124':'机器人/工控','601869':'光通信','002389':'航天/军工',
    '600118':'航天/军工','688631':'航天/军工','600893':'航天/军工','002179':'航天/军工',
    '603662':'机器人/工控','603009':'机器人/工控','002472':'机器人/工控','002236':'航天/军工',
    '601698':'航天/军工','002837':'AI/服务器','300394':'光通信','600522':'光通信',
    '600667':'半导体/芯片','600584':'半导体/芯片','688041':'半导体/芯片','688019':'半导体设备',
    '688126':'半导体设备','603986':'半导体/芯片','600919':'银行','601166':'银行',
    '300033':'AI/服务器','002600':'消费电子','002273':'面板/光电','603773':'面板/光电',
    '300474':'半导体/芯片','603893':'半导体/芯片','688498':'光通信','688525':'半导体/芯片',
    '300007':'机器人/工控','300115':'机器人/工控','301076':'机器人/工控','600879':'航天/军工',
    '600990':'航天/军工','603950':'航天/军工','002126':'航天/军工','300777':'航天/军工','000099':'航天/军工','603009':'机器人/工控','002472':'机器人/工控','600990':'航天/军工','603950':'航天/军工','002126':'航天/军工',
}
sector_heat = {}
_sector_stocks_cache = {}  # id(results) -> sh_stocks, for multi-day reuse

def fetch_klines_em(codes, days=12):
    """东财日K线API（比Sina更稳定，限速更宽松）"""
    results = {}
    for code in codes:
        try:
            secid = f'1.{code}' if code.startswith('6') else f'0.{code}'
            r = req('https://push2his.eastmoney.com/api/qt/stock/kline/get', {
                'secid': secid, 'fields1': 'f1,f2,f3,f4,f5,f6',
                'fields2': 'f51,f52,f53,f54,f55,f56,f57',
                'klt': 101, 'fqt': 1, 'end': '20500101', 'lmt': days,
            })
            klines = r.json().get('data', {}).get('klines', []) or []
            parsed = []
            for k in klines:
                p = k.split(',')
                if len(p) >= 6:
                    parsed.append({'close': float(p[2] or 0), 'volume': float(p[5] or 0)})
            results[code] = [x for x in parsed if x['close'] > 0]
        except:
            results[code] = []
        time.sleep(0.08)
    return results

SECTOR_CATALYSTS = {
    '半导体': 'AI算力需求驱动，国产芯片加速',
    '芯片': 'AI算力需求驱动，国产芯片加速',
    '机器人': '人形机器人产业化，订单落地预期',
    '工控': '工业自动化升级，国产替代',
    '新能源': '绿电装机提速，储能需求爆发',
    '光通信': '数据中心算力扩容，400G需求放量',
    'AI': 'AI大模型商业化落地，算力基建受益',
    '服务器': 'AI训练推理算力爆发，IDC扩容',
    '军工': '国防预算增长，装备现代化加速',
    '航天': '商业航天提速，卫星互联网布局',
    '医药': '创新药审批提速，出海逻辑兑现',
    '生物': '创新药审批提速，出海逻辑兑现',
    '银行': '化债推进，息差企稳，资产质量改善',
    '新材料': '国产材料替代，政策支持',
    '面板': '显示面板价格上涨周期',
    '消费电子': '手机/PC换机潮，AI终端普及',
    '电力': '电网改造投资，绿电消纳提升',
}

def gen_rise_reason(s):
    chg = s.get('chg1d', 0)
    turnover = s.get('turnover', 0)
    pe = s.get('pe', 0)
    industry = s.get('industry', '')
    reasons = []

    if chg >= 9.8:
        reasons.append('涨停封板')
    elif chg >= 7:
        reasons.append(f'大涨{chg:.1f}%，市场情绪高涨')
    elif chg >= 5:
        reasons.append(f'强势上涨{chg:.1f}%')

    if turnover >= 15:
        reasons.append('超高换手率，游资积极介入')
    elif turnover >= 8:
        reasons.append('量能显著放大，主力建仓')
    elif turnover >= 4:
        reasons.append('有效放量突破')

    if 0 < pe <= 15:
        reasons.append('低估值价值发现')
    elif 15 < pe <= 25:
        reasons.append('估值合理，机构增持')

    for key, catalyst in SECTOR_CATALYSTS.items():
        if key in industry:
            reasons.append(catalyst)
            break

    if not reasons:
        reasons.append(f'{industry}板块资金轮动')
    return '；'.join(reasons)

def analyze_institutional(codes):
    quotes = fetch_sina_quotes(codes)
    dailies = fetch_daily(codes, 60)
    results = []

    for code in codes:
        q = quotes.get(code)
        if not q: continue
        kl = dailies.get(code, [])
        has_daily = len(kl) >= 10

        price = q['price']; preclose = q['preClose']
        pct = (price-preclose)/preclose*100 if preclose>0 else 0
        high=q['high']; low=q['low']; vol=q['volume']; amt=q['amount']

        if has_daily:
            closes = [k['close'] for k in kl]
            volumes = [k['volume'] for k in kl]
            highs = [k['high'] for k in kl]; lows = [k['low'] for k in kl]
            n = len(closes)
            ma5 = sum(closes[-5:])/5; ma20 = sum(closes[-20:])/20 if n>=20 else ma5
            ma60 = sum(closes[-60:])/60 if n>=60 else None
            vol5 = sum(volumes[-6:-1])/5 if n>=6 else vol
            vol_ratio = vol/vol5 if vol5>0 else 1
            vol_6m_low = min(volumes); is_volume_low = vol <= vol_6m_low * 1.1
            price_1m_high = max(highs[-20:]) if n>=20 else high
            price_1m_low = min(lows[-20:]) if n>=20 else low
            e12=e26=closes[0]; difs=[]
            for p in closes: e12=p*2/13+e12*11/13; e26=p*2/27+e26*25/27; difs.append(e12-e26)
            dea=difs[0]
            for d in difs: dea=d*2/10+dea*8/10
            macd_signal = 'golden' if difs[-1]>dea else 'dead'
            g=sum(max(closes[i]-closes[i-1],0) for i in range(n-14,n))
            l=sum(max(closes[i-1]-closes[i],0) for i in range(n-14,n))
            rsi14 = 100-100/(1+g/l) if l>0 else 100
            trend_up = price > ma5 > ma20
            trend_down = price < ma5 < ma20
        else:
            ma5=ma20=price; ma60=None; vol_ratio=1.0
            is_volume_low=False; price_1m_high=high; price_1m_low=low
            macd_signal='unknown'; rsi14=50
            trend_up=price>preclose; trend_down=price<preclose

        turnover_est = vol / 100 if vol > 0 else 0
        upper_shadow = (high-max(price, q['open']))/price*100 if price>0 else 0
        lower_shadow = (min(price, q['open'])-low)/price*100 if price>0 else 0

        # ─── Signals ───
        signals = []
        warnings = []
        phase = 'neutral'

        # 量价信号
        # 放量滞涨 (最重要出货信号)
        if vol_ratio >= 1.5 and abs(pct) < 1:
            signals.append({'type':'bearish','text':'⚠️ 放量滞涨 — 主力高位出货，散户接盘'})
            if phase!='distribution': phase='distribution'

        if has_daily:
            # 缩量横盘不破低位 (建仓信号)
            price_range_5d = (max(highs[-5:])-min(lows[-5:]))/min(lows[-5:])*100 if min(lows[-5:])>0 else 100
            if vol_ratio < 0.8 and price_range_5d < 3 and price > price_1m_low * 1.02:
                signals.append({'type':'bullish','text':'💡 缩量横盘不破低位 — 主力低价吸筹，筹码锁定'})
                if phase=='neutral': phase='accumulation'
            # 地量
            if is_volume_low and price > price_1m_low * 1.01:
                signals.append({'type':'bullish','text':'📊 地量出现 — 筹码高度集中，即将启动'})
            # 低位长下影线放量
            if lower_shadow > 2 and vol_ratio > 1.2 and price < price_1m_high * 0.9:
                signals.append({'type':'bullish','text':'🔨 低位长下影线+放量 — 主力在下方大量承接'})
            # 高位长上影线 (出货)
            if upper_shadow > 2 and price > price_1m_low * 1.15:
                signals.append({'type':'bearish','text':'📌 高位长上影线 — 盘中冲高被抛压压回，主力借高点出货'})
                if phase!='distribution': phase='distribution'
            # 量价背离
            if price > price_1m_high * 0.95 and vol_ratio < 0.8:
                signals.append({'type':'bearish','text':'⚠️ 量价背离 — 股价近高但量能萎缩，买入动能减弱'})
            # 高位连续阴线不缩量
            recent_days = [(closes[i]-closes[i-1])/closes[i-1]*100 for i in range(n-3,n)]
            if all(d<0 for d in recent_days) and vol_ratio > 0.8 and price > price_1m_low * 1.1:
                signals.append({'type':'bearish','text':'📉 高位连续阴线+量不缩 — 主力持续出货，趋势已逆转'})
            # 放量大阳突破
            if pct > 3 and vol_ratio > 1.5 and price > ma20:
                signals.append({'type':'bullish','text':'🚀 放量大阳突破均线 — 主力拉升启动'})
                phase = 'markup'
            # 缩量回调至均线 (洗盘)
            if -3 < pct < 0 and vol_ratio < 0.8 and price > ma20:
                signals.append({'type':'bullish','text':'🔄 缩量回调至均线 — 洗盘，清除获利盘'})
                if phase=='markup': phase='shakeout'

        # 换手率判断
        if turnover_est > 20:
            warnings.append('换手率>20%异常，主力大幅出货或庄股崩盘')
            phase = 'distribution'
        elif turnover_est > 15:
            signals.append({'type':'bearish','text':'换手率>15% 高度活跃，注意减仓'})
        elif 3 <= turnover_est <= 8:
            signals.append({'type':'bullish','text':'换手率健康(3-8%)，可积极跟进'})
        elif turnover_est < 1:
            signals.append({'type':'neutral','text':'换手率<1%极度冷清，观察不操作'})

        # 量比实时判断
        if vol_ratio > 3:
            if pct > 0: signals.append({'type':'bullish','text':f'量比{vol_ratio:.1f}极度放量+上涨=强势突破'})
            else: signals.append({'type':'bearish','text':f'量比{vol_ratio:.1f}极度放量+下跌=恐慌出逃'})
        elif vol_ratio < 0.5 and has_daily:
            if price > price_1m_low * 1.05:
                signals.append({'type':'bullish','text':'量比<0.5地量 — 主力完成控盘即将拉升'})

        # MACD顶背离检查
        if has_daily and n >= 30 and price > price_1m_high * 0.95 and macd_signal == 'dead':
            warnings.append('股价近高但MACD死叉 — 顶背离预警')

        # Phase determination
        if not signals:
            if trend_up and vol_ratio > 1: phase = 'markup'
            elif trend_down: phase = 'distribution'

        phase_labels = {'accumulation':'🏗️ 建仓吸筹期','markup':'🚀 拉升启动期','shakeout':'🔄 洗盘震荡期','distribution':'⚠️ 拉升出货期','neutral':'➡️ 方向不明'}
        phase_advice = {
            'accumulation':'持续观察量能，不追涨也不恐慌割肉',
            'markup':'风险最低赔率最高，最佳入场窗口',
            'shakeout':'只要大单净流入不减+低点不创新低，就坚持持有',
            'distribution':'出现2个以上出货信号立即减仓，不恋战不等最高点',
            'neutral':'观望等待明确信号'
        }

        # Buy checklist score
        checklist = 0
        if vol_ratio > 1.5: checklist += 1
        if trend_up: checklist += 1
        if macd_signal == 'golden': checklist += 1
        if rsi14 < 70: checklist += 1
        if vol_ratio > 1 and pct > 1: checklist += 1  # 量价配合
        buy_signal = checklist >= 4

        results.append({
            'code':code,'name':q['name'],'price':price,'changePct':round(pct,2),
            'amount':amt,'volRatio':round(vol_ratio,2),'turnover':round(turnover_est,1),
            'rsi14':round(rsi14,1),'macd':macd_signal,
            'ma5':round(ma5,2),'ma20':round(ma20,2),'ma60':round(ma60,2) if ma60 else None,
            'trendUp':trend_up,'trendDown':trend_down,
            'upperShadow':round(upper_shadow,1),'lowerShadow':round(lower_shadow,1),
            'phase':phase,'phaseLabel':phase_labels.get(phase,''),
            'phaseAdvice':phase_advice.get(phase,''),
            'signals':signals,'warnings':warnings,'checklist':checklist,'buySignal':buy_signal,
        })

    # Market breadth
    bull = sum(1 for r in results if any(s['type']=='bullish' for s in r['signals']))
    bear = sum(1 for r in results if any(s['type']=='bearish' for s in r['signals']))
    dist = sum(1 for r in results if r['phase']=='distribution')
    accum = sum(1 for r in results if r['phase']=='accumulation')
    markup = sum(1 for r in results if r['phase']=='markup')

    # ── 主力建仓热力图（1d，含 top3 公司）──
    sh_map = {}   # sec -> aggregates
    sh_stocks = {}  # sec -> list of {code, name, flow}
    for r in results:
        sec = sector_map.get(r['code'], '其他')
        if sec not in sh_map:
            sh_map[sec] = {'total':0,'accum':0,'markup':0,'dist':0,'buySignal':0,'flow':0}
            sh_stocks[sec] = []
        sh = sh_map[sec]; sh['total'] += 1
        if r['phase']=='accumulation': sh['accum']+=1
        if r['phase']=='markup': sh['markup']+=1
        if r['phase']=='distribution': sh['dist']+=1
        if r['buySignal']: sh['buySignal']+=1
        est_flow = round(r.get('amount',0)*(1 if r.get('changePct',0)>0 else -1)/1e8, 1)
        sh['flow'] += est_flow
        sh_stocks[sec].append({'code':r['code'],'name':r['name'],'flow':est_flow})

    sector_list = []
    for sec, sh in sh_map.items():
        score = round((sh['accum']*3+sh['markup']*2-sh['dist']*2+sh['buySignal']*2)/max(sh['total'],1),1)
        stocks = sh_stocks[sec]
        top3 = sorted([s for s in stocks if s['flow']>0], key=lambda x: x['flow'], reverse=True)[:3]
        outflow3 = sorted([s for s in stocks if s['flow']<0], key=lambda x: x['flow'])[:3]
        sector_list.append({'name':sec,'total':sh['total'],'accum':sh['accum'],'markup':sh['markup'],
                           'dist':sh['dist'],'buySignal':sh['buySignal'],'flow':round(sh['flow'],1),
                           'score':score,'top3':top3,'outflow3':outflow3})
    sector_list.sort(key=lambda x: x['score'], reverse=True)
    # also expose per-sector stock list for multi-day computation
    _sector_stocks_cache[id(results)] = sh_stocks

    return {'stocks':results, 'breadth':{'bullish':bull,'bearish':bear,'total':len(results),
            'distribution':dist,'accumulation':accum,'markup':markup},
            'sectorHeat':sector_list, 'updatedAt':time.strftime('%Y-%m-%d %H:%M:%S')}

# ─── 北向资金 ──────────────────────────────────────────────────
def fetch_north_bound():
    """获取北向资金实时流向 — 通过配额使用率推断"""
    try:
        r = req('https://push2.eastmoney.com/api/qt/kamt/get', {
            'fields1':'f1,f2,f3,f4','fields2':'f51,f52,f53,f54'})
        data = r.json()
        qt = data.get('data',{})
        hk2sh_remain = float(qt.get('hk2sh',{}).get('dayAmtRemain',0) or 0)
        hk2sz_remain = float(qt.get('hk2sz',{}).get('dayAmtRemain',0) or 0)
        total_remain = hk2sh_remain + hk2sz_remain
        max_quota = float(qt.get('hk2sh',{}).get('dayAmtThreshold',5200000) or 5200000) * 2
        used_pct = round((1 - total_remain/max_quota)*100, 1) if max_quota > 0 else 0

        if total_remain >= max_quota * 0.99:
            signal = '⚪ 非交易时段'
            is_trading = False
        elif used_pct > 30:
            signal = f'🟢 外资强烈流入(配额用{used_pct:.0f}%)'
            is_trading = True
        elif used_pct > 10:
            signal = f'🟢 外资流入(配额用{used_pct:.0f}%)'
            is_trading = True
        else:
            signal = f'⚖️ 外资小幅流入'
            is_trading = True

        return {'direction':'流入' if used_pct>0 else '--','amount':used_pct,
                'signal':signal,'isTrading':is_trading}
    except:
        return {'direction':'--','amount':0,'signal':'⚪ 非交易时段','isTrading':False}

# ─── 资金类型分类 ──────────────────────────────────────────────
MONEY_TYPE_INFO = {
    '游资':{'desc':'短期快进快出，专注情绪和题材，持仓数天','typical':['宁波系','上海游资','深圳游资'],'cap':'<200亿'},
    '公募/私募':{'desc':'持仓季度~年，基于基本面研究，资金量大','typical':['易方达','华夏','高瓴'],'cap':'全市值'},
    '北向资金':{'desc':'沪深港通渠道，国际机构对A股核心资产的判断','typical':['外资机构'],'cap':'>500亿为主'},
    '国家队':{'desc':'汇金/社保/央企，市场恐慌时托底，长期配置','typical':['汇金','社保基金','央企'],'cap':'大盘蓝筹'},
}

def classify_money_type(code):
    """根据股票特征判断主要资金类型"""
    if code.startswith('601') or code in ['600036','600028','601398','601939']:
        return ['公募/私募','北向资金','国家队']
    if code.startswith('600') or code.startswith('000'):
        return ['公募/私募','北向资金']
    if code.startswith('300') or code.startswith('301'):
        return ['游资']  # 创业板，公募较少
    if code.startswith('688'):
        return ['游资','公募/私募']  # 科创板
    return ['公募/私募']


# ─── 中小盘涨幅榜 100亿-1000亿 ────────────────────────────────────────────
INDUSTRY_DESC = {
    '银行': '银行存贷款及金融服务，受益于利差扩张与信贷增长',
    '证券': '证券经纪、投行及自营业务，与市场交投活跃度高度相关',
    '保险': '寿险/财险承保与投资，受利率环境和赔付率影响',
    '房地产': '住宅开发与物业管理，关注销售回款与融资成本',
    '建筑材料': '水泥、玻璃、石材等基建上游，受地产与基建投资拉动',
    '建筑装饰': '基础设施施工与室内装修，受政府投资周期驱动',
    '钢铁': '碳钢/特钢冶炼，关注铁矿石价格与下游需求',
    '有色金属': '铜铝锂等金属采选冶炼，受大宗商品价格与新能源需求影响',
    '化工': '基础化学品与精细化工，原料价格与下游景气共同决定盈利',
    '采掘': '煤炭石油天然气开采，能源价格敏感型',
    '电气设备': '输配电设备与工控系统，受电网投资与工业自动化拉动',
    '机械设备': '通用/专用机械制造，工业景气与出口订单是核心驱动',
    '国防军工': '航空航天、军船、军电子等，受国防预算与装备换代驱动',
    '汽车': '整车与零部件，关注新能源渗透率与出口竞争力',
    '家用电器': '白电黑电小家电，内需消费与出口双轮驱动',
    '轻工制造': '家具造纸印刷等，受地产后周期与出口影响',
    '纺织服装': '服装鞋帽家纺，品牌溢价与原材料成本是关键',
    '农林牧渔': '种植养殖及农资，受猪周期与粮价波动驱动',
    '食品饮料': '白酒、食品、调味品，消费升级与渠道变革是主线',
    '商业贸易': '零售、批发、电商，受社会消费品零售总额驱动',
    '休闲服务': '酒店旅游影视，出行恢复与消费意愿是核心逻辑',
    '医药生物': '创新药、仿制药、器械、CXO，受医保政策与研发管线影响',
    '电子': '半导体、消费电子、面板，AI/手机/汽车电子是增长主驱动',
    '计算机': '软件、IT服务、云计算，政策支持与数字化转型是主线',
    '通信': '运营商、设备商、光通信，5G/算力网络建设驱动增长',
    '传媒': '游戏、广告、影视，AI内容与出海是当前核心题材',
    '公用事业': '电力、水务、燃气，受监管定价与能源转型影响',
    '交通运输': '航运、铁路、机场，货量与运价是核心变量',
    '综合': '多元化业务集团，估值折价常见',
}

def fetch_midcap_gainers():
    """获取市值100亿-1000亿 A股涨幅TOP20，含1d/3d/7d + 上涨原因"""
    try:
        r = req('https://push2.eastmoney.com/api/qt/clist/get', {
            'pn': 1, 'pz': 800, 'po': 1, 'np': 1,
            'ut': 'bd1d9ddb04089700cf9c27f6f7426281',
            'fltt': 2, 'invt': 2, 'fid': 'f3',
            'fs': 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23',
            'fields': 'f2,f3,f5,f6,f8,f9,f12,f14,f20,f100',
        })
        raw = r.json().get('data', {}).get('diff', []) or []
    except:
        return {}

    LOWER, UPPER = 10_000_000_000, 100_000_000_000
    candidates = []
    for s in raw:
        cap = s.get('f20') or 0
        if not (LOWER <= cap <= UPPER):
            continue
        chg1d = s.get('f3') or 0
        if chg1d <= 0:
            continue
        industry = s.get('f100') or '其他'
        c = {
            'code': str(s.get('f12', '')).zfill(6),
            'name': s.get('f14', ''),
            'price': round(s.get('f2') or 0, 2),
            'chg1d': round(chg1d, 2),
            'chg3d': None,
            'chg7d': None,
            'marketCapB': round(cap / 1e8, 1),
            'industry': industry,
            'desc': INDUSTRY_DESC.get(industry, f'{industry}行业上市公司'),
            'turnover': round(s.get('f8') or 0, 2),
            'pe': round(s.get('f9') or 0, 1),
        }
        c['reason'] = gen_rise_reason(c)
        candidates.append(c)

    # 取前100候选，用东财K线API补充3d/7d（更稳定）
    candidates.sort(key=lambda x: x['chg1d'], reverse=True)
    pool = candidates[:100]
    pool_codes = [c['code'] for c in pool]
    klines = fetch_klines_em(pool_codes, days=12)

    code_map = {c['code']: c for c in pool}
    for code, kl in klines.items():
        c = code_map.get(code)
        if not c:
            continue
        closes = [k['close'] for k in kl]
        if len(closes) >= 4 and closes[-4]:
            c['chg3d'] = round((closes[-1] - closes[-4]) / closes[-4] * 100, 2)
        if len(closes) >= 8 and closes[-8]:
            c['chg7d'] = round((closes[-1] - closes[-8]) / closes[-8] * 100, 2)

    result = {}
    for tf, key in [('1d', 'chg1d'), ('3d', 'chg3d'), ('7d', 'chg7d')]:
        valid = [c for c in pool if c.get(key) is not None]
        valid.sort(key=lambda x: x[key], reverse=True)
        result[tf] = valid[:20]
    return result


CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.institutional_cache.json')

def main():
    codes = sys.argv[1].split(',') if len(sys.argv)>1 else ['000725','600036']
    result = analyze_institutional(codes)

    # If live data empty, try cache
    if not result.get('stocks'):
        try:
            with open(CACHE_FILE) as f:
                cached = json.load(f)
            # Update only the timestamp, keep cached data
            result = cached
            result['updatedAt'] = time.strftime('%Y-%m-%d %H:%M:%S') + ' (缓存)'
            result['fromCache'] = True
        except:
            pass

    # Save to cache if we got live data
    if result.get('stocks') and not result.get('fromCache'):
        try:
            with open(CACHE_FILE, 'w') as f:
                json.dump(result, f)
        except:
            pass
    # Add north-bound + money types
    try: result['northBound'] = fetch_north_bound()
    except: result['northBound'] = {'direction':'未知','amount':0,'recent':[],'signal':'❌'}
    result['moneyTypes'] = MONEY_TYPE_INFO

    # ── 行业分析用全量数据 ──
    all_codes = list(sector_map.keys())
    all_result = analyze_institutional(all_codes) if set(all_codes) != set(codes) else result

    result['breadth'] = all_result.get('breadth', result.get('breadth', {}))

    # ── 多周期 sectorHeat: 1d / 3d / 7d ──
    heat_1d = all_result.get('sectorHeat', [])

    # 用东财K线API（更稳定）抓多日数据
    name_map = {s['code']: s['name'] for s in all_result.get('stocks', [])}
    all_klines = fetch_klines_em(all_codes, days=12)

    def build_sector_heat_tf(days):
        sec_agg = {}
        covered = 0
        for code in all_codes:
            sec = sector_map.get(code, '其他')
            kl = all_klines.get(code, [])
            closes = [k['close'] for k in kl]
            if len(closes) < days + 1:
                continue
            covered += 1
            prev = closes[-days - 1]
            cur = closes[-1]
            chg = (cur - prev) / prev * 100 if prev else 0
            vols = [k.get('volume', 0) for k in kl[-days:]]
            avg_vol = sum(vols) / max(len(vols), 1)
            est_flow = round((avg_vol * cur * 0.3 / 1e8) * (1 if chg > 0 else -1) * min(abs(chg) / 5, 1), 1)
            if sec not in sec_agg:
                sec_agg[sec] = {'flow': 0, 'stocks': []}
            sec_agg[sec]['flow'] += est_flow
            sec_agg[sec]['stocks'].append({'code': code, 'name': name_map.get(code, code), 'flow': est_flow, 'chg': round(chg, 2)})

        # 如果K线数据不足（限速），fallback到1d数据
        if covered < len(all_codes) // 2:
            return heat_1d

        sector_list = []
        for sec, agg in sec_agg.items():
            total_flow = round(agg['flow'], 1)
            score = round(min(5, max(-5, total_flow / max(1, len(agg['stocks'])) * 2)), 1)
            stocks = agg['stocks']
            top3 = sorted([s for s in stocks if s['flow'] > 0], key=lambda x: x['flow'], reverse=True)[:3]
            outflow3 = sorted([s for s in stocks if s['flow'] < 0], key=lambda x: x['flow'])[:3]
            sector_list.append({'name': sec, 'score': score, 'flow': total_flow,
                                'accum': 0, 'markup': 0, 'dist': 0,
                                'top3': top3, 'outflow3': outflow3})
        sector_list.sort(key=lambda x: x['score'], reverse=True)
        return sector_list

    result['sectorHeat'] = {
        '1d': heat_1d,
        '3d': build_sector_heat_tf(3),
        '7d': build_sector_heat_tf(7),
    }

    try: result['midcapGainers'] = fetch_midcap_gainers()
    except: result['midcapGainers'] = {}
    print(json.dumps(result, ensure_ascii=False))

if __name__=='__main__': main()
