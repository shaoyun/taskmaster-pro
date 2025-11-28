# 完成时间功能部署指南

## 快速开始

本指南说明如何部署任务完成时间（`completed_at`）功能。

## 部署步骤

### 1. 数据库迁移

在 Supabase Dashboard 的 SQL Editor 中执行以下迁移脚本：

```sql
-- 文件位置: migrations/001_add_completed_at.sql

ALTER TABLE public.tasks
ADD COLUMN completed_at timestamp with time zone NULL;

COMMENT ON COLUMN public.tasks.completed_at IS
  'Timestamp when the task was marked as DONE.
   Automatically set when status changes to DONE,
   cleared when status changes from DONE to other states.';
```

或者如果你有命令行访问权限：

```bash
# 使用 psql
psql -h <your-db-host> -U <your-db-user> -d <your-db-name> -f migrations/001_add_completed_at.sql

# 或使用 Supabase CLI
supabase db push
```

### 2. 验证数据库更改

在 SQL Editor 中运行以下查询验证字段已添加：

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name = 'completed_at';
```

预期输出：
```
column_name   | data_type                   | is_nullable
--------------+-----------------------------+-------------
completed_at  | timestamp with time zone    | YES
```

### 3. 部署前端代码

所有必要的代码更改已完成，包括：

- ✅ TypeScript 类型定义更新 ([types.ts](../types.ts:25))
- ✅ 数据服务层更新 ([services/taskService.ts](../services/taskService.ts))
- ✅ UI 组件更新 ([components/TaskCard.tsx](../components/TaskCard.tsx:73-78))
- ✅ 主应用逻辑更新 ([App.tsx](../App.tsx))

构建和部署应用：

```bash
# 安装依赖（如果需要）
npm install

# 构建
npm run build

# 部署（根据你的部署方式）
# 例如，如果使用 Docker
docker-compose up -d --build
```

### 4. 功能验证

部署完成后，进行以下测试：

#### 测试 1: 创建新任务并标记完成
1. 创建一个新任务（状态为 TODO）
2. 点击任务卡片上的圆圈图标，将状态切换到 DONE
3. 验证任务卡片显示"完成于 XX月XX日 XX:XX"

#### 测试 2: 取消完成状态
1. 选择一个已完成的任务
2. 再次点击图标，将状态改回 TODO
3. 验证完成时间标签消失

#### 测试 3: 查看所有任务表格
1. 切换到"所有任务"视图
2. 验证表格中有"完成时间"列
3. 已完成的任务显示绿色时间，未完成的显示 `-`

#### 测试 4: 编辑已完成任务
1. 编辑一个已完成任务的标题或描述
2. 保存后验证完成时间没有变化

### 5. 常见问题

**Q: 现有的已完成任务没有显示完成时间怎么办？**

A: 这是预期行为。`completed_at` 字段只会在任务状态变更为 DONE 时设置。现有的已完成任务在数据库迁移前完成，因此该字段为空。如果需要，可以手动为这些任务设置完成时间：

```sql
-- 可选：为现有已完成任务设置完成时间为创建时间
UPDATE public.tasks
SET completed_at = created_at
WHERE status = 'DONE' AND completed_at IS NULL;
```

**Q: 时区显示不正确怎么办？**

A: 确保：
1. 数据库使用 `timestamp with time zone` 类型
2. JavaScript 使用 `.toISOString()` 生成时间戳
3. 浏览器的时区设置正确

**Q: 需要回滚怎么办？**

A: 执行以下 SQL 删除 `completed_at` 字段：

```sql
ALTER TABLE public.tasks DROP COLUMN completed_at;
```

然后回滚到之前的代码版本。

## 相关文档

- [完整设计文档](./completed-at-feature.md)
- [数据库迁移脚本](../migrations/001_add_completed_at.sql)

## 技术支持

如有问题，请参考：
- 设计文档中的测试场景
- 检查浏览器控制台的错误信息
- 验证 Supabase 连接配置
