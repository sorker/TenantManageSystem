const { ipcMain } = require('electron');
const db = require('../database/init');

// 获取所有日程
ipcMain.handle('get-schedules', async () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT s.*, r.room_number, l.name as location_name,
             datetime(s.date) as date
      FROM schedules s
      LEFT JOIN rooms r ON s.room_id = r.id
      LEFT JOIN locations l ON r.location_id = l.id
      ORDER BY s.date DESC
    `, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

// 添加日程
ipcMain.handle('add-schedule', async (event, schedule) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO schedules (title, type, date, description, room_id) VALUES (?, ?, ?, ?, ?)',
      [schedule.title, schedule.type, schedule.date, schedule.description, schedule.room_id],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...schedule });
        }
      }
    );
  });
});

// 更新日程
ipcMain.handle('update-schedule', async (event, schedule) => {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE schedules SET title = ?, type = ?, date = ?, description = ?, room_id = ? WHERE id = ?',
      [schedule.title, schedule.type, schedule.date, schedule.description, schedule.room_id, schedule.id],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(schedule);
        }
      }
    );
  });
});

// 删除日程
ipcMain.handle('delete-schedule', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM schedules WHERE id = ?', [id], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
});

module.exports = {}; 