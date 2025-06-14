const { ipcMain } = require('electron');
const db = require('../database/init');

// 预定义的费用类型
const PAYMENT_TYPES = [
  'rent',
  'water',
  'electricity',
  'property'
];

// 费用类型中英文映射
const PAYMENT_TYPE_LABELS = {
  'rent': '租金',
  'water': '水费',
  'electricity': '电费',
  'maintenance': '维修费'
};

// 获取所有费用类型
ipcMain.handle('get-payment-types', async () => {
  return Promise.resolve(PAYMENT_TYPES);
});

// 获取支付统计数据
ipcMain.handle('get-payment-statistics', async (event, params) => {
  const { startDate, endDate, payment_type, location_id } = params;
  
  let typeFilter = '';
  let locationFilter = '';
  const queryParams = [startDate, endDate];
  
  if (payment_type) {
    typeFilter = ' AND ph.payment_type = ?';
    queryParams.push(payment_type);
  }

  if (location_id) {
    locationFilter = ' AND r.location_id = ?';
    queryParams.push(location_id);
  }
  
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        ph.payment_type,
        COUNT(*) as payment_count,
        SUM(ph.amount) as total_amount,
        AVG(ph.amount) as average_amount,
        SUM(CASE WHEN ph.payment_date <= ph.due_date THEN 1 ELSE 0 END) as on_time_count,
        SUM(CASE WHEN ph.payment_date > ph.due_date THEN 1 ELSE 0 END) as overdue_count,
        AVG(CASE 
          WHEN ph.payment_date > ph.due_date 
          THEN julianday(ph.payment_date) - julianday(ph.due_date)
          ELSE 0 
        END) as average_overdue_days
      FROM payment_history ph
      JOIN tenants t ON ph.tenant_id = t.id
      JOIN rooms r ON t.room_id = r.id
      WHERE ph.payment_date BETWEEN ? AND ?${typeFilter}${locationFilter}
      GROUP BY ph.payment_type
    `, queryParams, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        // 确保所有预定义的费用类型都在结果中
        const resultMap = new Map(rows.map(row => [row.payment_type, row]));
        const completeResults = PAYMENT_TYPES.map(type => {
          return resultMap.get(type) || {
            payment_type: type,
            payment_count: 0,
            total_amount: 0,
            average_amount: 0,
            on_time_count: 0,
            overdue_count: 0,
            average_overdue_days: 0
          };
        });
        resolve(completeResults);
      }
    });
  });
});

// 获取按月份统计的支付数据
ipcMain.handle('get-monthly-payment-statistics', async (event, params) => {
  const { year, month, payment_type, location_id } = params;
  
  let query;
  let queryParams = [];
  let typeFilter = '';
  let locationFilter = '';
  
  if (payment_type) {
    typeFilter = ' AND ph.payment_type = ?';
    queryParams.push(payment_type);
  }

  if (location_id) {
    locationFilter = ' AND r.location_id = ?';
    queryParams.push(location_id);
  }
  
  if (month) {
    // 按天统计
    query = `
      SELECT 
        strftime('%Y-%m-%d', ph.payment_date) as date,
        COUNT(*) as payment_count,
        SUM(ph.amount) as total_amount,
        SUM(CASE WHEN ph.payment_date <= ph.due_date THEN 1 ELSE 0 END) as on_time_count,
        SUM(CASE WHEN ph.payment_date > ph.due_date THEN 1 ELSE 0 END) as overdue_count
      FROM payment_history ph
      JOIN tenants t ON ph.tenant_id = t.id
      JOIN rooms r ON t.room_id = r.id
      WHERE strftime('%Y-%m', ph.payment_date) = ?${typeFilter}${locationFilter}
      GROUP BY date
      ORDER BY date
    `;
    queryParams.unshift(`${year}-${month.padStart(2, '0')}`);
  } else {
    // 按月统计，确保获取所有月份的数据
    query = `
      WITH RECURSIVE months(month) AS (
        SELECT '01'
        UNION ALL
        SELECT printf('%02d', CAST(month AS INTEGER) + 1)
        FROM months
        WHERE CAST(month AS INTEGER) < 12
      )
      SELECT 
        m.month,
        COALESCE(COUNT(ph.id), 0) as payment_count,
        COALESCE(SUM(ph.amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN ph.payment_date <= ph.due_date THEN 1 ELSE 0 END), 0) as on_time_count,
        COALESCE(SUM(CASE WHEN ph.payment_date > ph.due_date THEN 1 ELSE 0 END), 0) as overdue_count
      FROM months m
      LEFT JOIN payment_history ph ON 
        strftime('%m', ph.payment_date) = m.month 
        AND strftime('%Y', ph.payment_date) = ?
        ${typeFilter}${locationFilter}
      LEFT JOIN tenants t ON ph.tenant_id = t.id
      LEFT JOIN rooms r ON t.room_id = r.id
      GROUP BY m.month
      ORDER BY m.month
    `;
    queryParams.unshift(year);
  }

  return new Promise((resolve, reject) => {
    db.all(query, queryParams, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

// 获取支付方式统计
ipcMain.handle('get-payment-method-statistics', async (event, params) => {
  const { startDate, endDate, payment_type, location_id } = params;
  
  let typeFilter = '';
  let locationFilter = '';
  const queryParams = [startDate, endDate];
  
  if (payment_type) {
    typeFilter = ' AND ph.payment_type = ?';
    queryParams.push(payment_type);
  }

  if (location_id) {
    locationFilter = ' AND r.location_id = ?';
    queryParams.push(location_id);
  }

  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        ph.payment_method,
        COUNT(*) as usage_count,
        SUM(ph.amount) as total_amount,
        COALESCE(ph.payment_type, '其他') as payment_type
      FROM payment_history ph
      JOIN tenants t ON ph.tenant_id = t.id
      JOIN rooms r ON t.room_id = r.id
      WHERE ph.payment_date BETWEEN ? AND ?${typeFilter}${locationFilter}
      GROUP BY ph.payment_method, ph.payment_type
    `, queryParams, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

module.exports = {};
