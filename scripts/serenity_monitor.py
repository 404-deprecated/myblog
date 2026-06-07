#!/usr/bin/env python3
"""
Serenity (@aleabitoreddit) X/Twitter 监控 — 新推文 → 微信推送 + 中文翻译
数据源: nitter RSS (nitter.net / nitter.poast.org)
推送: PushPlus
"""

import json, os, re, sys, time, hashlib
from datetime import datetime, timezone
from html import unescape
import requests

# ─── Config ────────────────────────────────────────────────
NITTER_URLS = [
    "https://nitter.net/aleabitoreddit/rss",
    "https://nitter.poast.org/aleabitoreddit/rss",
]
PUSHPLUS_TOKEN = "9dd4c07ffdf94335aa7817c5405a2856"
PUSHPLUS_URL = "https://www.pushplus.plus/send"
STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".serenity_state.json")
CHECK_INTERVAL = 300  # seconds

HEADERS = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}


# ─── RSS 解析 ──────────────────────────────────────────────
def fetch_tweets():
    """从多个 nitter 实例拉 RSS,返回推文列表"""
    for url in NITTER_URLS:
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            if r.status_code != 200 or len(r.text) < 500:
                continue
            tweets = []
            # Parse RSS items
            items = re.findall(r'<item>(.*?)</item>', r.text, re.DOTALL)
            for item_xml in items:
                title_match = re.search(r'<title>(.*?)</title>', item_xml, re.DOTALL)
                desc_match = re.search(r'<description>(.*?)</description>', item_xml, re.DOTALL)
                date_match = re.search(r'<pubDate>(.*?)</pubDate>', item_xml, re.DOTALL)
                link_match = re.search(r'<link>(.*?)</link>', item_xml, re.DOTALL)

                if not title_match: continue
                title = unescape(title_match.group(1).strip())
                desc = unescape(desc_match.group(1).strip()) if desc_match else ''
                pub_date = date_match.group(1).strip() if date_match else ''
                link = link_match.group(1).strip() if link_match else ''

                # Skip nitter internal items
                if 'whitelist' in title.lower() or 'rss reader' in title.lower():
                    continue
                # Skip replies (R to @username: ...)
                if title.startswith('R to @'):
                    continue

                # Generate unique ID from content hash
                content_hash = hashlib.md5((title + desc[:100]).encode()).hexdigest()[:12]

                # Clean HTML from description
                desc_clean = re.sub(r'<[^>]+>', '', desc).strip()
                # Limit description length
                if len(desc_clean) > 500:
                    desc_clean = desc_clean[:500] + '...'

                tweets.append({
                    'id': content_hash,
                    'title': title,
                    'text': desc_clean or title,
                    'date': pub_date,
                    'link': link,
                })

            if tweets:
                return tweets
        except Exception as e:
            print(f"[WARN] {url}: {e}")
            continue
    return []


# ─── 翻译 ──────────────────────────────────────────────────
def translate_to_chinese(text):
    """使用免费翻译API翻译成中文"""
    # 清理文本
    text = text.strip()
    if not text or len(text) < 3:
        return text

    try:
        # Google Translate free API
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            'client': 'gtx',
            'sl': 'en',
            'tl': 'zh-CN',
            'dt': 't',
            'q': text[:1500],  # limit input length
        }
        r = requests.get(url, params=params, headers=HEADERS, timeout=10)
        result = r.json()
        # Extract translated text
        parts = []
        for sentence in result[0]:
            if sentence[0]:
                parts.append(sentence[0])
        return ''.join(parts)
    except Exception as e:
        print(f"[WARN] Translation failed: {e}")
        return text  # return original on failure


# ─── 推送 ──────────────────────────────────────────────────
def push_to_wechat(tweet, translation):
    """通过PushPlus推送到微信"""
    # Sanitize title: no newlines, max 80 chars
    safe_title = tweet['title'].replace('\n', ' ').replace('\r', ' ').strip()
    title = f"🐦 Serenity"
    if len(safe_title) > 60:
        title += f": {safe_title[:60]}..."
    elif safe_title:
        title += f": {safe_title}"

    # Escape HTML special chars in text content
    safe_text = tweet['text'].replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('\n','<br/>')
    safe_trans = translation.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('\n','<br/>')

    content = f"""
    <h3>🐦 Serenity (@aleabitoreddit)</h3>
    <p style="font-size:14px;color:#333;line-height:1.6"><b>原文:</b><br/>{safe_text}</p>
    <hr/>
    <p style="font-size:14px;color:#1a56db;line-height:1.6"><b>🇨🇳 中文翻译:</b><br/>{safe_trans}</p>
    <hr/>
    <p style="font-size:11px;color:#888">
      🕐 {tweet['date']}<br/>
      🔗 <a href="{tweet['link']}">{tweet['link']}</a>
    </p>
    <p style="font-size:10px;color:#aaa"><i>— Serenity Monitor Bot</i></p>
    """

    try:
        r = requests.post(PUSHPLUS_URL, json={
            'token': PUSHPLUS_TOKEN,
            'title': title,
            'content': content,
            'template': 'html',
        }, timeout=15)
        result = r.json()
        if result.get('code') == 200:
            return True
        else:
            print(f"[ERROR] PushPlus: {result}")
    except Exception as e:
        print(f"[ERROR] Push failed: {e}")
    return False


# ─── 状态管理 ──────────────────────────────────────────────
def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {'seen_ids': [], 'last_check': None}

def save_state(state):
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f)


# ─── Main ──────────────────────────────────────────────────
def main():
    state = load_state()
    now = datetime.now(timezone.utc).isoformat()

    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Checking Serenity tweets...")

    tweets = fetch_tweets()
    if not tweets:
        print("  No tweets fetched (network issue?)")
        return

    new_tweets = [t for t in tweets if t['id'] not in state['seen_ids']]

    if not new_tweets:
        print(f"  No new tweets (tracking {len(state['seen_ids'])} seen)")
        state['last_check'] = now
        save_state(state)
        return

    print(f"  Found {len(new_tweets)} new tweets!")

    for tweet in reversed(new_tweets):  # oldest first
        print(f"  Translating: {tweet['title'][:80]}...")
        translation = translate_to_chinese(tweet['text'])
        success = push_to_wechat(tweet, translation)
        if success:
            state['seen_ids'].append(tweet['id'])
            print(f"  ✅ Pushed to WeChat!")
        time.sleep(3)  # PushPlus free tier: max ~5/min, so 3s gap = 20/min safe

    # Keep only last 200 IDs
    state['seen_ids'] = state['seen_ids'][-200:]
    state['last_check'] = now
    save_state(state)
    print(f"  Done. Tracking {len(state['seen_ids'])} tweets.")


if __name__ == '__main__':
    main()
