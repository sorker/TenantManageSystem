const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const EventEmitter = require('events');

class Database extends EventEmitter {
  constructor() {
    super();
    this.db = null;
    this.isReady = false;
    this.isTest = process.env.NODE_ENV === 'test';
  }

  async connect() {
    if (this.isTest) {
      return;
    }

    try {
      const dbPath = path.join(process.cwd(), 'tenant.db');
      console.log('Connecting to database at:', dbPath);
      
      this.db = new sqlite3.Database(dbPath, async (err) => {
        if (err) {
          console.error('Error connecting to database:', err);
          this.emit('error', err);
          return;
        }
        console.log('Connected to database successfully');
        
        try {
          await this.createTables();
          this.isReady = true;
          this.emit('open');
        } catch (error) {
          console.error('Error during table creation:', error);
          this.emit('error', error);
        }
      });

      this.db.on('error', (err) => {
        console.error('Database error:', err);
        this.isReady = false;
        this.emit('error', err);
      });
    } catch (error) {
      console.error('Exception during database connection:', error);
      this.emit('error', error);
    }
  }

  createTables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        try {
          // 创建租客表
          this.db.run(`
            CREATE TABLE IF NOT EXISTS tenants (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              phone TEXT NOT NULL,
              id_number TEXT NOT NULL,
              wechat_id TEXT,
              check_in_date DATE NOT NULL,
              rent_amount REAL NOT NULL,
              payment_frequency TEXT NOT NULL,
              is_active INTEGER DEFAULT 1,
              is_deleted INTEGER DEFAULT 0,
              last_payment_date DATE,
              last_payment_amount REAL,
              room_id INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (room_id) REFERENCES rooms(id)
            )
          `);

          // 创建租客合同图片表
          this.db.run(`
            CREATE TABLE IF NOT EXISTS tenant_contract_images (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              tenant_id INTEGER NOT NULL,
              name TEXT NOT NULL,
              file_path TEXT NOT NULL,
              type TEXT NOT NULL DEFAULT 'contract',
              is_deleted INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
            )
          `);

          // 创建位置表
          this.db.run(`
            CREATE TABLE IF NOT EXISTS locations (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              address TEXT NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);

          // 创建房间表
          this.db.run(`
            CREATE TABLE IF NOT EXISTS rooms (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              location_id INTEGER NOT NULL,
              room_number TEXT NOT NULL,
              floor INTEGER,
              is_occupied INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (location_id) REFERENCES locations(id)
            )
          `);

          // 创建设施表
          this.db.run(`
            CREATE TABLE IF NOT EXISTS facilities (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              description TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);

          // 创建房间设施关联表
          this.db.run(`
            CREATE TABLE IF NOT EXISTS room_facilities (
              room_id INTEGER NOT NULL,
              facility_id INTEGER NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (room_id, facility_id),
              FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
              FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
            )
          `);

          // 创建日程表
          this.db.run(`
            CREATE TABLE IF NOT EXISTS schedules (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              title TEXT NOT NULL,
              type TEXT NOT NULL,
              date DATE NOT NULL,
              description TEXT,
              room_id INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
            )
          `);

          // 创建交租历史表
          this.db.run(`
            CREATE TABLE IF NOT EXISTS payment_history (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              tenant_id INTEGER NOT NULL,
              payment_date DATE NOT NULL,
              due_date DATE NOT NULL,
              amount REAL NOT NULL,
              payment_method TEXT,
              payment_type TEXT DEFAULT 'rent',
              notes TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
            )
          `, (err) => {
            if (err) reject(err);
            else resolve();
          });
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  // 用于测试的方法
  __setMockDb(mockDb) {
    this.db = mockDb;
    this.isReady = true;
    this.emit('open');
  }

  // 用于测试的方法
  __reset() {
    this.db = null;
    this.isReady = false;
  }

  // 代理数据库方法
  all(sql, params, callback) {
    if (!this.db) {
      callback(new Error('Database connection is not available'));
      return;
    }
    this.db.all(sql, params, callback);
  }

  run(sql, params, callback) {
    if (!this.db) {
      if (typeof callback === 'function') {
        callback(new Error('Database connection is not available'));
      }
      return;
    }
    this.db.run(sql, params, callback);
  }

  get(sql, params, callback) {
    if (!this.db) {
      callback(new Error('Database connection is not available'));
      return;
    }
    this.db.get(sql, params, callback);
  }

  serialize(callback) {
    if (!this.db) {
      throw new Error('Database connection is not available');
    }
    if (!this.isReady) {
      throw new Error('Database is not ready yet');
    }
    this.db.serialize(callback);
  }

  // 事务相关方法
  beginTransaction(callback) {
    if (!this.db) {
      if (typeof callback === 'function') {
        callback(new Error('Database connection is not available'));
      }
      return;
    }
    this.db.run('BEGIN TRANSACTION', callback);
  }

  commit(callback) {
    if (!this.db) {
      if (typeof callback === 'function') {
        callback(new Error('Database connection is not available'));
      }
      return;
    }
    this.db.run('COMMIT', callback);
  }

  rollback(callback) {
    if (!this.db) {
      if (typeof callback === 'function') {
        callback(new Error('Database connection is not available'));
      }
      return;
    }
    this.db.run('ROLLBACK', callback);
  }
}

const db = new Database();
db.connect();

module.exports = db; 