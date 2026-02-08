# Hackathon Starter - AI Agent Platform

基于 Monorepo 架构的 AI 智能体平台，支持智能体管理、工作流编排、知识库集成和工具扩展。

## 项目结构

```
hackathon-starter/
├── apps/
│   ├── agent-api/                    # NestJS 后端服务
│   │   ├── prisma/                   # 数据库模型与迁移
│   │   ├── src/
│   │   │   ├── agent/                # 智能体模块（CRUD、对话、标题生成）
│   │   │   ├── tool/                 # 工具与工具包模块
│   │   │   │   ├── toolkits/         # 内置工具包实现
│   │   │   │   ├── toolkits.decorator.ts
│   │   │   │   └── toolkits.service.ts  # 装饰器发现 + DB 同步
│   │   │   ├── workflow/             # 工作流模块
│   │   │   │   ├── workflows/        # 代码定义的内置工作流
│   │   │   │   ├── workflow.decorator.ts
│   │   │   │   ├── base-workflow.ts
│   │   │   │   ├── workflow-discovery.service.ts  # 装饰器发现 + DB 同步
│   │   │   │   ├── workflow.service.ts   # DSL 编译、执行、自然语言生成
│   │   │   │   ├── event-bus.ts          # RxJS 事件总线
│   │   │   │   └── workflow.ts           # 工作流执行引擎
│   │   │   ├── knowledge-base/       # 知识库模块（向量检索）
│   │   │   ├── llamaindex/           # LlamaIndex + OpenAI 集成
│   │   │   └── prisma/               # Prisma 数据库服务
│   │   └── Dockerfile
│   └── agent-web/                    # React 前端应用
│       ├── src/
│       │   ├── components/chat/      # 聊天界面组件
│       │   ├── pages/                # 管理页面（智能体、工作流、知识库、工具包）
│       │   ├── services/             # React Query API 封装
│       │   ├── hooks/                # 自定义 Hooks
│       │   ├── lib/                  # API 客户端、聊天存储、查询配置
│       │   └── types/                # TypeScript 类型定义
│       └── Dockerfile
├── packages/
│   ├── ui/                           # 共享 UI 组件库（Radix UI + Tailwind）
│   ├── eslint-config/                # 共享 ESLint 配置
│   └── typescript-config/            # 共享 TypeScript 配置
├── docker-compose.yml                # 开发环境（PostgreSQL + Redis + 应用）
├── docker-compose.prod.yml           # 生产环境
└── turbo.json                        # Turborepo 配置
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | NestJS 10 + TypeScript |
| 数据库 | PostgreSQL（pgvector）+ Prisma ORM |
| 缓存 | Redis |
| AI 集成 | LlamaIndex + OpenAI GPT-4.1 |
| 前端框架 | React 19 + Vite 6 + React Router 7 |
| 状态管理 | React Query (TanStack Query) |
| UI 组件 | Radix UI + Tailwind CSS 4 |
| Monorepo | Turborepo + PNPM Workspaces |
| 容器化 | Docker + Docker Compose |

## 核心功能

### 智能体管理

- 创建、编辑、删除智能体
- 为智能体分配工具包、知识库、工作流
- 对话聊天，首次对话自动调用 LLM 生成会话标题

### 工具包系统

通过 `@toolkitId()` 装饰器在代码中定义工具包，应用启动时自动发现并同步到数据库。

内置工具包：

| ID | 名称 | 功能 |
|----|------|------|
| `common-toolkit-01` | Common Tools | 时间查询（getCurrentTime） |
| `knowledge-base-toolkit-01` | Knowledge Base Toolkit | 知识库查询 |
| `knowledge-base-explorer-toolkit-01` | KB Explorer Toolkit | 知识库发现（DSL 生成用） |
| `tool-explorer-toolkit-01` | Tool Explorer Toolkit | 工具发现（DSL 生成用） |
| `workflow-toolkit-01` | Workflow Toolkit | 工作流执行（动态生成工具） |

### 工作流编排

支持两种创建方式：

1. **代码定义（内置）**：通过 `@workflowId()` 装饰器 + `BaseWorkflow` 抽象类在后端代码中定义，启动时自动同步到数据库，前端显示「内置工作流」标签，不可删除
2. **API 创建**：通过前端自然语言描述或手动填写 JSON DSL 创建

工作流基于事件驱动架构：
- `EventBus`：RxJS 事件发布/订阅
- `WorkflowContextStorage`：AsyncLocalStorage 上下文管理
- DSL 编译：动态函数生成，支持工具调用和智能体调用

内置工作流示例：

| ID | 名称 | 功能 |
|----|------|------|
| `time-query-workflow-01` | 智能聊天工作流 | 具备时间查询能力的自动回复机器人 |

#### 代码定义工作流示例

```typescript
// apps/agent-api/src/workflow/workflows/my-workflow.ts
import { workflowId } from '../workflow.decorator';
import { BaseWorkflow, WorkflowDsl } from '../base-workflow';

@workflowId('my-workflow-01')
export class MyWorkflow extends BaseWorkflow {
  readonly name = '我的工作流';
  readonly description = '示例工作流';

  getDsl(): WorkflowDsl {
    return {
      id: 'myWorkflow',
      name: this.name,
      description: this.description,
      version: 'v1',
      tools: ['getCurrentTime'],
      agents: [
        {
          name: 'MyAgent',
          description: '示例智能体',
          prompt: '你是一个助手。',
          output: { result: 'string' },
          tools: ['getCurrentTime'],
        },
      ],
      events: [
        { type: 'WORKFLOW_START', data: { input: 'string' } },
        { type: 'WORKFLOW_STOP', data: { result: 'string' } },
      ],
      steps: [
        {
          event: 'WORKFLOW_START',
          handle: `async (event, context) => {
            const response = await MyAgent.run(event.data.input);
            return { type: 'WORKFLOW_STOP', data: { result: response.data.result } };
          }`,
        },
      ],
    };
  }
}
```

然后在 `workflow.module.ts` 的 `providers` 中注册 `MyWorkflow`，重启即可。

### 知识库

- 创建知识库，上传文件，自动向量化（text-embedding-3-small）
- 智能体可关联知识库进行 RAG 检索
- 工作流 DSL 生成时自动发现可用知识库

## 数据模型

```
Agent ──┬── AgentToolkit ── Toolkit ── Tool
        ├── AgentKnowledgeBase ── KnowledgeBase ── File
        ├── AgentWorkflow ── WorkFlow ── WorkflowAgent
        └── AgentTool ── Tool
```

- `WorkFlow.source`：`"api"`（前端创建）或 `"code"`（代码定义）
- `Agent.isWorkflowGenerated`：标记工作流自动生成的智能体

## API 端点

### 智能体

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/agents` | 获取所有智能体 |
| GET | `/api/agents/:id` | 获取单个智能体 |
| POST | `/api/agents` | 创建智能体 |
| PUT | `/api/agents/:id` | 更新智能体 |
| DELETE | `/api/agents/:id` | 删除智能体 |
| POST | `/api/agents/:id/chat` | 与智能体对话（支持 `generateTitle`） |
| GET | `/api/agents/:id/toolkits` | 获取智能体工具包 |

### 工作流

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/workflows` | 获取所有工作流 |
| GET | `/api/workflows/:id` | 获取单个工作流 |
| POST | `/api/workflows` | 创建工作流 |
| DELETE | `/api/workflows/:id` | 删除工作流（内置工作流禁止删除） |
| POST | `/api/workflows/:id/execute` | 执行工作流 |
| POST | `/api/workflows/generate-dsl` | 自然语言生成 DSL |
| GET | `/api/workflows/:id/agents` | 获取工作流智能体 |
| PUT | `/api/workflows/:id/agents/:name` | 更新工作流智能体 |

### 工具包

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/toolkits` | 获取所有工具包 |

### 知识库

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/knowledge-base` | 获取所有知识库 |
| POST | `/api/knowledge-base` | 创建知识库 |
| PUT | `/api/knowledge-base/:id` | 更新知识库 |
| DELETE | `/api/knowledge-base/:id` | 删除知识库 |
| POST | `/api/knowledge-base/:id/files` | 上传文件 |
| POST | `/api/knowledge-base/:id/files/:fileId/train` | 训练文件 |
| DELETE | `/api/knowledge-base/:id/files/:fileId` | 删除文件 |
| POST | `/api/knowledge-base/:id/query` | 查询知识库 |

## 快速开始

### 环境要求

- Node.js >= 20
- Docker & Docker Compose
- PNPM >= 8

### 1. 克隆并安装

```bash
git clone <your-repo-url>
cd hackathon-starter
pnpm install
```

### 2. 配置环境变量

```bash
cp apps/agent-api/.env.example apps/agent-api/.env
```

编辑 `apps/agent-api/.env`，填入：

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hackathon
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
```

### 3. 启动数据库

```bash
docker compose up postgres redis -d
```

### 4. 初始化数据库

```bash
cd apps/agent-api
npx prisma migrate deploy
npx prisma db seed
```

### 5. 启动开发服务

```bash
# 根目录
pnpm dev
```

或使用 Docker 一键启动全部服务：

```bash
docker compose up -d
```

### 服务地址

| 服务 | 地址 | 端口 |
|------|------|------|
| 前端应用 | http://localhost:5173 | 5173 |
| API 服务 | http://localhost:3001 | 3001 |
| PostgreSQL | localhost:5432 | 5432 |
| Redis | localhost:6379 | 6379 |

## 常用命令

```bash
# 开发
pnpm dev                              # 启动所有应用
pnpm --filter agent-api run dev       # 仅启动后端
pnpm --filter agent-web run dev       # 仅启动前端

# 构建
pnpm build                            # 构建所有应用

# 数据库
cd apps/agent-api
npx prisma migrate dev --name xxx     # 创建迁移
npx prisma migrate deploy             # 应用迁移
npx prisma db seed                    # 填充种子数据
npx prisma studio                     # 打开数据库管理界面

# Docker
docker compose up -d                  # 启动开发环境
docker compose down                   # 停止服务
docker compose logs -f agent-api      # 查看后端日志
```

## 许可证

本项目采用 MIT 许可证。
