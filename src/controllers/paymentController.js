const { ipcMain } = require('electron');
const db = require('../database/init');

// 获取租客交租历史
ipcMain.handle('get-tenant-payment-history', async (event, tenantId) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM payment_history 
       WHERE tenant_id = ? 
       ORDER BY payment_date DESC`,
      [tenantId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});

// 添加交租记录
ipcMain.handle('add-payment-record', async (event, payment) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO payment_history (
        tenant_id, payment_date, due_date, amount, payment_type, payment_method, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        payment.tenant_id,
        payment.payment_date,
        payment.due_date,
        payment.amount,
        payment.payment_type,
        payment.payment_method,
        payment.notes
      ],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...payment });
      }
    );
  });
});

// 删除交租记录
ipcMain.handle('delete-payment-record', async (event, paymentId) => {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM payment_history WHERE id = ?',
      [paymentId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
});

// 获取支付记录
ipcMain.handle('get-payment-records', async (event, params) => {
  const { startDate, endDate, paymentType, page = 1, pageSize = 10 } = params;
  const offset = (page - 1) * pageSize;

  let paymentTypeFilter = '';
  const queryParams = [startDate, endDate];
  
  if (paymentType) {
    paymentTypeFilter = ' AND ph.payment_type = ?';
    queryParams.push(paymentType);
  }

  return new Promise((resolve, reject) => {
    // Get total count
    db.get(`
      SELECT COUNT(*) as total
      FROM payment_history ph
      JOIN tenants t ON ph.tenant_id = t.id
      JOIN rooms r ON t.room_id = r.id
      WHERE ph.payment_date BETWEEN ? AND ?${paymentTypeFilter}
    `, queryParams, (err, countResult) => {
      if (err) {
        reject(err);
        return;
      }

      // Get paginated data
      db.all(`
        SELECT 
          ph.payment_date,
          ph.due_date,
          ph.amount,
          ph.payment_type,
          ph.payment_method,
          ph.notes,
          t.name as tenant_name,
          r.room_number
        FROM payment_history ph
        JOIN tenants t ON ph.tenant_id = t.id
        JOIN rooms r ON t.room_id = r.id
        WHERE ph.payment_date BETWEEN ? AND ?${paymentTypeFilter}
        ORDER BY ph.payment_date DESC
        LIMIT ? OFFSET ?
      `, [...queryParams, pageSize, offset], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          data: rows,
          total: countResult.total
        });
      });
    });
  });
});

// 导出支付数据
ipcMain.handle('export-payment-data', async (event, params) => {
  const { startDate, endDate, paymentType } = params;
  
  let paymentTypeFilter = '';
  const queryParams = [startDate, endDate];
  
  if (paymentType) {
    paymentTypeFilter = ' AND ph.payment_type = ?';
    queryParams.push(paymentType);
  }

  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        ph.payment_date,
        ph.due_date,
        ph.amount,
        ph.payment_type,
        ph.payment_method,
        t.name as tenant_name,
        r.room_number,
        CASE 
          WHEN ph.payment_date <= ph.due_date THEN '准时'
          ELSE '逾期'
        END as payment_status,
        CASE 
          WHEN ph.payment_date > ph.due_date 
          THEN julianday(ph.payment_date) - julianday(ph.due_date)
          ELSE 0
        END as days_overdue,
        ph.notes
      FROM payment_history ph
      JOIN tenants t ON ph.tenant_id = t.id
      JOIN rooms r ON t.room_id = r.id
      WHERE ph.payment_date BETWEEN ? AND ?${paymentTypeFilter}
      ORDER BY ph.payment_date DESC
    `, queryParams, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
});

module.exports = {}; 