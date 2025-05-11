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
  'property': '物业费'
};

// 获取所有费用类型
ipcMain.handle('get-payment-types', async () => {
  return Promise.resolve(PAYMENT_TYPES);
});

// 获取支付统计数据
ipcMain.handle('get-payment-statistics', async (event, params) => {
  const { startDate, endDate, payment_type } = params;
  
  let typeFilter = '';
  const queryParams = [startDate, endDate];
  
  if (payment_type) {
    typeFilter = ' AND payment_type = ?';
    queryParams.push(payment_type);
  }
  
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        payment_type,
        COUNT(*) as payment_count,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount,
        SUM(CASE WHEN payment_date <= due_date THEN 1 ELSE 0 END) as on_time_count,
        SUM(CASE WHEN payment_date > due_date THEN 1 ELSE 0 END) as overdue_count,
        AVG(CASE 
          WHEN payment_date > due_date 
          THEN julianday(payment_date) - julianday(due_date)
          ELSE 0 
        END) as average_overdue_days
      FROM payment_history ph
      WHERE payment_date BETWEEN ? AND ?${typeFilter}
      GROUP BY payment_type
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
  const { year, month, payment_type } = params;
  
  let query;
  let queryParams = [];
  
  if (month) {
    // 按天统计
    query = `
      SELECT 
        strftime('%Y-%m-%d', payment_date) as date,
        COUNT(*) as payment_count,
        SUM(amount) as total_amount,
        SUM(CASE WHEN payment_date <= due_date THEN 1 ELSE 0 END) as on_time_count,
        SUM(CASE WHEN payment_date > due_date THEN 1 ELSE 0 END) as overdue_count
      FROM payment_history
      WHERE strftime('%Y-%m', payment_date) = ?
      ${payment_type ? 'AND payment_type = ?' : ''}
      GROUP BY date
      ORDER BY date
    `;
    queryParams.push(`${year}-${month.padStart(2, '0')}`);
  } else {
    // 按月统计
    query = `
      SELECT 
        strftime('%m', payment_date) as month,
        COUNT(*) as payment_count,
        SUM(amount) as total_amount,
        SUM(CASE WHEN payment_date <= due_date THEN 1 ELSE 0 END) as on_time_count,
        SUM(CASE WHEN payment_date > due_date THEN 1 ELSE 0 END) as overdue_count
      FROM payment_history
      WHERE strftime('%Y', payment_date) = ?
      ${payment_type ? 'AND payment_type = ?' : ''}
      GROUP BY month
      ORDER BY month
    `;
    queryParams.push(year);
  }

  if (payment_type) {
    queryParams.push(payment_type);
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
  const { startDate, endDate, payment_type } = params;
  
  let typeFilter = '';
  const queryParams = [startDate, endDate];
  
  if (payment_type) {
    typeFilter = ' AND payment_type = ?';
    queryParams.push(payment_type);
  }

  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        payment_method,
        COUNT(*) as usage_count,
        SUM(amount) as total_amount,
        COALESCE(payment_type, '其他') as payment_type
      FROM payment_history
      WHERE payment_date BETWEEN ? AND ?${typeFilter}
      GROUP BY payment_method, payment_type
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
