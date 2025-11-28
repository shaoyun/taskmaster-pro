import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

interface SettingsViewProps {
    showHolidays: boolean;
    onToggleHolidays: (show: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
    showHolidays,
    onToggleHolidays
}) => {
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
        </div>
    );
};
