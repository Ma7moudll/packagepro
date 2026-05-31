#!/usr/bin/env node

/**
 * Database Migration Tool
 * Supports PostgreSQL and MySQL
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { Client } = require('pg');

const config = {
  database: {
    type: process.env.DB_TYPE || 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || (process.env.DB_TYPE === 'postgresql' ? 5432 : 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'packagepro',
  },
  migrations: {
    directory: path.join(__dirname, 'migrations'),
  },
};

/**
 * Get database connection
 */
async function getConnection() {
  if (config.database.type === 'postgresql') {
    return new Client({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
    });
  } else {
    return mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
    });
  }
}

/**
 * Get executed migrations
 */
async function getExecutedMigrations(connection) {
  try {
    if (config.database.type === 'postgresql') {
      const result = await connection.query('SELECT name FROM migrations ORDER BY batch, id');
      return result.rows.map(row => row.name);
    } else {
      const [rows] = await connection.query('SELECT name FROM migrations ORDER BY batch, id');
      return rows.map(row => row.name);
    }
  } catch (error) {
    // Migrations table doesn't exist yet
    return [];
  }
}

/**
 * Record migration
 */
async function recordMigration(connection, name, batch) {
  if (config.database.type === 'postgresql') {
    await connection.query(
      'INSERT INTO migrations (name, batch) VALUES ($1, $2)',
      [name, batch]
    );
  } else {
    await connection.query(
      'INSERT INTO migrations (name, batch) VALUES (?, ?)',
      [name, batch]
    );
  }
}

/**
 * Get next batch number
 */
async function getNextBatch(connection) {
  try {
    if (config.database.type === 'postgresql') {
      const result = await connection.query('SELECT MAX(batch) as max_batch FROM migrations');
      return (result.rows[0]?.max_batch || 0) + 1;
    } else {
      const [rows] = await connection.query('SELECT MAX(batch) as max_batch FROM migrations');
      return (rows[0]?.max_batch || 0) + 1;
    }
  } catch (error) {
    return 1;
  }
}

/**
 * Execute SQL file
 */
async function executeSQL(connection, sql) {
  if (config.database.type === 'postgresql') {
    await connection.query(sql);
  } else {
    // MySQL doesn't support multiple statements by default
    const statements = sql.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.query(statement);
      }
    }
  }
}

/**
 * Run migrations
 */
async function runMigrations() {
  const connection = await getConnection();
  
  try {
    if (config.database.type === 'postgresql') {
      await connection.connect();
    }

    // Ensure migrations table exists
    try {
      if (config.database.type === 'postgresql') {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            batch INT NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_batch ON migrations(batch);
        `);
      } else {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            batch INT NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_batch (batch)
          )
        `);
      }
    } catch (error) {
      console.error('Error creating migrations table:', error.message);
    }

    const executedMigrations = await getExecutedMigrations(connection);
    const migrationFiles = fs.readdirSync(config.migrations.directory)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    const batch = await getNextBatch(connection);
    console.log(`Running ${pendingMigrations.length} migration(s) in batch ${batch}...`);

    for (const file of pendingMigrations) {
      const filepath = path.join(config.migrations.directory, file);
      const sql = fs.readFileSync(filepath, 'utf8');

      console.log(`Running migration: ${file}`);
      try {
        await executeSQL(connection, sql);
        await recordMigration(connection, file, batch);
        console.log(`✅ Migration completed: ${file}`);
      } catch (error) {
        console.error(`❌ Migration failed: ${file}`);
        console.error(error.message);
        throw error;
      }
    }

    console.log(`✅ All migrations completed successfully`);
  } finally {
    if (config.database.type === 'postgresql') {
      await connection.end();
    } else {
      await connection.end();
    }
  }
}

/**
 * Rollback last batch
 */
async function rollbackLastBatch() {
  const connection = await getConnection();
  
  try {
    if (config.database.type === 'postgresql') {
      await connection.connect();
    }

    const result = await connection.query(
      'SELECT MAX(batch) as max_batch FROM migrations'
    );
    
    const maxBatch = config.database.type === 'postgresql' 
      ? result.rows[0]?.max_batch 
      : result[0][0]?.max_batch;

    if (!maxBatch) {
      console.log('No migrations to rollback');
      return;
    }

    console.log(`Rolling back batch ${maxBatch}...`);
    
    if (config.database.type === 'postgresql') {
      await connection.query('DELETE FROM migrations WHERE batch = $1', [maxBatch]);
    } else {
      await connection.query('DELETE FROM migrations WHERE batch = ?', [maxBatch]);
    }

    console.log(`✅ Batch ${maxBatch} rolled back`);
  } finally {
    if (config.database.type === 'postgresql') {
      await connection.end();
    } else {
      await connection.end();
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'migrate':
      runMigrations().then(() => process.exit(0));
      break;

    case 'rollback':
      rollbackLastBatch().then(() => process.exit(0));
      break;

    default:
      console.log(`
Usage:
  node migrate.js migrate   Run pending migrations
  node migrate.js rollback  Rollback last batch
      `);
      process.exit(1);
  }
}

module.exports = {
  runMigrations,
  rollbackLastBatch,
};

