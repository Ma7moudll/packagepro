-- Seeder: 001_seed_users
-- Description: Seed initial users and admin account
-- Created: 2024-01-01

-- Insert admin user (password: admin123 - should be hashed in production)
INSERT INTO users (id, email, name, password_hash, email_verified, created_at, updated_at)
VALUES 
    ('admin-001', 'admin@packagepro.com', 'Admin User', '$2b$10$rQ8K8K8K8K8K8K8K8K8K8O8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', TRUE, NOW(), NOW()),
    ('user-001', 'user@packagepro.com', 'Test User', '$2b$10$rQ8K8K8K8K8K8K8K8K8K8O8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- For PostgreSQL, use:
-- INSERT INTO users (id, email, name, password_hash, email_verified, created_at, updated_at)
-- VALUES 
--     ('admin-001', 'admin@packagepro.com', 'Admin User', '$2b$10$rQ8K8K8K8K8K8K8K8K8O8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', TRUE, NOW(), NOW()),
--     ('user-001', 'user@packagepro.com', 'Test User', '$2b$10$rQ8K8K8K8K8K8K8K8K8O8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', TRUE, NOW(), NOW())
-- ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

