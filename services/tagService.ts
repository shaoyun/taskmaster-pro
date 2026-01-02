import { getSupabase } from './supabaseClient';

const ensureSupabase = () => {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }
  return supabase;
};

export interface Tag {
  id: string;
  name: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export const tagService = {
  /**
   * 获取所有标签，按使用次数降序排列
   */
  async getTags(): Promise<Tag[]> {
    const supabase = ensureSupabase();

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('usage_count', { ascending: false });

    if (error) {
      console.error('Error fetching tags:', error);
      throw error;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      usageCount: row.usage_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  /**
   * 搜索标签（模糊匹配）
   */
  async searchTags(query: string): Promise<Tag[]> {
    const supabase = ensureSupabase();

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('usage_count', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error searching tags:', error);
      throw error;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      usageCount: row.usage_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  /**
   * 增加标签使用次数（如果标签不存在则创建）
   */
  async incrementTagUsage(tagNames: string[]): Promise<void> {
    if (tagNames.length === 0) return;

    const supabase = ensureSupabase();

    // 为每个标签执行 upsert 操作
    for (const tagName of tagNames) {
      const trimmedName = tagName.trim();
      if (!trimmedName) continue;

      // 先尝试查找现有标签
      const { data: existing } = await supabase
        .from('tags')
        .select('id, usage_count')
        .eq('name', trimmedName)
        .single();

      if (existing) {
        // 更新使用次数
        await supabase
          .from('tags')
          .update({
            usage_count: existing.usage_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // 创建新标签
        await supabase
          .from('tags')
          .insert({
            name: trimmedName,
            usage_count: 1
          });
      }
    }
  },

  /**
   * 减少标签使用次数（如果使用次数为0则删除标签）
   */
  async decrementTagUsage(tagNames: string[]): Promise<void> {
    if (tagNames.length === 0) return;

    const supabase = ensureSupabase();

    for (const tagName of tagNames) {
      const trimmedName = tagName.trim();
      if (!trimmedName) continue;

      // 查找现有标签
      const { data: existing } = await supabase
        .from('tags')
        .select('id, usage_count')
        .eq('name', trimmedName)
        .single();

      if (existing) {
        const newCount = Math.max(0, existing.usage_count - 1);

        if (newCount === 0) {
          // 使用次数为0，删除标签
          await supabase
            .from('tags')
            .delete()
            .eq('id', existing.id);
        } else {
          // 减少使用次数
          await supabase
            .from('tags')
            .update({
              usage_count: newCount,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        }
      }
    }
  },

  /**
   * 更新标签使用情况（处理任务标签变更）
   * @param oldTags 旧标签列表
   * @param newTags 新标签列表
   */
  async updateTagUsage(oldTags: string[], newTags: string[]): Promise<void> {
    const oldSet = new Set(oldTags);
    const newSet = new Set(newTags);

    // 找出被添加的标签
    const added = newTags.filter(tag => !oldSet.has(tag));
    // 找出被移除的标签
    const removed = oldTags.filter(tag => !newSet.has(tag));

    // 增加新标签的使用次数
    if (added.length > 0) {
      await this.incrementTagUsage(added);
    }

    // 减少移除标签的使用次数
    if (removed.length > 0) {
      await this.decrementTagUsage(removed);
    }
  },

  /**
   * 清理未使用的标签（使用次数为0的标签）
   */
  async cleanupUnusedTags(): Promise<void> {
    const supabase = ensureSupabase();

    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('usage_count', 0);

    if (error) {
      console.error('Error cleaning up unused tags:', error);
      throw error;
    }
  }
};
