import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, Priority, PRIORITY_LABELS, STATUS_LABELS, Sprint } from '../types';
import { X, Sparkles, Loader2, Plus, Trash2, CalendarClock, Clock, Tag, Rocket } from 'lucide-react';
import { breakdownTaskWithAI } from '../services/geminiService';
import { addDays, format } from 'date-fns';

// Helper functions to replace missing date-fns exports
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const nextDayOfWeek = (date: Date, dayOfWeek: number) => {
  const result = new Date(date);
  const currentDay = result.getDay();
  // Calculate difference to get to the next occurrence of the day
  // dayOfWeek: 0 (Sun) to 6 (Sat)
  const diff = (dayOfWeek + 7 - currentDay) % 7;
  const daysToAdd = diff === 0 ? 7 : diff;
  result.setDate(result.getDate() + daysToAdd);
  result.setHours(0, 0, 0, 0);
  return result;
};

const nextMonday = (date: Date) => nextDayOfWeek(date, 1);
const nextFriday = (date: Date) => nextDayOfWeek(date, 5);

// Timezone Helpers
// Convert UTC ISO string (from DB) to Local Input string (yyyy-MM-ddThh:mm)
const isoToInput = (isoString: string): string => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    // format from date-fns uses local time by default
    return format(date, "yyyy-MM-dd'T'HH:mm");
  } catch (e) {
    return '';
  }
};

// Convert Local Input string (yyyy-MM-ddThh:mm) to UTC ISO string (for DB)
const inputToIso = (inputString: string): string | null => {
  if (!inputString) return null;
  try {
    const date = new Date(inputString);
    return date.toISOString();
  } catch (e) {
    return null;
  }
};

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  onDelete?: (id: string) => void;

  initialTask?: Partial<Task> | null;
  sprints?: Sprint[];
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, onDelete, initialTask, sprints = [] }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);

  const [priority, setPriority] = useState<Priority>(Priority.Q2);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [sprintId, setSprintId] = useState<string>('');

  // dueDate stores the string for the input: "yyyy-MM-ddThh:mm" (Local Time)
  const [dueDate, setDueDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setTitle(initialTask.title || '');
        setDescription(initialTask.description || '');
        setStatus(initialTask.status || TaskStatus.TODO);

        setPriority(initialTask.priority || Priority.Q2);
        setTags(initialTask.tags || []);
        setSprintId(initialTask.sprintId || '');
        // Convert DB ISO time to Local Input time
        setDueDate(initialTask.dueDate ? isoToInput(initialTask.dueDate) : '');
      } else {
        // Reset for new task
        setTitle('');
        setDescription('');
        setStatus(TaskStatus.TODO);

        setPriority(Priority.Q2);
        setTags([]);
        setSprintId('');
        // If initialTask has a dueDate (e.g. passed from Calendar click), convert it too
        setDueDate(initialTask?.dueDate ? isoToInput(initialTask.dueDate!) : '');
      }
    }
  }, [isOpen, initialTask]);

  const handleSave = () => {
    if (!title.trim()) return;

    onSave({
      id: initialTask?.id,
      title,
      description,
      status,
      priority,
      tags,
      sprintId: sprintId || null,
      // Convert Local Input time back to ISO UTC
      dueDate: inputToIso(dueDate),
    });
    onClose();
  };

  const handleAIBreakdown = async () => {
    if (!title) return;
    setIsGenerating(true);
    const subtasks = await breakdownTaskWithAI(title);
    setIsGenerating(false);

    if (subtasks.length > 0) {
      const formattedSubtasks = subtasks.map(st => `- [ ] ${st}`).join('\n');
      setDescription(prev => prev ? `${prev}\n\nAI 建议拆解:\n${formattedSubtasks}` : `AI 建议拆解:\n${formattedSubtasks}`);
    }
  };

  // Quick Date Helpers
  const setQuickDate = (type: 'today' | 'tomorrow' | 'friday' | 'monday') => {
    const today = startOfToday();
    let targetDate = today;

    switch (type) {
      case 'today': targetDate = today; break;
      case 'tomorrow': targetDate = addDays(today, 1); break;
      case 'friday': targetDate = nextFriday(today); break;
      case 'monday': targetDate = nextMonday(today); break;
    }

    // Determine time: preserve existing time if set, otherwise default to 09:00
    let hours = 9;
    let minutes = 0;

    if (dueDate) {
      const current = new Date(dueDate); // This parses local string to local date
      if (!isNaN(current.getTime())) {
        hours = current.getHours();
        minutes = current.getMinutes();
      }
    }

    // Set target date with determined time
    targetDate.setHours(hours, minutes, 0, 0);
    setDueDate(format(targetDate, "yyyy-MM-dd'T'HH:mm"));
  };

  const setQuickTime = (hour: number) => {
    // If we have a date, use it. If not, use Today.
    let baseDate = new Date();
    if (dueDate) {
      const current = new Date(dueDate);
      if (!isNaN(current.getTime())) {
        baseDate = current;
      }
    }

    baseDate.setHours(hour, 0, 0, 0);
    setDueDate(format(baseDate, "yyyy-MM-dd'T'HH:mm"));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in duration-200 sm:h-auto sm:max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 shrink-0">
          <h2 className="text-lg font-semibold text-slate-800">
            {initialTask?.id ? '编辑任务' : '新建任务'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">任务标题</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="准备做什么？"
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAIBreakdown}
                disabled={!title || isGenerating}
                className="flex items-center gap-1 rounded-md bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition-colors shrink-0"
                title="使用 AI 拆解任务"
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span className="hidden sm:inline">AI 拆解</span>
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">描述 / 备注</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="添加详细描述，或粘贴链接..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">标签</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  <Tag size={12} />
                  {tag}
                  <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} className="text-slate-400 hover:text-red-500"><X size={12} /></button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                    setTags([...tags, tagInput.trim()]);
                    setTagInput('');
                  }
                }
              }}
              placeholder="输入标签按回车添加..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">截止时间</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            />

            {/* Quick Actions */}
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CalendarClock size={14} className="text-slate-400" />
                <button type="button" onClick={() => setQuickDate('today')} className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 shadow-sm border border-slate-200 hover:border-indigo-300 hover:text-indigo-600">今天</button>
                <button type="button" onClick={() => setQuickDate('tomorrow')} className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 shadow-sm border border-slate-200 hover:border-indigo-300 hover:text-indigo-600">明天</button>
                <button type="button" onClick={() => setQuickDate('friday')} className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 shadow-sm border border-slate-200 hover:border-indigo-300 hover:text-indigo-600">本周五</button>
                <button type="button" onClick={() => setQuickDate('monday')} className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 shadow-sm border border-slate-200 hover:border-indigo-300 hover:text-indigo-600">下周一</button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Clock size={14} className="text-slate-400" />
                <button type="button" onClick={() => setQuickTime(10)} className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 shadow-sm border border-slate-200 hover:border-indigo-300 hover:text-indigo-600">10:00</button>
                <button type="button" onClick={() => setQuickTime(14)} className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 shadow-sm border border-slate-200 hover:border-indigo-300 hover:text-indigo-600">14:00</button>
                <button type="button" onClick={() => setQuickTime(18)} className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 shadow-sm border border-slate-200 hover:border-indigo-300 hover:text-indigo-600">18:00</button>
                <button type="button" onClick={() => setQuickTime(20)} className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 shadow-sm border border-slate-200 hover:border-indigo-300 hover:text-indigo-600">20:00</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">优先级 (四象限)</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">状态</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">所属冲刺</label>
              <div className="relative">
                <select
                  value={sprintId}
                  onChange={(e) => setSprintId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none"
                >
                  <option value="">未分配</option>
                  {sprints.map(sprint => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name} ({sprint.status === 'ACTIVE' ? '进行中' : sprint.status === 'PLANNING' ? '规划中' : '已归档'})
                    </option>
                  ))}
                </select>
                <Rocket size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 p-4 bg-slate-50 rounded-b-xl shrink-0">
          <div>
            {initialTask?.id && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(initialTask.id)}
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">删除任务</span>
                <span className="sm:hidden">删除</span>
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Plus size={16} />
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};