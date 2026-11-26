# 部署到公网

这份文档回答两个问题：

1. 别人想打开我的网页，需要买域名和服务器吗？
2. 带登录系统的版本怎么安全地部署？

## 先给结论

| 目标 | 需要服务器吗 | 需要域名吗 | 说明 |
| --- | --- | --- | --- |
| 同一局域网访问 | 不需要 | 不需要 | 用 `npm run dev -- --host 0.0.0.0`，别人访问你的局域网 IP |
| 互联网上公开访问 | **需要** | **不必须** | 需要一台持续运行 Node.js、带持久磁盘的机器；平台子域名可直接用 |
| 想要好记的地址 | 同上 | 建议买 | 自定义域名通常几十到一百元/年，HTTPS 证书可免费自动申请 |
| 临时演示给朋友 | 可不用买服务器 | 不需要 | 家里电脑 + Cloudflare Tunnel / ngrok，但电脑必须保持开机 |

**不能直接放在 Vercel / Netlify 这类纯 Serverless 平台**：它们默认文件系统是临时的，SQLite 和 `data/uploads/` 会在重启后丢失。要用带持久卷的 Node 托管，或改成外部数据库 + 对象存储。

登录系统涉及密码和会话 Cookie，**上线必须使用 HTTPS**。

## 推荐方案

### 方案 A：带持久磁盘的 Node PaaS

适合不想维护服务器的人。可选 Render、Railway、Fly.io 等，重点确认三点：

1. 能运行长时间 Node 进程，不是纯静态托管。
2. 能挂载**持久磁盘**（persistent disk / volume）。
3. 能设置环境变量。

以 Render 为例：

- Build Command：`npm install && npm run build`
- Start Command：`npm start`
- 环境变量：
  - `HOST=0.0.0.0`
  - `PORT` 使用平台注入的端口（一般无需手动设置）
  - `COOKIE_SECURE=1`
  - `GIFT_DATA_DIR=/var/data`
  - `INVITE_CODE=你的固定邀请码`
- 持久磁盘挂载路径：`/var/data`

这样 SQLite 和上传图片都会落在持久磁盘里。平台提供的 `xxx.onrender.com` 子域名可以直接用，自定义域名是可选项。

注意：免费实例可能休眠、冷启动较慢，长期公开使用建议付费实例。

### 方案 B：VPS + Caddy（推荐长期使用）

一台 1 核 1G 的 VPS 通常就够个人使用。以 Ubuntu 为例：

```bash
# 安装 Node.js 22（建议使用 NodeSource 或 nvm）
node --version   # 需要 >= 22.13

git clone <your-repository-url> /opt/gift-assistant
cd /opt/gift-assistant
npm install
npm run build
```

设置 systemd 服务 `/etc/systemd/system/gift-assistant.service`：

```ini
[Unit]
Description=Gift Assistant
After=network.target

[Service]
Type=simple
User=gift
WorkingDirectory=/opt/gift-assistant
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=4173
Environment=COOKIE_SECURE=1
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now gift-assistant
```

用 Caddy 自动申请 HTTPS 证书，`/etc/caddy/Caddyfile`：

```caddyfile
gift.example.com {
    reverse_proxy 127.0.0.1:4173
}
```

```bash
sudo systemctl reload caddy
```

Caddy 会设置 `X-Forwarded-Proto: https`，应用会据此给会话 Cookie 加 `Secure`；同时显式设置 `COOKIE_SECURE=1` 更稳妥。

防火墙只开放 `80` 和 `443`，不要直接暴露 Node 端口。

### 方案 C：家里电脑 + Cloudflare Tunnel

适合临时给朋友看，不想买服务器：

```bash
# 应用照常监听本地
HOST=127.0.0.1 PORT=4173 npm start

# 另开一个终端
cloudflared tunnel --url http://127.0.0.1:4173
```

会得到一个临时 HTTPS 地址。缺点：电脑必须保持开机和联网，家庭网络质量决定访问速度。长期使用建议绑定正式 Tunnel 和域名。

## 域名要不要买

- **不买**：PaaS 子域名（如 `xxx.onrender.com`）或 Cloudflare Tunnel 临时域名就能访问。
- **想买**：在域名注册商购买后，添加一条 `CNAME` 或 `A` 记录指向托管平台/VPS 的地址即可。HTTPS 由平台或 Caddy 自动处理。
- 域名是“好记的地址”，不是让网站上线的前提。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | 反向代理场景保持 127.0.0.1；直接暴露可设 0.0.0.0 |
| `PORT` | `4173` | 应用监听端口 |
| `COOKIE_SECURE` | 未设置 | 生产环境设为 `1`，强制会话 Cookie 只走 HTTPS |
| `GIFT_DATA_DIR` | 项目下 `data/` | 数据目录，包含 SQLite 与上传图片 |
| `GIFT_DB_PATH` | `$GIFT_DATA_DIR/gift-assistant.db` | 可选，单独指定数据库文件 |
| `INVITE_CODE` | 未设置 | 固定注册邀请码；未设置时注册关闭 |

示例：

```bash
GIFT_DATA_DIR=/var/data \
COOKIE_SECURE=1 \
INVITE_CODE=your-fixed-invite-code \
HOST=127.0.0.1 \
PORT=4173 \
node server/index.js
```

## 首次上线与账号

- 新数据库没有账号，打开页面会进入登录/注册页。
- **如果是从单用户旧版本升级**：数据库里已有好友、仓库和评价，第一个注册的账号会自动接管这些数据。上线前请自己先注册，不要把地址先发给别人。
- 注册使用固定邀请码；邀请码通过 `INVITE_CODE` 环境变量设置，未设置时注册关闭。
- 注册后自动分配 4 位用户名（0001-9999），登录使用用户名 + 密码，不收集邮箱。
- 最早的账号自动成为管理员；管理员可以查看全部评价、删除违规评价、重置用户密码、禁言/解除禁言账号。
- 被禁言账号仍可登录和浏览，但禁言期间不能发表评价。
- 忘记密码没有自助找回，需要管理员在账号设置中重置。
- 账号设置中支持修改密码和永久注销；管理员账号不能自行注销。
- 所有用户数据都保存在同一个 SQLite 文件中，管理员可以直接读取；这不是端到端加密产品。

## 数据与备份

需要备份的只有：

```text
data/gift-assistant.db
data/uploads/
```

推荐做法：

```bash
# 运行中做一致性备份（需要 sqlite3 命令）
sqlite3 data/gift-assistant.db ".backup 'gift-assistant-backup.db'"

# 连同图片一起打包
tar -czf gift-assistant-backup.tar.gz data/
```

定期把备份复制到另一台机器或对象存储。不要只留一份在服务器上。

## 安全检查清单

- [ ] 全站 HTTPS，`COOKIE_SECURE=1`
- [ ] 数据库和上传目录在持久磁盘上，并已配置备份
- [ ] `data/` 没有被提交到 Git
- [ ] 服务器系统与 Node.js 保持更新
- [ ] 反向代理只暴露 80/443，Node 端口不直接对公网开放
- [ ] 上线前自己先注册首个账号，成为管理员
- [ ] 公开运营时准备隐私说明、用户协议与图片内容管理规则
- [ ] 不要把他人的真实生日、邮箱或评价截图发到公开仓库
- [ ] 定期检查 `data/uploads/` 占用空间

## 为什么不用 Serverless

本项目依赖：

- 本地 SQLite 文件
- 本地上传图片目录
- 服务端会话表
- `node:sqlite` 的同步文件访问

Vercel / Netlify 的函数实例通常没有持久磁盘，冷启动也会换文件系统，所以需要改造成托管数据库（如 Postgres）和对象存储（如 S3/R2）后才能部署。当前版本优先保证“一条命令在 VPS 上跑起来”，没有做这层改造。
