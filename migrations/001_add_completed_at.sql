-- Add completed_at field to tasks table
-- This field tracks when a task was marked as completed
-- It uses timestamp with time zone to handle timezone correctly

ALTER TABLE public.tasks
ADD COLUMN completed_at timestamp with time zone NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.tasks.completed_at IS 'Timestamp when the task was marked as DONE. Automatically set when status changes to DONE, cleared when status changes from DONE to other states.';
