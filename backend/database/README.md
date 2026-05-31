# Database System

This directory contains the database schema, migrations, seeders, backup, and replication setup for PackagePro.

## Features

### ✅ PostgreSQL/MySQL Schema
- **File**: `schema.sql`
- **Features**:
  - Complete database schema
  - Supports both PostgreSQL and MySQL
  - All tables with proper relationships
  - Indexes for performance
  - Foreign key constraints

### ✅ Migration Scripts
- **File**: `migrate.js`
- **Features**:
  - Run migrations
  - Rollback migrations
  - Track migration history
  - Support for both PostgreSQL and MySQL

### ✅ Data Seeding
- **File**: `seed.js`
- **Features**:
  - Seed initial data
  - Run seeders in order
  - Support for both PostgreSQL and MySQL

### ✅ Backup System
- **File**: `backup.js`
- **Features**:
  - Full backups
  - Incremental backups
  - Schema-only backups
  - Automatic compression
  - Backup retention
  - Restore functionality

### ✅ Replication Setup
- **File**: `replication.js`
- **Features**:
  - MySQL replication setup
  - PostgreSQL replication setup
  - Replication status checking
  - Master-replica configuration

## Usage

### Setup Database

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE packagepro;"
# or
psql -U postgres -c "CREATE DATABASE packagepro;"

# Run schema
mysql -u root -p packagepro < schema.sql
# or
psql -U postgres -d packagepro -f schema.sql
```

### Run Migrations

```bash
# Set environment variables
export DB_TYPE=mysql
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=root
export DB_PASSWORD=yourpassword
export DB_NAME=packagepro

# Run migrations
node migrate.js migrate

# Rollback last batch
node migrate.js rollback
```

### Seed Database

```bash
# Run seeders
node seed.js
```

### Create Backup

```bash
# Full backup
node backup.js backup full

# Incremental backup
node backup.js backup incremental

# Schema-only backup
node backup.js backup schema

# Restore backup
node backup.js restore backups/packagepro_full_2024-01-01.sql.gz

# Clean old backups
node backup.js clean
```

### Setup Replication

```bash
# Show replication setup instructions
node replication.js setup

# Check replication status
node replication.js status
```

## Database Schema

### Core Tables
- `users` - User accounts
- `accounts` - OAuth accounts
- `sessions` - User sessions
- `projects` - Design projects
- `project_folders` - Project organization
- `project_versions` - Version history
- `project_shares` - Sharing permissions
- `project_comments` - Comments and feedback
- `approval_workflows` - Approval processes

### Content Tables
- `templates` - Design templates
- `template_ratings` - Template ratings
- `assets` - Media assets
- `asset_versions` - Asset versioning

### Export Tables
- `export_presets` - Export configurations
- `export_jobs` - Export job tracking
- `export_schedules` - Scheduled exports

### Integration Tables
- `integrations` - External integrations
- `sync_jobs` - Sync job tracking

### E-commerce Tables
- `orders` - Customer orders
- `invoices` - Invoices

### Analytics Tables
- `analytics_events` - Event tracking

### System Tables
- `database_backups` - Backup records
- `migrations` - Migration history

## Environment Variables

```bash
# Database Configuration
DB_TYPE=mysql                    # or postgresql
DB_HOST=localhost
DB_PORT=3306                     # or 5432 for PostgreSQL
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=packagepro

# Backup Configuration
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESSION=true

# Replication Configuration
DB_MASTER_HOST=master.example.com
DB_MASTER_PORT=3306
DB_MASTER_USER=root
DB_MASTER_PASSWORD=password
DB_MASTER_NAME=packagepro

DB_REPLICA_HOST=replica.example.com
DB_REPLICA_PORT=3306
DB_REPLICA_USER=root
DB_REPLICA_PASSWORD=password
DB_REPLICA_NAME=packagepro
```

## Migration Files

- `001_initial_schema.sql` - Migration tracking table
- `002_add_indexes.sql` - Performance indexes
- `003_add_triggers.sql` - Database triggers

## Seeder Files

- `001_seed_users.sql` - Initial users
- `002_seed_templates.sql` - Sample templates
- `003_seed_export_presets.sql` - Default export presets

## Notes

- All SQL files support both PostgreSQL and MySQL
- Differences are noted in comments
- Migrations are tracked in the `migrations` table
- Backups are compressed by default
- Replication setup provides instructions, not automatic setup
- All scripts are idempotent and safe to run multiple times

