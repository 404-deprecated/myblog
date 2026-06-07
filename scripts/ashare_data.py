#!/usr/bin/env python3
"""
A股实时行情数据服务 — 新浪财经(主) + 东方财富(日线)
Usage:
  python3 ashare_data.py quote 600036,002142
  python3 ashare_data.py all 600036,002142,000725
  python3 ashare_data.py index 000001,399001
"""

import json, os, sys, time, re

# Keep proxy for international sites, bypass for Chinese financial data
os.environ['no_proxy'] = 'sina.com.cn,sinajs.cn,eastmoney.com,*.eastmoney.com,*.sina.com.cn,*.sinajs.cn'

import requests

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

def req(url, params=None, referer='https://finance.sina.com.cn'):
    for i in range(3):
        try:
            return requests.get(url, params=params,
                headers={'User-Agent': UA, 'Referer': referer}, timeout=15)
        except Exception as e:
            if i == 2: raise e
            time.sleep(1.5)

# ─── Sina Finance (主数据源: 实时行情+盘口) ──────────────────────────

def fetch_quote_sina(codes):
    """新浪财经实时行情 (含5档盘口)"""
    symbols = []
    for c in codes:
        if c.startswith('6'): symbols.append(f'sh{c}')
        elif c.startswith('0') or c.startswith('3'): symbols.append(f'sz{c}')
        else: symbols.append(f'sh{c}')

    url = 'https://hq.sinajs.cn/list=' + ','.join(symbols)
    r = req(url, referer='https://finance.sina.com.cn')
    # sina returns GBK
    text = r.content.decode('gbk')

    results = []
    for line in text.strip().split('\n'):
        if '=' not in line: continue
        parts = line.split('"')[1].split(',')
        if len(parts) < 30: continue
        code = symbols[len(results)]
        code_clean = code[2:]  # remove sh/sz prefix
        results.append({
            'code': code_clean,
            'name': parts[0],
            'open': float(parts[1]) if parts[1] else 0,
            'preClose': float(parts[2]) if parts[2] else 0,
            'price': float(parts[3]) if parts[3] else 0,
            'high': float(parts[4]) if parts[4] else 0,
            'low': float(parts[5]) if parts[5] else 0,
            'volume': int(float(parts[8])) if parts[8] else 0,  # 手
            'amount': float(parts[9]) if parts[9] else 0,        # 元
            'date': parts[30] if len(parts) > 30 else '',
            'time': parts[31] if len(parts) > 31 else '',
            # 5档买卖盘口
            'bid': [
                {'price': float(parts[11]), 'vol': int(float(parts[10]))},
                {'price': float(parts[13]), 'vol': int(float(parts[12]))},
                {'price': float(parts[15]), 'vol': int(float(parts[14]))},
                {'price': float(parts[17]), 'vol': int(float(parts[16]))},
                {'price': float(parts[19]), 'vol': int(float(parts[18]))},
            ] if len(parts) > 20 else [],
            'ask': [
                {'price': float(parts[21]), 'vol': int(float(parts[20]))},
                {'price': float(parts[23]), 'vol': int(float(parts[22]))},
                {'price': float(parts[25]), 'vol': int(float(parts[24]))},
                {'price': float(parts[27]), 'vol': int(float(parts[26]))},
                {'price': float(parts[29]), 'vol': int(float(parts[28]))},
            ] if len(parts) > 29 else [],
            'source': 'sina',
        })

    # Compute change
    for r in results:
        if r['preClose'] and r['preClose'] > 0:
            r['change'] = round(r['price'] - r['preClose'], 2)
            r['changePct'] = round((r['price'] - r['preClose']) / r['preClose'] * 100, 2)
        else:
            r['change'] = 0; r['changePct'] = 0
    return results


# ─── 日线K线 (新浪主 + 东方财富备) ──────────────────────────────

def fetch_daily(codes, days=60):
    """日线K线：新浪(scale=240日线)为主，东方财富为备"""
    results = {}
    for code in codes:
        klines = []
        # Try Sina daily first (scale=240 = daily)
        try:
            prefix = 'sh' if code.startswith('6') else 'sz'
            r = req(f'https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol={prefix}{code}&scale=240&ma=no&datalen={days}',
                    referer='https://finance.sina.com.cn')
            data = json.loads(r.text)
            for item in data:
                klines.append({
                    'date': item.get('day', ''),
                    'open': float(item.get('open', 0)),
                    'close': float(item.get('close', 0)),
                    'high': float(item.get('high', 0)),
                    'low': float(item.get('low', 0)),
                    'volume': float(item.get('volume', 0)),
                    'amount': 0, 'changePct': 0, 'turnover': 0,
                })
            results[code] = [k for k in klines if k['close'] > 0][-days:]
        except Exception:
            # Fallback to eastmoney
            try:
                secid = f'1.{code}' if code.startswith('6') else f'0.{code}'
                r = req('https://push2his.eastmoney.com/api/qt/stock/kline/get', {
                    'secid': secid, 'klt': '101', 'fqt': '1',
                    'fields1': 'f1,f2,f3,f4,f5,f6',
                    'fields2': 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
                    'end': '20500101', 'lmt': days})
                data = r.json()
                for line in (data.get('data', {}).get('klines') or []):
                    p = line.split(',')
                    klines.append({
                        'date': p[0], 'open': float(p[1]), 'close': float(p[2]),
                        'high': float(p[3]), 'low': float(p[4]),
                        'volume': float(p[5]), 'amount': float(p[6]),
                        'changePct': float(p[8]) if len(p) > 8 else 0,
                        'turnover': float(p[10]) if len(p) > 10 else 0,
                    })
                results[code] = klines
            except Exception as e2:
                results[code] = []
                print(f'[WARN] daily {code}: sina+em both failed', file=sys.stderr)
        time.sleep(0.3)
    return results


# ─── 资金流向 (东方财富 — 单次请求不触发限流) ──────────────────────

def fetch_fundflow(codes):
    """获取主力资金流向"""
    results = {}
    for code in codes:
        try:
            secid = f'1.{code}' if code.startswith('6') else f'0.{code}'
            r = req('https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get', {
                'secid': secid, 'fields1': 'f1,f2,f3,f7',
                'fields2': 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65',
                'lmt': 5, 'klt': '101'})
            data = r.json()
            daily = []
            for line in (data.get('data', {}).get('klines') or []):
                p = line.split(',')
                daily.append({
                    'date': p[0],
                    'mainNetInflow': float(p[1]) / 1e8 if p[1] else 0,   # 主力净流入(亿)
                    'superLargeNet': float(p[3]) / 1e8 if len(p) > 3 and p[3] else 0,  # 超大单(亿)
                    'largeNet': float(p[5]) / 1e8 if len(p) > 5 and p[5] else 0,       # 大单(亿)
                    'mediumNet': float(p[7]) / 1e8 if len(p) > 7 and p[7] else 0,     # 中单(亿)
                    'smallNet': float(p[9]) / 1e8 if len(p) > 9 and p[9] else 0,       # 小单(亿)
                })
            results[code] = daily
        except Exception as e:
            results[code] = []
    return results


def fetch_index_sina(codes):
    """新浪指数行情"""
    symbols = []
    for c in codes:
        prefix = 's_sh' if c.startswith('0') else 's_sz'
        symbols.append(f'{prefix}{c}')
    url = 'https://hq.sinajs.cn/list=' + ','.join(symbols)
    r = req(url, referer='https://finance.sina.com.cn')
    text = r.content.decode('gbk')
    results = []
    for i, line in enumerate(text.strip().split('\n')):
        if '=' not in line: continue
        parts = line.split('"')[1].split(',')
        if len(parts) < 5: continue
        price = float(parts[1]) if parts[1] else 0
        chg_pct = float(parts[3]) if len(parts) > 3 and parts[3] else 0
        raw_code = codes[i] if i < len(codes) else ''
        results.append({
            'code': raw_code,
            'name': parts[0],
            'price': price,
            'change': float(parts[2]) if parts[2] else 0,
            'changePct': chg_pct,
            'volume': float(parts[4]) if len(parts) > 4 and parts[4] else 0,
            'amount': float(parts[5]) if len(parts) > 5 and parts[5] else 0,
            'source': 'sina',
        })
    return results


# ─── 技术指标 ──────────────────────────────────────────────────────

def compute_indicators(klines):
    if len(klines) < 20: return {}
    c = [k['close'] for k in klines]
    h = [k['high'] for k in klines]
    l = [k['low'] for k in klines]
    n = len(c)
    # RSI 14
    g = sum(max(c[i]-c[i-1],0) for i in range(n-14,n))
    loss = sum(max(c[i-1]-c[i],0) for i in range(n-14,n))
    rsi = round(100 - 100/(1+g/loss), 1) if loss > 0 else 100
    # MACD 12/26/9
    e12 = e26 = c[0]; difs = []
    for p in c: e12=p*2/13+e12*11/13; e26=p*2/27+e26*25/27; difs.append(e12-e26)
    dea = difs[0]
    for d in difs: dea = d*2/10+dea*8/10
    macd_hist = round((difs[-1] - dea) * 2, 3)
    # MA
    ma5 = round(sum(c[-5:])/5, 2) if n>=5 else c[-1]
    ma10 = round(sum(c[-10:])/10, 2) if n>=10 else c[-1]
    ma20 = round(sum(c[-20:])/20, 2) if n>=20 else c[-1]
    ma60 = round(sum(c[-60:])/60, 2) if n>=60 else c[-1]
    # KDJ 9/3/3
    h9 = max(h[-9:]); l9 = min(l[-9:])
    rsv = (c[-1]-l9)/(h9-l9)*100 if h9 != l9 else 50
    k_val = round(rsv * 1/3 + 50 * 2/3, 1)
    d_val = round(k_val * 1/3 + 50 * 2/3, 1)
    j_val = round(3*k_val - 2*d_val, 1)
    # 量比 (近5日均量 vs 前5日均量)
    vol5 = sum(k['volume'] for k in klines[-5:])/5
    vol5prev = sum(k['volume'] for k in klines[-10:-5])/5 if n>=10 else vol5
    vol_ratio = round(vol5/vol5prev, 2) if vol5prev > 0 else 1.0
    # 振幅
    amp = round((c[-1]/l9-1)*100, 1) if l9 > 0 else 0

    return {
        'rsi': rsi,
        'macd': {'dif': round(difs[-1],3), 'dea': round(dea,3), 'hist': macd_hist,
                 'signal': 'golden_cross' if difs[-1] > dea else 'dead_cross'},
        'kdj': {'k': k_val, 'd': d_val, 'j': j_val},
        'ma': {'ma5': ma5, 'ma10': ma10, 'ma20': ma20, 'ma60': ma60},
        'volRatio': vol_ratio,
        'amplitude': amp,
        'pricePosition': {
            'vsMA5': round((c[-1]/ma5-1)*100,1), 'vsMA20': round((c[-1]/ma20-1)*100,1),
            'vsMA60': round((c[-1]/ma60-1)*100,1),
        },
    }


# ─── 明日策略引擎 ──────────────────────────────────────────────────

def generate_strategy(stock):
    """基于技术指标+资金流向+盘口生成明日交易策略"""
    ind = stock.get('indicators')
    ff = stock.get('fundflow', [])
    bid = stock.get('bid', [])
    ask = stock.get('ask', [])
    price = stock.get('price', 0)
    changePct = stock.get('changePct', 0)
    preClose = stock.get('preClose', 0)

    signals = []
    risks = []
    score = 50  # neutral base

    if not ind:
        return {'signals': ['数据不足'], 'risks': [], 'score': 50, 'action': '观望', 'buyZone': '', 'sellZone': '', 'summary': '技术指标数据不足，无法生成策略'}

    macd = ind['macd']
    rsi = ind['rsi']
    kdj = ind['kdj']
    ma = ind['ma']
    pos = ind.get('pricePosition', {})
    volRatio = ind.get('volRatio', 1.0)

    # ---- 估值判断 ----
    is_above_ma60 = pos.get('vsMA60', 0) > 0
    is_below_ma20 = pos.get('vsMA20', 0) < 0
    dist_from_ma60 = abs(pos.get('vsMA60', 0))

    if pos.get('vsMA60', 0) > 20:
        signals.append('⚠️ 高于60日均线20%+，估值偏贵')
        risks.append('追高风险大')
        score -= 15
    elif pos.get('vsMA60', 0) < -15:
        signals.append('💡 低于60日均线15%+，估值偏低')
        score += 10
    elif -5 <= pos.get('vsMA60', 0) <= 5:
        signals.append('📊 价格在60日均线附近，估值合理')
        score += 5

    # ---- 趋势判断 ----
    if macd['signal'] == 'golden_cross' and macd['hist'] > 0:
        if macd['dif'] > 0:
            signals.append('📈 MACD零轴上金叉 — 强势多头')
            score += 15
        else:
            signals.append('📈 MACD零轴下金叉 — 反弹信号')
            score += 8
    elif macd['signal'] == 'dead_cross' and macd['hist'] < 0:
        if macd['dif'] < 0:
            signals.append('📉 MACD零轴下死叉 — 空头延续')
            risks.append('下跌趋势未止')
            score -= 12
        else:
            signals.append('📉 MACD零轴上死叉 — 回调信号')
            score -= 5

    # ---- RSI ----
    if rsi > 80:
        signals.append(f'🔴 RSI={rsi} 严重超买')
        risks.append('高位钝化但随时可能回调')
        score -= 8
    elif rsi > 70:
        signals.append(f'🟡 RSI={rsi} 超买区间')
        score -= 3
    elif rsi < 20:
        signals.append(f'🟢 RSI={rsi} 严重超卖，反弹概率高')
        score += 12
    elif rsi < 30:
        signals.append(f'🟢 RSI={rsi} 超卖区间')
        score += 6
    else:
        signals.append(f'➡️ RSI={rsi} 中性区间')

    # ---- KDJ ----
    j = kdj['j']
    if j > 100:
        signals.append('🔴 KDJ J值>100 极度超买')
        risks.append('KDJ高位钝化')
        score -= 5
    elif j > 80:
        signals.append('🟡 KDJ J值>80 超买')
        score -= 2
    elif j < 0:
        signals.append('🟢 KDJ J值<0 极度超卖')
        score += 8
    elif j < 20:
        signals.append('🟢 KDJ J值<20 超卖')
        score += 4

    # ---- 均线 ----
    above_ma5 = price > ma['ma5']
    above_ma20 = price > ma['ma20']
    if above_ma5 and above_ma20 and ma['ma5'] > ma['ma20']:
        signals.append('📊 多头排列 (MA5>MA20)')
        score += 8
    elif not above_ma5 and not above_ma20 and ma['ma5'] < ma['ma20']:
        signals.append('📊 空头排列 (MA5<MA20)')
        risks.append('均线空头压制')
        score -= 8

    # ---- 量能 ----
    if volRatio > 2:
        signals.append(f'📊 放量(量比{volRatio}) — 资金活跃')
        if changePct > 5:
            signals.append('  放量暴涨，注意高位换手')
            risks.append('天量天价风险')
        score += 5
    elif volRatio < 0.5:
        signals.append(f'📊 缩量(量比{volRatio}) — 交投清淡')
        score -= 3

    # ---- 资金流向 ----
    if ff and len(ff) > 0:
        today_flow = ff[-1]
        main_inflow = today_flow.get('mainNetInflow', 0)
        if main_inflow > 0.5:
            signals.append(f'💰 主力净流入 {main_inflow:.1f}亿 — 大资金看多')
            score += 10
        elif main_inflow < -0.5:
            signals.append(f'💸 主力净流出 {abs(main_inflow):.1f}亿 — 大资金撤退')
            risks.append('主力在派发')
            score -= 10
        # Super large order check
        super_large = today_flow.get('superLargeNet', 0)
        if super_large > 0.3:
            signals.append(f'🐋 超大单净流入 {super_large:.1f}亿 — 机构主导')
            score += 8
        elif super_large < -0.3:
            signals.append(f'🐋 超大单净流出 {abs(super_large):.1f}亿 — 机构减仓')
            risks.append('机构在出货')

    # ---- 盘口分析 ----
    if bid and ask and bid[0]['price'] > 0 and ask[0]['price'] > 0:
        bid_total = sum(b['vol'] for b in bid[:5])
        ask_total = sum(a['vol'] for a in ask[:5])
        if bid_total > ask_total * 2:
            signals.append('🟢 买盘显著大于卖盘 — 下方支撑强')
        elif ask_total > bid_total * 2:
            signals.append('🔴 卖盘显著大于买盘 — 上方压力大')
            risks.append('抛压重')

    # ---- 明日策略 ----
    # Determine action and price zones
    buy_zone = ''
    sell_zone = ''
    action = '观望'
    summary = ''

    if score >= 75:
        action = '🟢 偏多 — 可考虑逢低吸纳'
        if changePct > 9.5:
            summary = '涨停封板中，追板风险大。若已持仓可持有，未持仓等次日回调再考虑。'
            action = '🟡 持有观察（涨停中不追）'
        else:
            summary = '技术面多头共振+主力流入，回调至MA5附近可分批建仓。'
    elif score >= 60:
        action = '🟢 偏多 — 轻仓参与'
        summary = '多数指标偏多但有瑕疵，建议小仓位试探，严格设止损。'
    elif score >= 45:
        action = '🟡 中性 — 观望等信号'
        summary = '多空交织，方向不明确。等MACD金叉确认或放量突破再入场。'
    elif score >= 30:
        action = '🟠 偏空 — 减仓或观望'
        summary = '技术面偏弱，持币观望。若已持仓考虑减仓，等超卖信号再回补。'
    else:
        action = '🔴 偏空 — 不建议参与'
        summary = '空头信号共振，下跌风险大。建议空仓等待，等底部放量阳线确认反转。'

    # Buy/sell zone calculation
    if ma.get('ma20') and ma.get('ma60'):
        buy_zone = f"¥{min(ma['ma20'], ma['ma60']):.2f} ~ ¥{ma['ma5']:.2f}" if above_ma20 else f"¥{price*0.92:.2f} ~ ¥{price*0.97:.2f}"
        sell_zone = f"¥{ma['ma20']*1.05:.2f} ~ ¥{ma['ma20']*1.10:.2f}" if not above_ma20 else f"¥{price*1.05:.2f} ~ ¥{price*1.10:.2f}"

    # Clamp score
    score = max(0, min(100, score))

    return {
        'signals': signals,
        'risks': risks,
        'score': score,
        'action': action,
        'buyZone': buy_zone,
        'sellZone': sell_zone,
        'summary': summary,
    }


# ─── Main ──────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: ashare_data.py <cmd> [codes]'}, ensure_ascii=False))
        sys.exit(1)

    cmd = sys.argv[1]
    try:
        if cmd == 'quote':
            codes = sys.argv[2].split(',') if len(sys.argv) > 2 else []
            result = fetch_quote_sina(codes)

        elif cmd == 'index':
            codes = sys.argv[2].split(',') if len(sys.argv) > 2 else ['000001']
            result = fetch_index_sina(codes)

        elif cmd == 'all':
            codes = sys.argv[2].split(',') if len(sys.argv) > 2 else []
            # 1. Sina real-time quotes (fast)
            quotes = fetch_quote_sina(codes)
            # 2. Eastmoney daily K-line (1/sec per stock)
            dailies = fetch_daily(codes, 60)
            # 3. Eastmoney fund flow (best effort)
            fundflows = {}
            try:
                fundflows = fetch_fundflow(codes)
            except Exception as e:
                print(f'[WARN] fundflow: {e}', file=sys.stderr)
            # 4. Merge indicators + fund flow + strategy
            for q in quotes:
                cd = q['code']
                if cd in dailies and dailies[cd]:
                    q['indicators'] = compute_indicators(dailies[cd])
                    q['klines'] = dailies[cd][-30:]
                else:
                    q['indicators'] = None
                    q['klines'] = []
                if cd in fundflows and fundflows[cd]:
                    q['fundflow'] = fundflows[cd]
                else:
                    q['fundflow'] = []
                # Generate strategy
                q['strategy'] = generate_strategy(q)
            # 4. Index
            indices = fetch_index_sina(['000001', '399001', '399006'])
            result = {'stocks': quotes, 'indices': indices, 'updatedAt': time.strftime('%Y-%m-%d %H:%M:%S')}

        else:
            result = {'error': f'Unknown cmd: {cmd}'}

    except Exception as e:
        result = {'error': str(e)}

    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
