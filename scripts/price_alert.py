#!/usr/bin/env python3
"""
价格预警脚本 — 微信通知版（PushPlus）

触发条件（满足任一即报警）：
  1. 当日收盘价较近 30 个交易日最高收盘价跌幅 ≥ 10%
  2. 连续 4 个交易日收盘价环比下跌

用法：
  python scripts/price_alert.py

环境变量（在 .env.local 中设置）：
  PUSHPLUS_TOKEN=<你的 PushPlus token>

计划任务（macOS crontab）：
  # 每天美股收盘后运行（美东时间 16:30 = 北京时间次日 04:30）
  30 4 * * 2-6 cd /path/to/myblog && python scripts/price_alert.py >> /tmp/price_alert.log 2>&1
"""

import json
import os
import ssl
import sys
import urllib.request
import urllib.parse
from datetime import date, timedelta
from pathlib import Path

# macOS Python ships without bundled CA certs — use certifi if available, else skip verify
try:
    import certifi
    _SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    _SSL_CTX = ssl.create_default_context()
    _SSL_CTX.check_hostname = False
    _SSL_CTX.verify_mode = ssl.CERT_NONE

# ── 配置 ────────────────────────────────────────────────────────────────────

WATCHLIST = [
    {"ticker": "NVDA",      "name": "英伟达",        "currency": "USD"},
    {"ticker": "0700.HK",   "name": "腾讯控股",      "currency": "HKD"},
    {"ticker": "ORCL",      "name": "甲骨文",        "currency": "USD"},
    {"ticker": "PDD",       "name": "拼多多",        "currency": "USD"},
    {"ticker": "600036.SS", "name": "招商银行",      "currency": "CNY"},
    {"ticker": "002142.SZ", "name": "宁波银行",      "currency": "CNY"},
    {"ticker": "MU",        "name": "美光科技",      "currency": "USD"},
    {"ticker": "005930.KS", "name": "三星电子",      "currency": "KRW"},
    {"ticker": "000660.KS", "name": "SK海力士",      "currency": "KRW"},
    {"ticker": "GLD",       "name": "黄金ETF(GLD)",  "currency": "USD"},
]

DROP_THRESHOLD = 0.10      # 10% 跌幅预警
CONSEC_DOWN_DAYS = 4       # 连续下跌天数
LOOKBACK_DAYS = 30         # 计算高点的回望窗口（交易日）

SCRIPT_DIR = Path(__file__).parent
STATE_FILE = SCRIPT_DIR / ".alert_state.json"
ENV_FILE = SCRIPT_DIR.parent / ".env.local"

YF_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "application/json",
}

# ── 工具函数 ─────────────────────────────────────────────────────────────────

def load_env() -> dict:
    env: dict = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip().strip('"').strip("'")
    env.update(os.environ)
    return env


def load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except Exception:
            pass
    return {}


def save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False))


def yf_fetch_closes(ticker: str, days: int = 40) -> list[float]:
    """返回最近 days 个交易日的收盘价列表（升序，最新在末尾）"""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(ticker)}?interval=1d&range=3mo"
    req = urllib.request.Request(url, headers=YF_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10, context=_SSL_CTX) as resp:
            data = json.loads(resp.read())
    except Exception as e:
        print(f"  [WARN] {ticker} fetch 失败: {e}")
        return []

    result = data.get("chart", {}).get("result", [])
    if not result:
        return []

    closes_raw = result[0].get("indicators", {}).get("quote", [{}])[0].get("close", [])
    closes = [c for c in closes_raw if c is not None]
    return closes[-days:]


# ── 预警逻辑 ─────────────────────────────────────────────────────────────────

def check_alerts(ticker: str, closes: list[float]) -> list[str]:
    """返回触发的预警描述列表"""
    alerts: list[str] = []
    if len(closes) < CONSEC_DOWN_DAYS + 1:
        return alerts

    current = closes[-1]

    # 条件 1: 较 30 日高点跌幅 ≥ 10%
    window = closes[-LOOKBACK_DAYS:] if len(closes) >= LOOKBACK_DAYS else closes
    high = max(window[:-1])  # 排除当日，取历史高点
    if high > 0:
        drop = (high - current) / high
        if drop >= DROP_THRESHOLD:
            alerts.append(f"📉 较近期高点({high:.2f})已跌 {drop*100:.1f}%，当前 {current:.2f}")

    # 条件 2: 连续 N 日下跌
    tail = closes[-(CONSEC_DOWN_DAYS + 1):]
    if all(tail[i] > tail[i + 1] for i in range(CONSEC_DOWN_DAYS)):
        alerts.append(
            f"📊 连续 {CONSEC_DOWN_DAYS} 日收盘下跌，"
            f"{tail[0]:.2f} → {tail[-1]:.2f} "
            f"({(tail[-1]-tail[0])/tail[0]*100:+.1f}%)"
        )

    return alerts


# ── 微信通知（PushPlus）────────────────────────────────────────────────────

def send_wechat(token: str, title: str, content: str) -> bool:
    payload = json.dumps({
        "token": token,
        "title": title,
        "content": content,
        "template": "markdown",
    }).encode()
    req = urllib.request.Request(
        "https://www.pushplus.plus/send",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10, context=_SSL_CTX) as resp:
            result = json.loads(resp.read())
        if result.get("code") == 200:
            print(f"  [OK] 微信通知已发送: {title}")
            return True
        else:
            print(f"  [WARN] PushPlus 返回异常: {result}")
            return False
    except Exception as e:
        print(f"  [ERROR] 微信通知发送失败: {e}")
        return False


# ── 主流程 ───────────────────────────────────────────────────────────────────

def main() -> None:
    env = load_env()
    token = env.get("PUSHPLUS_TOKEN", "")
    if not token:
        print("[ERROR] 未设置 PUSHPLUS_TOKEN，请在 .env.local 中配置")
        sys.exit(1)

    state = load_state()
    today = date.today().isoformat()
    triggered: list[dict] = []

    print(f"=== 价格预警检查 {today} ===")
    for stock in WATCHLIST:
        ticker = stock["ticker"]
        name = stock["name"]
        print(f"检查 {ticker} ({name})...")

        closes = yf_fetch_closes(ticker)
        if not closes:
            continue

        alerts = check_alerts(ticker, closes)
        if not alerts:
            print(f"  ✓ 无预警")
            continue

        # 去重：同一 ticker 同一天已通知过则跳过
        already_notified = state.get(ticker, {}).get("last_alert_date") == today
        if already_notified:
            print(f"  ⚡ 今日已通知过，跳过")
            continue

        triggered.append({
            "ticker": ticker,
            "name": name,
            "currency": stock["currency"],
            "price": closes[-1],
            "alerts": alerts,
        })

    if not triggered:
        print("\n✅ 今日无新预警触发")
        return

    # 构建微信消息
    lines = [f"## 🔔 买入关注提醒 — {today}\n"]
    for item in triggered:
        lines.append(f"### {item['name']} ({item['ticker']})")
        lines.append(f"当前价格：**{item['price']:.2f} {item['currency']}**\n")
        for a in item["alerts"]:
            lines.append(f"- {a}")
        lines.append("")

    lines.append("---")
    lines.append("*此提醒来自个人博客价格预警系统，仅供参考，不构成投资建议。*")
    content = "\n".join(lines)

    title = f"📈 价格预警：{'、'.join(i['name'] for i in triggered)}"
    send_wechat(token, title, content)

    # 更新状态
    for item in triggered:
        state[item["ticker"]] = {"last_alert_date": today, "price": item["price"]}
    save_state(state)


if __name__ == "__main__":
    main()
