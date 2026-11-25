# 🎁 礼物助手 Gift Assistant

> 朋友生日快到了，却总是临时翻聊天记录想送什么？礼物助手把生日提醒、礼物灵感、仓库和真实评价放进一个本地小工具里。

非商业个人项目。所有数据保存在本机 SQLite，不上传云端，不接电商平台。

![生日日历](docs/screenshot-birthday.png)

## 功能

### 生日日历

- 手动添加好友姓名、月 / 日、性别，年份可选
- 按距离下一次生日的天数升序排列，今天生日的排在最前
- 生日当天显示“某某某今天生日，快去祝他/她生日快乐吧”，称呼按性别显示
- 好友列表里可以直接补填或调整性别
- 2 月 29 日在平年按 2 月 28 日提醒

### 标签搜索

- 标签树支持父子层级，可展开 / 折叠
- 多标签交集筛选：同时选“运动”和“足球”只显示同时带有两者的礼物
- 价格区间筛选：0-100 / 100-300 / 300-500 / 500 元以上
- 71 条手工整理的品类礼物，覆盖运动、手办、书籍、香水、实用小物、数码、美食、居家、户外、音乐、手工
- 商品卡片展示 Emoji、名称、参考价区间、结构化文案和标签

![标签搜索](docs/screenshot-search.png)

### 仓库

- 商品卡片右上角一键收藏
- 区分“想送 / 已送 / 已删除”
- 支持填写购买渠道和实际价格
- 删除为软删除，只写 `deleted_at`，可随时恢复
- 同一件礼物只保留一条有效收藏

![仓库](docs/screenshot-warehouse.png)

### 商品详情与评价

- 商品详情页展示贝叶斯平均分（10 分制，保留一位小数）
- 支持 1-5 星评分、文字评论和图片上传
- 评论列表展示星级、文字、图片和日期
- 评分只在后端计算，前端只负责展示
- 公式：`((C × m + Σ评分) / (C + n)) × 2`，其中 `C = 10`、`m = 3.5`
- 图片保存在 `data/uploads/`，通过 `/api/uploads/:filename` 读取

![商品详情与评价](docs/screenshot-detail.png)

## 技术栈

- **Vite 7 + React 19**：前端
- **Node.js `node:sqlite`**：后端与数据库，无需额外数据库服务
- 原生 CSS：无 UI 框架
- 开发模式下由 Vite 同源挂载 `/api`，不需要启动第二个进程
- 生产模式由 `server/index.js` 同时提供静态页面和 API

## 本地运行

需要 Node.js **22.13+**（`node:sqlite` 可用）。

```bash
npm install
npm run dev
```

打开 <http://127.0.0.1:5173>。

首次启动会自动创建 `data/gift-assistant.db`，建表并写入 71 条种子礼物与 54 个标签。

```bash
# 生产构建 + 启动（默认 http://127.0.0.1:4173）
npm run build
npm start

# 重置本机数据库（会删除好友、仓库、评价等全部本地数据）
npm run db:reset
```

## 项目结构

```text
.
├── server/
│   ├── api.js          # 所有 HTTP 接口与图片读取
│   ├── db.js           # SQLite 连接、建表与迁移
│   ├── schema.js       # 6 张业务表
│   ├── birthdays.js    # 生日倒计时计算
│   ├── friends.js      # 好友校验与读写
│   ├── favorites.js    # 仓库、软删除与恢复
│   ├── reviews.js      # 贝叶斯评分、评价与图片保存
│   └── seed/           # 种子礼物与标签树
├── src/
│   ├── App.jsx         # 页面与交互
│   └── styles.css      # 全部样式
├── docs/               # README 截图
├── data/               # 本机数据库与上传图片（已 gitignore）
└── index.html
```

## 接口一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/gifts` | 礼物与标签数据 |
| GET | `/api/gifts/:id/reviews` | 评价列表、贝叶斯得分与星级分布 |
| POST | `/api/gifts/:id/reviews` | 提交评价：`{ rating, comment, image? }` |
| GET | `/api/friends` | 好友生日列表（按剩余天数排序） |
| POST | `/api/friends` | 添加好友：`{ name, month, day, gender?, year? }` |
| PATCH | `/api/friends/:id` | 更新好友性别 |
| GET | `/api/favorites` | 仓库列表（有效 + 已删除） |
| POST | `/api/favorites` | 收藏礼物：`{ giftId }` |
| PATCH | `/api/favorites/:id` | 更新状态 / 渠道 / 实际价格 |
| DELETE | `/api/favorites/:id` | 软删除收藏 |
| POST | `/api/favorites/:id/restore` | 恢复已删除的收藏 |
| GET | `/api/uploads/:filename` | 读取评价图片 |
| GET | `/api/health` | 数据表计数 |

## 数据与隐私

- 数据库：`data/gift-assistant.db`
- 评价图片：`data/uploads/`
- 没有任何账号体系，也不会上传数据到第三方服务
- `data/` 下的数据库与图片已加入 `.gitignore`，不会进入 Git 仓库
- 想清空本地数据可执行 `npm run db:reset`，或直接删除 `data/` 目录

## 合规说明

- **不内置任何第三方商品图片**。品类视觉全部使用 Emoji + 色块；README 截图中的图片是本地生成的示意占位图，不是商品实拍图。
- **不抓取任何电商平台数据**。71 条礼物为手工整理的品类参考，不含商家、链接或具体商品 ID。
- **价格仅为品类参考**，例如“比赛级足球：200-400 元”，不是实时售价，也不绑定任何商家。
- **购买渠道由用户自己填写**，应用不推荐具体商家，不做优劣背书。
- **评价只代表本地用户的主观记录**，不构成购买建议。
- 本项目为**非商业性质**，不包含广告、返利、联盟链接或付费功能。
- 截图中的好友姓名、生日、渠道和评价均为虚构演示数据，不包含真实个人信息。

## Roadmap

当前版本刻意没有做以下功能：

- 视频评论、表情包 / 贴纸
- 评论回复与点赞
- 多用户登录、云端同步与共享清单
- 生日提醒推送（系统通知 / 邮件）
- 礼物计划导出、已送礼物统计
- 更多排序方式（价格、随机灵感）与深色模式
- 移动端原生 App

## GitHub 发布

```bash
git init -b main
git add .
git commit -m "feat: 礼物助手 v0.1.0"
git remote add origin <your-repository-url>
git push -u origin main
```

`.gitignore` 已包含：

```text
node_modules/
dist/
data/*.db
data/*.db-shm
data/*.db-wal
data/uploads/
```

项目不使用任何环境变量或密钥，克隆后按“本地运行”即可启动。

## 许可

本项目为非商业个人项目，默认保留所有权利。若需转载、二次分发或商用，请先联系作者。
