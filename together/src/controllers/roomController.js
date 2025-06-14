const { ipcMain } = require('electron');
const db = require('../database/init');

// 获取所有房间
ipcMain.handle('get-rooms', async () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        r.id,
        r.location_id,
        l.name as location_name,
        l.address as location_address,
        r.room_number,
        r.floor,
        GROUP_CONCAT(DISTINCT f.id) as facility_ids,
        GROUP_CONCAT(DISTINCT f.name) as facility_names,
        t.name as current_tenant_name,
        t.id as current_tenant_id
      FROM rooms r
      LEFT JOIN locations l ON r.location_id = l.id
      LEFT JOIN room_facilities rf ON r.id = rf.room_id
      LEFT JOIN facilities f ON rf.facility_id = f.id
      LEFT JOIN (
        SELECT id, name, room_id 
        FROM tenants 
        WHERE is_active = 1 AND is_deleted = 0
      ) t ON r.id = t.room_id
      GROUP BY r.id, r.location_id, l.name, l.address, r.room_number, r.floor, t.id, t.name
    `, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const processedRows = rows.map(row => ({
          ...row,
          facilities: row.facility_ids ? row.facility_ids.split(',').map((id, index) => ({
            id: parseInt(id),
            name: row.facility_names.split(',')[index]
          })) : []
        }));
        resolve(processedRows);
      }
    });
  });
});

// 获取单个房间信息
ipcMain.handle('get-room-by-id', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT r.*, 
        GROUP_CONCAT(f.id) as facility_ids,
        GROUP_CONCAT(f.name) as facility_names
      FROM rooms r
      LEFT JOIN room_facilities rf ON r.id = rf.room_id
      LEFT JOIN facilities f ON rf.facility_id = f.id
      WHERE r.id = ?
      GROUP BY r.id
    `, [id], (err, rows) => {
      if (err) {
        reject(err);
      } else if (rows.length === 0) {
        resolve(null);
      } else {
        const row = rows[0];
        const room = {
          ...row,
          facilities: row.facility_ids ? row.facility_ids.split(',').map((id, index) => ({
            id: parseInt(id),
            name: row.facility_names.split(',')[index]
          })) : []
        };
        resolve(room);
      }
    });
  });
});

// 添加房间
ipcMain.handle('add-room', async (event, room) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO rooms (location_id, room_number, floor) VALUES (?, ?, ?)',
      [room.location_id, room.room_number, room.floor],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        const roomId = this.lastID;
        
        if (room.facilities && room.facilities.length > 0) {
          const values = room.facilities.map(facilityId => [roomId, facilityId]);
          const placeholders = values.map(() => '(?, ?)').join(',');
          db.run(
            `INSERT INTO room_facilities (room_id, facility_id) VALUES ${placeholders}`,
            values.flat(),
            (err) => {
              if (err) {
                reject(err);
                return;
              }
              resolve(roomId);
            }
          );
        } else {
          resolve(roomId);
        }
      }
    );
  });
});

// 更新房间
ipcMain.handle('update-room', async (event, room) => {
  return new Promise((resolve, reject) => {
    // 首先检查房间是否存在
    db.get('SELECT id FROM rooms WHERE id = ?', [room.id], (err, existingRoom) => {
      if (err) {
        console.error('检查房间存在时出错:', err);
        reject(new Error('检查房间时出错'));
        return;
      }

      if (!existingRoom) {
        reject(new Error('房间不存在'));
        return;
      }

      // 使用 serialize 来确保操作的原子性
      db.serialize(() => {
        try {
          // 更新房间基本信息
          db.run(
            'UPDATE rooms SET location_id = ?, room_number = ?, floor = ? WHERE id = ?',
            [room.location_id, room.room_number, room.floor, room.id],
            (err) => {
              if (err) {
                console.error('更新房间信息时出错:', err);
                throw err;
              }
            }
          );

          // 删除旧的设施关联
          db.run('DELETE FROM room_facilities WHERE room_id = ?', [room.id], (err) => {
            if (err) {
              console.error('删除旧设施关联时出错:', err);
              throw err;
            }
          });

          // 添加新的设施关联
          if (room.facilities && room.facilities.length > 0) {
            const values = room.facilities.map(facilityId => [room.id, facilityId]);
            const placeholders = values.map(() => '(?, ?)').join(',');
            
            db.run(
              `INSERT INTO room_facilities (room_id, facility_id) VALUES ${placeholders}`,
              values.flat(),
              (err) => {
                if (err) {
                  console.error('添加新设施关联时出错:', err);
                  throw err;
                }
              }
            );
          }

          // 获取更新后的房间信息
          db.all(`
            SELECT r.*, 
              l.name as location_name,
              l.address as location_address,
              GROUP_CONCAT(DISTINCT f.id) as facility_ids,
              GROUP_CONCAT(DISTINCT f.name) as facility_names
            FROM rooms r
            LEFT JOIN locations l ON r.location_id = l.id
            LEFT JOIN room_facilities rf ON r.id = rf.room_id
            LEFT JOIN facilities f ON rf.facility_id = f.id
            WHERE r.id = ?
            GROUP BY r.id
          `, [room.id], (err, rows) => {
            if (err) {
              console.error('获取更新后的房间信息时出错:', err);
              throw err;
            }
            
            if (rows.length === 0) {
              throw new Error('更新后未找到房间信息');
            }

            const updatedRoom = {
              ...rows[0],
              facilities: rows[0].facility_ids ? rows[0].facility_ids.split(',').map((id, index) => ({
                id: parseInt(id),
                name: rows[0].facility_names.split(',')[index]
              })) : []
            };
            
            resolve(updatedRoom);
          });
        } catch (error) {
          console.error('更新操作失败:', error);
          reject(new Error(error.message || '更新操作失败'));
        }
      });
    });
  });
});

// 删除房间
ipcMain.handle('delete-room', async (event, id) => {
  return new Promise((resolve, reject) => {
    // 首先检查房间是否存在
    db.get('SELECT id FROM rooms WHERE id = ?', [id], (err, room) => {
      if (err) {
        console.error('检查房间存在时出错:', err);
        reject(new Error('检查房间时出错'));
        return;
      }

      if (!room) {
        reject(new Error('房间不存在'));
        return;
      }

      // 使用 serialize 来确保操作的原子性
      db.serialize(() => {
        try {
          // 删除房间设施关联
          db.run('DELETE FROM room_facilities WHERE room_id = ?', [id], (err) => {
            if (err) {
              console.error('删除房间设施关联时出错:', err);
              throw err;
            }
          });

          // 删除房间
          db.run('DELETE FROM rooms WHERE id = ?', [id], (err) => {
            if (err) {
              console.error('删除房间时出错:', err);
              throw err;
            }
            resolve({ success: true });
          });
        } catch (error) {
          console.error('删除操作失败:', error);
          reject(new Error(error.message || '删除操作失败'));
        }
      });
    });
  });
});

module.exports = {}; 