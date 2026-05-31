-- Seeder: 002_seed_templates
-- Description: Seed sample templates
-- Created: 2024-01-01

INSERT INTO templates (id, name, description, category, style, tags, template_data, is_public, is_premium, created_by, created_at, updated_at)
VALUES 
    (
        'template-001',
        'Classic Box',
        'A classic rectangular box template',
        'boxes',
        'classic',
        '["box", "classic", "rectangular"]',
        '{"type": "box", "dimensions": {"width": 200, "height": 150, "depth": 100}}',
        TRUE,
        FALSE,
        'admin-001',
        NOW(),
        NOW()
    ),
    (
        'template-002',
        'Premium Gift Box',
        'An elegant gift box with premium finish',
        'boxes',
        'premium',
        '["box", "gift", "premium"]',
        '{"type": "box", "dimensions": {"width": 250, "height": 200, "depth": 150}}',
        TRUE,
        TRUE,
        'admin-001',
        NOW(),
        NOW()
    ),
    (
        'template-003',
        'Product Packaging',
        'Standard product packaging template',
        'packaging',
        'modern',
        '["packaging", "product", "modern"]',
        '{"type": "packaging", "dimensions": {"width": 300, "height": 200, "depth": 100}}',
        TRUE,
        FALSE,
        'admin-001',
        NOW(),
        NOW()
    )
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- For PostgreSQL, use:
-- INSERT INTO templates (id, name, description, category, style, tags, template_data, is_public, is_premium, created_by, created_at, updated_at)
-- VALUES 
--     ('template-001', 'Classic Box', 'A classic rectangular box template', 'boxes', 'classic', '["box", "classic", "rectangular"]', '{"type": "box", "dimensions": {"width": 200, "height": 150, "depth": 100}}', TRUE, FALSE, 'admin-001', NOW(), NOW()),
--     ('template-002', 'Premium Gift Box', 'An elegant gift box with premium finish', 'boxes', 'premium', '["box", "gift", "premium"]', '{"type": "box", "dimensions": {"width": 250, "height": 200, "depth": 150}}', TRUE, TRUE, 'admin-001', NOW(), NOW()),
--     ('template-003', 'Product Packaging', 'Standard product packaging template', 'packaging', 'modern', '["packaging", "product", "modern"]', '{"type": "packaging", "dimensions": {"width": 300, "height": 200, "depth": 100}}', TRUE, FALSE, 'admin-001', NOW(), NOW())
-- ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

