import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Rocket } from 'lucide-react';
import { sprintService } from '../services/sprintService';
import { SprintConfig } from '../types';

interface SettingsViewProps {
    showHolidays: boolean;
    onToggleHolidays: (show: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
    showHolidays,
    onToggleHolidays
}) => {
    const [sprintConfig, setSprintConfig] = useState<SprintConfig>(sprintService.getSprintConfig());

    const handleSaveSprintConfig = (key: keyof SprintConfig, value: any) => {
        const newConfig = { ...sprintConfig, [key]: value };
        setSprintConfig(newConfig);
        sprintService.saveSprintConfig(newConfig);
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">设置</h2>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">日历设置</h3>
                    <p className="text-sm text-slate-500">自定义日历视图的显示选项</p>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <CalendarIcon size={20} />
                            </div>
                            <div>
                                <div className="font-medium text-slate-900">显示中国法定节假日</div>
                                <div className="text-sm text-slate-500">在日历和周视图中显示节假日调休信息</div>
                            </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={showHolidays}
                                onChange={(e) => onToggleHolidays(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">冲刺配置</h3>
                    <p className="text-sm text-slate-500">设置冲刺计划的全局默认参数</p>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mt-1">
                            <Rocket size={20} />
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">默认周期</label>
                                    <select
                                        value={sprintConfig.durationUnit}
                                        onChange={(e) => handleSaveSprintConfig('durationUnit', e.target.value)}
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                        <option value="week">1 周</option>
                                        <option value="2weeks">2 周</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">默认开始时间</label>
                                    <input
                                        type="time"
                                        value={sprintConfig.startTime}
                                        onChange={(e) => handleSaveSprintConfig('startTime', e.target.value)}
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">默认开始日</label>
                                    <select
                                        value={sprintConfig.startDay}
                                        onChange={(e) => handleSaveSprintConfig('startDay', Number(e.target.value))}
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                        <option value={1}>周一</option>
                                        <option value={2}>周二</option>
                                        <option value={3}>周三</option>
                                        <option value={4}>周四</option>
                                        <option value={5}>周五</option>
                                        <option value={6}>周六</option>
                                        <option value={0}>周日</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
