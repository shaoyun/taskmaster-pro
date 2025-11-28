import React, { useState } from 'react';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { Task, Holiday } from '../../types';
import { format, addMonths, subMonths, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onToggleStatus: (task: Task) => void;
    holidays: Holiday[];
    showHolidays: boolean;
}

type CalendarTab = 'month' | 'week';

export const CalendarView: React.FC<CalendarViewProps> = ({
    tasks,
    onTaskClick,
    onToggleStatus,
    holidays,
    showHolidays
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeTab, setActiveTab] = useState<CalendarTab>('week');

    const handlePrev = () => {
        if (activeTab === 'month') {
            setCurrentDate(subMonths(currentDate, 1));
        } else {
            setCurrentDate(subWeeks(currentDate, 1));
        }
    };

    const handleNext = () => {
        if (activeTab === 'month') {
            setCurrentDate(addMonths(currentDate, 1));
        } else {
            setCurrentDate(addWeeks(currentDate, 1));
        }
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const getHeaderText = () => {
        if (activeTab === 'month') {
            return format(currentDate, 'yyyy年MM月');
        } else {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            // If same month
            if (start.getMonth() === end.getMonth()) {
                return `${format(start, 'yyyy年MM月dd日')} - ${format(end, 'dd日')}`;
            }
            return `${format(start, 'yyyy年MM月dd日')} - ${format(end, 'MM月dd日')}`;
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden lg:h-[calc(100vh-9rem)]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleToday}
                        className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                    >
                        今天
                    </button>

                    <div className="flex items-center gap-1">
                        <button onClick={handlePrev} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={handleNext} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <h2 className="text-lg font-bold text-slate-800 min-w-[200px]">
                        {getHeaderText()}
                    </h2>
                </div>

                {/* View Switcher */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('week')}
                        className={`px-6 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'week'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        周
                    </button>
                    <button
                        onClick={() => setActiveTab('month')}
                        className={`px-6 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'month'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        月
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {activeTab === 'month' ? (
                    <MonthView
                        currentMonth={currentDate}
                        tasks={tasks}
                        onTaskClick={onTaskClick}
                        onDateClick={(date) => {
                            setCurrentDate(date);
                            setActiveTab('week');
                        }}
                        holidays={holidays}
                        showHolidays={showHolidays}
                    />
                ) : (
                    <WeekView
                        currentDate={currentDate}
                        tasks={tasks}
                        onTaskClick={onTaskClick}
                        holidays={holidays}
                        showHolidays={showHolidays}
                    />
                )}
            </div>
        </div>
    );
};
