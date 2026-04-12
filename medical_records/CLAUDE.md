# 家庭诊疗记录

纯前端单文件 React 应用，用于记录家庭成员的就诊、用药、检查、症状等医疗信息。通过 GitHub Gist 实现跨设备同步，通过火山引擎 TOS 存储图片，通过火山引擎 AI 实现拍照/文字识别。

## 技术栈

| 技术 | 说明 |
|------|------|
| React 18 | CDN 加载，production build |
| Babel standalone | 浏览器端编译 JSX，无需构建工具 |
| 火山引擎 TOS SDK | CDN 加载，对象存储上传图片 |
| GitHub Gist API | 数据同步后端（免费，私有 Gist） |
| 火山引擎 Responses/Chat API | AI 图片/文字识别，json_schema 结构化输出 |
| GitHub Pages | 静态托管 |

**部署地址**: `https://comoysha.github.io/medical_records/`

## 文件结构

```
/Users/xiayue/家庭诊疗记录/
├── index.html          # 唯一源文件（~1550 行，含所有组件和逻辑）
├── CLAUDE.md           # 本文档
├── docs/
│   └── 火山引擎结构化输出.md
├── test_record.png     # 测试用图片
└── 王溪茉出生证明.JPG   # 测试用图片
```

## 数据模型

### 记录 (Record)

```
{
  id: string,               // 时间戳+随机字符
  memberId: string,         // 关联成员 ID
  type: "visit" | "medication" | "test" | "symptom" | "note",
  date: string,             // YYYY-MM-DD
  summary: string,          // 一句话概要（必填）
  hospital: string,
  doctor: string,
  diagnosis: string,
  medications: [{name, dosage}],
  tests: [{name, result}],
  notes: string,
  images: [{imageUrl, thumbUrl}],   // TOS URL（新格式）
  imageUrl/imageData: ...,          // 旧格式，兼容处理
  createdAt: number                 // 毫秒时间戳
}
```

### 成员 (Member)

```
{ id, name, avatar(emoji), color(hex) }
```

默认三人：我、女儿、妻子。最多 8 人。emoji 和名称可手动编辑。

### 各类型表单字段差异

| 字段 | 就诊 | 用药 | 检查 | 症状 | 备注 |
|------|------|------|------|------|------|
| summary | 就诊概要 | 用药概要 | 检查概要 | 症状描述 | 内容 |
| hospital | 必填 | 选填 | 必填 | - | - |
| doctor | 必填 | 选填 | 选填 | - | - |
| diagnosis | 必填 | - | 选填 | 选填 | - |
| medications | 有 | 核心 | - | - | - |
| tests | - | - | 核心 | - | - |

用药/检查使用结构化列表组件（ItemList），不是逗号分隔文本框。

## 存储架构

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ localStorage │     │ GitHub Gist  │     │ 火山引擎 TOS  │
│              │     │  (私有)       │     │  (公开读)      │
│ - 记录+成员   │◄───►│ - 记录+成员    │     │ - 原图 .jpg   │
│ - 各项配置    │     │ - deletedIds │     │ - 缩略图 _thumb│
│ - deletedIds │     │ - aiConfig   │     └──────────────┘
└─────────────┘     │ - tosConfig  │           ▲
                     └──────────────┘           │
                                          图片上传时写入
                                          记录中存 URL 引用
```

### localStorage 键

| 键 | 内容 |
|----|------|
| `family-medical-records` | `{members, records}` |
| `gist-sync-config` | `{token, gistId}` — 不同步，每台设备手填 |
| `volcengine-config` | `{url, apiKey, endpoint, apiType}` — 通过 Gist 同步 |
| `tos-config` | `{accessKeyId, accessKeySecret, bucket, region}` — 通过 Gist 同步 |
| `deleted-record-ids` | `[id1, id2, ...]` — 删除墓碑 |

### 同步机制

- **触发时机**: 页面加载自动拉取 / 新增、编辑、删除后立即推送 / 点 🔄 按钮手动触发
- **合并策略**: 成员取并集，记录按 ID 去重取 createdAt 较新的，deletedIds 取并集
- **配置恢复**: 新设备只填 Token + Gist ID → 同步后 AI 配置和 TOS 配置自动恢复
- **图片处理**: 推送前剔除 base64 数据（太大），只保留 TOS URL

## 用户操作流程

### 拍照识别（两步）

```
📸 按钮 → 选图/拍照 → AI 识别中... → 展示识别结果
  → "下一步" → 进入表单（预填 AI 结果 + 拍照图片）
  → 用户可编辑 → "保存记录"（图片上传 TOS，数据同步 Gist）
```

### 手动填写（三步选择）

```
✏️ 按钮 → 选成员（大按钮列表）→ 选类型（就诊/用药/检查/症状/备注）
  → 进入对应类型表单 → 填写 → "保存记录"
```

如果已在成员 tab 下，跳过选成员直接到选类型。

### AI 文字识别

```
在表单中 → "🤖 AI 识别文字" → 弹窗输入文字描述
  → AI 按当前类型提取信息 → 结果填入表单（覆盖）
```

每种类型有专属 prompt（TYPE_PROMPTS），引导 AI 重点关注对应字段。

### 编辑/删除

- 展开记录卡片 → "编辑"按钮 → 进入 EditForm（同 QuickForm 结构）
- 展开记录卡片 → "删除"按钮 → 确认后软删除（记入 deletedIds 墓碑）

### 图片

- 表单中可添加多张图片，每张可单独删除
- 记录卡片缩略图显示第一张 + 数量角标
- 点击图片 → 全屏查看 + 下载按钮

## 组件树

```
MedicalRecords (根组件，状态管理)
├── SettingsModal (AI + TOS 配置)
├── SyncSettingsModal (Gist 配置)
├── Header
│   ├── MemberManager (成员增删改)
│   ├── 同步/导出/设置 按钮
│   └── 统计信息
├── Content (根据 mode 切换)
│   ├── mode=list: MemberPill筛选 + RecordCard列表
│   │   └── RecordCard
│   │       ├── ImageViewer (大图弹窗)
│   │       └── EditForm (编辑模式)
│   │           ├── TypedFormFields (按类型渲染字段)
│   │           │   └── ItemList (用药/检查列表)
│   │           └── MultiImageAttachment
│   ├── mode=photo: PhotoCapture
│   │   ├── AI识别结果预览
│   │   └── QuickForm (下一步后)
│   ├── mode=select-member: 成员大按钮列表
│   ├── mode=select-type: 类型大按钮列表
│   └── mode=form: QuickForm
│       ├── TypedFormFields
│       ├── MultiImageAttachment
│       └── AiTextModal (AI文字识别弹窗)
└── FAB 底部按钮 (📸 ✏️ 🔄)
```

## API 集成

### 火山引擎 AI（Responses API，默认）

```
POST {baseUrl}/responses
Body: {
  model: "{endpoint}",
  thinking: { type: "disabled" },
  text: { format: MEDICAL_RECORD_SCHEMA },  // json_schema 结构化输出
  input: [
    { role: "system", content: "..." },
    { role: "user", content: [
      { type: "input_image", image_url: "data:..." },
      { type: "input_text", text: "..." }
    ]}
  ]
}
```

也支持 Chat API（`/chat/completions`），可在设置中切换。

### GitHub Gist API

- `POST /gists` — 创建私有 Gist
- `GET /gists/{id}` — 拉取数据
- `PATCH /gists/{id}` — 推送数据（409 冲突自动重试 2 次）
- 认证: `Authorization: token {ghp_xxx}`
- 文件名: `medical-records.json`

### 火山引擎 TOS

- 初始化 `new TOS({accessKeyId, accessKeySecret, region, endpoint, bucket})`
- 上传: `client.putObject({key, body})`
- 路径: `medical-images/{recordId}.{ext}` / `medical-images/{recordId}_thumb.{ext}`
- Bucket 策略: `medical-images/*` 路径公开读

## 重构注意事项

1. **单文件局限**: 1550 行全在一个 `<script type="text/babel">` 里，Babel 运行时编译。如需拆分，需引入构建工具（Vite 等），同时改变部署方式。

2. **图片兼容性**: 旧记录用 `imageUrl`/`imageData`（单值），新记录用 `images` 数组。`getRecordImages()` 函数负责兼容转换。推送同步时 `stripBase64()` 剔除 base64 只保留 URL。

3. **无 TypeScript**: 所有类型约束靠运行时。数据结构变更需要同时改 AI 的 `MEDICAL_RECORD_SCHEMA`。

4. **避免 Babel 不支持的语法**: 对象解构 rest spread（`({a, ...rest}) => rest`）会让 Babel standalone 静默失败导致白屏。用 `Object.assign` + `delete` 替代。

5. **状态分散**: 配置存 3 个不同的 localStorage 键，同步逻辑在 gistSync.push 里拼装。未来可统一为一个 config store。

6. **TOS 密钥暴露**: AK/SK 存在浏览器端 localStorage 和 Gist 中。生产环境应改为 STS 临时凭证或后端签名。

7. **样式**: 全部 inline style，无 CSS 类。如需样式复用，可提取为 CSS 文件或 CSS-in-JS 方案。
