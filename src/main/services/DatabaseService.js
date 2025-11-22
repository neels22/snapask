/**
 * Database Service
 * Manages SQLite database connection and migrations
 */

const Database = require('better-sqlite3');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const Logger = require('../utils/logger');

class DatabaseService {
  constructor() {
    this.db = null;
    this.logger = new Logger('DatabaseService');
    this.dbPath = path.join(app.getPath('userData'), 'conversations.db');
  }

  initialize() {
    try {
      // Ensure directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Open database
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL'); // Better concurrency
      this.db.pragma('foreign_keys = ON');  // Enforce foreign keys

      this.logger.info(`Database opened: ${this.dbPath}`);

      // Run migrations
      this.runMigrations();

      this.logger.success('Database initialized');
    } catch (error) {
      this.logger.error('Failed to initialize database', error);
      throw error;
    }
  }

  runMigrations() {
    const currentVersion = this.getCurrentVersion();
    const migrations = this.loadMigrations();

    migrations
      .filter(m => m.version > currentVersion)
      .sort((a, b) => a.version - b.version)
      .forEach(migration => {
        this.logger.info(`Running migration ${migration.version}`);
        migration.up(this.db);
        this.setVersion(migration.version);
      });
  }

  loadMigrations() {
    const migrationsDir = path.join(__dirname, '../db/migrations');
    
    // Create migrations directory if it doesn't exist
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
      return [];
    }
    
    const files = fs.readdirSync(migrationsDir);
    
    return files
      .filter(f => f.endsWith('.js'))
      .map(f => require(path.join(migrationsDir, f)));
  }

  getCurrentVersion() {
    try {
      const stmt = this.db.prepare('SELECT value FROM metadata WHERE key = ?');
      const row = stmt.get('schema_version');
      return row ? parseInt(row.value, 10) : 0;
    } catch {
      return 0;
    }
  }

  setVersion(version) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO metadata (key, value, updated_at) 
      VALUES (?, ?, ?)
    `);
    stmt.run('schema_version', version.toString(), Date.now());
  }

  getDb() {
    return this.db;
  }

  close() {
    if (this.db) {
      this.db.close();
      this.logger.info('Database closed');
    }
  }
}

module.exports = DatabaseService;

