import { getSupabase } from './supabaseClient';
import { Sprint, SprintConfig, SprintStatus } from '../types';

const ensureSupabase = () => {
    const supabase = getSupabase();
    if (!supabase) {
        throw new Error('SUPABASE_NOT_CONFIGURED');
    }
    return supabase;
};

const CONFIG_KEY = 'taskmaster_sprint_config';

export const sprintService = {
    // --- Sprint Data (Supabase) ---

    async getSprints(): Promise<Sprint[]> {
        const supabase = ensureSupabase();

        const { data, error } = await supabase
            .from('sprints')
            .select('*')
            .order('start_date', { ascending: false });

        if (error) {
            console.error('Error fetching sprints:', error);
            throw error;
        }

        return (data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            startDate: row.start_date,
            endDate: row.end_date,
            status: row.status as SprintStatus,
            createdAt: row.created_at,
        }));
    },

    async createSprint(sprint: Sprint): Promise<void> {
        const supabase = ensureSupabase();

        const { error } = await supabase.from('sprints').insert({
            id: sprint.id,
            name: sprint.name,
            start_date: sprint.startDate,
            end_date: sprint.endDate,
            status: sprint.status,
            created_at: sprint.createdAt,
        });
        if (error) throw error;
    },

    async updateSprint(sprint: Sprint): Promise<void> {
        const supabase = ensureSupabase();

        const { error } = await supabase
            .from('sprints')
            .update({
                name: sprint.name,
                start_date: sprint.startDate,
                end_date: sprint.endDate,
                status: sprint.status,
            })
            .eq('id', sprint.id);
        if (error) throw error;
    },

    async deleteSprint(id: string): Promise<void> {
        const supabase = ensureSupabase();
        const { error } = await supabase.from('sprints').delete().eq('id', id);
        if (error) throw error;
    },

    // --- Configuration (LocalStorage) ---

    getSprintConfig(): SprintConfig {
        try {
            const data = localStorage.getItem(CONFIG_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to load sprint config', e);
        }
        // Default config
        return {
            durationUnit: 'week',
            startDay: 5, // Friday
            startTime: '00:00',
        };
    },

    saveSprintConfig(config: SprintConfig): void {
        try {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        } catch (e) {
            console.error('Failed to save sprint config', e);
        }
    }
};
