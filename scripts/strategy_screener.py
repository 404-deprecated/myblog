#!/usr/bin/env python3
"""A股短线/中线策略筛选器 — 匹配涨停打板/政策炒作/均线趋势等策略"""
import json, os, sys, time
for k in list(os.environ.keys()):
    if 'proxy' in k.lower(): del os.environ[k]
import requests

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

def req(url, params=None, referer='https://quote.eastmoney.com/'):
    for i in range(3):
        try:
            return requests.get(url, params=params,
                headers={'User-Agent':UA,'Referer':referer},
                timeout=15, proxies={'http':None,'https':None})
        except: time.sleep(1.5)
    raise RuntimeError(f"Failed: {url}")

def fetch_sina_quotes(codes):
    results = {}
    for batch_start in range(0, len(codes), 20):
        batch = codes[batch_start:batch_start+20]
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
        except Exception as e:
            print(f"[WARN] sina batch failed: {e}", file=sys.stderr)
        if batch_start + 20 < len(codes): time.sleep(0.3)
    return results

def fetch_daily(codes, days=30):
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
        except Exception as e:
            results[code] = []
            print(f"[WARN] daily {code}: {e}", file=sys.stderr)
        time.sleep(0.2)
    return results

def screen_strategies(codes):
    quotes = fetch_sina_quotes(codes)
    dailies = fetch_daily(codes, 30)

    results = []
    for code in codes:
        q = quotes.get(code)
        if not q: continue
        kl = dailies.get(code, [])
        if len(kl) < 5: continue

        price = q['price']; preclose = q['preClose']
        pct = (price - preclose) / preclose * 100 if preclose > 0 else 0
        high = q['high']; low = q['low']; vol = q['volume']; amt = q['amount']

        closes = [k['close'] for k in kl]
        volumes = [k['volume'] for k in kl]
        highs = [k['high'] for k in kl]

        ma5 = sum(closes[-5:]) / 5
        ma10 = sum(closes[-10:]) / 10 if len(closes) >= 10 else ma5
        ma20 = sum(closes[-20:]) / 20 if len(closes) >= 20 else ma5
        ma60 = sum(closes[-60:]) / 60 if len(closes) >= 60 else None

        vol5 = sum(volumes[-6:-1]) / 5 if len(volumes) >= 6 else vol
        vol_ratio = vol / vol5 if vol5 > 0 else 1
        turnover_est = vol / 100  # rough estimate

        # RSI 6
        gains = sum(max(closes[i]-closes[i-1],0) for i in range(len(closes)-6, len(closes)))
        losses = sum(max(closes[i-1]-closes[i],0) for i in range(len(closes)-6, len(closes)))
        rsi6 = 100 - 100/(1+gains/losses) if losses > 0 else 100

        # MACD
        e12=e26=closes[0]; difs=[]
        for p in closes: e12=p*2/13+e12*11/13; e26=p*2/27+e26*25/27; difs.append(e12-e26)
        dea=difs[0]
        for d in difs: dea=d*2/10+dea*8/10
        macd_signal = 'golden' if difs[-1] > dea else 'dead'

        # Upper shadow
        upper_shadow = (high - price) / price * 100 if price > 0 else 0
        day_amplitude = (high - low) / preclose * 100 if preclose > 0 else 0

        strategies = []

        # ── 策略1: 涨停板打板 ──
        is_st = 'ST' in q.get('name','') or '*ST' in q.get('name','')
        ban_score = 0
        ban_signals = []
        if not is_st: ban_score += 10; ban_signals.append('非ST')
        if amt > 5e8: ban_score += 15; ban_signals.append(f'成交{amt/1e8:.0f}亿')
        if vol_ratio >= 1.5: ban_score += 20; ban_signals.append(f'量比{vol_ratio:.1f}')
        if 5 <= turnover_est <= 20: ban_score += 10; ban_signals.append(f'换手{turnover_est:.0f}%')
        if pct >= 9.5: ban_score += 30; ban_signals.append('涨停!')
        elif 5 <= pct < 9.5: ban_score += 15; ban_signals.append(f'强势+{pct:.1f}%')
        if pct >= 3 and vol_ratio >= 1.2 and rsi6 < 80: ban_score += 15; ban_signals.append('量价健康')
        if upper_shadow < 2 and pct > 0: ban_score += 10; ban_signals.append('无长上影')
        strategies.append({'name':'涨停打板','score':min(100,ban_score),'signals':ban_signals,'match':ban_score>=50})

        # ── 策略2: 均线趋势 ──
        trend_score = 0
        trend_signals = []
        if ma60 and price > ma5 > ma20 > ma60: trend_score += 30; trend_signals.append('完美多头排列')
        elif price > ma5 > ma20: trend_score += 20; trend_signals.append('短期多头')
        elif price > ma20: trend_score += 10; trend_signals.append('站上MA20')
        else: trend_score -= 10; trend_signals.append('破MA20')
        if ma60 and abs(price - ma20) / ma20 < 0.03: trend_score += 15; trend_signals.append('回踩MA20附近(买点)')
        if macd_signal == 'golden': trend_score += 15; trend_signals.append('MACD金叉')
        if rsi6 < 70 and rsi6 > 30: trend_score += 10; trend_signals.append('RSI中性')
        elif rsi6 < 30: trend_score += 15; trend_signals.append('RSI超卖反弹')
        if vol_ratio > 0.8: trend_score += 5
        strategies.append({'name':'均线趋势','score':min(100,trend_score+30),'signals':trend_signals,'match':trend_score>=40})

        # ── 策略3: 板块轮动(简化: 量价+资金方向) ──
        rotate_score = 0
        rotate_signals = []
        if pct > 2 and vol_ratio > 1.2: rotate_score += 25; rotate_signals.append('放量上涨')
        if ma5 > ma20: rotate_score += 15; rotate_signals.append('短均线上')
        if len(closes) >= 10:
            chg5 = (closes[-1] - closes[-6]) / closes[-6] * 100
            if 3 < chg5 < 15: rotate_score += 20; rotate_signals.append(f'5日+{chg5:.0f}%')
        if rsi6 > 50: rotate_score += 10; rotate_signals.append('RSI偏强')
        if amt > 10e8: rotate_score += 15; rotate_signals.append(f'成交活跃')
        strategies.append({'name':'板块轮动','score':min(100,rotate_score+20),'signals':rotate_signals,'match':rotate_score>=50})

        # ── 策略4: 波动做T ──
        swing_score = 0
        swing_signals = []
        if day_amplitude > 3: swing_score += 25; swing_signals.append(f'振幅{day_amplitude:.1f}%')
        if amt > 10e8: swing_score += 20; swing_signals.append('流动性好')
        if price < 30: swing_score += 20; swing_signals.append(f'低价¥{price:.1f}')
        elif price < 60: swing_score += 10
        if rsi6 < 70: swing_score += 10
        if vol_ratio > 0.8: swing_score += 5
        strategies.append({'name':'波动做T','score':min(100,swing_score+15),'signals':swing_signals,'match':swing_score>=45})

        best_strat = max(strategies, key=lambda x: x['score'])

        results.append({
            'code':code,'name':q['name'],'price':price,'changePct':round(pct,2),
            'amount':amt,'volRatio':round(vol_ratio,2),'rsi6':round(rsi6,1),
            'ma5':round(ma5,2),'ma20':round(ma20,2),
            'trendUp':price > ma5 > ma20,
            'macd':macd_signal,'amplitude':round(day_amplitude,1),
            'strategies':strategies,
            'bestStrategy':best_strat['name'],'bestScore':best_strat['score'],
        })

    return results

def main():
    codes = sys.argv[1].split(',') if len(sys.argv) > 1 else ['000725','600036']
    result = screen_strategies(codes)
    print(json.dumps(result, ensure_ascii=False))

if __name__ == '__main__':
    main()
