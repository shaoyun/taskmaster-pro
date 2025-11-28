import React from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay, parseISO } from 'date-fns';
import { Task, TaskStatus, Priority, Holiday } from '../../types';

interface MonthViewProps {
    currentMonth: Date;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onDateClick: (date: Date) => void;
    holidays: Holiday[];
    showHolidays: boolean;
}

const WEEK_DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export const MonthView: React.FC<MonthViewProps> = ({
    currentMonth,
    tasks,
    onTaskClick,
    onDateClick,
    holidays,
    showHolidays
}) => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
        <div className="flex h-full flex-col overflow-hidden bg-white">
            {/* Week Header */}
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
                {WEEK_DAYS.map(day => (
                    <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid flex-1 grid-cols-7 grid-rows-5 md:grid-rows-auto overflow-y-auto">
                {calendarDays.map((day, idx) => {
                    const dayTasks = tasks.filter(t =>
                        t.status !== TaskStatus.DONE &&
                        t.dueDate &&
                        isSameDay(parseISO(t.dueDate), day)
                    );
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isDayToday = isToday(day);

                    const holiday = holidays.find(h => isSameDay(parseISO(h.date), day));

                    return (
                        <div
                            key={day.toISOString()}
                            className={`min-h-[100px] border-b border-r border-slate-100 p-2 transition-colors hover:bg-slate-50 ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : ''}`}
                            onClick={() => onDateClick(day)}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className={`text-sm font-medium ${isDayToday ? 'w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center' : ''}`}>
                                    {format(day, 'd')}
                                </div>
                                {showHolidays && holiday && (
                                    <div className={`text-[10px] px-1 rounded ${holiday.isOffDay ? 'text-red-500 bg-red-50' : 'text-slate-500 bg-slate-100'}`}>
                                        {holiday.name}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                {dayTasks.map(t => (
                                    <div
                                        key={t.id}
                                        onClick={(e) => { e.stopPropagation(); onTaskClick(t); }}
                                        className={`truncate rounded px-1.5 py-0.5 text-[10px] cursor-pointer ${t.priority === Priority.Q1 ? 'bg-red-100 text-red-700' :
                                            t.priority === Priority.Q2 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                                            }`}
                                        title={t.title}
                                    >
                                        {t.title}
                                    </div>
                                ))}
                                {dayTasks.length > 3 && (
                                    <div className="text-[10px] text-slate-400 text-center">
                                        还有 {dayTasks.length - 3} 项...
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
