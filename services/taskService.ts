import { getSupabase } from './supabaseClient';
import { Task, TaskStatus, Priority } from '../types';

const ensureSupabase = () => {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }
  return supabase;
};

export const taskService = {
  async getTasks(): Promise<Task[]> {
    const supabase = ensureSupabase();
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      status: row.status as TaskStatus,
      priority: row.priority as Priority,
      dueDate: row.due_date,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    }));
  },

  async createTask(task: Task): Promise<void> {
    const supabase = ensureSupabase();

    const { error } = await supabase.from('tasks').insert({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.dueDate,
      created_at: task.createdAt,
      completed_at: task.status === TaskStatus.DONE ? new Date().toISOString() : null,
    });
    if (error) throw error;
  },

  async updateTask(task: Task): Promise<void> {
    const supabase = ensureSupabase();

    // Determine completed_at based on status
    let completedAt: string | null;
    if (task.status === TaskStatus.DONE) {
      // If task is being marked as DONE, set completed_at to now (if not already set)
      completedAt = task.completedAt || new Date().toISOString();
    } else {
      // If task status is changed from DONE to other status, clear completed_at
      completedAt = null;
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.dueDate,
        completed_at: completedAt,
      })
      .eq('id', task.id);
    if (error) throw error;
  },

  async deleteTask(id: string): Promise<void> {
    const supabase = ensureSupabase();
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  }
};
