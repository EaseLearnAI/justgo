# Just Go! 后端项目

基于 Node.js + Express + MongoDB 的运动健康管理后端服务。

## 项目结构（现行）

```
mapbackend/
├── .env.example              # 环境变量模板（密钥勿入库）
├── src/
│   ├── app.js                # 入口：挂载 /api/*
│   ├── config/
│   │   ├── database.js
│   │   ├── env.js            # 集中读 process.env
│   │   └── constants.js      # 强度/位置层级常量
│   ├── middleware/
│   ├── models/               # User, FoodRecord, ExerciseRoute, DailySummary
│   ├── routes/               # 薄 HTTP 层（auth/user/records/ai/vision/stats/route）
│   ├── services/
│   │   ├── statsService.js   # 今日热量唯一聚合入口
│   │   ├── calorieCalculatorService.js
│   │   ├── locationService.js  # 兼容层 → route/locationResolver
│   │   └── route/
│   │       ├── locationResolver.js  # L0–L3 IP 优先
│   │       ├── decision.js          # 时长/热量区间（纯函数）
│   │       ├── placeHints.js        # 城市级去向
│   │       └── route.service.js     # 生成/开始/完成编排
│   ├── MCP/                  # 高德 HTTP + Prompt（enhancer；密钥走 env）
│   ├── _legacy/              # 未挂载死路由归档（勿再挂载）
│   └── tests/                # npm test
└── package.json
```

## 实际挂载的 API

| 前缀 | 职责 |
|------|------|
| `/api/auth` | 注册 / 登录 + JWT |
| `/api/user` | 资料、身体数据、目标、签到、头像 |
| `/api/records` | 饮食/运动记录 |
| `/api/ai` | 文本热量 / 运动分析 |
| `/api/vision` | 图片热量分析 |
| `/api/stats` | 日摘要、目标进度 |
| `/api/route` | 路线生成 / 开始 / 完成 / IP 定位 |

> `src/_legacy/` 中的 exercise/daily 等**未挂载**，请勿当作现行 API。

## 技术栈

- **运行环境**: Node.js 18+
- **Web 框架**: Express 4.x
- **数据库**: MongoDB + Mongoose 8.x
- **认证**: JWT
- **地图**: 高德 Web 服务（`AMAP_MAPS_API_KEY`）

## 快速开始

### 1. 安装依赖

```bash
cd mapbackend
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 填写 AMAP_MAPS_API_KEY、AI_API_KEY、MONGODB_URI、JWT_SECRET
```

本地开发可用 `MOCK_CITY` / `MOCK_LAT` / `MOCK_LNG` 避免内网 IP 落到默认北京。

### 3. 启动

```bash
npm run dev
# 或
npm start
```

### 4. 单测

```bash
npm test
```

覆盖决策引擎区间、强度字段解析、L1 禁止 `place/around`、热量纯函数。

## 路线生成约定（增量字段）

`POST /api/route/generate` 在保持原有 `data.routeSuggestion` 等字段的同时，可返回：

- `location.level` / `location.source`（L0–L3）
- `data.plan.durationRange` / `calorieRange` / `reason`（决策引擎；LLM 不改数字）
- `data.place.mode`：`city_hint`（仅 IP）或 `nearby`（L2+）
- `data.enhancements.canUpgradeWithGps`

仅 L1/IP 时**不会**用城市中心坐标调用 `place/around`。

## 文档

更完整的重构与产品方案见仓库 Agent Store / 项目 docs（后端重构方案、位置推荐方案）。
