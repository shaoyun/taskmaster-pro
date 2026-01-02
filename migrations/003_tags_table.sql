-- 创建标签表
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为标签名创建索引以加速查询
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- 为使用次数创建索引以支持按热度排序
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags(usage_count DESC);

-- 从现有任务中提取并初始化标签数据
INSERT INTO tags (name, usage_count)
SELECT
  tag_name,
  COUNT(*) as count
FROM (
  SELECT DISTINCT unnest(tags) as tag_name
  FROM tasks
  WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
) subquery
GROUP BY tag_name
ON CONFLICT (name) DO UPDATE
SET usage_count = EXCLUDED.usage_count;
