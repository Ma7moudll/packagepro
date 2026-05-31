#!/usr/bin/env node

/**
 * Database Seeding Tool
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
  seeders: {
    directory: path.join(__dirname, 'seeders'),
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
 * Run seeders
 */
async function runSeeders() {
  const connection = await getConnection();
  
  try {
    if (config.database.type === 'postgresql') {
      await connection.connect();
    }

    const seederFiles = fs.readdirSync(config.seeders.directory)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (seederFiles.length === 0) {
      console.log('No seeders found');
      return;
    }

    console.log(`Running ${seederFiles.length} seeder(s)...`);

    for (const file of seederFiles) {
      const filepath = path.join(config.seeders.directory, file);
      const sql = fs.readFileSync(filepath, 'utf8');

      console.log(`Running seeder: ${file}`);
      try {
        await executeSQL(connection, sql);
        console.log(`✅ Seeder completed: ${file}`);
      } catch (error) {
        console.error(`❌ Seeder failed: ${file}`);
        console.error(error.message);
        // Continue with other seeders
      }
    }

    console.log(`✅ All seeders completed`);
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
  runSeeders().then(() => process.exit(0));
}

module.exports = {
  runSeeders,
};

