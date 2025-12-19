# Sprint Planning and Task Tags Features

## 1. Background
To enhance project management capabilities, we are introducing **Sprint Planning** and **Task Tags** to TaskMaster Pro. This allows users to manage tasks in agile sprints and organize them with flexible tags.

## 2. Requirements

### 2.1 Sprint Planning (冲刺计划)
*   **Sprint Creation**:
    *   Support creating sprints with **1-week** or **2-week** durations.
    *   **Default Duration**: 1 week.
    *   **Start/End Time**: Configurable per sprint. must include start time and end time.
*   **Global Configuration**:
    *   Configurable default start day and time (default: **Friday 00:00**).
    *   Automatic calculation: When a new sprint starts, the previous one ends before it.
*   **Task Association**:
    *   Tasks can be assigned to a specific Sprint.
*   **Validation**:
    *   Ensure logical timeframes (Start < End).

### 2.2 Task Tags (任务标签)
*   **Multi-tag Support**: Users can add multiple tags to a single task.
*   **Filtering**:
    *   "All Tasks" view must support filtering by **multiple tags** (AND/OR logic? Usually OR or AND. Will implement multi-select).

## 3. Implementation Plan

### 3.1 Data Model Changes
*   **Task Interface**:
    *   Add `tags: string[]`.
    *   Add `sprintId: string | null`.
*   **New Interfaces in `types.ts`**:
    *   `Sprint`: `id`, `name`, `startDate`, `endDate`, `status`.
    *   `SprintConfig`: `durationUnit` ('week', '2weeks'), `startDay` (0-6), `startTime` (HH:mm).

### 3.2 Storage/Service Layer
*   **SprintService**:
    *   Manage Sprint CRUD.
    *   Manage Sprint Configuration (persisted in LocalStorage or `settings` DB table).
*   **TaskService**:
    *   Update to handle new fields.

### 3.3 UI Components
*   **SettingsView**:
    *   Add "Sprint Settings" section (Default start time, duration).
*   **SprintView (New)**:
    *   List Sprints.
    *   Create New Sprint (Modal with auto-calculated defaults).
*   **TaskModal**:
    *   Add **Tags Input** (Chips style).
    *   Add **Sprint Selector** (Dropdown).
*   **AllTasksView**:
    *   Add **Tags Filter** (Multi-select dropdown).
    *   Display tags in the task list.

### 2.3 Optimization Phase (New)
*   **Sprint Statistics**:
    *   [x] Sprint list must show: Total Tasks, Completed Count, Overdue Count.
    *   [x] Ability to view tasks belonging to a specific sprint.
*   **Configuration**:
    *   [x] Move Sprint Global Config to **Settings Page**. Remove from Sprint View.
*   **Global Filtering**:
    *   [x] "All Tasks" and "Overdue" lists must support **Sprint Filtering**.
*   **Dashboard**:
    *   [x] Add "Active Sprint" overview (Completion Rate, Remaining Time).

## 3. Implementation Plan

### 3.1 Data Model Changes
Since we use Supabase, we need SQL migrations.

\`\`\`sql
-- Add tags and sprint_id to tasks
ALTER TABLE tasks ADD COLUMN tags TEXT[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN sprint_id UUID DEFAULT NULL;

-- Create sprints table
CREATE TABLE sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PLANNING', -- PLANNING, ACTIVE, COMPLETED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
\`\`\`
