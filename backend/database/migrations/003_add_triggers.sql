-- Migration: 003_add_triggers
-- Description: Add database triggers for automatic updates
-- Created: 2024-01-03

-- MySQL Triggers
DELIMITER $$

-- Update updated_at timestamp on projects
CREATE TRIGGER IF NOT EXISTS update_projects_timestamp
BEFORE UPDATE ON projects
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$

-- Update updated_at timestamp on users
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$

-- Update project_count in folders
CREATE TRIGGER IF NOT EXISTS update_folder_count_insert
AFTER INSERT ON projects
FOR EACH ROW
BEGIN
    IF NEW.folder_id IS NOT NULL THEN
        UPDATE project_folders
        SET project_count = project_count + 1
        WHERE id = NEW.folder_id;
    END IF;
END$$

CREATE TRIGGER IF NOT EXISTS update_folder_count_delete
AFTER DELETE ON projects
FOR EACH ROW
BEGIN
    IF OLD.folder_id IS NOT NULL THEN
        UPDATE project_folders
        SET project_count = project_count - 1
        WHERE id = OLD.folder_id;
    END IF;
END$$

CREATE TRIGGER IF NOT EXISTS update_folder_count_update
AFTER UPDATE ON projects
FOR EACH ROW
BEGIN
    IF OLD.folder_id != NEW.folder_id THEN
        IF OLD.folder_id IS NOT NULL THEN
            UPDATE project_folders
            SET project_count = project_count - 1
            WHERE id = OLD.folder_id;
        END IF;
        IF NEW.folder_id IS NOT NULL THEN
            UPDATE project_folders
            SET project_count = project_count + 1
            WHERE id = NEW.folder_id;
        END IF;
    END IF;
END$$

DELIMITER ;

-- PostgreSQL Triggers
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = CURRENT_TIMESTAMP;
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- CREATE TRIGGER update_projects_timestamp
--     BEFORE UPDATE ON projects
--     FOR EACH ROW
--     EXECUTE FUNCTION update_updated_at_column();

-- CREATE TRIGGER update_users_timestamp
--     BEFORE UPDATE ON users
--     FOR EACH ROW
--     EXECUTE FUNCTION update_updated_at_column();

