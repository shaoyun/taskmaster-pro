import React, { useState, useMemo } from 'react';
import {
    ChevronRight, ChevronDown, Tag,
    Plus, Layout, Edit2, Trash2, Check, Filter, Flame, Star, Clock, Circle
} from 'lucide-react';
import { Task, TaskStatus, Priority, PRIORITY_LABELS, STATUS_LABELS } from '../types';
import { isPast, format } from 'date-fns';

interface DraftsViewProps {
    tasks: Task[];
    onEditTask: (task: Task) => void;
    onToggleStatus: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
    onCreateTask: (initialData?: Partial<Task>) => void;
}

export const DraftsView: React.FC<DraftsViewProps> = ({
    tasks,
    onEditTask,
    onToggleStatus,
    onDeleteTask,
    onCreateTask
}) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [expandedSections, setExpandedSections] = useState({
        filters: true
    });

    // 筛选条件
    const [selectedTags, setSelectedTags] = useState<string[]>([]); // 多选
    const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null); // 单选

    // 应用筛选条件后的最终任务列表
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            // 标签筛选（多选，OR逻辑）
            if (selectedTags.length > 0) {
                if (!task.tags || !task.tags.some(tag => selectedTags.includes(tag))) {
                    return false;
                }
            }
            // 优先级筛选（单选）
            if (selectedPriority !== null && task.priority !== selectedPriority) {
                return false;
            }
            return true;
        });
    }, [tasks, selectedTags, selectedPriority]);

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleTagClick = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handlePriorityClick = (priority: Priority) => {
        setSelectedPriority(prev => prev === priority ? null : priority);
    };

    const getFilterCount = (filterFn: (t: Task) => boolean) => {
        return tasks.filter(filterFn).length;
    };

    const uniqueTags = useMemo(() => {
        const tags = new Set<string>();
        tasks.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
        return Array.from(tags).sort();
    }, [tasks]);

    const TreeItem: React.FC<{
        icon?: any;
        label: string;
        count?: number;
        isActive: boolean;
        onClick: () => void;
        showCheck?: boolean;
    }> = ({ icon: Icon, label, count, isActive, onClick, showCheck = false }) => (
        <button
            onClick={onClick}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-all ${isActive
                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                : 'text-slate-700 hover:bg-white/60 hover:text-slate-900'
                }`}
        >
            {showCheck && (
                <div className={`flex items-center justify-center w-4 h-4 rounded border ${isActive ? 'bg-white border-white' : 'border-slate-300 bg-white'
                    }`}>
                    {isActive && <Check size={10} className="text-indigo-600" />}
                </div>
            )}
            {!showCheck && Icon && (
                <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
            )}
            <span className="truncate flex-1 text-left">{label}</span>
            {count !== undefined && (
                <span className={`text-xs font-medium ${isActive ? 'text-indigo-100' : 'text-slate-400'
                    }`}>
                    {count}
                </span>
            )}
        </button>
    );

    const activeFilterCount = selectedTags.length + (selectedPriority !== null ? 1 : 0);

    // 优先级图标映射
    const getPriorityIcon = (priority: Priority) => {
        switch (priority) {
            case Priority.Q1: return Flame;
            case Priority.Q2: return Star;
            case Priority.Q3: return Clock;
            case Priority.Q4: return Circle;
        }
    };

    return (
        <div className="flex h-full w-full overflow-hidden bg-white">
            {/* 侧边栏 */}
            <div className={`flex flex-col border-r border-slate-200/80 bg-gradient-to-b from-slate-50 via-slate-50/30 to-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-0 opacity-0 overflow-hidden'
                }`}>
                <div className="flex-1 overflow-y-auto p-3">
                    {/* 筛选条件区域 */}
                    <div className="px-3 py-3">
                        <div className="flex items-center justify-between px-1 py-1 mb-2">
                            <div
                                className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-600 hover:text-indigo-600"
                                onClick={() => toggleSection('filters')}
                            >
                                {expandedSections.filters ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                <Filter size={14} />
                                <span>筛选条件</span>
                                <span className="w-5 h-5 flex items-center justify-center">
                                    {activeFilterCount > 0 && (
                                        <span className="bg-indigo-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedTags([]);
                                    setSelectedPriority(null);
                                }}
                                className={`text-xs text-slate-500 hover:text-indigo-600 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-all ${activeFilterCount > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                    }`}
                            >
                                清除
                            </button>
                        </div>

                        {expandedSections.filters && (
                            <div className="mt-3">
                                {/* 优先级（单选） */}
                                <div className="py-3">
                                    <div className="px-1 py-1 text-sm font-semibold text-slate-600">
                                        优先级 <span className="text-xs font-normal text-slate-400">(单选)</span>
                                    </div>
                                    <div className="space-y-1 mt-2">
                                        {Object.values(Priority).map(p => (
                                            <TreeItem
                                                key={p}
                                                icon={getPriorityIcon(p)}
                                                label={PRIORITY_LABELS[p].split(' ')[0]}
                                                isActive={selectedPriority === p}
                                                onClick={() => handlePriorityClick(p)}
                                                count={getFilterCount(t => t.priority === p)}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* 分割线 */}
                                <div className="border-t border-slate-200/60"></div>

                                {/* 标签（多选） */}
                                <div className="pt-3">
                                    <div className="px-1 py-1 text-sm font-semibold text-slate-600">
                                        标签 <span className="text-xs font-normal text-slate-400">(多选)</span>
                                    </div>
                                    <div className="space-y-1 mt-2">
                                        {uniqueTags.map(tag => (
                                            <TreeItem
                                                key={tag}
                                                icon={Tag}
                                                label={tag}
                                                isActive={selectedTags.includes(tag)}
                                                onClick={() => handleTagClick(tag)}
                                                count={getFilterCount(t => t.tags?.includes(tag))}
                                                showCheck
                                            />
                                        ))}
                                        {uniqueTags.length === 0 && (
                                            <p className="text-xs text-slate-400 px-3 py-2">无标签</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 主内容区域 */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                <div className="h-14 border-b border-slate-100 flex items-center justify-between px-4 shrink-0 bg-gradient-to-r from-white to-slate-50">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <Layout size={18} />
                        </button>
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            {activeFilterCount > 0 && (
                                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                                    {activeFilterCount} 个筛选
                                </span>
                            )}
                        </h2>
                    </div>
                    <button
                        onClick={() => onCreateTask()}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        新建任务
                    </button>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 border-b border-slate-100 z-10">
                            <tr>
                                <th className="px-6 py-3 font-medium">任务名称</th>
                                <th className="px-6 py-3 font-medium">状态</th>
                                <th className="px-6 py-3 font-medium">优先级</th>
                                <th className="px-6 py-3 font-medium">截止时间</th>
                                <th className="px-6 py-3 font-medium">完成时间</th>
                                <th className="px-6 py-3 text-right font-medium">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 border-b border-slate-100">
                            {filteredTasks.map(task => (
                                <tr key={task.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-slate-900 cursor-pointer" onClick={() => onEditTask(task)}>
                                        <div className="truncate max-w-xs sm:max-w-sm md:max-w-md" title={task.title}>
                                            {task.title}
                                        </div>
                                        {task.tags && task.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {task.tags.map(t => (
                                                    <span
                                                        key={t}
                                                        className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 font-medium"
                                                    >
                                                        #{t}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                            {STATUS_LABELS[task.status]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs px-2.5 py-1 rounded-md border font-medium ${task.priority === Priority.Q1 ? 'bg-red-50 border-red-200 text-red-700' :
                                            task.priority === Priority.Q2 ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                                task.priority === Priority.Q3 ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                                    'bg-slate-50 border-slate-200 text-slate-600'
                                            }`}>
                                            {PRIORITY_LABELS[task.priority].split(' ')[0]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-xs">
                                        {task.dueDate ? (
                                            <span className={isPast(new Date(task.dueDate)) && task.status !== TaskStatus.DONE ?
                                                "text-red-600 font-semibold" : ""
                                            }>
                                                {format(new Date(task.dueDate), 'MM-dd HH:mm')}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-xs">
                                        {task.completedAt ? (
                                            <span className="text-green-700 font-medium">
                                                {format(new Date(task.completedAt), 'MM-dd HH:mm')}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onEditTask(task)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteTask(task.id);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredTasks.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <div className="text-slate-400">
                                            <Filter size={32} className="mx-auto mb-3 opacity-20" />
                                            <p className="text-sm">暂无符合条件的任务</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
