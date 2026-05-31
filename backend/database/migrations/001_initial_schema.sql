-- Migration: 001_initial_schema
-- Description: Initial database schema creation
-- Created: 2024-01-01

-- This migration creates all base tables for PackagePro
-- Run this migration first to set up the database structure

-- Note: The main schema is in schema.sql
-- This file is for migration tracking purposes

-- Migration tracking table
CREATE TABLE IF NOT EXISTS migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    batch INT NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_batch (batch)
);

-- For PostgreSQL, use SERIAL instead of AUTO_INCREMENT
-- CREATE TABLE IF NOT EXISTS migrations (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL UNIQUE,
--     batch INT NOT NULL,
--     executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
-- CREATE INDEX idx_batch ON migrations(batch);

