# 个人博客

基于 Next.js 16 构建的个人博客，集成了 MDX 写作系统、金融市场仪表盘和 AI 工具集。

---

## 功能模块

### 博客系统
- MDX 文章支持，含代码高亮、Callout、目录
- 按分类（tech / finance / life）和标签筛选
- 全文搜索（Fuse.js）
- RSS Feed（`/feed.xml`）
- Giscus 评论系统
- OG 图自动生成（`/og`）

### 市场仪表盘（`/market`）
金融分析功能，分 7 个 Tab：

| Tab | 功能 |
|-----|------|
| 市场分析 | 纳指 / 上证 / 恒生三大指数走势图，事件标注，趋势预测（SMA + RSI） |
| 个股分析 | 自选股持仓监控，连涨连跌信号，MA20/MA50 穿越检测 |
| 赛道估值 | 7 大科技赛道 comps 分析：运营指标 + 估值倍数 + 四分位统计 |
| 基金工具 | 截图 OCR 识别持仓，AI 买卖时机判断 |
| 黄金分析 | 黄金 / GLD ETF 跟踪，宏观驱动分析 |
| 预测复盘 | 历史预测记录与回测胜率统计 |
| 安全买入 | 多方法安全买入价计算（布林带 / 历史回撤 / RSI / 估值回归） |

赛道估值基于 `comps-analysis` 分析框架，覆盖：
- AI 基础设施（NVDA AMD AVGO TSM …）
- AI 企业软件（MSFT GOOGL META …）
- 具身智能 / AI 能源 / 量子计算 / AI 生物医药 / 新能源汽车

### 数据层
- 实时行情：Yahoo Finance API（含并发限制器，防封禁）
- 基本面数据：`data/fundamentals.json`，含 68 支股票的 LTM 营收、净负债、PE、PEG、增速、利润率
- 宏观指标：FRED（VIX / 美债收益率 / Buffett Indicator）
- 市场事件：`data/market-events.json`，150+ 条人工 + 自动标注事件

---

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 16 (App Router) |
| 内容 | MDX + gray-matter + next-mdx-remote |
| 样式 | 原生 CSS（CSS 变量 token 体系，支持亮 / 暗主题） |
| 搜索 | Fuse.js（客户端全文模糊搜索） |
| 评论 | Giscus（GitHub Discussions） |
| 图表 | Canvas 自绘（无依赖），支持缩放 / 平移 / 事件标注 |
| 数据 | Yahoo Finance API + FRED + 手动维护 JSON |

---

## 目录结构

```
myblog/
├── content/posts/          # MDX 博客文章
├── data/
│   ├── fundamentals.json   # 68支股票基本面数据
│   └── market-events.json  # 市场重大事件时间线
├── src/
│   ├── app/
│   │   ├── market/         # 金融仪表盘页面
│   │   ├── blog/           # 博客列表与文章详情
│   │   ├── api/            # API 路由（stocks/market-data/safe-buy 等）
│   │   └── search/         # 全文搜索
│   ├── components/         # 25 个 UI 组件
│   └── lib/
│       ├── yahoo-finance.ts # Yahoo Finance 封装（curl + cookie jar）
│       ├── fundamentals.ts  # 基本面数据加载器
│       └── stock-analysis.ts# stockanalysis.com 爬虫（备用数据源）
└── public/
```

---

## 本地开发

```bash
npm install
npm run dev
# 访问 http://localhost:3000
```

---

## 文章分类

- `tech`：AI、Agent、编程工具、学习路线
- `finance`：美股分析、指数基金、市场研究
- `life`：海外生活、工作选择、房产

---

## License

MIT
