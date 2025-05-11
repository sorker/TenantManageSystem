const { ipcMain } = require('electron');
const db = require('../database/init');

// 获取所有位置
ipcMain.handle('get-locations', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM locations ORDER BY name', [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

// 添加位置
ipcMain.handle('add-location', async (event, location) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO locations (name, address) VALUES (?, ?)',
      [location.name, location.address],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...location });
        }
      }
    );
  });
});

// 更新位置
ipcMain.handle('update-location', async (event, location) => {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE locations SET name = ?, address = ? WHERE id = ?',
      [location.name, location.address, location.id],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(location);
        }
      }
    );
  });
});

// 删除位置
ipcMain.handle('delete-location', async (event, id) => {
  return new Promise((resolve, reject) => {
    // 检查是否有房间使用此位置
    db.get('SELECT COUNT(*) as count FROM rooms WHERE location_id = ?', [id], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (row.count > 0) {
        reject(new Error('无法删除：该位置已被房间使用'));
        return;
      }
      
      // 如果没有房间使用，则删除位置
      db.run('DELETE FROM locations WHERE id = ?', [id], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
});

module.exports = {}; 