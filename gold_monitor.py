#!/usr/bin/env python3
"""
Gold Price Monitor v2 — 金价监控 + 波段交易信号 + 微信推送

功能:
  1. 每5分钟获取国际金价，换算人民币/克
  2. 跌破预警: 阶梯式推送 (970/922/873/776/679/582)
  3. 交易信号: 买入区/卖出区/止损 自动推送

Usage:
    python3 gold_monitor.py --token YOUR_PUSHPLUS_TOKEN
    python3 gold_monitor.py --once --token TOKEN  # 单次查看
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

import requests

# ---- Config ----
GOLD_API_URLS = [
    "https://api.gold-api.com/price/XAU",
    "https://www.goldapi.io/api/XAU/USD",
]
FOREX_API_URLS = [
    "https://open.er-api.com/v6/latest/USD",
    "http://api.exchangerate.host/latest?base=USD",
]
PUSHPLUS_URL = "https://www.pushplus.plus/send"
GRAMS_PER_TROY_OZ = 31.1035
MAX_RETRIES = 3
RETRY_DELAY = 5

STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".gold_monitor_state.json")

# ---- 预警阈值 ----
CRASH_THRESHOLD = 970  # 基准
CRASH_TIERS = [0, 5, 10, 20, 30, 40]  # 跌幅%

# ---- 波段交易信号 ----
# (最低价, 最高价, 信号名称, 图标, 操作建议)
TRADING_SIGNALS = [
    # 买入区
    (960, 975, "BUY_HEAVY", "🟢", "重仓买入 70% — 52周中轴+下轨共振，强支撑"),
    (975, 980, "BUY_LIGHT", "🔵", "轻仓试多 30% — 接近支撑区，小仓试探"),
    # 卖出区
    (998, 1010, "SELL_HALF", "🟡", "减仓 50% 锁利 — 阻力区，先落袋一半"),
    (1010, 1020, "SELL_ALL",  "🔴", "全部清仓 — 上轨附近，波段结束"),
    # 止损
    (0,    945,  "STOP_LOSS","⛔", "止损离场！跌破 ¥945 结构破坏，立即退出"),
]


def fetch_with_retry(url, timeout=15, max_retries=MAX_RETRIES):
    last_error = None
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, timeout=timeout)
            resp.raise_for_status()
            return resp
        except (requests.exceptions.SSLError,
                requests.exceptions.ConnectionError,
                requests.exceptions.Timeout) as e:
            last_error = e
            if attempt < max_retries - 1:
                time.sleep(RETRY_DELAY)
    raise last_error


def fetch_gold_price_usd():
    for url in GOLD_API_URLS:
        try:
            resp = fetch_with_retry(url)
            data = resp.json()
            price = data.get("price") or data.get("spot_price")
            if price:
                return float(price)
        except Exception as e:
            print(f"  [WARN] Gold API {url}: {e}")
            continue
    raise RuntimeError("All gold price APIs failed")


def fetch_usd_cny():
    for url in FOREX_API_URLS:
        try:
            resp = fetch_with_retry(url)
            data = resp.json()
            rate = data.get("rates", {}).get("CNY")
            if rate:
                return float(rate)
        except Exception as e:
            print(f"  [WARN] Forex API {url}: {e}")
            continue
    raise RuntimeError("All forex APIs failed")


def send_pushplus(token, title, content):
    payload = {"token": token, "title": title, "content": content, "template": "html"}
    resp = requests.post(PUSHPLUS_URL, json=payload, timeout=15)
    resp.raise_for_status()
    result = resp.json()
    if result.get("code") != 200:
        raise RuntimeError(f"PushPlus error: {result}")
    return result


def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {
        "fired_crash_tiers": [],
        "fired_trade_signals": [],
        "last_price": None,
        "last_signal_time": None,
    }


def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)


def check_crash_tiers(price, state):
    """返回 [(级别, 阈值, 跌幅%), ...]"""
    triggered = []
    for tier in range(len(CRASH_TIERS)):
        t = CRASH_THRESHOLD * (1 - CRASH_TIERS[tier] / 100)
        if price < t and tier not in state.get("fired_crash_tiers", []):
            triggered.append((tier, t, CRASH_TIERS[tier]))
    return triggered


def check_trade_signals(price, state):
    """
    返回 (signal_name, icon, advice, zone_low, zone_high)
    只有当价格刚进入新区间且上次信号不同时才触发。
    """
    fired = state.get("fired_trade_signals", [])
    for low, high, name, icon, advice in TRADING_SIGNALS:
        if low <= price < high:
            if name not in fired:
                return (name, icon, advice, low, high)
            return None  # 已推送过，不重复
    # 价格不在任何信号区间内 → 清除所有交易信号，允许下次重新触发
    if fired:
        state["fired_trade_signals"] = []
    return None


def build_trade_signal_card(name, icon, advice, low, high, price, gold_usd, usd_cny, now_str):
    """构建交易信号推送卡片."""
    if "BUY" in name:
        color = "#22c55e"
        title_emoji = icon
    elif "SELL" in name:
        color = "#ef4444"
        title_emoji = icon
    else:
        color = "#000000"
        title_emoji = icon

    zone_label = f"¥{low:.0f} – ¥{high:.0f}/g" if low > 0 else f"< ¥{high:.0f}/g"

    return f"""
    <h3>{title_emoji} 波段交易信号 — {advice.split('—')[0].strip()}</h3>
    <p style="font-size:16px">{advice.split('—')[1].strip() if '—' in advice else advice}</p>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse">
        <tr><td><b>当前金价</b></td><td style="color:{color};font-size:22px"><b>¥{price:.2f}/g</b></td></tr>
        <tr><td><b>美元/盎司</b></td><td>${gold_usd:.2f}</td></tr>
        <tr><td><b>USD/CNY</b></td><td>{usd_cny:.4f}</td></tr>
        <tr><td><b>信号区间</b></td><td>{zone_label}</td></tr>
        <tr><td><b>操作</b></td><td style="color:{color};font-size:16px"><b>{advice}</b></td></tr>
        <tr><td><b>时间</b></td><td>{now_str}</td></tr>
    </table>
    <p style="color:#888"><i>— Gold Trading Bot</i></p>
    """


def build_crash_alert_card(tier_num, tier_price, drop_pct, next_threshold, next_drop,
                           price, gold_usd, usd_cny, now_str):
    """构建暴跌预警卡片."""
    next_info = ""
    if next_threshold:
        next_info = f"<tr><td><b>下一级预警</b></td><td>¥{next_threshold:.0f}/g（-{next_drop}%）</td></tr>"

    return f"""
    <h3>⚠️ 金价预警 — 第{tier_num+1}级（-{drop_pct}%）</h3>
    <p>金价已跌破 ¥{tier_price:.0f}/g</p>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse">
        <tr><td><b>人民币/克</b></td><td style="color:red;font-size:22px"><b>¥{price:.2f}</b></td></tr>
        <tr><td><b>美元/盎司</b></td><td>${gold_usd:.2f}</td></tr>
        <tr><td><b>USD/CNY</b></td><td>{usd_cny:.4f}</td></tr>
        <tr><td><b>触发阈值</b></td><td>¥{tier_price:.0f}/g</td></tr>
        <tr><td><b>累计跌幅</b></td><td style="color:red">-{drop_pct}%</td></tr>
        {next_info}
        <tr><td><b>时间</b></td><td>{now_str}</td></tr>
    </table>
    <p style="color:#888"><i>— Gold Monitor Bot</i></p>
    """


def main():
    parser = argparse.ArgumentParser(description="Gold Monitor v2 — 金价监控+交易信号")
    parser.add_argument("--token", type=str, default=os.environ.get("PUSHPLUS_TOKEN"),
                        help="PushPlus token")
    parser.add_argument("--once", action="store_true",
                        help="单次查看，不保存状态")
    args = parser.parse_args()

    if not args.token:
        print("ERROR: PushPlus token required. Use --token or set PUSHPLUS_TOKEN env var.")
        sys.exit(1)

    try:
        gold_usd = fetch_gold_price_usd()
        usd_cny = fetch_usd_cny()
        price = (gold_usd * usd_cny) / GRAMS_PER_TROY_OZ

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{now_str}] Gold: ${gold_usd:.2f}/oz | USD/CNY: {usd_cny:.4f} | RMB: ¥{price:.2f}/g")

        if args.once:
            print(f"\n  预警基准: ¥{CRASH_THRESHOLD}/g")
            for i, drop in enumerate(CRASH_TIERS):
                t = CRASH_THRESHOLD * (1 - drop/100)
                print(f"    Tier {i}: ¥{t:.0f}/g (-{drop}%)")
            print(f"\n  交易信号区间:")
            for low, high, name, icon, advice in TRADING_SIGNALS:
                zone = f"¥{low:.0f}-¥{high:.0f}/g" if low > 0 else f"< ¥{high:.0f}/g"
                print(f"    {icon} {zone}: {name} → {advice}")
            return

        state = load_state()
        state["last_price"] = price
        updated = False

        # ---- 1. 交易信号检查 (优先级更高) ----
        trade = check_trade_signals(price, state)
        if trade:
            name, icon, advice, low, high = trade
            content = build_trade_signal_card(name, icon, advice, low, high,
                                              price, gold_usd, usd_cny, now_str)
            short_advice = advice.split('—')[0].strip()
            send_pushplus(args.token,
                f"{icon} 金价交易信号 | ¥{price:.2f}/g | {short_advice}",
                content)
            state["fired_trade_signals"].append(name)
            state["last_signal_time"] = now_str
            # 买入信号出现 → 重置卖出信号; 卖出信号出现 → 重置买入信号
            if "BUY" in name:
                for s in ["SELL_HALF", "SELL_ALL"]:
                    if s in state["fired_trade_signals"]:
                        state["fired_trade_signals"].remove(s)
            elif "SELL" in name:
                for s in ["BUY_LIGHT", "BUY_HEAVY"]:
                    if s in state["fired_trade_signals"]:
                        state["fired_trade_signals"].remove(s)
            updated = True
            print(f"  → Trade signal: {name}")

        # ---- 2. 暴跌预警检查 ----
        crash_trig = check_crash_tiers(price, state)
        if crash_trig:
            for tier_num, tier_price, drop_pct in crash_trig:
                next_t = tier_num + 1
                nt_val = None
                nd_val = None
                if next_t < len(CRASH_TIERS):
                    nt_val = CRASH_THRESHOLD * (1 - CRASH_TIERS[next_t] / 100)
                    nd_val = CRASH_TIERS[next_t]

                content = build_crash_alert_card(tier_num, tier_price, drop_pct,
                                                 nt_val, nd_val,
                                                 price, gold_usd, usd_cny, now_str)
                send_pushplus(args.token,
                    f"🚨 金价第{tier_num+1}级预警！¥{price:.2f}/g（-{drop_pct}%）",
                    content)
                state["fired_crash_tiers"].append(tier_num)
                updated = True
                print(f"  → Crash alert tier {tier_num}")

        # ---- 3. 重置逻辑 ----
        # 价格回到基准以上 → 重置所有暴跌预警
        if price >= CRASH_THRESHOLD and state.get("fired_crash_tiers"):
            print(f"  → Price recovered — resetting crash tiers")
            state["fired_crash_tiers"] = []
            updated = True

        # 价格离开所有交易信号区间 → 不重置(已在 check_trade_signals 中处理)

        if not crash_trig and not trade:
            status_parts = []
            # 找到当前所在区间
            for low, high, name, icon, advice in TRADING_SIGNALS:
                if low <= price < high:
                    status_parts.append(f"当前: {icon} {name}")
                    break
            if not status_parts:
                between_sell = price >= 980 and price < 998
                if between_sell:
                    status_parts.append("当前: 中性区 (观望)")
                else:
                    status_parts.append("当前: 无信号区间")
            status_parts.append(f"预警: {'活跃' if state.get('fired_crash_tiers') else '正常'}")
            print(f"  → {' | '.join(status_parts)}")

        if updated:
            save_state(state)

    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
