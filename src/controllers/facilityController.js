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
  if (!facility || !facility.name) {
    throw new Error('设施名称不能为空');
  }

  const facilityData = {
    name: facility.name,
    description: facility.description || ''
  };

  return new Promise((resolve, reject) => {
    // 检查是否已存在同名设施
    db.get('SELECT id FROM facilities WHERE name = ?', [facilityData.name], (err, existing) => {
      if (err) {
        console.error('Error checking existing facility:', err);
        reject(err);
        return;
      }

      if (existing) {
        reject(new Error('已存在同名设施'));
        return;
      }

      // 插入新设施
      db.run(
        'INSERT INTO facilities (name, description) VALUES (?, ?)',
        [facilityData.name, facilityData.description],
        function(err) {
          if (err) {
            console.error('Error inserting facility:', err);
            reject(err);
            return;
          }

          const newId = this.lastID;

          // 获取新插入的设施数据
          db.get('SELECT * FROM facilities WHERE id = ?', [newId], (err, newFacility) => {
            if (err) {
              console.error('Error fetching new facility:', err);
              reject(err);
              return;
            }

            if (!newFacility) {
              reject(new Error('Failed to fetch newly created facility'));
              return;
            }

            resolve(newFacility);
          });
        }
      );
    });
  });
});

// 更新设施
ipcMain.handle('update-facility', async (event, facility) => {
  if (!facility?.id || !facility?.name) {
    throw new Error('设施ID和名称不能为空');
  }

  return new Promise((resolve, reject) => {
    // 检查是否存在同名设施（排除自身）
    db.get('SELECT id FROM facilities WHERE name = ? AND id != ?', 
      [facility.name, facility.id], 
      (err, existing) => {
        if (err) {
          console.error('Error checking existing facility:', err);
          reject(err);
          return;
        }

        if (existing) {
          reject(new Error('已存在同名设施'));
          return;
        }

        // 更新设施
        db.run(
          'UPDATE facilities SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [facility.name, facility.description, facility.id],
          function(err) {
            if (err) {
              console.error('Error updating facility:', err);
              reject(err);
              return;
            }

            // 获取更新后的设施数据
            db.get('SELECT * FROM facilities WHERE id = ?', [facility.id], (err, updatedFacility) => {
              if (err) {
                console.error('Error fetching updated facility:', err);
                reject(err);
                return;
              }

              if (!updatedFacility) {
                reject(new Error('设施更新失败'));
                return;
              }

              resolve(updatedFacility);
            });
          }
        );
      }
    );
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