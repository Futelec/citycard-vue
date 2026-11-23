# citycard-vue · 城与卡牌

一款融合中国地理知识与策略卡牌的实时在线对战游戏。381 座真实城市被转化为卡牌角色，玩家抽取城市组建队伍，通过战斗、金币技能和资源管理击败对手。

- 官网 / 线上地址：`https://citycard.fun`
- 认证代理：`https://auth.citycard.fun`

## 功能概览

- **381 座城市**：覆盖 34 个省级行政区，城市血量映射真实经济规模，省会与直辖市拥有额外加成
- **112 个金币技能**：24 个战斗技能 + 88 个非战斗技能，覆盖攻击、防御、治疗、控制、情报、经济等维度
- **城市专属技能**：每个城市拥有取材于地域文化的独特技能
- **多种对战模式**：2 人对战、3 人混战、2v2 组队
- **离线 / 在线双模式**：离线本地双人可存档；在线通过 Firebase Realtime Database 实时同步，支持房间、断线重连
- **策略交互**：「无懈可击」异步拦截、信息迷雾（已知城市追踪）、技能连锁与组合
- **答题系统**：「博学多才」等技能将地理问答融入对战
- **用户与社交**：注册登录、用户资料、玩家搜索、关注/粉丝列表
- **中国大陆可用**：通过 Cloudflare Worker 反向代理 Firebase Auth 被封锁的域名

## 技术栈

| 依赖 | 版本 | 用途 |
|------|------|------|
| Vue | 3.5 | 组合式 API（Composition API） |
| Vite | 7 | 开发服务器与构建 |
| Pinia | 3 | 全局状态管理 |
| Firebase | 12 | Realtime Database、Authentication |
| Vitest | 4 | 单元 / 集成测试 |
| Cloudflare Workers | — | Firebase Auth 反向代理、验证码邮件 |

建议使用 Node.js 20.19+ 或 22.12+（Vite 7 要求）。

## 快速开始

```bash
npm install
npm run dev            # 开发服务器 http://localhost:5173
npm run build          # 生产构建，输出到 dist/
npm run preview        # 预览生产构建
npm test               # 运行测试（Vitest）
npm run test:ui        # 带 UI 面板的测试
npm run test:coverage  # 覆盖率报告
```

## 环境变量

在项目根目录创建 `.env`（已被 `.env` 文件默认读取，**请勿提交真实密钥**）：

```bash
# Resend 邮件服务 API Key（备用方案）
VITE_RESEND_API_KEY=re_xxxxxxxx

# 发件人地址
VITE_EMAIL_FROM_SIGNUP=signup@email.citycard.fun
VITE_EMAIL_FROM_LOGIN=login@email.citycard.fun
```

Firebase 默认配置内置于 [useFirebase.js](file:///Users/north/CascadeProjects/2048/citycard-vue/src/composables/useFirebase.js)，也可通过 `localStorage.firebase_config` 覆盖。

## 项目结构

```
citycard-vue/
├── index.html                 # HTML 入口
├── vite.config.js             # Vite 配置 + Firebase Auth 开发代理插件 + Vitest 配置
├── package.json
├── .env                       # 邮件服务环境变量（勿提交密钥）
├── public/
│   └── citycard.svg           # 站点图标
├── src/                       # 应用源码
├── worker/                    # Cloudflare Worker 反向代理
├── docs/                      # 战斗系统技术分析文档
├── promo-animation.html       # 宣传动画页（独立单页）
├── prompt-logs/               # 开发过程提示词记录
├── 作品说明.md                 # 作品介绍与创作说明
├── citycard/                  # 历史版本（Vue 源码副本 + 构建产物），仅供参考
└── 城市卡牌游戏/               # 早期静态构建产物，仅供参考
```

### src 源码结构

```
src/
├── main.js                    # 应用入口（启用 Auth 代理 → 初始化 Firebase → 挂载 Vue）
├── App.vue                    # 根组件，以 currentView 驱动页面切换
├── style.css                  # 备用全局样式（实际入口使用 assets/styles）
│
├── assets/styles/             # 全局样式
│   ├── variables.css          #   CSS 变量
│   ├── base.css               #   基础样式
│   └── components.css         #   组件样式
│
├── components/                # Vue 组件（53 个）
│   ├── AdminMode/             #   管理员模式：面板、城市编辑、技能面板、战斗调试
│   ├── Auth/                  #   登录、注册、用户资料
│   ├── Battle/                #   战斗结果展示
│   ├── Common/                #   AppDialog、NotificationContainer
│   ├── Firebase/              #   Firebase 配置界面
│   ├── Game/                  #   核心游戏组件：棋盘、城市卡牌、部署、战斗动画、
│   │                          #   玩家面板、游戏日志、拦截/时来运转弹窗、已知城市等
│   ├── MainMenu/              #   主菜单与模式选择
│   ├── Modals/                #   游戏介绍、技能指南、题库、城市介绍、更新日志、重连
│   ├── PlayerMode/            #   在线 / 离线玩家模式、中心城市选择
│   ├── Quiz/                  #   答题弹窗
│   ├── Room/                  #   房间选择与等待室
│   ├── Save/                  #   存档管理
│   ├── Skills/                #   技能选择器、激活技能面板、技能效果动画
│   └── Social/                #   玩家搜索、资料页、关注列表
│
├── composables/               # 组合式函数
│   ├── useGameLogic.js        #   游戏核心逻辑（战斗计算、回合、金币技能调度）
│   ├── useBattle.js           #   战斗系统
│   ├── useSkills.js           #   技能调度
│   ├── useSkillEffects.js     #   技能效果执行
│   ├── useCitySkills.js       #   城市专属技能入口
│   ├── useCitySkillEffects.js #   城市技能效果处理
│   ├── useCityDraw.js         #   城市抽取（10000 HP 保底、最多 5 次重抽）
│   ├── useRoom.js             #   房间生命周期、心跳、断线重连
│   ├── useFirebase.js         #   Firebase 初始化与数据库实例
│   ├── useAuth.js             #   注册 / 登录 / 验证码 / 找回密码 / 账号管理
│   ├── useAuthProxy.js        #   fetch 拦截，将被墙域名重写到 Worker
│   ├── useEmailService.js     #   通过 Worker / Resend 发送验证码邮件
│   ├── useUserDB.js           #   用户资料与 UID / 邮箱索引
│   ├── useGameSave.js         #   本地存档读写
│   ├── useGameState.js        #   游戏状态辅助
│   ├── useQuiz.js             #   答题系统
│   ├── useSession.js          #   会话管理
│   ├── useDialog.js           #   全局对话框
│   ├── useNotification.js     #   通知系统
│   ├── useFollow.js           #   关注 / 粉丝
│   ├── usePlayerSearch.js     #   玩家搜索
│   ├── usePlayerStats.js      #   玩家战绩统计
│   ├── skills/                #   技能具体实现（每个技能单文件）
│   │   ├── battleSkills/      #     战斗技能：29 个技能文件 + index.js + _helpers.js
│   │   ├── nonBattleSkills/   #     非战斗技能：90 个技能文件 + index.js
│   │   └── performanceOptimization.js
│   ├── skillCore/             #   技能引擎核心（类型、状态变更应用、公共工具）
│   ├── game/                  #   游戏子系统
│   │   ├── useBattleSimulator.js   # 战斗模拟
│   │   ├── preBattleChecks.js      # 战前检查
│   │   ├── fatigueSystem.js        # 疲劳系统
│   │   ├── battleAnimationData.js  # 战斗动画数据
│   │   ├── logUtils.js             # 日志工具
│   │   └── useGameLogic.js         # 游戏逻辑工具
│   └── citySkills/            #   城市专属技能（按省份拆分，24 个省份文件）
│       ├── index.js           #     技能名 → 处理函数映射与统一调度
│       ├── skillHelpers.js
│       └── *.js               #     各省份城市技能实现
│
├── stores/                    # Pinia 状态仓库
│   ├── gameStore.js           #   游戏状态（核心，技能标记 / 回合 / 交互队列）
│   ├── authStore.js           #   认证状态
│   └── playerStore.js         #   玩家状态
│
├── data/                      # 静态游戏数据
│   ├── cities.js              #   381 座城市及省份映射
│   ├── citySkills.js          #   城市专属技能定义
│   ├── cityQuestions.js       #   城市题库
│   ├── goldSkills.js          #   112 个金币技能描述
│   ├── skills.js              #   技能冷却 / 次数限制
│   ├── skillMetadata.js       #   技能分类与白名单
│   └── skillAnimationConfig.js
│
├── constants/
│   └── skillCosts.js          #   技能金币消耗
│
├── config/
│   └── gameTuning.js          #   技能数值 / 白名单统一配置（TUNE）
│
├── utils/                      # 工具函数
│   ├── cityDrawing.js         #   城市抽取算法
│   ├── cityHelpers.js         #   城市辅助函数
│   ├── constants.js           #   技能描述常量
│   ├── helpers.js             #   通用工具
│   ├── clientIP.js            #   客户端 IP（房间限流等）
│   └── debug.js               #   调试日志
│
├── views/                     # 独立页面视图（日志演示等）
├── adapters/                  # 预留适配层（当前为空）
└── tests/                     # 测试
    ├── unit/                  #   战斗 / 非战斗技能单测
    ├── integration/           #   技能组合集成测试
    └── helpers/               #   mockGameStore 等测试辅助
```

## 游戏模式

| 模式 | 说明 |
|------|------|
| **离线模式** | 本地双人对战，支持存档 / 读档，无需网络 |
| **在线模式** | 通过 Firebase 实时同步，创建或加入 9 位房间号；支持 2P / 3P / 2v2、观战、断线重连 |

在线流程：主菜单 → 模式选择 → 登录 → 房间选择 / 创建 → 等待室 → 中心城市选择 → 城市抽取 → 对战。

## 核心系统

### 技能系统

- **战斗技能（24）**：在战斗阶段使用，影响伤害分配、攻击目标、减伤、反伤等
- **非战斗技能（88）**：在技能阶段使用，覆盖经济、治疗、防御、控制、情报、省份操作等
- **单技能单文件**：战斗技能位于 `skills/battleSkills/`，非战斗技能位于 `skills/nonBattleSkills/`，每个技能一个中文命名文件；两个 `index.js` 分别导出 `useBattleSkills()` / `useNonBattleSkills()`，对外 API 与拆分前完全一致
- **城市专属技能**：按省份组织在 `composables/citySkills/`，由 `index.js` 统一映射调度
- **数值集中管理**：所有技能数值（伤害、血量、回合数、倍率、阈值、成本表等）集中在 `src/config/gameTuning.js` 的 `TUNE` 中，按技能分组；技能白名单（实际显示 / 可选的技能）位于 `TUNE.skillWhitelist`。调整平衡性或技能开放范围只需改该文件
- 技能金币消耗定义在 `constants/skillCosts.js`，冷却与次数限制在 `data/skills.js`

修改某个技能时：实现逻辑改对应技能文件，数值改 `TUNE` 中同名分组，二者分离。

### 战斗系统

- 战斗模拟：[useBattleSimulator.js](file:///Users/north/CascadeProjects/2048/citycard-vue/src/composables/game/useBattleSimulator.js)
- 疲劳、战前检查、日志、动画分别由 `game/` 下的独立模块负责
- 详细技术分析见 `docs/` 目录

### 在线同步

- 房间与游戏状态存于 Firebase Realtime Database
- 10 秒心跳 + 30 秒离线判定，支持断线重连与观战
- 异步拦截（无懈可击）、先声夺人交换请求、求和请求等通过交互队列同步

### 认证与网络代理

Firebase Auth 相关域名在中国大陆被封锁，项目通过以下方式解决：

1. [useAuthProxy.js](file:///Users/north/CascadeProjects/2048/citycard-vue/src/composables/useAuthProxy.js) 拦截 `fetch`，把命中白名单的域名重写为代理地址
2. 开发模式下走 Vite 插件 `/auth-proxy/*` 转发到 `https://auth.citycard.fun`
3. 生产模式直接请求 `https://auth.citycard.fun/{host}/{path}`
4. Worker 端使用白名单转发 Google / Firebase 接口，并额外提供验证码登录与邮件发送

## Cloudflare Worker

源码：[worker/auth-proxy-worker.js](file:///Users/north/CascadeProjects/2048/citycard-vue/worker/auth-proxy-worker.js)  
配置：[worker/wrangler.toml](file:///Users/north/CascadeProjects/2048/citycard-vue/worker/wrangler.toml)

提供的端点：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/send-email` | POST | 代理 Resend 发送邮件 |
| `/auth/send-login-code` | POST | 生成并发送登录验证码（AES-GCM 无状态令牌） |
| `/auth/verify-login-code` | POST | 校验验证码并签发 Firebase custom token |
| `/{allowed-host}/{path}` | ANY | 白名单 Google / Firebase 域名反向代理 |
| `/__/auth/*` | ANY | Firebase Auth iframe / handler 代理 |

部署：

```bash
cd worker
npx wrangler secret put FIREBASE_SA_KEY   # Firebase 服务账号私钥（PEM）
npx wrangler secret put RESEND_API_KEY    # Resend API Key
npx wrangler deploy
```

`wrangler.toml` 中的 `[vars]` 已配置服务账号邮箱、数据库地址与发件人。

## 测试

```bash
npm test               # 监听模式运行 Vitest
npm run test:ui        # 浏览器 UI 面板
npm run test:coverage  # 生成覆盖率报告
```

测试基于 `happy-dom` 环境，覆盖：

- `tests/unit/battleSkills.test.js` — 战斗技能
- `tests/unit/nonBattleSkills.test.js` — 非战斗技能
- `tests/integration/skillCombinations.test.js` — 技能组合与状态交互

## 部署

1. `npm run build` 生成静态产物到 `dist/`
2. 将 `dist/` 部署到任意静态托管（Cloudflare Pages、Nginx、对象存储等）
3. 确保 `auth.citycard.fun` Worker 已部署且可访问
4. `vite.config.js` 中 `base: './'`，支持部署在子路径下

## 相关文档

- [作品说明.md](file:///Users/north/CascadeProjects/2048/citycard-vue/作品说明.md) — 作品定位、玩法与 AI 协作说明
- [docs/README.md](file:///Users/north/CascadeProjects/2048/citycard-vue/docs/README.md) — 战斗系统技术文档索引
- [docs/BATTLE_SYSTEM_ANALYSIS.md](file:///Users/north/CascadeProjects/2048/citycard-vue/docs/BATTLE_SYSTEM_ANALYSIS.md) — 战斗系统深度分析
- [docs/ANALYSIS_SUMMARY.md](file:///Users/north/CascadeProjects/2048/citycard-vue/docs/ANALYSIS_SUMMARY.md) — 分析摘要与重构建议
- [docs/BATTLE_QUICK_REFERENCE.txt](file:///Users/north/CascadeProjects/2048/citycard-vue/docs/BATTLE_QUICK_REFERENCE.txt) — 战斗函数快速索引

## 说明

- `citycard/` 与 `城市卡牌游戏/` 为历史版本 / 早期构建产物，不参与当前构建，仅作参考。
- `prompt-logs/` 记录了开发过程中的 AI 提示词与迭代记录。
- `.env` 中包含邮件服务密钥，提交前请确认不要将真实密钥推送到公开仓库。
