
export type ViewMode = 'inbox' | 'today' | 'tomorrow' | 'week' | 'month' | 'calendar' | 'overdue' | 'all' | 'sprint' | 'dashboard' | 'settings' | 'task-list';

export interface Holiday {
  name: string;
  date: string; // YYYY-MM-DD
  isOffDay: boolean; // true for holiday, false for working day (makeup day)
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export enum Priority {
  Q1 = 'Q1', // Urgent & Important
  Q2 = 'Q2', // Not Urgent & Important
  Q3 = 'Q3', // Urgent & Not Important
  Q4 = 'Q4', // Not Urgent & Not Important
}



export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.Q1]: '重要且紧急 (马上做)',
  [Priority.Q2]: '重要不紧急 (规划做)',
  [Priority.Q3]: '紧急不重要 (授权做)',
  [Priority.Q4]: '不紧急不重要 (消减做)',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: '待安排',
  [TaskStatus.IN_PROGRESS]: '进行中',
  [TaskStatus.DONE]: '已完成',
};

export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED';

export interface Sprint {
  id: string;
  name: string;
  startDate: string; // ISO
  endDate: string; // ISO
  status: SprintStatus;
  createdAt: string;
}

export interface SprintConfig {
  durationUnit: 'week' | '2weeks';
  startDay: number; // 0 (Sun) - 6 (Sat), default 5 (Fri)
  startTime: string; // HH:mm, default "00:00"
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null; // ISO Date string
  createdAt: string;
  completedAt: string | null; // ISO Date string
  tags: string[];
  sprintId: string | null;
}