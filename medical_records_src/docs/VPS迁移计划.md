# 家庭诊疗记录 · VPS 自托管迁移计划

> 把现有「GitHub Gist 单文件同步」改造成「VPS + Docker + 数据库」的多人协作后端。
> 本文是方案与待办清单，实施前的决策都已在此固化。

---

## 1. 为什么要改

当前架构：纯前端 SPA（Vite + React）+ localStorage 缓存 + 单个私有 Gist（`medical-records.json`）做跨设备同步，图片在火山引擎 TOS，AI/OCR 走火山引擎 API。

痛点：

1. **Gist 整文件覆盖** —— 多端并发写必然丢数据（现有 409 重试本质也只是「后写覆盖」）。
2. **单一 Gist = 单租户** —— 多人共用就是抢同一个文件，无法隔离。
3. **密钥暴露** —— TOS 的 AK/SK、AI Key 都落在浏览器 localStorage 和 Gist 里。
4. **没有真正的用户/设备概念** —— 无法吊销某台设备、无法审计谁改了什么。

---

## 2. 已敲定的技术选型

| 维度 | 选择 | 理由 |
|------|------|------|
| 后端 | **Node 20 + Fastify + Prisma** | 与前端同语言，类型/校验一致，迁移和查询体验好，上下文切换最少 |
| 数据库 | **PostgreSQL 16** | 成熟、JSONB 适合弱结构字段、乐观锁好做 |
| 图片存储 | **继续用火山引擎 TOS** | 已有数据不迁移；但 AK/SK 收回后端，前端改走签名直传 |
| 反代 / TLS | **Caddy** | 自动 Let's Encrypt，配置最短 |
| 实时同步 | **WebSocket**（`ws`） | 记录变更广播，驱动多端近实时刷新 |
| 部署 | **Docker Compose** | caddy + api + postgres 一键起 |
| 前端托管 | 暂留 **GitHub Pages** | 后端开 CORS 放行 `https://comoysha.github.io`；以后也可一并搬到 VPS |
| VPS 现状 | **已有 VPS + 已绑域名** | Caddy 直接走自动 HTTPS |

---

## 3. 租户与认证模型（核心设计）

### 3.1 范围

- **多 family**：你（VPS 拥有者）可以给朋友、亲戚开通，各家数据完全隔离。
- **但不是公开服务**：没有公开注册页，能不能开新 family 由你这个管理员把关。

### 3.2 两层 token，职责分清

```
你（VPS 拥有者）：.env 里有一个 ADMIN_TOKEN（私藏，不进 git / 不进数据库）
      │
      ▼  POST /admin/families   (Authorization: Bearer ADMIN_TOKEN)
      │  body: { familyName: "张三家" }
      ▼
服务端生成一次性 setup token（32 位），返回 URL：
      https://your.domain/setup?token=xxxxxxxx
      │
      │   你把这个 URL 发给张三
      ▼
张三打开 → POST /setup?token=xxxxxxxx
      ├─ 建 family + 张三的第一个 device
      ├─ 把该 setup token 标记 used_at（再点即 403）
      └─ 返回 deviceToken（JWT，长效）写入张三浏览器
      │
      ▼
张三在 App 内 → 生成「家庭邀请码」发给老婆 → 老婆扫码 / 输码加入张三的 family
```

- **setup_token**：跨家庭，**你**（VPS 管理员）发出，一次性。
- **invite code**：家庭内部，**每个家庭的 owner** 给自家人发，一次性、短期过期。

### 3.3 为什么不用「设备指纹防重复创建」

最初设想过「同一设备不许创建第二个 family」，结论是**不采用**：

- 设备指纹（browser fingerprint）不可靠：换浏览器 / 隐身模式 / 清缓存 → 指纹就变。
- 反向误伤：一家人共用一台电脑/浏览器 → 指纹相同会被挡。
- 挡不住真想绕的人，却会把正常使用挡掉。

改用「**管理员预先签发一次性 setup token**」从源头控制，简单且安全。

---

## 4. 数据库 Schema（精简版）

```sql
-- ===== 认证 / 租户 =====
families      (id, name, created_by_admin, created_at)
setup_tokens  (token_hash, family_name, created_at, used_at, expires_at)  -- 跨家庭，管理员签发，一次性
invites       (code_hash, family_id, expires_at, used_at)                 -- 家庭内部，owner 签发，一次性
devices       (id, family_id, name, token_hash, last_seen, revoked_at)    -- 每台设备一条，可吊销

-- ===== 业务 =====
members       (id, family_id, name, avatar, color, sort_order,
               updated_at, deleted_at)
records       (id, family_id, member_id, type, date, summary,
               hospital, doctor, diagnosis, notes,
               data JSONB,                       -- medications / tests 等弱结构字段
               created_by_device, updated_by_device,
               created_at, updated_at,
               version INT,                      -- 乐观锁
               deleted_at)                       -- 软删
record_images (id, record_id, image_key, thumb_key, uploaded_at)
change_log    (id BIGSERIAL, family_id, entity, entity_id, op, device_id, at)  -- 增量同步真相源

CREATE INDEX ON records (family_id, date DESC);
CREATE INDEX ON records USING GIN (data);
CREATE INDEX ON change_log (family_id, id);
```

> 所有业务表都带 `family_id`，天然多租户隔离；查询一律按当前 device 所属 family 过滤。

---

## 5. API 草案

```
# 管理员（你）
POST   /admin/families         建 family + 返回一次性 setup URL    (Bearer ADMIN_TOKEN)
GET    /admin/families         列出所有 family / 状态              (Bearer ADMIN_TOKEN)
DELETE /admin/families/:id     吊销某个 family                     (Bearer ADMIN_TOKEN)

# 家庭入口
POST   /setup?token=…          用一次性 setup token 建家庭，返回 deviceToken
POST   /auth/invite            family owner 生成邀请码             (Bearer deviceToken)
POST   /auth/join?code=…       用邀请码加入家庭，返回 deviceToken
POST   /auth/revoke/:deviceId  吊销家庭内某台设备                  (Bearer deviceToken)

# 业务（全部 Bearer deviceToken，按 family 隔离）
GET    /members
POST   /members
PATCH  /members/:id            If-Match: <version>
DELETE /members/:id
GET    /records?since=…&limit=…
POST   /records
PATCH  /records/:id            If-Match: <version>
DELETE /records/:id
POST   /upload/sign            返回 TOS 签名直传 URL（AK/SK 不下发前端）
GET    /sync/stream            WebSocket，推 { entity, id, version }
POST   /ai/extract             （可选）后端代理火山 AI，收回 AI Key
```

---

## 6. 多人并发编辑策略

不再「整文件覆盖」，改为 **按记录粒度 + 乐观锁**：

1. **写**：`PATCH /records/:id` 带 `If-Match: <version>`；服务端
   `UPDATE records SET …, version = version + 1 WHERE id = $1 AND version = $2 RETURNING version`；
   版本不符返回 `409` + 当前版本，前端拉新版后重试（v1 可先简单提示「远端已更新，点击刷新」）。
2. **增量同步**：`GET /records?since=<lastChangeId>` 拿增量，按 entity+id 应用到本地。
3. **实时推送**：WebSocket 订阅 `family/:id`，任何写完成后服务端广播 `{ entity, id, version }`，其他在线端按需拉该条。
4. **离线**：保留 IndexedDB 本地镜像 + 出站操作队列；恢复网络后先 `GET /records?since=…`，再回放队列（冲突走上面的 If-Match）。

软删继续用 `deleted_at`，但 tombstone 不再需要塞前端 —— 服务端 `change_log` 就是真相源。

---

## 7. 仓库结构

```
medical_records_src/            ← 现有前端
└── src/services/apiClient.js   ← 新增，替换 gistSync.js

medical_records_api/            ← 新建后端
├── src/
│   ├── server.js               ← Fastify 启动
│   ├── routes/                 ← admin, setup, auth, members, records, upload
│   ├── lib/                    ← prisma, jwt, tosSign
│   └── ws/                     ← WebSocket 广播
├── prisma/schema.prisma
├── migrations/0001_init.sql
├── scripts/import-gist.mjs     ← 一次性：旧 Gist JSON → Postgres
├── Dockerfile
└── package.json

deploy/                         ← 新建部署配置
├── docker-compose.yml          ← caddy + api + postgres
├── Caddyfile                   ← your.domain → api:3000，含 /sync/stream 的 WS upgrade
└── .env.example                ← ADMIN_TOKEN / DB / TOS 等
```

---

## 8. 实施路线图

| # | 任务 | 依赖 | 产出 |
|---|------|------|------|
| 1 | 新建 `medical_records_api/` + `deploy/`：Prisma schema、Fastify 骨架、Compose、Caddyfile | 域名 | `docker compose up` 跑起空 API |
| 2 | members/records CRUD（含 `If-Match` 乐观锁）+ admin/setup/invite/join 认证流 + 单测 | 1 | 用 curl 能跑通完整认证与增删改 |
| 3 | `scripts/import-gist.mjs`：拉一次现有 Gist → 灌进 Postgres（打 `imported_from=gist` 标记） | 2 | 历史数据进库，可回滚 |
| 4 | 前端 `apiClient.js` 替换 `gistSync.js`；保留 IndexedDB 离线队列；Gist 降级为只读导入 | 2 | 前后端打通，单端流畅 |
| 5 | `/upload/sign` + 前端改 `tosHelper.js` 走签名地址；**从前端清掉 AK/SK** | 2 | 密钥不再出现在浏览器 |
| 6 | WebSocket `/sync/stream` 广播 + 前端订阅 | 4 | 多端近实时 |
| 7 | 冲突 UI（最简：「远端已更新，点击刷新」） | 6 | 多端编辑安全 |
| 8 | `pg_dump` 每日备份 cron + Uptime Kuma 健康检查 | 1 | 可长期运行 |
| 9 |（可选）AI 代理 `POST /ai/extract`，收回火山 AI Key | 1 | 全部密钥归后端 |

**建议第一刀**：只做阶段 1 —— 起空 API、能 `docker compose up`，**先不动前端**。验证认证模型 OK 再推进。

---

## 9. ✅ 我（VPS 拥有者）需要做的事

### 一次性准备

- [ ] VPS 上装好 Docker + Docker Compose。
- [ ] 域名解析 A 记录指向 VPS IP（Caddy 自动签 HTTPS 证书需要）。
- [ ] 开放防火墙 80 / 443 端口。
- [ ] 复制 `deploy/.env.example` 为 `.env`，填写：
  - `ADMIN_TOKEN`：自己随机生成一长串（例如 `openssl rand -hex 32`），**私藏，别进 git**。
  - `POSTGRES_PASSWORD`：数据库密码。
  - `TOS_*`：火山引擎 TOS 的 AK/SK、bucket、region、endpoint（从原前端配置里挪过来）。
  - `DOMAIN`：你的域名。
- [ ] `docker compose up -d` 启动。

### 给一个家庭开通（每次）

```bash
# 1. 用管理员 token 创建 family，拿到一次性 setup URL
curl -X POST https://your.domain/admin/families \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"familyName":"张三家"}'
# → 返回 { "setupUrl": "https://your.domain/setup?token=xxxxxxxx" }

# 2. 把 setupUrl 发给张三（微信/短信均可，一次性、会过期）
```

之后张三家内部加人（邀请老婆/孩子）由**张三自己在 App 里**生成邀请码，不需要你管。

### 日常维护

- [ ] 确认 `pg_dump` 每日备份在跑，且备份文件有异地副本（阶段 8）。
- [ ] 偶尔看一眼 Uptime Kuma，服务挂了能收到通知。
- [ ] 有人设备丢了 → 让对方 family owner 在设置里吊销那台 device。

---

## 10. 🚀 如果哪天朋友太多（未来增强，非 v1）

v1 用 `curl` 手动开 family 就够。等家庭多到手动开嫌烦时，再加一个**管理员页**：

- 前端单独一个 `/admin` 页面（或独立小工具），输入 `ADMIN_TOKEN` 登录。
- 功能：
  - 列出所有 family（名称、设备数、最后活跃时间、记录数）。
  - 一键「新建 family」→ 自动生成 setup URL + 二维码，复制即可发出去。
  - 吊销某个 family / 某台设备。
  - 看用量（各 family 记录数、TOS 图片占用），方便判断要不要限额。
- 再往后若要做成**公开服务**，才需要：注册流程、邮箱验证、限流、配额、付费等 —— 那是另一个量级的工程，目前**不在计划内**。

---

## 11. 风险与回滚

- **数据迁移可回滚**：导入脚本打 `imported_from=gist` 标记；前端切换用灰度开关；上线后前两周保留 Gist 作只读备份，确认无误再停。
- **TOS 密钥下放**：优先用火山 **STS**（`AssumeRole` 拿 1 小时短期 AK/SK，策略限定 `medical-images/{recordId}/*`）；嫌折腾则退化为后端用主 AK/SK 做预签名 PUT。
- **单点故障**：VPS 挂了全家不可用 —— 靠每日备份 + 健康告警兜底；前端 IndexedDB 离线缓存保证「断网也能看 / 能记，恢复后回放」。
