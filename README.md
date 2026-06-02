# 城与卡牌(Citycard)-Vue

## 快速体验

如果想要快速体验此项目，请访问网址 https://citycard.fun，QQ交流群：1073827457



## 项目版本

本项目包含两个版本：

| 版本 | 目录 | 技术栈 | 状态 |
|------|------|--------|------|
| **HTML 单文件版** | `/citycard_web.html` | 原生 HTML/JS | 完整可用 |
| **Vue 3 重构版** | `/citycard-vue/` | Vue 3 + Vite + Pinia + Firebase | 开发中 |

---

## HTML 单文件版

### 如何正确打开游戏

#### ⚠️ 重要提示

由于浏览器的安全限制，**不能直接双击HTML文件打开游戏**，否则会导致外部JavaScript文件无法加载，出现以下错误：
- `Failed to load resource: net::ERR_FILE_NOT_FOUND`
- `Uncaught ReferenceError: ALL_CITIES is not defined`
- `Uncaught ReferenceError: Cannot access 'DEFAULT_FIREBASE_CONFIG' before initialization`

#### 推荐方法

请使用以下任一方法打开游戏：

##### 方法1：使用Python内置服务器（推荐）

1. 在项目目录打开终端/命令提示符
2. 运行以下命令：

```bash
# Python 3
python3 -m http.server 8000

# 或 Python 2
python -m SimpleHTTPServer 8000
```

3. 在浏览器中访问：`http://localhost:8000/citycard_web.html`

##### 方法2：使用VS Code Live Server插件

1. 在VS Code中安装"Live Server"插件
2. 右键点击`citycard_web.html`
3. 选择"Open with Live Server"

##### 方法3：使用Node.js http-server

1. 安装http-server（全局）：
```bash
npm install -g http-server
```

2. 在项目目录运行：
```bash
http-server -p 8000
```

3. 在浏览器中访问：`http://localhost:8000/citycard_web.html`

---

## Vue 3 重构版

HTML 单文件版已超过 45000 行，维护困难。Vue 3 版本将其重构为模块化的组件架构。

### 技术栈

- **Vue 3.5** — 组合式 API（Composition API）
- **Vite 7** — 构建工具与开发服务器
- **Pinia 3** — 状态管理
- **Firebase 12** — 在线多人实时同步
- **Vitest 4** — 单元测试（含 UI 模式和覆盖率）

### 目录结构

```
citycard-vue/
├── src/
│   ├── main.js                # 应用入口
│   ├── App.vue                # 根组件
│   ├── adapters/              # 数据适配层
│   ├── assets/                # 静态资源
│   ├── components/            # 组件
│   │   ├── AdminMode/         #   管理员模式（AdminMode, BattlePanel, CityEditor, SkillPanel）
│   │   ├── Battle/            #   战斗结果展示
│   │   ├── Common/            #   通用组件（通知容器等）
│   │   ├── Firebase/          #   Firebase 配置
│   │   ├── Game/              #   核心游戏（GameBoard, CityCard, CityDeployment, BattleAnimation 等）
│   │   ├── MainMenu/          #   主菜单与模式选择
│   │   ├── Modals/            #   弹窗（城市信息、技能指南、题库、更新日志）
│   │   ├── PlayerMode/        #   玩家模式（本地 / 在线 / 中心城市选择）
│   │   ├── Quiz/              #   答题模块
│   │   ├── Room/              #   房间选择与等待室
│   │   ├── Save/              #   存档管理
│   │   └── Skills/            #   技能选择器与技能效果动画
│   ├── composables/           # 组合式函数（可复用逻辑）
│   ├── constants/             # 常量配置
│   ├── data/                  # 城市数据 / 题库
│   ├── stores/                # Pinia 状态仓库
│   ├── tests/                 # 单元测试
│   ├── utils/                 # 工具函数
│   └── views/                 # 页面视图
├── package.json
└── vite.config.js
```

### 快速启动

```bash
cd citycard-vue
npm install
npm run dev          # 开发服务器（默认 http://localhost:5173）
```

### 可用命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 生产构建
npm run preview      # 预览生产构建
npm run test         # 运行单元测试
npm run test:ui      # 测试（带 UI 面板）
npm run test:coverage # 测试覆盖率
```

---

## 游戏模式

### 玩家模式
- 密码：`EU6OIdsjkl1-2WEJ`
- 支持在线多人游戏（需配置Firebase）
- 支持本地存储模式

### 管理员模式
- 用于测试和配置游戏

## 文件结构（HTML 单文件版）

```
2048/
├── citycard_web.html          # 主游戏文件
├── js/
│   ├── config/
│   │   └── constants.js       # 常量配置
│   ├── data/
│   │   ├── cities.js          # 城市数据
│   │   └── cityQuestions.js   # 城市题库
│   ├── skills/
│   │   └── skillMetadata.js   # 技能元数据
│   └── utils/
│       └── helpers.js         # 工具函数
├── citycard-vue/              # Vue 3 重构版（见上方说明）
└── README.md                  # 本文件
```

## 常见问题

### Q: 为什么不能直接双击打开？
A: 现代浏览器出于安全考虑，限制本地HTML文件加载其他本地JavaScript文件（CORS策略）。

### Q: 一定要用服务器吗？
A: 是的，除非你修改浏览器安全设置（不推荐）。使用本地服务器是最安全、最简单的方法。

### Q: 哪个方法最简单？
A: 如果已安装Python，使用Python内置服务器最简单（无需额外安装）。

### Q: Vue 3 版本可以直接使用吗？
A: Vue 3 版本仍在开发中，功能尚未与 HTML 版完全对齐。目前完整游戏体验请使用 HTML 单文件版。

## 技术支持

如遇到问题，请检查浏览器控制台（F12）的错误信息。



## 许可证与版权声明

本游戏项目为了在**拥抱开源社区**的同时**保护核心劳动成果**，采用了**代码与资产分离**的双重授权模式，请在修改或分发本项目时严格遵守：

### 1. 源代码 (Source Code) — 自由开源
* 本项目的所有**计算机源代码**（包括但不限于 `.js`, `.py`, `.vue` 以及配置文件等）均在 **GNU GPLv3** 许可证下开源。
* 你可以自由地复制、修改和分发这些代码，但根据 GPLv3 的传染性条款，任何包含或基于本项目代码的衍生作品**也必须强制以 GPLv3 许可证开源**。
* 完整的代码授权条款请参阅项目根目录下的 `LICENSE` 文件。

### 2. 游戏资产 (Game Assets) — 严禁商用
* 本项目中所包含的**所有非代码资产**，包括但不限于：
  * 🎨 **美术作品**：卡牌美术设计、角色原画、UI（图形用户界面）视觉设计与贴图。
  * 🎵 **音频内容**：游戏背景音乐（BGM）、技能与战斗音效。
  * ✍️ **文案与世界观**：卡牌数值设计、关卡剧情、世界观设定及背景故事。
* **以上所有资产均属于“版权所有，保留所有权利 (All Rights Reserved)”**。
* ⚠️ **【核心限制】**：未经原作者（Futelec）明确的**书面授权**，任何人**不得**将上述资产用于任何形式的商业盈利行为（包括但不限于上架收费平台、加入内购、挂载广告分发等）。

---

### 💡 开发者声明
我们非常欢迎社区开发者利用开源代码来学习、交流或为本项目提交 Bug 修复和性能优化（PR）。但如果你打算将本项目进行“换皮”或二次商业化运作，请务必自行重新设计并替换所有的美术、音效及卡牌文案资产，否则我们将依法追究侵权责任。

如有商业合作或特殊授权需求，请通过以下方式联系作者：
* **Email**: redrch327@gmail.com
* **QQ群**: 1039214788



---

Copyright (C) 2026, Futelec Game Studio          Email: redrch327@gmail.com