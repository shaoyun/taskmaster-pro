<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# TaskMaster Pro

一个功能强大、设计精美的现代化任务管理应用，集成了 AI 辅助任务分解与直观的日历视图。

</div>

## ✨ 核心特性

- **🤖 AI 智能辅助**：集成 Google Gemini AI，支持一键将复杂任务分解为可执行的子任务。
- **📅 高级日历视图**：
  - **周视图优化**：智能滚动定位到最早任务，支持多任务堆叠显示，悬停自动浮起。
  - **节假日支持**：自动标记节假日与补班信息。
  - **任务热力图**：通过日期右上角的颜色指示器直观展示每日工作负载。
- **✅ 完善的任务追踪**：
  - 记录任务详细完成时间 (`completed_at`)。
  - 延期任务醒目提示（红色边框）。
  - 支持四象限（优先级）管理。
- **🎨 现代化 UI 设计**：基于 Tailwind CSS 的清爽设计，响应式布局适配各尺寸屏幕。

## 🛠️ 技术栈

- **前端框架**：[React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**：[Vite](https://vitejs.dev/)
- **样式方案**：[Tailwind CSS](https://tailwindcss.com/)
- **后端服务**：[Supabase](https://supabase.com/) (部分功能直接调用或配合后端逻辑)
- **AI 能力**：Google Gemini API
- **容器化**：Docker + Nginx

## 📂 目录结构

```
taskmaster-pro/
├── components/          # React 组件
│   ├── Calendar/        # 日历视图相关组件 (WeekView, MonthView)
│   ├── TaskCard.tsx     # 任务卡片组件
│   ├── TaskModal.tsx    # 任务编辑/新建弹窗
│   └── ...
├── services/            # 业务逻辑与 API 服务
│   ├── geminiService.ts # AI 任务分解服务
│   ├── supabaseClient.ts# Supabase 客户端配置
│   └── ...
├── docs/                # 项目文档
│   ├── deployment-guide.md      # 部署指南
│   └── completed-at-feature.md  # 完成时间功能设计文档
├── migrations/          # 数据库迁移脚本
├── Dockerfile          # Docker 构建配置
├── docker-compose.yml  # Docker Compose配置
└── REQUIREMENTS.md     # 详细需求文档
```

## 🚀 快速开始

### 前置要求

- Node.js (v18+)
- Docker & Docker Compose (可选，用于容器化部署)
- Google Cloud Gemini API Key
- Supabase 项目 (URL & Anon Key)

### 本地开发

1. **安装依赖**
   ```bash
   npm install
   ```

2. **配置环境变量**
   复制 `.env.example` 为 `.env.local` 并填入你的 API Key：
   ```bash
   cp .env.example .env.local
   ```
   *注意：本地开发推荐使用 `.env.local`，它会被 git 忽略。*

3. **启动开发服务器**
   ```bash
   npm run dev
   ```
   访问 `http://localhost:3000` 即可看到应用。

### 🐳 Docker 部署

1. **配置环境变量**
   在根目录创建 `.env` 文件（参考 `.env.example`），确保包含以下变量：
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   GEMINI_API_KEY=your_gemini_key
   ```

2. **构建并启动容器**
   ```bash
   docker-compose build
   docker-compose up -d
   ```
   访问 `http://localhost:8080`。

## 📖 文档索引

更详细的功能设计与部署说明请参考 `docs/` 目录：

- [部署指南 (Deployment Guide)](docs/deployment-guide.md)
- [完成时间功能设计 (Completed At Feature)](docs/completed-at-feature.md)
- [详细需求列表 (Requirements)](docs/REQUIREMENTS.md)

## 📝 许可证

This project is licensed under the MIT License.
