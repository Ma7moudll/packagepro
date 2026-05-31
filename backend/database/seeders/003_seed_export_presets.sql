-- Seeder: 003_seed_export_presets
-- Description: Seed default export presets
-- Created: 2024-01-01

INSERT INTO export_presets (id, name, description, format, settings, is_default, created_at, updated_at)
VALUES 
    (
        'preset-001',
        'High Quality PDF',
        '300 DPI CMYK PDF with bleed and crop marks',
        'pdf',
        '{"dpi": 300, "quality": 100, "colorMode": "cmyk", "includeBleed": true, "bleedSize": 3, "includeCropMarks": true}',
        TRUE,
        NOW(),
        NOW()
    ),
    (
        'preset-002',
        'Web PNG',
        '72 DPI RGB PNG for web use',
        'png',
        '{"dpi": 72, "quality": 90, "colorMode": "rgb", "includeBleed": false}',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        'preset-003',
        'Print Ready PDF',
        '600 DPI CMYK PDF with all print marks',
        'pdf',
        '{"dpi": 600, "quality": 100, "colorMode": "cmyk", "includeBleed": true, "bleedSize": 3, "includeCropMarks": true, "includeColorBars": true, "includeRegistrationMarks": true}',
        FALSE,
        NOW(),
        NOW()
    )
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- For PostgreSQL, use:
-- INSERT INTO export_presets (id, name, description, format, settings, is_default, created_at, updated_at)
-- VALUES 
--     ('preset-001', 'High Quality PDF', '300 DPI CMYK PDF with bleed and crop marks', 'pdf', '{"dpi": 300, "quality": 100, "colorMode": "cmyk", "includeBleed": true, "bleedSize": 3, "includeCropMarks": true}', TRUE, NOW(), NOW()),
--     ('preset-002', 'Web PNG', '72 DPI RGB PNG for web use', 'png', '{"dpi": 72, "quality": 90, "colorMode": "rgb", "includeBleed": false}', FALSE, NOW(), NOW()),
--     ('preset-003', 'Print Ready PDF', '600 DPI CMYK PDF with all print marks', 'pdf', '{"dpi": 600, "quality": 100, "colorMode": "cmyk", "includeBleed": true, "bleedSize": 3, "includeCropMarks": true, "includeColorBars": true, "includeRegistrationMarks": true}', FALSE, NOW(), NOW())
-- ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

