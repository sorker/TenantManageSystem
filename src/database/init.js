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

  connect() {
    if (this.isTest) {
      return;
    }

    try {
      const dbPath = path.join(process.cwd(), 'tenant.db');
      console.log('Connecting to database at:', dbPath);
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error connecting to database:', err);
          this.emit('error', err);
          return;
        }
        console.log('Connected to database successfully');
        
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
        `, (err) => {
          if (err) {
            console.error('Error creating tenants table:', err);
            this.emit('error', err);
            return;
          }
          console.log('tenants table created or already exists');

          // 检查并添加新列
          const newColumns = [
            { name: 'last_payment_date', type: 'DATE' },
            { name: 'last_payment_amount', type: 'REAL' },
            { name: 'room_id', type: 'INTEGER' }
          ];

          // 使用 Promise 来处理列添加
          const addColumn = (column) => {
            return new Promise((resolve, reject) => {
              this.db.get(`SELECT * FROM pragma_table_info('tenants') WHERE name='${column.name}'`, (err, row) => {
                if (err) {
                  console.error(`Error checking for ${column.name} column:`, err);
                  reject(err);
                  return;
                }
                
                if (!row) {
                  console.log(`Adding ${column.name} column to tenants table`);
                  this.db.run(`ALTER TABLE tenants ADD COLUMN ${column.name} ${column.type}`, (err) => {
                    if (err) {
                      console.error(`Error adding ${column.name} column:`, err);
                      reject(err);
                    } else {
                      console.log(`Successfully added ${column.name} column`);
                      resolve();
                    }
                  });
                } else {
                  resolve();
                }
              });
            });
          };

          // 按顺序添加列
          Promise.all(newColumns.map(addColumn))
            .then(() => {
              console.log('All columns added successfully');
            })
            .catch((error) => {
              console.error('Error adding columns:', error);
            });
        });

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
        `, (err) => {
          if (err) {
            console.error('Error creating tenant_contract_images table:', err);
            this.emit('error', err);
            return;
          }
          console.log('tenant_contract_images table created or already exists');

          // 检查并添加列
          const checkAndAddColumn = (columnName, columnType, defaultValue = null) => {
            return new Promise((resolve, reject) => {
              this.db.get(`SELECT * FROM pragma_table_info('tenant_contract_images') WHERE name='${columnName}'`, (err, row) => {
                if (err) {
                  console.error(`Error checking for ${columnName} column:`, err);
                  reject(err);
                  return;
                }
                
                if (!row) {
                  console.log(`Adding ${columnName} column to tenant_contract_images table`);
                  const defaultValueClause = defaultValue ? `DEFAULT '${defaultValue}'` : '';
                  this.db.run(`ALTER TABLE tenant_contract_images ADD COLUMN ${columnName} ${columnType} ${defaultValueClause}`, (err) => {
                    if (err) {
                      console.error(`Error adding ${columnName} column:`, err);
                      reject(err);
                    } else {
                      console.log(`Successfully added ${columnName} column`);
                      resolve();
                    }
                  });
                } else {
                  resolve();
                }
              });
            });
          };

          // 按顺序添加列
          Promise.all([
            checkAndAddColumn('type', 'TEXT', 'contract'),
            checkAndAddColumn('is_deleted', 'INTEGER', '0')
          ])
            .then(() => {
              console.log('All tenant_contract_images columns added successfully');
            })
            .catch((error) => {
              console.error('Error adding tenant_contract_images columns:', error);
            });
        });

        // 创建交租历史表
        this.db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='payment_history'`, (err, table) => {
          if (err) {
            console.error('Error checking payment_history table:', err);
            this.emit('error', err);
            return;
          }

          if (!table) {
            // 表不存在，创建新表
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
              if (err) {
                console.error('Error creating payment_history table:', err);
                this.emit('error', err);
                return;
              }
              console.log('payment_history table created successfully');
            });
          } else {
            // 表已存在，只检查并添加新的 payment_type 列
            const checkAndAddColumn = (columnName, columnType, defaultValue = null) => {
              return new Promise((resolve, reject) => {
                this.db.get(`SELECT * FROM pragma_table_info('payment_history') WHERE name='${columnName}'`, (err, row) => {
                  if (err) {
                    console.error(`Error checking for ${columnName} column:`, err);
                    reject(err);
                    return;
                  }
                  
                  if (!row) {
                    console.log(`Adding ${columnName} column to payment_history table`);
                    const defaultValueClause = defaultValue ? `DEFAULT '${defaultValue}'` : '';
                    this.db.run(`ALTER TABLE payment_history ADD COLUMN ${columnName} ${columnType} ${defaultValueClause}`, (err) => {
                      if (err) {
                        console.error(`Error adding ${columnName} column:`, err);
                        reject(err);
                      } else {
                        console.log(`Successfully added ${columnName} column`);
                        resolve();
                      }
                    });
                  } else {
                    resolve();
                  }
                });
              });
            };

            // 只检查添加 payment_type 列
            checkAndAddColumn('payment_type', 'TEXT', 'rent')
              .then(() => {
                console.log('payment_type column check completed');
              })
              .catch((error) => {
                console.error('Error checking payment_type column:', error);
              });
          }
        });

        // 创建设施表
        this.db.run(`
          CREATE TABLE IF NOT EXISTS facilities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('Error creating facilities table:', err);
            this.emit('error', err);
            return;
          }
          console.log('facilities table created or already exists');
        });

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
        `, (err) => {
          if (err) {
            console.error('Error creating schedules table:', err);
            this.emit('error', err);
            return;
          }
          console.log('schedules table created or already exists');
        });

        // 创建位置表
        this.db.run(`
          CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('Error creating locations table:', err);
            this.emit('error', err);
            return;
          }
          console.log('locations table created or already exists');
        });

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
        `, (err) => {
          if (err) {
            console.error('Error creating rooms table:', err);
            this.emit('error', err);
            return;
          }
          console.log('rooms table created or already exists');
        });

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
        `, (err) => {
          if (err) {
            console.error('Error creating room_facilities table:', err);
            this.emit('error', err);
            return;
          }
          console.log('room_facilities table created or already exists');
        });

        this.isReady = true;
        this.emit('open');
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
      callback(new Error('Database connection is not available'));
      return;
    }
    this.db.run(sql, params, callback);
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
      callback(new Error('Database connection is not available'));
      return;
    }
    this.db.run('BEGIN TRANSACTION', callback);
  }

  commit(callback) {
    if (!this.db) {
      callback(new Error('Database connection is not available'));
      return;
    }
    this.db.run('COMMIT', callback);
  }

  rollback(callback) {
    if (!this.db) {
      callback(new Error('Database connection is not available'));
      return;
    }
    this.db.run('ROLLBACK', callback);
  }
}

const db = new Database();
db.connect();

module.exports = db; 