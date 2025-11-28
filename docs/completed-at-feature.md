# 任务完成时间功能设计文档

## 概述

本文档描述了任务完成时间（`completed_at`）字段的设计和实现要求。

## 功能需求

### 1. 数据库字段

- **字段名**: `completed_at`
- **类型**: `timestamp with time zone`
- **可空**: `NULL`
- **说明**: 记录任务被标记为完成时的时间戳，包含时区信息以确保跨时区的准确性

### 2. 业务逻辑

#### 2.1 自动设置完成时间

当任务状态变更为 `DONE` 时：
- 如果 `completed_at` 为空，自动设置为当前时间（包含时区）
- 如果 `completed_at` 已有值（任务之前已完成过），保留原有值

#### 2.2 清空完成时间

当任务状态从 `DONE` 变更为其他状态（`TODO` 或 `IN_PROGRESS`）时：
- 自动清空 `completed_at` 字段（设置为 `NULL`）
- 这确保了完成时间只在任务处于完成状态时有效

#### 2.3 更新任务时的处理

在更新任务的其他字段（标题、描述、优先级、截止时间等）时：
- **不要覆盖** `completed_at` 字段
- 只有在状态变更时才更新 `completed_at`
- 这保证了完成时间的准确性和一致性

### 3. 用户界面

#### 3.1 已完成任务列表

在已完成任务视图中：
- 显示任务的完成时间
- 格式：`完成于 MM月dd日 HH:mm`
- 使用绿色徽章突出显示
- 显示时考虑用户本地时区

#### 3.2 所有任务表格视图

在所有任务的表格视图中：
- 添加"完成时间"列
- 对于已完成的任务，显示完成时间（绿色文字）
- 对于未完成的任务，显示 `-`

## 实现细节

### 数据库迁移

```sql
-- 迁移文件: migrations/001_add_completed_at.sql
ALTER TABLE public.tasks
ADD COLUMN completed_at timestamp with time zone NULL;

COMMENT ON COLUMN public.tasks.completed_at IS
  'Timestamp when the task was marked as DONE.
   Automatically set when status changes to DONE,
   cleared when status changes from DONE to other states.';
```

### TypeScript 类型定义

```typescript
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null; // ISO Date string - when task was marked as DONE
}
```

### 服务层实现

#### 创建任务

```typescript
async createTask(task: Task): Promise<void> {
  // ...
  const { error } = await supabase.from('tasks').insert({
    // ... other fields
    completed_at: task.status === TaskStatus.DONE
      ? new Date().toISOString()
      : null,
  });
  // ...
}
```

#### 更新任务

```typescript
async updateTask(task: Task): Promise<void> {
  // Determine completed_at based on status
  let completedAt: string | null;
  if (task.status === TaskStatus.DONE) {
    // If task is being marked as DONE, set completed_at to now (if not already set)
    completedAt = task.completedAt || new Date().toISOString();
  } else {
    // If task status is changed from DONE to other status, clear completed_at
    completedAt = null;
  }

  const { error } = await supabase
    .from('tasks')
    .update({
      // ... other fields
      completed_at: completedAt,
    })
    .eq('id', task.id);
  // ...
}
```

## 时区处理

### 原则

1. **存储**: 所有时间戳在数据库中使用 `timestamp with time zone` 类型存储
2. **传输**: 前后端之间使用 ISO 8601 格式字符串（包含时区信息）
3. **显示**: 在用户界面显示时自动转换为用户本地时区

### 实现

- 数据库: `timestamp with time zone` - PostgreSQL 会自动处理时区转换
- JavaScript: 使用 `new Date().toISOString()` 生成 ISO 8601 格式
- 显示: `date-fns` 的 `format()` 函数会自动使用本地时区

## 测试场景

### 场景 1: 创建已完成任务

1. 创建一个状态为 `DONE` 的新任务
2. 验证 `completed_at` 被设置为当前时间

### 场景 2: 标记任务为完成

1. 创建一个状态为 `TODO` 的任务
2. 更新状态为 `DONE`
3. 验证 `completed_at` 被设置为当前时间

### 场景 3: 取消完成状态

1. 将已完成的任务状态改为 `TODO` 或 `IN_PROGRESS`
2. 验证 `completed_at` 被清空

### 场景 4: 更新已完成任务的其他字段

1. 更新已完成任务的标题、描述或优先级
2. 验证 `completed_at` 保持不变

### 场景 5: 跨时区显示

1. 在不同时区创建和完成任务
2. 验证完成时间在不同时区正确显示

## 部署步骤

1. **数据库迁移**
   ```bash
   # 在 Supabase SQL Editor 中执行迁移脚本
   psql -f migrations/001_add_completed_at.sql
   ```

2. **代码部署**
   - 确保所有代码更改已提交
   - 部署更新后的前端代码

3. **验证**
   - 测试创建新任务
   - 测试状态切换
   - 验证已完成任务显示完成时间

## 注意事项

1. **兼容性**: 现有的已完成任务的 `completed_at` 字段为 `NULL`，这是预期行为
2. **性能**: `completed_at` 字段未添加索引，如果需要基于完成时间的查询性能优化，可考虑添加索引
3. **数据完整性**: `completed_at` 的值完全由系统管理，不应由用户直接修改

## 版本历史

- **v1.0** (2025-11-28): 初始版本，实现基本的完成时间跟踪功能
