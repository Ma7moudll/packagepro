-- Migration: 002_add_indexes
-- Description: Add performance indexes
-- Created: 2024-01-02

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_projects_owner_status ON projects(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_folder_status ON projects(folder_id, status);
CREATE INDEX IF NOT EXISTS idx_project_versions_project_current ON project_versions(project_id, is_current);
CREATE INDEX IF NOT EXISTS idx_project_comments_project_status ON project_comments(project_id, status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status_created ON export_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_integration_status ON sync_jobs(integration_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_event ON analytics_events(user_id, event_name);

-- Full-text search indexes (MySQL)
-- ALTER TABLE projects ADD FULLTEXT INDEX ft_name_description (name, description);
-- ALTER TABLE templates ADD FULLTEXT INDEX ft_name_description (name, description);
-- ALTER TABLE assets ADD FULLTEXT INDEX ft_name_description (name, description);

-- Full-text search indexes (PostgreSQL)
-- CREATE INDEX ft_projects_name_description ON projects USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
-- CREATE INDEX ft_templates_name_description ON templates USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
-- CREATE INDEX ft_assets_name_description ON assets USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

