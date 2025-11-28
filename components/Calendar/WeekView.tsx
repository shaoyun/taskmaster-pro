import React, { useEffect, useState, useRef } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay, parseISO, getHours, getMinutes, differenceInMinutes } from 'date-fns';
import { Task, TaskStatus, Priority, Holiday } from '../../types';

interface WeekViewProps {
  currentDate: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  holidays: Holiday[];
  showHolidays: boolean;
}

const WEEK_DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const PIXELS_PER_HOUR = 60; // 1px per minute
const TASK_OFFSET = 20; // Offset in pixels for stacked tasks
const MAX_VISIBLE_TASKS = 3; // Maximum tasks before showing overflow indicator

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  tasks,
  onTaskClick,
  holidays,
  showHolidays
}) => {
  const start = startOfWeek(currentDate, { weekStartsOn: 1 });
  const end = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });
  const [now, setNow] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [overflowModalState, setOverflowModalState] = useState<{ day: Date; tasks: Task[] } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to earliest task time minus 30 minutes on mount
  useEffect(() => {
    if (scrollRef.current) {
      const weekTasks = tasks.filter(t =>
        t.status !== TaskStatus.DONE &&
        t.dueDate &&
        days.some(day => isSameDay(parseISO(t.dueDate!), day))
      );

      if (weekTasks.length > 0) {
        const earliestTask = weekTasks.reduce((earliest, task) => {
          const taskDate = parseISO(task.dueDate!);
          const earliestDate = parseISO(earliest.dueDate!);
          return taskDate < earliestDate ? task : earliest;
        });

        const taskDate = parseISO(earliestTask.dueDate!);
        const taskHour = getHours(taskDate);
        const taskMin = getMinutes(taskDate);
        const taskTimeInMinutes = taskHour * 60 + taskMin;
        const scrollToMinutes = Math.max(0, taskTimeInMinutes - 30);
        scrollRef.current.scrollTop = scrollToMinutes * (PIXELS_PER_HOUR / 60);
      } else {
        // Default to 8:00 AM if no tasks
        scrollRef.current.scrollTop = 8 * PIXELS_PER_HOUR;
      }
    }
  }, [tasks, days]);

  const getTaskStyle = (task: Task, index: number, isHovered: boolean) => {
    if (!task.dueDate) return {};
    const date = parseISO(task.dueDate);
    const startHour = getHours(date);
    const startMin = getMinutes(date);
    const top = (startHour * 60 + startMin) * (PIXELS_PER_HOUR / 60);
    const height = 60 * (PIXELS_PER_HOUR / 60); // Default 1 hour duration

    return {
      top: `${top}px`,
      height: `${height}px`,
      left: `${2 + index * TASK_OFFSET}px`,
      right: '2px',
      zIndex: isHovered ? 50 : 10 + index,
    };
  };

  // Group tasks by time slot for overlap detection
  const getOverlappingTasks = (dayTasks: Task[]) => {
    const groups: Task[][] = [];

    dayTasks.forEach(task => {
      const taskTime = parseISO(task.dueDate!);
      const taskStart = getHours(taskTime) * 60 + getMinutes(taskTime);
      const taskEnd = taskStart + 60; // Assuming 1-hour duration

      let addedToGroup = false;
      for (const group of groups) {
        const groupTask = group[0];
        const groupTime = parseISO(groupTask.dueDate!);
        const groupStart = getHours(groupTime) * 60 + getMinutes(groupTime);
        const groupEnd = groupStart + 60;

        // Check if tasks overlap
        if (taskStart < groupEnd && taskEnd > groupStart) {
          group.push(task);
          addedToGroup = true;
          break;
        }
      }

      if (!addedToGroup) {
        groups.push([task]);
      }
    });

    return groups;
  };

  // Count tasks for a specific day
  const getTaskCount = (day: Date): number => {
    return tasks.filter(t =>
      t.status !== TaskStatus.DONE &&
      t.dueDate &&
      isSameDay(parseISO(t.dueDate), day)
    ).length;
  };

  const getCurrentTimeStyle = () => {
    const hour = getHours(now);
    const min = getMinutes(now);
    const top = (hour * 60 + min) * (PIXELS_PER_HOUR / 60);
    return { top: `${top}px` };
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex border-b border-slate-200 bg-white sticky top-0 z-20">
        {/* Time Column Header */}
        <div className="w-16 flex-shrink-0 border-r border-slate-100 flex items-end justify-center pb-2 text-xs text-slate-400 font-medium">
          GMT+8
        </div>

        {/* Days Header */}
        <div className="flex-1 grid grid-cols-7">
          {days.map(day => {
            const isDayToday = isToday(day);
            const dayHolidays = holidays.filter(h => isSameDay(parseISO(h.date), day));
            const taskCount = getTaskCount(day);

            return (
              <div key={day.toISOString()} className={`py-3 px-2 text-center border-r border-slate-100 last:border-r-0 relative ${isDayToday ? 'bg-indigo-50/30' : ''}`}>
                {/* Task Count Indicator */}
                <div className="absolute top-2 right-2">
                  <div
                    className={`w-2 h-2 rounded-sm ${
                      taskCount === 0 ? 'bg-green-500' :
                      taskCount <= 2 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    title={`${taskCount} 个任务`}
                  />
                </div>

                <div className={`text-xs mb-1 ${isDayToday ? 'text-indigo-600 font-semibold' : 'text-slate-500'}`}>
                  {WEEK_DAYS[day.getDay()]}
                </div>
                <div className={`text-xl font-medium ${isDayToday ? 'text-indigo-600' : 'text-slate-800'}`}>
                  {format(day, 'd')}
                </div>
                {showHolidays && dayHolidays.length > 0 && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {dayHolidays.map((holiday, idx) => (
                      <div
                        key={idx}
                        className={`text-[10px] inline-block px-1.5 py-0.5 rounded ${
                          holiday.isOffDay
                            ? 'bg-red-50 text-red-600'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {holiday.name}
                        {!holiday.isOffDay && ' (补班)'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable Grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative flex">
        {/* Time Axis */}
        <div className="w-16 flex-shrink-0 border-r border-slate-100 bg-white z-10">
          {HOURS.map(hour => (
            <div key={hour} className="h-[60px] relative border-b border-transparent">
              <span className="absolute -top-2.5 right-2 text-xs text-slate-400">
                {hour.toString().padStart(2, '0')}:00
              </span>
            </div>
          ))}
        </div>

        {/* Grid Body */}
        <div className="flex-1 grid grid-cols-7 relative min-w-[800px]">
          {/* Horizontal Lines */}
          <div className="absolute inset-0 pointer-events-none z-0">
            {HOURS.map(hour => (
              <div key={hour} className="h-[60px] border-b border-slate-100 w-full" />
            ))}
          </div>

          {/* Current Time Line */}
          {days.some(d => isToday(d)) && (
            <div
              className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none flex items-center"
              style={getCurrentTimeStyle()}
            >
              <div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div>
            </div>
          )}

          {/* Day Columns */}
          {days.map(day => {
            const dayTasks = tasks.filter(t =>
              t.status !== TaskStatus.DONE &&
              t.dueDate &&
              isSameDay(parseISO(t.dueDate), day)
            );

            const taskGroups = getOverlappingTasks(dayTasks);

            return (
              <div key={day.toISOString()} className="relative border-r border-slate-100 last:border-r-0 h-[1440px]">
                {taskGroups.map((group, groupIdx) => (
                  <React.Fragment key={groupIdx}>
                    {group.slice(0, MAX_VISIBLE_TASKS).map((task, index) => {
                      const isOverdue = task.dueDate && parseISO(task.dueDate) < now && task.status !== TaskStatus.DONE;

                      return (
                        <div
                          key={task.id}
                          className={`absolute rounded px-2 py-1 text-xs cursor-pointer overflow-hidden transition-all hover:shadow-md border-l-2 ${
                            isOverdue ? 'bg-red-50 border-red-500 text-red-700' :
                            task.priority === Priority.Q1 ? 'bg-red-50 border-red-500 text-red-700' :
                            task.priority === Priority.Q2 ? 'bg-blue-50 border-blue-500 text-blue-700' :
                            task.priority === Priority.Q3 ? 'bg-amber-50 border-amber-500 text-amber-700' :
                            'bg-slate-50 border-slate-400 text-slate-700'
                          }`}
                          style={getTaskStyle(task, index, hoveredTaskId === task.id)}
                          onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                          onMouseEnter={() => setHoveredTaskId(task.id)}
                          onMouseLeave={() => setHoveredTaskId(null)}
                          title={`${task.title} (${format(parseISO(task.dueDate!), 'HH:mm')})`}
                        >
                          <div className="font-semibold truncate">{task.title}</div>
                          <div className="text-[10px] opacity-80">
                            {format(parseISO(task.dueDate!), 'HH:mm')}
                          </div>
                        </div>
                      );
                    })}

                    {/* Overflow Indicator */}
                    {group.length > MAX_VISIBLE_TASKS && (
                      <div
                        className="absolute rounded px-2 py-1 text-xs cursor-pointer bg-slate-200 hover:bg-slate-300 border-l-2 border-slate-500 text-slate-700 font-semibold flex items-center justify-center transition-all hover:shadow-md"
                        style={getTaskStyle(group[0], MAX_VISIBLE_TASKS, false)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOverflowModalState({ day, tasks: group });
                        }}
                        title={`查看全部 ${group.length} 个任务`}
                      >
                        +{group.length - MAX_VISIBLE_TASKS} 更多
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Overflow Modal */}
      {overflowModalState && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setOverflowModalState(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                {format(overflowModalState.day, 'M月d日')} 的任务 ({overflowModalState.tasks.length})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-3">
                {overflowModalState.tasks.map(task => {
                  const isOverdue = task.dueDate && parseISO(task.dueDate) < now && task.status !== TaskStatus.DONE;

                  return (
                    <div
                      key={task.id}
                      className={`p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all ${
                        isOverdue ? 'bg-red-50 border-red-500' :
                        task.priority === Priority.Q1 ? 'bg-red-50 border-red-500' :
                        task.priority === Priority.Q2 ? 'bg-blue-50 border-blue-500' :
                        task.priority === Priority.Q3 ? 'bg-amber-50 border-amber-500' :
                        'bg-slate-50 border-slate-400'
                      }`}
                      onClick={() => {
                        onTaskClick(task);
                        setOverflowModalState(null);
                      }}
                    >
                      <div className="font-semibold text-sm text-slate-800 mb-1">
                        {task.title}
                      </div>
                      <div className="text-xs text-slate-600">
                        {format(parseISO(task.dueDate!), 'HH:mm')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
              <button
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
                onClick={() => setOverflowModalState(null)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
