import React, { useState, useEffect } from 'react';
import { Sprint, SprintConfig, SprintStatus, Task, TaskStatus } from '../types';
import { sprintService } from '../services/sprintService';
import { format, addWeeks, addDays, isPast, isFuture } from 'date-fns';
import { Plus, Settings, Rocket, Calendar, Clock, Trash2, CheckCircle2, List as ListIcon, AlertCircle, CheckSquare } from 'lucide-react';

interface SprintViewProps {
    sprints: Sprint[];
    tasks?: Task[];
    onSprintUpdate: () => void;
    onViewSprintTasks?: (sprintId: string) => void;
}

export const SprintView: React.FC<SprintViewProps> = ({ sprints, tasks = [], onSprintUpdate, onViewSprintTasks }) => {
    // Config logic removed, now in SettingsView
    const [config, setConfig] = useState<SprintConfig>(sprintService.getSprintConfig());
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Create Sprint State
    const [newName, setNewName] = useState('');
    const [newStartDate, setNewStartDate] = useState('');
    const [newEndDate, setNewEndDate] = useState('');


    // Config functions removed

    // Open Create Modal and Calculate Defaults
    const openCreateModal = () => {
        // Determine start date
        // If there is a last sprint (sorted by start date desc), start after it?
        // Usually sprints are contiguous.
        // Sprints are likely passed sorted.
        // Let's find the latest end date.
        // Assuming sprints are sorted by startDate desc (as per service).
        const lastSprint = sprints[0]; // simplistic
        let start = new Date();

        // Calculation of next start based on config
        const targetDay = config.startDay; // 0-6
        const [targetHour, targetMinute] = config.startTime.split(':').map(Number);

        if (lastSprint) {
            // Start = Last Sprint End?
            start = new Date(lastSprint.endDate);
        } else {
            // Find next occurrence of targetDay
            const currentDay = start.getDay();
            const diff = (targetDay + 7 - currentDay) % 7;
            let daysToAdd = diff === 0 ? 0 : diff;
            // If today is the day but time is past, add 7 days? Or just use today?
            // "Default Friday 00:00 start".
            // If today is Friday 10:00, use Today?
            // Usually "Next Sprint".
            start.setDate(start.getDate() + daysToAdd);
            start.setHours(targetHour, targetMinute, 0, 0);
        }

        // Default duration
        const weeks = config.durationUnit === 'week' ? 1 : 2;
        const end = addWeeks(start, weeks);

        setNewName(`Sprint ${format(start, 'yyyy-MM-dd')}`);
        setNewStartDate(format(start, "yyyy-MM-dd'T'HH:mm"));
        setNewEndDate(format(end, "yyyy-MM-dd'T'HH:mm"));
        setIsCreateOpen(true);
    };

    const handleCreateSprint = async () => {
        try {
            const sprint: Sprint = {
                id: crypto.randomUUID(),
                name: newName,
                startDate: new Date(newStartDate).toISOString(),
                endDate: new Date(newEndDate).toISOString(),
                status: 'PLANNING',
                createdAt: new Date().toISOString(),
            };
            await sprintService.createSprint(sprint);
            onSprintUpdate();
            setIsCreateOpen(false);
        } catch (e) {
            console.error(e);
            alert('创建冲刺失败');
        }
    };

    const handleDeleteSprint = async (id: string) => {
        if (confirm('确定要删除这个冲刺吗？')) {
            await sprintService.deleteSprint(id);
            onSprintUpdate();
        }
    };

    const handleStatusChange = async (sprint: Sprint, status: SprintStatus) => {
        const updated = { ...sprint, status };
        await sprintService.updateSprint(updated);
        onSprintUpdate();
    };

    return (
        <div className="flex h-full flex-col gap-6 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-end">
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm"
                >
                    <Plus size={18} />
                    新建冲刺
                </button>
            </div>

            {/* Sprints List */}
            <div className="flex-1 overflow-y-auto">
                <div className="grid gap-4">
                    {sprints.map(sprint => {
                        const isActive = sprint.status === 'ACTIVE';
                        const isCompleted = sprint.status === 'COMPLETED';

                        // Check if dates match active status?
                        // Simplification: Manual status or status display based on date + stored status
                        const now = new Date();
                        const start = new Date(sprint.startDate);
                        const end = new Date(sprint.endDate);
                        const isCurrentTime = now >= start && now <= end;

                        return (
                            <div key={sprint.id} className={`relative flex flex-col gap-4 rounded-xl border p-6 shadow-sm transition-all sm:flex-row sm:items-center sm:justify-between ${isActive ? 'bg-white border-indigo-200 ring-1 ring-indigo-100' : 'bg-white border-slate-200'}`}>
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-bold text-slate-800">{sprint.name}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isActive ? 'bg-indigo-100 text-indigo-700' :
                                            isCompleted ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {isActive ? '进行中' : isCompleted ? '已完成' : '规划中'}
                                        </span>
                                        {isCurrentTime && !isActive && !isCompleted && (
                                            <span className="text-xs text-amber-600 font-medium">(到达开始时间)</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={14} />
                                            {format(start, 'yyyy/MM/dd HH:mm')} - {format(end, 'yyyy/MM/dd HH:mm')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-3">
                                        {(() => {
                                            const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
                                            const total = sprintTasks.length;
                                            const completed = sprintTasks.filter(t => t.status === TaskStatus.DONE).length;
                                            const overdue = sprintTasks.filter(t => t.status !== TaskStatus.DONE && t.dueDate && isPast(new Date(t.dueDate))).length;

                                            // Progress Bar
                                            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

                                            return (
                                                <div className="flex items-center gap-4 text-xs">
                                                    <div className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                                        <CheckSquare size={12} />
                                                        <span>{completed}/{total}</span>
                                                    </div>
                                                    {overdue > 0 && (
                                                        <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded">
                                                            <AlertCircle size={12} />
                                                            <span>{overdue} 逾期</span>
                                                        </div>
                                                    )}
                                                    {/* Simple Progress Strip */}
                                                    <div className="flex flex-col gap-0.5 w-24">
                                                        <div className="flex justify-between text-[10px] text-slate-400">
                                                            <span>进度</span>
                                                            <span>{progress}%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${progress}%` }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Status Actions */}
                                    {!isCompleted && (
                                        isActive ? (
                                            <button onClick={() => handleStatusChange(sprint, 'COMPLETED')} className="flex items-center gap-1 rounded bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100">
                                                <CheckCircle2 size={14} /> 完成冲刺
                                            </button>
                                        ) : (
                                            <button onClick={() => handleStatusChange(sprint, 'ACTIVE')} className="flex items-center gap-1 rounded bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
                                                <Rocket size={14} /> 启动冲刺
                                            </button>
                                        )
                                    )}



                                    {onViewSprintTasks && (
                                        <button
                                            onClick={() => onViewSprintTasks(sprint.id)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                            title="查看任务"
                                        >
                                            <ListIcon size={18} />
                                        </button>
                                    )}

                                    <button onClick={() => handleDeleteSprint(sprint.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="删除冲刺">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {sprints.length === 0 && (
                        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                            <Rocket size={48} className="mb-4 opacity-20" />
                            <p>暂无冲刺计划</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {
                isCreateOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
                            <h2 className="mb-4 text-lg font-bold text-slate-800">新建冲刺</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">名称</label>
                                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">开始时间</label>
                                        <input type="datetime-local" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">结束时间</label>
                                        <input type="datetime-local" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button onClick={() => setIsCreateOpen(false)} className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">取消</button>
                                <button onClick={handleCreateSprint} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">创建</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Config Modal Removed */}
        </div >
    );
};
