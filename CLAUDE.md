# CLAUDE.md

本文件为 Claude Code 在本项目中工作时提供指引。

## 项目概览

基于 Monorepo 架构的 AI 智能体平台。包含两个应用：`agent-api`（NestJS 后端）和 `agent-web`（React 前端），共享 UI 组件位于 `packages/ui`。

## Monorepo 结构

```
apps/agent-api    → NestJS 10 + Prisma + PostgreSQL + LlamaIndex
apps/agent-web    → React 19 + Vite 6 + React Router 7 + TanStack Query
packages/ui       → Radix UI + Tailwind CSS 4 共享组件库
```

包管理器：**pnpm 10.4.1**（禁止使用 npm 或 yarn）。
构建编排：**Turborepo**。

## 常用命令

```bash
# 开发（在根目录执行）
pnpm dev                              # 启动所有应用
pnpm --filter agent-api run dev       # 仅启动后端
pnpm --filter agent-web run dev       # 仅启动前端

# 类型检查
cd apps/agent-api && npx tsc --noEmit   # 后端
cd apps/agent-web && npx tsc --noEmit   # 前端

# 数据库（在 apps/agent-api/ 目录下执行）
npx prisma migrate dev --name <name>    # 创建迁移（交互式，非交互环境可能失败）
npx prisma migrate deploy               # 应用迁移（非交互式）
npx prisma generate                     # Schema 变更后重新生成 Prisma Client
npx prisma db seed                      # 填充种子数据
npx prisma studio                       # 数据库可视化管理

# 构建
pnpm build                              # 构建所有应用

# 代码检查与格式化
pnpm lint                               # 检查所有应用
pnpm format                             # Prettier 格式化
```

## 后端架构（agent-api）

### 模块模式

NestJS 模块位于 `apps/agent-api/src/`，每个模块包含：
- `*.module.ts` — 模块定义（imports、providers、exports）
- `*.controller.ts` — HTTP 端点
- `*.service.ts` — 业务逻辑
- `*.type.ts` 或 `*.dto.ts` — DTO，使用 class-validator 装饰器校验

### 核心模块

| 模块 | 路径 | 职责 |
|------|------|------|
| Agent | `src/agent/` | 智能体 CRUD、对话、标题生成 |
| Tool | `src/tool/` | 工具包发现、工具管理 |
| Workflow | `src/workflow/` | 工作流 DSL 编译、执行、发现 |
| KnowledgeBase | `src/knowledge-base/` | 向量存储、文件上传、RAG 检索 |
| LlamaIndex | `src/llamaindex/` | LLM 集成（OpenAI） |
| Prisma | `src/prisma/` | 数据库服务 |

### 装饰器发现模式

工具包和工作流使用相同的发现模式：
1. 装饰器（`@toolkitId()` / `@workflowId()`）设置 Reflect 元数据并附加 `@Injectable()`
2. 类继承基类（`BaseToolkit` / `BaseWorkflow`）
3. 在模块的 providers 数组中注册
4. 发现服务在 `onModuleInit()` 中通过 `DiscoveryService.getProviders()` + `Reflector.get()` 扫描
5. 启动时 upsert 到数据库，清理已移除的条目

### 新增工具包

1. 在 `src/tool/toolkits/` 下创建文件
2. 使用 `@toolkitId('my-toolkit-01')` 装饰
3. 继承 `BaseToolkit`，实现 `initTools()`、`validateSettings()`
4. 在 `src/tool/tools.module.ts` 的 providers 数组中注册

### 新增代码定义工作流

1. 在 `src/workflow/workflows/` 下创建文件
2. 使用 `@workflowId('my-workflow-01')` 装饰
3. 继承 `BaseWorkflow`，实现 `name`、`description`、`getDsl()`
4. 在 `src/workflow/workflow.module.ts` 的 providers 数组中注册

### 数据库

- PostgreSQL + pgvector 扩展
- ORM：Prisma 5.10.2
- Schema 文件：`apps/agent-api/prisma/schema.prisma`
- Schema 变更后：执行 `npx prisma migrate deploy` 然后 `npx prisma generate`
- 非交互环境下：手动在 `prisma/migrations/<时间戳>_<名称>/migration.sql` 创建迁移 SQL，再执行 `npx prisma migrate deploy`

### 核心数据模型

- `Agent` — 智能体（prompt、options）
- `Toolkit` / `Tool` — 代码发现的工具包及其工具
- `WorkFlow` — 工作流定义（DSL JSON），`source` 字段区分来源：`"api"`（前端创建）或 `"code"`（代码定义）
- `KnowledgeBase` / `File` — 向量存储及上传文件
- 关联表：`AgentToolkit`、`AgentTool`、`AgentWorkflow`、`AgentKnowledgeBase`、`WorkflowAgent`

### TypeScript 配置（后端）

- `emitDecoratorMetadata: true`、`experimentalDecorators: true`（NestJS 必需）
- `module: "node16"`、`target: "ES2021"`
- `strictNullChecks: false`、`noImplicitAny: false`
- 导入路径：使用相对路径（如 `import { PrismaService } from '../prisma/prisma.service'`）

## 前端架构（agent-web）

### 技术栈

- React 19 + Vite 6 + React Router 7
- TanStack Query 管理服务端状态
- Radix UI 组件通过 `@workspace/ui` 引入
- Tailwind CSS 4
- 聊天会话存储在浏览器 localStorage（无服务端持久化）

### 关键目录

| 路径 | 职责 |
|------|------|
| `src/components/chat/` | 聊天界面（ChatPage、ChatMessages、ChatInput、ChatSidebar） |
| `src/pages/` | 管理页面（Agents、Workflows、KnowledgeBases、Toolkits） |
| `src/services/` | React Query hooks，封装 API 调用 |
| `src/hooks/` | 自定义 Hooks（聊天会话、确认弹窗、侧边栏） |
| `src/lib/api.ts` | API 客户端类，基础 URL `http://localhost:3001/api` |
| `src/lib/chat-storage.ts` | 基于 localStorage 的聊天会话管理 |
| `src/types/index.ts` | 所有 TypeScript 接口和 DTO 定义 |

### TypeScript 配置（前端）

- `strict: true`、`noUnusedLocals: true`、`noUnusedParameters: true`
- `moduleResolution: "bundler"`、`jsx: "react-jsx"`
- 路径别名：`@workspace/ui/*` → `packages/ui/src/*`

### 新增前端类型

更新 `apps/agent-web/src/types/index.ts`。后端 DTO 与前端接口需手动保持同步。

## 代码风格

- Prettier：100 字符宽度、单引号、尾逗号（es5）、分号
- 界面文本使用简体中文
- 代码中不使用 emoji（除非明确要求）
- 优先编辑已有文件，避免创建新文件
- 后端注释使用中文；前端 UI 字符串使用中文

## 环境变量

后端（`apps/agent-api/.env`）：
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hackathon
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=<key>
OPENAI_BASE_URL=<url>
LLAMA_CLOUD_API_KEY=<key>
```

## 端口

| 服务 | 端口 |
|------|------|
| agent-web（Vite） | 5179 |
| agent-api（NestJS） | 3001 |
| PostgreSQL | 5432 |
| Redis | 6379 |

## 变更后验证清单

每次修改后务必验证：
1. `cd apps/agent-api && npx tsc --noEmit` — 后端编译通过
2. `cd apps/agent-web && npx tsc --noEmit` — 前端编译通过
3. 若修改了 schema.prisma：确认迁移已创建/应用 + 执行 `npx prisma generate`
4. 若修改了后端类型：检查前端 `types/index.ts` 是否需要同步更新
