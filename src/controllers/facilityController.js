const { ipcMain } = require('electron');
const db = require('../database/init');

// 获取所有设施
ipcMain.handle('get-facilities', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM facilities ORDER BY name', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

// 添加设施
ipcMain.handle('add-facility', async (event, facility) => {
  return new Promise((resolve, reject) => {
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        return reject(err);
      }

      const facilityData = {
        name: facility.name,
        description: facility.description
      };

      // 检查是否已存在同名设施
      db.get('SELECT id FROM facilities WHERE name = ?', [facilityData.name], (err, existing) => {
        if (err) {
          db.run('ROLLBACK');
          return reject(err);
        }

        if (existing) {
          db.run('ROLLBACK');
          return reject(new Error('已存在同名设施'));
        }

        // 插入新设施
        db.run(
          'INSERT INTO facilities (name, description) VALUES (?, ?)',
          [facilityData.name, facilityData.description],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }

            db.run('COMMIT', (err) => {
              if (err) {
                db.run('ROLLBACK');
                return reject(err);
              }
              resolve({
                id: this.lastID,
                ...facilityData
              });
            });
          }
        );
      });
    });
  });
});

// 更新设施
ipcMain.handle('update-facility', async (event, facility) => {
  return new Promise((resolve, reject) => {
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        return reject(err);
      }

      // 检查是否存在同名设施（排除自身）
      db.get('SELECT id FROM facilities WHERE name = ? AND id != ?', [facility.name, facility.id], (err, existing) => {
        if (err) {
          db.run('ROLLBACK');
          return reject(err);
        }

        if (existing) {
          db.run('ROLLBACK');
          return reject(new Error('已存在同名设施'));
        }

        // 更新设施
        db.run(
          'UPDATE facilities SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [facility.name, facility.description, facility.id],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }

            db.run('COMMIT', (err) => {
              if (err) {
                db.run('ROLLBACK');
                return reject(err);
              }
              resolve(facility);
            });
          }
        );
      });
    });
  });
});

// 删除设施
ipcMain.handle('delete-facility', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        return reject(err);
      }

      // 检查设施是否正在被使用
      db.get('SELECT COUNT(*) as count FROM room_facilities WHERE facility_id = ?', [id], (err, result) => {
        if (err) {
          db.run('ROLLBACK');
          return reject(err);
        }

        if (result.count > 0) {
          db.run('ROLLBACK');
          return reject(new Error('该设施正在被房间使用，无法删除'));
        }

        // 删除设施
        db.run('DELETE FROM facilities WHERE id = ?', [id], (err) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }

          db.run('COMMIT', (err) => {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }
            resolve();
          });
        });
      });
    });
  });
});

module.exports = {}; 