#!/usr/bin/env node

/**
 * Database Replication Setup
 * Supports PostgreSQL and MySQL replication
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const config = {
  database: {
    type: process.env.DB_TYPE || 'mysql',
    master: {
      host: process.env.DB_MASTER_HOST || 'localhost',
      port: process.env.DB_MASTER_PORT || (process.env.DB_TYPE === 'postgresql' ? 5432 : 3306),
      user: process.env.DB_MASTER_USER || 'root',
      password: process.env.DB_MASTER_PASSWORD || '',
      database: process.env.DB_MASTER_NAME || 'packagepro',
    },
    replica: {
      host: process.env.DB_REPLICA_HOST || 'localhost',
      port: process.env.DB_REPLICA_PORT || (process.env.DB_TYPE === 'postgresql' ? 5432 : 3306),
      user: process.env.DB_REPLICA_USER || 'root',
      password: process.env.DB_REPLICA_PASSWORD || '',
      database: process.env.DB_REPLICA_NAME || 'packagepro',
    },
  },
};

/**
 * Setup MySQL Replication
 */
async function setupMySQLReplication() {
  console.log('Setting up MySQL replication...');

  // Step 1: Configure master server
  console.log('1. Configuring master server...');
  const masterConfig = `
[mysqld]
server-id = 1
log-bin = mysql-bin
binlog-format = ROW
expire_logs_days = 7
max_binlog_size = 100M
  `;

  console.log('Master configuration:');
  console.log(masterConfig);

  // Step 2: Create replication user
  console.log('2. Creating replication user...');
  const createUserSQL = `
CREATE USER IF NOT EXISTS 'replicator'@'%' IDENTIFIED BY '${config.database.replica.password}';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';
FLUSH PRIVILEGES;
  `;

  console.log('Run this on master:');
  console.log(createUserSQL);

  // Step 3: Get master status
  console.log('3. Getting master status...');
  const masterStatusSQL = `SHOW MASTER STATUS;`;
  console.log('Run this on master:');
  console.log(masterStatusSQL);

  // Step 4: Configure replica server
  console.log('4. Configuring replica server...');
  const replicaConfig = `
[mysqld]
server-id = 2
relay-log = mysql-relay-bin
read-only = 1
  `;

  console.log('Replica configuration:');
  console.log(replicaConfig);

  // Step 5: Start replication
  console.log('5. Starting replication...');
  console.log(`
Run this on replica:
CHANGE MASTER TO
  MASTER_HOST='${config.database.master.host}',
  MASTER_PORT=${config.database.master.port},
  MASTER_USER='replicator',
  MASTER_PASSWORD='${config.database.replica.password}',
  MASTER_LOG_FILE='<from SHOW MASTER STATUS>',
  MASTER_LOG_POS=<from SHOW MASTER STATUS>;

START SLAVE;

SHOW SLAVE STATUS\\G;
  `);

  console.log('✅ MySQL replication setup instructions provided');
}

/**
 * Setup PostgreSQL Replication
 */
async function setupPostgreSQLReplication() {
  console.log('Setting up PostgreSQL replication...');

  // Step 1: Configure master (primary) server
  console.log('1. Configuring primary server...');
  const primaryConfig = `
# postgresql.conf
wal_level = replica
max_wal_senders = 3
max_replication_slots = 3
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/archive/%f && cp %p /var/lib/postgresql/archive/%f'

# pg_hba.conf
host replication replicator <replica-ip>/32 md5
  `;

  console.log('Primary configuration:');
  console.log(primaryConfig);

  // Step 2: Create replication user
  console.log('2. Creating replication user...');
  const createUserSQL = `
CREATE USER replicator WITH REPLICATION PASSWORD '${config.database.replica.password}';
  `;

  console.log('Run this on primary:');
  console.log(createUserSQL);

  // Step 3: Create replication slot
  console.log('3. Creating replication slot...');
  const createSlotSQL = `SELECT pg_create_physical_replication_slot('replica_slot');`;
  console.log('Run this on primary:');
  console.log(createSlotSQL);

  // Step 4: Setup replica (standby) server
  console.log('4. Setting up standby server...');
  console.log(`
Run this on standby:
pg_basebackup -h ${config.database.master.host} -D /var/lib/postgresql/data -U replicator -P -v -R -X stream
  `);

  // Step 5: Configure standby
  console.log('5. Configure standby recovery...');
  const standbyConfig = `
# postgresql.conf
primary_conninfo = 'host=${config.database.master.host} port=${config.database.master.port} user=replicator password=${config.database.replica.password}'
primary_slot_name = 'replica_slot'
  `;

  console.log('Standby configuration:');
  console.log(standbyConfig);

  console.log('✅ PostgreSQL replication setup instructions provided');
}

/**
 * Check replication status
 */
async function checkReplicationStatus() {
  if (config.database.type === 'postgresql') {
    const env = {
      ...process.env,
      PGPASSWORD: config.database.replica.password,
    };

    try {
      const { stdout } = await execAsync(
        `psql -h ${config.database.replica.host} -p ${config.database.replica.port} -U ${config.database.replica.user} -d ${config.database.replica.database} -c "SELECT * FROM pg_stat_replication;"`
      );
      console.log('Replication status:');
      console.log(stdout);
    } catch (error) {
      console.error('Error checking replication status:', error.message);
    }
  } else {
    try {
      const { stdout } = await execAsync(
        `mysql -h ${config.database.replica.host} -P ${config.database.replica.port} -u ${config.database.replica.user} -p${config.database.replica.password} -e "SHOW SLAVE STATUS\\G"`
      );
      console.log('Replication status:');
      console.log(stdout);
    } catch (error) {
      console.error('Error checking replication status:', error.message);
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'setup':
      if (config.database.type === 'postgresql') {
        setupPostgreSQLReplication();
      } else {
        setupMySQLReplication();
      }
      break;

    case 'status':
      checkReplicationStatus();
      break;

    default:
      console.log(`
Usage:
  node replication.js setup   Show replication setup instructions
  node replication.js status   Check replication status
      `);
      process.exit(1);
  }
}

module.exports = {
  setupMySQLReplication,
  setupPostgreSQLReplication,
  checkReplicationStatus,
};

