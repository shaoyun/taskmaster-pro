import { getSupabase } from './supabaseClient';
import { Task, TaskStatus, Priority } from '../types';
import { tagService } from './tagService';

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
      tags: row.tags || [],
      sprintId: row.sprint_id,
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
      tags: task.tags,
      sprint_id: task.sprintId,
    });
    if (error) throw error;

    // 维护标签表：增加新标签的使用次数
    try {
      await tagService.incrementTagUsage(task.tags || []);
    } catch (tagError) {
      console.error('Error updating tag usage:', tagError);
      // 标签更新失败不影响任务创建
    }
  },

  async updateTask(task: Task): Promise<void> {
    const supabase = ensureSupabase();

    // 获取任务的旧标签以便更新标签使用统计
    const { data: oldTask } = await supabase
      .from('tasks')
      .select('tags')
      .eq('id', task.id)
      .single();

    const oldTags = oldTask?.tags || [];

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
        tags: task.tags,
        sprint_id: task.sprintId,
      })
      .eq('id', task.id);
    if (error) throw error;

    // 维护标签表：更新标签使用次数
    try {
      await tagService.updateTagUsage(oldTags, task.tags || []);
    } catch (tagError) {
      console.error('Error updating tag usage:', tagError);
      // 标签更新失败不影响任务更新
    }
  },

  async deleteTask(id: string): Promise<void> {
    const supabase = ensureSupabase();

    // 获取任务的标签以便更新标签使用统计
    const { data: task } = await supabase
      .from('tasks')
      .select('tags')
      .eq('id', id)
      .single();

    const tags = task?.tags || [];

    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;

    // 维护标签表：减少已删除任务的标签使用次数
    try {
      await tagService.decrementTagUsage(tags);
    } catch (tagError) {
      console.error('Error updating tag usage:', tagError);
      // 标签更新失败不影响任务删除
    }
  }
};
