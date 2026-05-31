#!/usr/bin/env node

/**
 * Database Backup System
 * Supports PostgreSQL and MySQL
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const config = {
  database: {
    type: process.env.DB_TYPE || 'mysql', // 'mysql' or 'postgresql'
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || (process.env.DB_TYPE === 'postgresql' ? 5432 : 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'packagepro',
  },
  backup: {
    directory: process.env.BACKUP_DIR || path.join(__dirname, 'backups'),
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
    compression: process.env.BACKUP_COMPRESSION !== 'false',
  },
};

/**
 * Create backup directory if it doesn't exist
 */
function ensureBackupDirectory() {
  if (!fs.existsSync(config.backup.directory)) {
    fs.mkdirSync(config.backup.directory, { recursive: true });
  }
}

/**
 * Generate backup filename
 */
function generateBackupFilename(type = 'full') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const extension = config.backup.compression ? 'sql.gz' : 'sql';
  return `${config.database.database}_${type}_${timestamp}.${extension}`;
}

/**
 * Create MySQL backup
 */
async function backupMySQL(type = 'full') {
  const filename = generateBackupFilename(type);
  const filepath = path.join(config.backup.directory, filename);

  let command;
  if (type === 'schema') {
    command = `mysqldump -h ${config.database.host} -P ${config.database.port} -u ${config.database.user} -p${config.database.password} --no-data ${config.database.database}`;
  } else if (type === 'incremental') {
    // For incremental backups, you would need to track changes
    // This is a simplified version
    command = `mysqldump -h ${config.database.host} -P ${config.database.port} -u ${config.database.user} -p${config.database.password} --single-transaction --quick --lock-tables=false ${config.database.database}`;
  } else {
    command = `mysqldump -h ${config.database.host} -P ${config.database.port} -u ${config.database.user} -p${config.database.password} --single-transaction --quick --lock-tables=false ${config.database.database}`;
  }

  if (config.backup.compression) {
    command += ' | gzip';
  }

  command += ` > ${filepath}`;

  try {
    await execAsync(command);
    console.log(`✅ Backup created: ${filename}`);
    return { filename, filepath, size: fs.statSync(filepath).size };
  } catch (error) {
    console.error(`❌ Backup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Create PostgreSQL backup
 */
async function backupPostgreSQL(type = 'full') {
  const filename = generateBackupFilename(type);
  const filepath = path.join(config.backup.directory, filename);

  const env = {
    ...process.env,
    PGPASSWORD: config.database.password,
  };

  let command;
  if (type === 'schema') {
    command = `pg_dump -h ${config.database.host} -p ${config.database.port} -U ${config.database.user} -s ${config.database.database}`;
  } else if (type === 'incremental') {
    // PostgreSQL incremental backups use WAL archiving
    // This is a simplified version
    command = `pg_dump -h ${config.database.host} -p ${config.database.port} -U ${config.database.user} -F c ${config.database.database}`;
  } else {
    command = `pg_dump -h ${config.database.host} -p ${config.database.port} -U ${config.database.user} -F c ${config.database.database}`;
  }

  if (config.backup.compression && type !== 'incremental') {
    command += ' | gzip';
  }

  command += ` > ${filepath}`;

  try {
    await execAsync(command, { env });
    console.log(`✅ Backup created: ${filename}`);
    return { filename, filepath, size: fs.statSync(filepath).size };
  } catch (error) {
    console.error(`❌ Backup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Create backup
 */
async function createBackup(type = 'full') {
  ensureBackupDirectory();

  console.log(`Creating ${type} backup...`);

  let result;
  if (config.database.type === 'postgresql') {
    result = await backupPostgreSQL(type);
  } else {
    result = await backupMySQL(type);
  }

  // Record backup in database
  // await recordBackup(result, type);

  return result;
}

/**
 * Restore backup
 */
async function restoreBackup(filepath) {
  console.log(`Restoring backup from ${filepath}...`);

  let command;
  if (config.database.type === 'postgresql') {
    const env = {
      ...process.env,
      PGPASSWORD: config.database.password,
    };

    if (filepath.endsWith('.gz')) {
      command = `gunzip -c ${filepath} | psql -h ${config.database.host} -p ${config.database.port} -U ${config.database.user} -d ${config.database.database}`;
    } else {
      command = `psql -h ${config.database.host} -p ${config.database.port} -U ${config.database.user} -d ${config.database.database} < ${filepath}`;
    }

    try {
      await execAsync(command, { env });
      console.log('✅ Backup restored successfully');
    } catch (error) {
      console.error(`❌ Restore failed: ${error.message}`);
      throw error;
    }
  } else {
    if (filepath.endsWith('.gz')) {
      command = `gunzip -c ${filepath} | mysql -h ${config.database.host} -P ${config.database.port} -u ${config.database.user} -p${config.database.password} ${config.database.database}`;
    } else {
      command = `mysql -h ${config.database.host} -P ${config.database.port} -u ${config.database.user} -p${config.database.password} ${config.database.database} < ${filepath}`;
    }

    try {
      await execAsync(command);
      console.log('✅ Backup restored successfully');
    } catch (error) {
      console.error(`❌ Restore failed: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Clean old backups
 */
function cleanOldBackups() {
  const files = fs.readdirSync(config.backup.directory);
  const now = Date.now();
  const retentionMs = config.backup.retentionDays * 24 * 60 * 60 * 1000;

  let deletedCount = 0;
  files.forEach((file) => {
    const filepath = path.join(config.backup.directory, file);
    const stats = fs.statSync(filepath);
    const age = now - stats.mtimeMs;

    if (age > retentionMs) {
      fs.unlinkSync(filepath);
      deletedCount++;
      console.log(`🗑️  Deleted old backup: ${file}`);
    }
  });

  if (deletedCount > 0) {
    console.log(`✅ Cleaned ${deletedCount} old backup(s)`);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'backup':
      const type = args[1] || 'full';
      createBackup(type).then(() => {
        cleanOldBackups();
        process.exit(0);
      });
      break;

    case 'restore':
      const filepath = args[1];
      if (!filepath) {
        console.error('❌ Please provide backup file path');
        process.exit(1);
      }
      restoreBackup(filepath).then(() => process.exit(0));
      break;

    case 'clean':
      cleanOldBackups();
      process.exit(0);
      break;

    default:
      console.log(`
Usage:
  node backup.js backup [full|incremental|schema]  Create a backup
  node backup.js restore <filepath>                Restore from backup
  node backup.js clean                             Clean old backups
      `);
      process.exit(1);
  }
}

module.exports = {
  createBackup,
  restoreBackup,
  cleanOldBackups,
};

