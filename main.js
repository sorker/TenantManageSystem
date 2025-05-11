const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./src/database/init');

// 导入控制器
require('./src/controllers/tenantController');
require('./src/controllers/roomController');
require('./src/controllers/facilityController');
require('./src/controllers/locationController');
require('./src/controllers/scheduleController');
require('./src/controllers/paymentController');
require('./src/controllers/statisticsController');

let mainWindow;
let isDatabaseReady = false;

// 确保在用户数据目录下创建contracts文件夹
const contractsDir = path.join(app.getPath('userData'), 'contracts');
if (!fs.existsSync(contractsDir)) {
  fs.mkdirSync(contractsDir, { recursive: true });
}

// 监听数据库初始化完成事件
db.on('open', async () => {
  isDatabaseReady = true;
  console.log('Database and tables are ready for queries');
});

// 监听数据库错误
db.on('error', (err) => {
  console.error('Database error in main process:', err);
  isDatabaseReady = false;
});

// 获取正确的 preload 脚本路径
function getPreloadPath() {
  // 检查是否在开发模式下运行
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    // 开发模式：使用项目根目录的 preload.js
    return path.join(__dirname, 'preload.js');
  } else {
    // 生产模式：使用打包后的 preload.js
    return path.join(process.resourcesPath, 'app', 'preload.js');
  }
}

function createWindow() {
  const preloadPath = getPreloadPath();
  console.log('Using preload script at:', preloadPath);

  // 验证 preload 脚本是否存在
  try {
    if (fs.existsSync(preloadPath)) {
      console.log('Preload script exists at path:', preloadPath);
    } else {
      console.error('Preload script not found at path:', preloadPath);
    }
  } catch (error) {
    console.error('Error checking preload script:', error);
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      sandbox: false,
      webSecurity: true
    }
  });

  // 设置 CSP 头
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: local-resource:; img-src 'self' data: blob: local-resource: file:;"
        ]
      }
    });
  });

  // 检查是否在开发模式下运行
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    console.log('Running in development mode');
    console.log('Preload script path:', path.join(__dirname, 'preload.js'));
    // 开发模式：加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('Running in production mode');
    // 生产模式：加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    // 在生产模式下也打开开发者工具，用于调试
    mainWindow.webContents.openDevTools();
  }

  // 添加错误处理
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Window failed to load:', errorCode, errorDescription);
  });

  // 监听渲染进程准备就绪
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Window finished loading');
  });
}

app.whenReady().then(async () => {
  try {
    // 初始化数据库连接
    await db.connect();
    console.log('Database connection initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
  
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 获取所有数据库表
ipcMain.handle('get-all-tables', async () => {
  if (!db) {
    console.error('Database connection is null');
    throw new Error('Database connection is not available');
  }

  if (!isDatabaseReady) {
    console.error('Database is not ready');
    throw new Error('Database is not ready yet');
  }

  return new Promise((resolve, reject) => {
    try {
      db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
      `, [], (err, tables) => {
        if (err) {
          console.error('Error getting tables:', err);
          reject(new Error(`Failed to get tables: ${err.message}`));
        } else {
          console.log('Tables found:', tables);
          resolve(tables.map(t => t.name));
        }
      });
    } catch (error) {
      console.error('Exception while getting tables:', error);
      reject(new Error(`Exception while getting tables: ${error.message}`));
    }
  });
});

// 获取表数据
ipcMain.handle('get-table-data', async (event, tableName) => {
  if (!db) {
    console.error('Database connection is null');
    throw new Error('Database connection is not available');
  }

  if (!isDatabaseReady) {
    console.error('Database is not ready');
    throw new Error('Database is not ready yet');
  }

  if (!tableName) {
    console.error('Table name is required');
    throw new Error('Table name is required');
  }

  return new Promise((resolve, reject) => {
    try {
      db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
        if (err) {
          console.error('Error getting table data:', err);
          reject(new Error(`Failed to get table data: ${err.message}`));
        } else {
          console.log(`Data found for table ${tableName}:`, rows.length, 'rows');
          resolve(rows);
        }
      });
    } catch (error) {
      console.error('Exception while getting table data:', error);
      reject(new Error(`Exception while getting table data: ${error.message}`));
    }
  });
});

// 获取表结构
ipcMain.handle('get-table-schema', async (event, tableName) => {
  if (!db) {
    console.error('Database connection is null');
    throw new Error('Database connection is not available');
  }

  if (!isDatabaseReady) {
    console.error('Database is not ready');
    throw new Error('Database is not ready yet');
  }

  if (!tableName) {
    console.error('Table name is required');
    throw new Error('Table name is required');
  }

  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
      if (err) {
        console.error('Error getting table schema:', err);
        reject(new Error('Failed to get table schema: ' + err.message));
      } else {
        console.log('Schema found for table ' + tableName + ':', columns);
        resolve(columns);
      }
    });
  });
});

// 删除单行数据
ipcMain.handle('delete-row', async (event, tableName, conditions) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }

  return new Promise((resolve, reject) => {
    // 构建 WHERE 子句
    const whereClause = conditions
      .map(condition => `${condition.column} = ?`)
      .join(' AND ');
    
    const values = conditions.map(condition => condition.value);
    
    const query = `DELETE FROM ${tableName} WHERE ${whereClause}`;
    
    db.run(query, values, function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
});

// 删除表中所有数据
ipcMain.handle('delete-all-data', async (event, tableName) => {
  if (!isDatabaseReady) {
    throw new Error('Database is not ready yet');
  }

  return new Promise((resolve, reject) => {
    const query = `DELETE FROM ${tableName}`;
    
    db.run(query, [], function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
});