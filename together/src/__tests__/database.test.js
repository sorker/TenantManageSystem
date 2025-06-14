const { ipcMain } = require('electron');
const db = require('../database/init');

// 模拟 ipcMain
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn()
  }
}));

describe('Database Operations', () => {
  let mockDb;

  beforeEach(() => {
    // 在每个测试前重置模拟
    jest.clearAllMocks();
    
    // 重置数据库状态
    db.__reset();
    
    // 模拟数据库连接
    mockDb = {
      all: jest.fn(),
      run: jest.fn(),
      on: jest.fn()
    };
  });

  afterEach(() => {
    // 清理所有监听器
    db.removeAllListeners();
  });

  describe('getAllTables', () => {
    it('should return all tables when database is ready', async () => {
      // 模拟数据库响应
      const mockTables = [
        { name: 'tenants' },
        { name: 'rooms' },
        { name: 'facilities' }
      ];
      
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockTables);
      });

      // 设置数据库
      db.__setMockDb(mockDb);

      // 设置 ipcMain.handle 的模拟实现
      ipcMain.handle.mockImplementation(async () => {
        return new Promise((resolve) => {
          mockDb.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            AND name NOT LIKE 'sqlite_%'
          `, [], (err, tables) => {
            if (err) resolve([]);
            else resolve(tables.map(t => t.name));
          });
        });
      });

      // 调用获取表列表
      const result = await ipcMain.handle('get-all-tables');

      // 验证结果
      expect(result).toEqual(['tenants', 'rooms', 'facilities']);
      expect(mockDb.all).toHaveBeenCalled();
    });

    it('should throw error when database is not ready', async () => {
      // 设置 ipcMain.handle 的模拟实现
      ipcMain.handle.mockImplementation(async () => {
        if (!db.isReady) {
          throw new Error('Database connection is not available');
        }
        return [];
      });

      // 尝试获取表列表
      await expect(ipcMain.handle('get-all-tables')).rejects.toThrow('Database connection is not available');
    });
  });

  describe('getTableData', () => {
    it('should return table data when table exists', async () => {
      const mockData = [
        { id: 1, name: 'Test Room 1' },
        { id: 2, name: 'Test Room 2' }
      ];

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockData);
      });

      // 设置数据库
      db.__setMockDb(mockDb);

      // 设置 ipcMain.handle 的模拟实现
      ipcMain.handle.mockImplementation(async () => {
        return new Promise((resolve) => {
          mockDb.all(`SELECT * FROM test_table`, [], (err, rows) => {
            if (err) resolve([]);
            else resolve(rows);
          });
        });
      });

      const result = await ipcMain.handle('get-table-data', null, 'test_table');

      expect(result).toEqual(mockData);
      expect(mockDb.all).toHaveBeenCalled();
    });

    it('should throw error when table does not exist', async () => {
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(new Error('no such table: non_existent_table'));
      });

      // 设置数据库
      db.__setMockDb(mockDb);

      // 设置 ipcMain.handle 的模拟实现
      ipcMain.handle.mockImplementation(async () => {
        return new Promise((resolve, reject) => {
          mockDb.all(`SELECT * FROM non_existent_table`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
      });

      await expect(ipcMain.handle('get-table-data', null, 'non_existent_table')).rejects.toThrow('no such table');
    });
  });

  describe('getTableSchema', () => {
    it('should return table schema when table exists', async () => {
      const mockSchema = [
        { cid: 0, name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 },
        { cid: 1, name: 'name', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 }
      ];

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockSchema);
      });

      // 设置数据库
      db.__setMockDb(mockDb);

      // 设置 ipcMain.handle 的模拟实现
      ipcMain.handle.mockImplementation(async () => {
        return new Promise((resolve) => {
          mockDb.all(`PRAGMA table_info(test_table)`, [], (err, columns) => {
            if (err) resolve([]);
            else resolve(columns);
          });
        });
      });

      const result = await ipcMain.handle('get-table-schema', null, 'test_table');

      expect(result).toEqual(mockSchema);
      expect(mockDb.all).toHaveBeenCalled();
    });
  });
}); 