import React, { useMemo } from 'react';
import { Task, TaskStatus, Priority, PRIORITY_LABELS, STATUS_LABELS, Sprint } from '../types';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, CheckCircle2, Clock, AlertTriangle, Target, Rocket } from 'lucide-react';
import { startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subDays, differenceInDays } from 'date-fns';

// Helper functions
const parseISO = (str: string) => new Date(str);
const format = (date: Date, formatStr: string) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  if (formatStr === 'MM-dd') {
    return `${month}-${day}`;
  } else if (formatStr === 'EEE') {
    return weekDays[date.getDay()];
  }
  return date.toISOString();
};

interface DashboardViewProps {
  tasks: Task[];
  sprints?: Sprint[];
  onViewSprintTasks?: (sprintId: string) => void;
}

const COLORS = {
  Q1: '#dc2626', // red-600
  Q2: '#2563eb', // blue-600
  Q3: '#f59e0b', // amber-500
  Q4: '#64748b', // slate-500
  TODO: '#94a3b8', // slate-400
  IN_PROGRESS: '#3b82f6', // blue-500
  DONE: '#10b981', // green-500
};

export const DashboardView: React.FC<DashboardViewProps> = ({ tasks, sprints = [], onViewSprintTasks }) => {
  // 统计数据计算
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === TaskStatus.DONE).length;
    const inProgress = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    const todo = tasks.filter(t => t.status === TaskStatus.TODO).length;
    const overdue = tasks.filter(t =>
      t.status !== TaskStatus.DONE &&
      t.dueDate &&
      new Date(t.dueDate) < new Date()
    ).length;

    // 按优先级统计
    const byPriority = [
      { name: '第一象限', value: tasks.filter(t => t.priority === Priority.Q1 && t.status !== TaskStatus.DONE).length, priority: Priority.Q1 },
      { name: '第二象限', value: tasks.filter(t => t.priority === Priority.Q2 && t.status !== TaskStatus.DONE).length, priority: Priority.Q2 },
      { name: '第三象限', value: tasks.filter(t => t.priority === Priority.Q3 && t.status !== TaskStatus.DONE).length, priority: Priority.Q3 },
      { name: '第四象限', value: tasks.filter(t => t.priority === Priority.Q4 && t.status !== TaskStatus.DONE).length, priority: Priority.Q4 },
    ];

    // 按状态统计
    const byStatus = [
      { name: '待安排', value: todo, status: TaskStatus.TODO },
      { name: '进行中', value: inProgress, status: TaskStatus.IN_PROGRESS },
      { name: '已完成', value: completed, status: TaskStatus.DONE },
    ];

    // 最近7天完成趋势
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const completedCount = tasks.filter(t =>
        t.completedAt && isSameDay(parseISO(t.completedAt), date)
      ).length;
      return {
        date: format(date, 'MM-dd'),
        completed: completedCount,
      };
    });

    // 本周任务分布
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const weekDistribution = weekDays.map(day => {
      const dayTasks = tasks.filter(t =>
        t.dueDate &&
        isSameDay(parseISO(t.dueDate), day) &&
        t.status !== TaskStatus.DONE
      );
      return {
        day: format(day, 'EEE'),
        count: dayTasks.length,
      };
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Active Sprint Stats
    const now = new Date();
    let activeSprint = sprints.find(s => s.status === 'ACTIVE');

    // Fallback: If no sprint is explicitly active, check for a sprint that covers today
    if (!activeSprint) {
      activeSprint = sprints.find(s =>
        s.status !== 'COMPLETED' &&
        new Date(s.startDate) <= now &&
        new Date(s.endDate) >= now
      );
    }

    let sprintStats = null;
    if (activeSprint) {
      const sprintTasks = tasks.filter(t => t.sprintId === activeSprint.id);
      const stotal = sprintTasks.length;
      const scompleted = sprintTasks.filter(t => t.status === TaskStatus.DONE).length;
      const rate = stotal > 0 ? Math.round((scompleted / stotal) * 100) : 0;
      const daysLeft = differenceInDays(new Date(activeSprint.endDate), new Date());
      sprintStats = {
        id: activeSprint.id, // Add ID here
        name: activeSprint.name,
        total: stotal,
        completed: scompleted,
        rate,
        daysLeft: daysLeft < 0 ? 0 : daysLeft
      };
    }

    return {
      total,
      completed,
      inProgress,
      todo,
      overdue,
      completionRate,
      byPriority,
      byStatus,
      last7Days,
      weekDistribution,
      sprintStats
    };
  }, [tasks, sprints]);

  return (
    <div className="h-full overflow-y-auto pb-8">
      <div className="space-y-6">
        {/* 关键指标卡片 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">总任务数</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <div className="rounded-full bg-indigo-100 p-3">
                <Target className="text-indigo-600" size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">已完成</p>
                <p className="mt-2 text-3xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">进行中</p>
                <p className="mt-2 text-3xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <Clock className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">延期任务</p>
                <p className="mt-2 text-3xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <div className="rounded-full bg-red-100 p-3">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">完成率</p>
                <p className="mt-2 text-3xl font-bold text-indigo-600">{stats.completionRate}%</p>
              </div>
              <div className="rounded-full bg-indigo-100 p-3">
                <TrendingUp className="text-indigo-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Active Sprint Banner */}
        {stats.sprintStats ? (
          <div
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 p-6 shadow-md text-white cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
            onClick={() => onViewSprintTasks?.(stats.sprintStats!.id)}
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Rocket className="text-white/80" size={20} />
                  <h3 className="text-lg font-bold">当前冲刺: {stats.sprintStats.name}</h3>
                </div>
                <p className="text-indigo-100 text-sm">
                  剩余 {stats.sprintStats.daysLeft} 天 • 已完成 {stats.sprintStats.completed}/{stats.sprintStats.total} 个任务
                </p>
              </div>

              <div className="flex-1 w-full md:max-w-md">
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span>冲刺进度</span>
                  <span>{stats.sprintStats.rate}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-black/20 overflow-hidden backdrop-blur-sm">
                  <div className="h-full bg-white/90 rounded-full transition-all duration-1000 ease-out" style={{ width: `${stats.sprintStats.rate}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-slate-100 border border-slate-200 border-dashed p-6 text-slate-500">
            <div className="flex items-center gap-2 mb-2">
              <Rocket className="text-slate-400" size={20} />
              <h3 className="text-lg font-bold text-slate-600">当前无活跃冲刺</h3>
            </div>
            <p className="text-sm">前往“冲刺计划”页面启动新的冲刺周期。</p>
          </div>
        )}

        {/* 图表区域 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 任务状态分布 */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">任务状态分布</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.byStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) =>
                    value > 0 ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)` : ''
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.byStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.status]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 优先级分布 */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">未完成任务优先级分布</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.byPriority}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {stats.byPriority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.priority]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 最近7天完成趋势 */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">最近7天完成趋势</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.last7Days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="完成任务数"
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 本周任务分布 */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">本周未完成任务分布</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.weekDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" name="任务数" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 详细统计表格 */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">详细统计</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.byPriority.map((item) => (
              <div key={item.priority} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">{item.name}</span>
                  <span
                    className="text-2xl font-bold"
                    style={{ color: COLORS[item.priority] }}
                  >
                    {item.value}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {PRIORITY_LABELS[item.priority]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
