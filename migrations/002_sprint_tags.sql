-- Add tags and sprint_id to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sprint_id UUID DEFAULT NULL;

-- Create sprints table
CREATE TABLE IF NOT EXISTS sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PLANNING', -- PLANNING, ACTIVE, COMPLETED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for sprint_id on tasks
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON tasks(sprint_id);
-- Index for start_date on sprints
CREATE INDEX IF NOT EXISTS idx_sprints_start_date ON sprints(start_date);
