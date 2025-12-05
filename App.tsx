import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Layout, Calendar as CalendarIcon, Inbox,
  Grid2X2, Plus, Menu, Search, ChevronLeft, ChevronRight, Loader2, Sun,
  List, Filter, ArrowUpDown, Trash2, Edit2, RefreshCw, AlertCircle
} from 'lucide-react';
import { Task, ViewMode, TaskStatus, Priority, PRIORITY_LABELS, STATUS_LABELS } from './types';
import { taskService } from './services/taskService';
import { TaskModal } from './components/TaskModal';
import { TaskCard } from './components/TaskCard';
import { ConfirmModal } from './components/ConfirmModal';
import { CalendarView } from './components/Calendar/CalendarView';
import { SettingsView } from './components/SettingsView';
import { holidayService } from './services/holidayService';
import { Settings as SettingsIcon } from 'lucide-react';
import {
  format, isSameDay, isSameWeek, isSameMonth,
  endOfWeek, addDays,
  endOfMonth, eachDayOfInterval, isToday, addMonths, isPast
} from 'date-fns';

// Helpers to replace missing date-fns functions
const parseISO = (str: string) => new Date(str);
const startOfMonth = (date: Date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfWeek = (date: Date, options?: { weekStartsOn?: number }) => {
  const d = new Date(date);
  const day = d.getDay();
  // Calculate difference to get to the start of the week
  const weekStartsOn = options?.weekStartsOn ?? 1;
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};
const subMonths = (date: Date, amount: number) => addMonths(date, -amount);
const WEEK_DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function App() {
  // --- State ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('inbox');

  // Initialize sidebar based on window width (closed on mobile by default)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Deleting State
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null); // For loading spinner
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null); // For confirmation modal

  // Holiday State
  const [holidays, setHolidays] = useState<any[]>([]);
  const [showHolidays, setShowHolidays] = useState(true);

  // All Tasks View State
  const [allTasksPage, setAllTasksPage] = useState(1);
  const [allTasksStatus, setAllTasksStatus] = useState<'ALL' | 'UNFINISHED' | TaskStatus>('ALL');
  const [allTasksPriority, setAllTasksPriority] = useState<'ALL' | Priority>('ALL');
  const [allTasksSort, setAllTasksSort] = useState<'created' | 'dueDate'>('created');
  const ITEMS_PER_PAGE = 10;

  // --- Effects ---
  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await taskService.getTasks();
      setTasks(data);
    } catch (error: any) {
      console.error("Failed to fetch tasks:", error);
      if (error.message === 'SUPABASE_NOT_CONFIGURED') {
        console.warn('Supabase not configured');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();

    // Request notification permission
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, [fetchTasks]);

  useEffect(() => {
    const loadHolidays = async () => {
      const year = new Date().getFullYear();
      // Fetch current year and next year to be safe
      const [currentYear, nextYear] = await Promise.all([
        holidayService.getHolidays(year),
        holidayService.getHolidays(year + 1)
      ]);
      setHolidays([...currentYear, ...nextYear]);
    };
    loadHolidays();
  }, []);

  // Check for due tasks every minute
  useEffect(() => {
    const checkDueTasks = () => {
      const now = new Date();
      tasks.forEach(task => {
        if (task.dueDate && task.status !== TaskStatus.DONE) {
          const due = parseISO(task.dueDate);
          const diff = due.getTime() - now.getTime();
          // Notify if due within the last minute
          if (diff < 0 && diff > -60000 && Notification.permission === 'granted') {
            new Notification(`任务到期提醒: ${task.title}`, {
              body: "该任务已到期，请及时处理。",
            });
          }
        }
      });
    };

    const interval = setInterval(checkDueTasks, 60000);
    return () => clearInterval(interval);
  }, [tasks]);

  // --- Handlers ---


  // Helper to handle navigation and auto-close sidebar on mobile
  const handleNavClick = (mode: ViewMode) => {
    setViewMode(mode);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      if (taskData.id) {
        // Update existing
        const existingTask = tasks.find(t => t.id === taskData.id);
        if (!existingTask) return;

        const updatedTask = { ...existingTask, ...taskData } as Task;

        // Optimistic Update
        setTasks(prev => prev.map(t => t.id === taskData.id ? updatedTask : t));
        setIsModalOpen(false);
        setEditingTask(null);

        await taskService.updateTask(updatedTask);

        // Refresh from server to ensure data consistency (especially for completedAt)
        await fetchTasks();
      } else {
        // Create new
        const newTask: Task = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          title: taskData.title!,
          description: taskData.description || '',
          status: taskData.status || TaskStatus.TODO,
          priority: taskData.priority || Priority.Q2,
          dueDate: taskData.dueDate || null,
          completedAt: null,
        };

        // Optimistic Update
        setTasks(prev => [newTask, ...prev]);
        setIsModalOpen(false);
        setEditingTask(null);

        await taskService.createTask(newTask);
      }
    } catch (error: any) {
      console.error("Failed to save task:", error);
      if (error.message === 'SUPABASE_NOT_CONFIGURED') {
        console.warn('Supabase not configured');
      } else {
        // Revert on error
        fetchTasks();
      }
    }
  };

  // Step 1: User requests delete (opens modal)
  const requestDeleteTask = (id: string) => {
    setTaskToDelete(id);
  };

  // Step 2: User confirms delete (calls API)
  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    const id = taskToDelete;
    // Don't close taskToDelete yet, wait for finish or error

    try {
      setDeletingTaskId(id);
      await taskService.deleteTask(id);

      // If the deleted task was currently open in the modal, close it
      if (editingTask?.id === id) {
        setIsModalOpen(false);
        setEditingTask(null);
      }

      // Refresh data from server
      await fetchTasks();

      // Close confirm modal only on success
      setTaskToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete task:", error);
      if (error.message === 'SUPABASE_NOT_CONFIGURED') {
        console.warn('Supabase not configured');
      } else {
        alert('删除任务失败，请重试');
      }
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleStatusToggle = async (task: Task) => {
    let newStatus = TaskStatus.TODO;

    // Cycle: TODO -> IN_PROGRESS -> DONE -> TODO
    if (task.status === TaskStatus.TODO) newStatus = TaskStatus.IN_PROGRESS;
    else if (task.status === TaskStatus.IN_PROGRESS) newStatus = TaskStatus.DONE;
    else newStatus = TaskStatus.TODO;

    const updatedTask = { ...task, status: newStatus };

    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));

    try {
      await taskService.updateTask(updatedTask);
      // Refresh from server to get the correct completedAt timestamp
      await fetchTasks();
    } catch (error: any) {
      console.error("Failed to toggle status:", error);
      if (error.message === 'SUPABASE_NOT_CONFIGURED') {
        console.warn('Supabase not configured');
      } else {
        fetchTasks();
      }
    }
  };

  const openNewTaskModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  // --- Filtering Logic ---
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // 1. Search Filter (Global)
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(lower) ||
        t.description.toLowerCase().includes(lower)
      );
    }

    // 2. View Mode Filter
    const today = new Date();

    switch (viewMode) {
      case 'inbox':
        // Inbox: Only tasks WITHOUT due date (Unplanned) and not done
        return filtered.filter(t => t.status !== TaskStatus.DONE && !t.dueDate);
      case 'today':
        return filtered.filter(t =>
          t.status !== TaskStatus.DONE &&
          t.dueDate && isSameDay(parseISO(t.dueDate), today)
        );
      case 'tomorrow':
        return filtered.filter(t =>
          t.status !== TaskStatus.DONE &&
          t.dueDate && isSameDay(parseISO(t.dueDate), addDays(today, 1))
        );
      case 'week':
        return filtered.filter(t =>
          t.status !== TaskStatus.DONE &&
          t.dueDate && isSameWeek(parseISO(t.dueDate), today, { weekStartsOn: 1 })
        );
      case 'month':
        // For month view logic, we just pass all non-done tasks, UI filters by day
        return filtered.filter(t => t.status !== TaskStatus.DONE);
      case 'completed':
        return filtered.filter(t => t.status === TaskStatus.DONE);
      case 'overdue':
        // Overdue: Tasks with due date in the past and not done
        return filtered.filter(t =>
          t.status !== TaskStatus.DONE &&
          t.dueDate && isPast(parseISO(t.dueDate))
        );
      case 'matrix':
        return filtered.filter(t => t.status !== TaskStatus.DONE);
      case 'all':
        // Return all filtered by search, internal table handles other filters
        return filtered;
      case 'settings':
        return filtered;
      default:
        return filtered;
    }
  }, [tasks, viewMode, searchQuery]);


  // --- Render Helpers ---

  const renderMatrixView = () => (
    <div className="grid h-full grid-cols-1 gap-3 sm:gap-4 overflow-y-auto pb-4 md:pb-20 md:grid-cols-2 lg:h-[calc(100vh-8rem)]">
      {[Priority.Q1, Priority.Q2, Priority.Q3, Priority.Q4].map((p) => (
        <div key={p} className="flex flex-col gap-2 rounded-xl bg-slate-100 p-4 shadow-inner">
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-slate-700">
            {p === Priority.Q1 && <span className="text-red-600">🔥 第一象限 (马上做)</span>}
            {p === Priority.Q2 && <span className="text-blue-600">📅 第二象限 (规划做)</span>}
            {p === Priority.Q3 && <span className="text-amber-600">🗣️ 第三象限 (授权做)</span>}
            {p === Priority.Q4 && <span className="text-slate-500">🗑️ 第四象限 (消减做)</span>}
          </h3>
          <div className="flex flex-col gap-2 overflow-y-auto pr-1 custom-scrollbar max-h-[40vh] md:max-h-full">
            {filteredTasks
              .filter(t => t.priority === p)
              .map(t => (
                <TaskCard key={t.id} task={t} onEdit={openEditTaskModal} onToggleStatus={handleStatusToggle} compact />
              ))}
            {filteredTasks.filter(t => t.priority === p).length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">暂无任务</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );



  const renderAllTasksView = () => {
    // 1. Filter
    let result = filteredTasks.filter(t => {
      if (allTasksStatus === 'UNFINISHED') {
        if (t.status === TaskStatus.DONE) return false;
      } else if (allTasksStatus !== 'ALL' && t.status !== allTasksStatus) {
        return false;
      }
      if (allTasksPriority !== 'ALL' && t.priority !== allTasksPriority) return false;
      return true;
    });

    // 2. Sort
    result.sort((a, b) => {
      if (allTasksSort === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      // Created desc
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // 3. Paginate
    const totalPages = Math.ceil(result.length / ITEMS_PER_PAGE);
    const displayedTasks = result.slice((allTasksPage - 1) * ITEMS_PER_PAGE, allTasksPage * ITEMS_PER_PAGE);

    const getStatusBadge = (status: TaskStatus) => {
      switch (status) {
        case TaskStatus.DONE: return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">已完成</span>;
        case TaskStatus.IN_PROGRESS: return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">进行中</span>;
        default: return <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">待安排</span>;
      }
    };

    return (
      <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden lg:h-[calc(100vh-9rem)]">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4 p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-500" />
            <select
              value={allTasksStatus}
              onChange={(e) => { setAllTasksStatus(e.target.value as any); setAllTasksPage(1); }}
              className="text-sm border border-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">所有状态</option>
              <option value="UNFINISHED">未完成</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select
              value={allTasksPriority}
              onChange={(e) => { setAllTasksPriority(e.target.value as any); setAllTasksPage(1); }}
              className="text-sm border border-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">所有优先级</option>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v.split(' ')[0]}</option>)}
            </select>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <ArrowUpDown size={16} className="text-slate-500" />
            <select
              value={allTasksSort}
              onChange={(e) => setAllTasksSort(e.target.value as any)}
              className="text-sm border border-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="created">按创建时间</option>
              <option value="dueDate">按截止时间</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 font-medium">任务名称</th>
                <th className="px-6 py-3 font-medium">状态</th>
                <th className="px-6 py-3 font-medium">优先级</th>
                <th className="px-6 py-3 font-medium">截止时间</th>
                <th className="px-6 py-3 font-medium">完成时间</th>
                <th className="px-6 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedTasks.map(task => (
                <tr key={task.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-slate-900 cursor-pointer" onClick={() => openEditTaskModal(task)}>
                    <div className="truncate max-w-xs sm:max-w-sm md:max-w-md" title={task.title}>{task.title}</div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(task.status)}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded border ${task.priority === Priority.Q1 ? 'bg-red-50 border-red-100 text-red-700' :
                      task.priority === Priority.Q2 ? 'bg-blue-50 border-blue-100 text-blue-700' :
                        task.priority === Priority.Q3 ? 'bg-amber-50 border-amber-100 text-amber-700' :
                          'bg-slate-50 border-slate-200 text-slate-600'
                      }`}>
                      {PRIORITY_LABELS[task.priority].split(' ')[0]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {task.dueDate ? (
                      <span className={isPast(new Date(task.dueDate)) && task.status !== TaskStatus.DONE ? "text-red-600 font-medium" : ""}>
                        {format(new Date(task.dueDate), 'MM-dd HH:mm')}
                      </span>
                    ) : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {task.completedAt ? (
                      <span className="text-green-700">
                        {format(new Date(task.completedAt), 'MM-dd HH:mm')}
                      </span>
                    ) : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditTaskModal(task)} className="p-1 text-slate-400 hover:text-indigo-600">
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); requestDeleteTask(task.id); }}
                        className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-50"
                        disabled={deletingTaskId === task.id || !!taskToDelete}
                      >
                        {deletingTaskId === task.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayedTasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">没有符合条件的任务</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50 text-sm text-slate-600">
          <div>
            第 {allTasksPage} 页 / 共 {totalPages || 1} 页
          </div>
          <div className="flex gap-2">
            <button
              disabled={allTasksPage === 1}
              onClick={() => setAllTasksPage(p => Math.max(1, p - 1))}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              disabled={allTasksPage >= totalPages}
              onClick={() => setAllTasksPage(p => Math.min(totalPages, p + 1))}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderListView = () => {
    // Check if current view should use fixed height cards (inbox, today, tomorrow)
    const useFixedHeight = viewMode === 'inbox' || viewMode === 'today' || viewMode === 'tomorrow';

    return (
      <div className={`grid grid-cols-1 gap-3 overflow-y-auto pb-4 md:pb-20 ${useFixedHeight ? 'auto-rows-fr' : ''} sm:grid-cols-2 lg:grid-cols-2 lg:h-[calc(100vh-8rem)] xl:grid-cols-3 2xl:grid-cols-4`}>
        {filteredTasks.map(task => (
          <div key={task.id} className={useFixedHeight ? 'h-full min-h-[120px] lg:max-h-[250px]' : ''}>
            <TaskCard
              task={task}
              onEdit={openEditTaskModal}
              onToggleStatus={handleStatusToggle}
            />
          </div>
        ))}
        {filteredTasks.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <div className="mb-3 flex justify-center text-slate-200">
              <Inbox size={48} />
            </div>
            <p className="text-slate-500">没有找到任务</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900">

      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && window.innerWidth < 768 && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-6">
          <Layout className="text-indigo-600" size={24} />
          <h1 className="text-xl font-bold text-indigo-900">TaskMaster</h1>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          <button
            onClick={() => handleNavClick('inbox')}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${viewMode === 'inbox' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            <Inbox size={18} />
            收集箱
            <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {tasks.filter(t => !t.dueDate && t.status !== TaskStatus.DONE).length}
            </span>
          </button>

          <button
            onClick={() => handleNavClick('today')}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${viewMode === 'today' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            <CalendarIcon size={18} />
            今日任务
            <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {tasks.filter(t => t.dueDate && isSameDay(parseISO(t.dueDate), new Date()) && t.status !== TaskStatus.DONE).length}
            </span>
          </button>

          <button
            onClick={() => handleNavClick('tomorrow')}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${viewMode === 'tomorrow' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            <Sun size={18} />
            明日任务
            <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {tasks.filter(t => t.dueDate && isSameDay(parseISO(t.dueDate), addDays(new Date(), 1)) && t.status !== TaskStatus.DONE).length}
            </span>
          </button>

          <button
            onClick={() => handleNavClick('calendar')}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            <CalendarIcon size={18} />
            日历视图
          </button>

          <div className="my-2 h-px bg-slate-100" />

          <button
            onClick={() => handleNavClick('overdue')}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${viewMode === 'overdue' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            <AlertCircle size={18} />
            延期任务
            <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
              {tasks.filter(t => t.status !== TaskStatus.DONE && t.dueDate && isPast(parseISO(t.dueDate))).length}
            </span>
          </button>

          <button
            onClick={() => handleNavClick('all')}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${viewMode === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            <List size={18} />
            所有任务
          </button>

          <button
            onClick={() => handleNavClick('matrix')}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${viewMode === 'matrix' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            <Grid2X2 size={18} />
            四象限视图
          </button>

          <div className="my-2 h-px bg-slate-100" />

          <button
            onClick={() => handleNavClick('settings')}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${viewMode === 'settings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            <SettingsIcon size={18} />
            设置
          </button>
        </nav>


      </aside>

      {/* Main Content */}
      <main className="flex h-full flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-100 bg-white px-4 shadow-sm md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="mr-2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-800">
              {viewMode === 'inbox' && '收集箱'}
              {viewMode === 'today' && '今日任务'}
              {viewMode === 'tomorrow' && '明日任务'}
              {viewMode === 'calendar' && '日历视图'}
              {viewMode === 'all' && '所有任务'}
              {viewMode === 'matrix' && '四象限视图'}
              {viewMode === 'overdue' && '延期任务'}
              {viewMode === 'settings' && '设置'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="搜索任务..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={fetchTasks}
              disabled={isLoading}
              className="flex items-center justify-center rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              title="刷新列表"
            >
              <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={openNewTaskModal}
              className="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-transform active:scale-95 hover:bg-indigo-700"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">新建任务</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-3 sm:p-4 md:p-6 lg:p-8">
          {viewMode === 'calendar' ? (
            <CalendarView
              tasks={filteredTasks}
              onTaskClick={openEditTaskModal}
              onToggleStatus={handleStatusToggle}
              holidays={holidays}
              showHolidays={showHolidays}
            />
          ) : viewMode === 'settings' ? (
            <SettingsView
              showHolidays={showHolidays}
              onToggleHolidays={setShowHolidays}
            />
          ) : viewMode === 'matrix' ? renderMatrixView() :
            (viewMode === 'all' || viewMode === 'overdue') ? renderAllTasksView() :
              renderListView()}
        </div>
      </main>

      {/* Modals */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={requestDeleteTask}
        initialTask={editingTask}
      // isDeleting is no longer passed to TaskModal in the same way, 
      // because TaskModal closes immediately or we handle it via the top ConfirmModal
      // but we can pass it if we want the button inside TaskModal to show loading,
      // however, we are using a separate ConfirmModal now.
      />



      <ConfirmModal
        isOpen={!!taskToDelete}
        title="删除确认"
        message="确定要删除这个任务吗？此操作无法撤销。"
        confirmText="删除任务"
        isLoading={!!deletingTaskId}
        onClose={() => setTaskToDelete(null)}
        onConfirm={confirmDeleteTask}
      />
    </div>
  );
}

export default App;
