import React from 'react';
import { Task, TaskStatus, Priority, PRIORITY_LABELS } from '../types';
import { format, isPast } from 'date-fns';
import { CheckCircle2, Circle, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onToggleStatus: (task: Task) => void;
  compact?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onToggleStatus, compact = false }) => {
  const isDone = task.status === TaskStatus.DONE;
  const isInProgress = task.status === TaskStatus.IN_PROGRESS;
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isDone;

  const priorityColors = {
    [Priority.Q1]: 'border-l-red-500 bg-red-50/50 hover:bg-red-50',
    [Priority.Q2]: 'border-l-blue-500 bg-blue-50/50 hover:bg-blue-50',
    [Priority.Q3]: 'border-l-amber-500 bg-amber-50/50 hover:bg-amber-50',
    [Priority.Q4]: 'border-l-slate-300 bg-slate-50/50 hover:bg-slate-50',
  };

  return (
    <div 
      className={`group relative flex flex-col gap-2 rounded-lg border border-slate-200 p-3 shadow-sm transition-all hover:shadow-md ${priorityColors[task.priority]} border-l-4`}
    >
      <div className="flex items-start justify-between gap-3">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleStatus(task); }}
          className={`mt-0.5 transition-colors ${
            isDone ? 'text-green-600' : 
            isInProgress ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
          title={isDone ? "标记为未完成" : "标记为已完成"}
        >
          {isDone ? <CheckCircle2 size={20} /> : isInProgress ? <Loader2 size={20} /> : <Circle size={20} />}
        </button>
        
        <div 
          className="flex-1 cursor-pointer" 
          onClick={() => onEdit(task)}
        >
          <h3 className={`font-medium text-slate-900 ${isDone ? 'line-through text-slate-400' : ''}`}>
            {task.title}
          </h3>
          
          {!compact && task.description && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-500 whitespace-pre-line">
              {task.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {task.dueDate && (
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-white/50 border border-slate-200'}`}>
                {isOverdue ? <AlertCircle size={12} /> : <Clock size={12} />}
                {format(new Date(task.dueDate), 'MM月dd日 HH:mm')}
              </span>
            )}
            
            <span className="rounded-full bg-white/50 border border-slate-200 px-2 py-0.5 text-slate-600">
              {PRIORITY_LABELS[task.priority].split(' ')[0]}
            </span>
            
            {isInProgress && !isDone && (
               <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
                进行中
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};