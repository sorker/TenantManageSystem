const { ipcMain } = require('electron');
const db = require('../database/init');

// 获取支付概览
ipcMain.handle('get-payment-overview', async (event, params) => {
  const { startDate, endDate, paymentType } = params;
  
  return new Promise((resolve, reject) => {
    // Get current month data
    const currentMonthStart = new Date().toISOString().split('T')[0].substring(0, 7) + '-01';
    const currentMonthEnd = new Date().toISOString().split('T')[0];
    
    // Get last month data
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthStart = lastMonthDate.toISOString().split('T')[0].substring(0, 7) + '-01';
    const lastMonthEnd = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0).toISOString().split('T')[0];

    let paymentTypeFilter = '';
    if (paymentType) {
      paymentTypeFilter = ' AND payment_type = ?';
    }

    // Current month income
    db.get(`
      SELECT COALESCE(SUM(amount), 0) as currentMonthIncome
      FROM payment_history
      WHERE payment_date BETWEEN ? AND ?${paymentTypeFilter}
    `, [currentMonthStart, currentMonthEnd, ...(paymentType ? [paymentType] : [])], (err, currentMonth) => {
      if (err) {
        reject(err);
        return;
      }

      // Last month income
      db.get(`
        SELECT COALESCE(SUM(amount), 0) as lastMonthIncome
        FROM payment_history
        WHERE payment_date BETWEEN ? AND ?${paymentTypeFilter}
      `, [lastMonthStart, lastMonthEnd, ...(paymentType ? [paymentType] : [])], (err, lastMonth) => {
        if (err) {
          reject(err);
          return;
        }

        // Pending payments
        db.get(`
          SELECT 
            COUNT(*) as pendingCount,
            COALESCE(SUM(amount), 0) as pendingAmount
          FROM payment_history
          WHERE payment_date IS NULL${paymentTypeFilter}
        `, [...(paymentType ? [paymentType] : [])], (err, pending) => {
          if (err) {
            reject(err);
            return;
          }

          // Overdue payments
          db.get(`
            SELECT 
              COUNT(*) as overdueCount,
              COALESCE(SUM(amount), 0) as overdueAmount
            FROM payment_history
            WHERE payment_date > due_date${paymentTypeFilter}
          `, [...(paymentType ? [paymentType] : [])], (err, overdue) => {
            if (err) {
              reject(err);
              return;
            }

            // Calculate growth rates
            const currentMonthIncome = currentMonth.currentMonthIncome;
            const lastMonthIncome = lastMonth.lastMonthIncome;
            const incomeGrowth = lastMonthIncome === 0 ? 100 : ((currentMonthIncome - lastMonthIncome) / lastMonthIncome * 100);

            // Calculate collection rate
            db.get(`
              SELECT 
                COUNT(*) as totalPayments,
                COUNT(CASE WHEN payment_date <= due_date THEN 1 END) as onTimePayments
              FROM payment_history
              WHERE payment_date IS NOT NULL${paymentTypeFilter}
            `, [...(paymentType ? [paymentType] : [])], (err, collection) => {
              if (err) {
                reject(err);
                return;
              }

              const collectionRate = collection.totalPayments === 0 ? 100 : (collection.onTimePayments / collection.totalPayments * 100);

              resolve({
                currentMonthIncome,
                incomeGrowth: Math.round(incomeGrowth * 100) / 100,
                pendingAmount: pending.pendingAmount,
                pendingCount: pending.pendingCount,
                overdueAmount: overdue.overdueAmount,
                overdueCount: overdue.overdueCount,
                collectionRate: Math.round(collectionRate * 100) / 100,
                collectionRateGrowth: 0
              });
            });
          });
        });
      });
    });
  });
});

// 获取支付趋势
ipcMain.handle('get-payment-trend', async (event, params) => {
  const { startDate, endDate, timeUnit, paymentType } = params;
  
  let timeFormat;
  switch (timeUnit) {
    case 'day':
      timeFormat = '%Y-%m-%d';
      break;
    case 'month':
      timeFormat = '%Y-%m';
      break;
    case 'year':
      timeFormat = '%Y';
      break;
    default:
      timeFormat = '%Y-%m';
  }

  let paymentTypeFilter = '';
  if (paymentType) {
    paymentTypeFilter = ' AND payment_type = ?';
  }

  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        strftime('${timeFormat}', payment_date) as label,
        COUNT(*) as count,
        SUM(amount) as value
      FROM payment_history
      WHERE payment_date BETWEEN ? AND ?${paymentTypeFilter}
      GROUP BY strftime('${timeFormat}', payment_date)
      ORDER BY label
    `, [startDate, endDate, ...(paymentType ? [paymentType] : [])], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve({
        labels: rows.map(row => row.label),
        values: rows.map(row => row.value)
      });
    });
  });
});

// 获取支付分布
ipcMain.handle('get-payment-distribution', async (event, params) => {
  const { startDate, endDate, type } = params;
  
  const groupByField = type === 'type' ? 'payment_type' : 'payment_method';
  const labelMap = type === 'type' ? {
    rent: '房租',
    utility: '水电费',
    property: '物业费',
    other: '其他'
  } : {
    cash: '现金',
    wechat: '微信',
    alipay: '支付宝',
    bank: '银行转账',
    other: '其他'
  };

  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        ${groupByField} as name,
        COUNT(*) as value,
        SUM(amount) as amount
      FROM payment_history
      WHERE payment_date BETWEEN ? AND ?
      GROUP BY ${groupByField}
    `, [startDate, endDate], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(rows.map(row => ({
        name: labelMap[row.name] || row.name,
        value: row.amount,
        itemStyle: {
          color: type === 'type' ? undefined : undefined
        }
      })));
    });
  });
});

// 获取逾期分析
ipcMain.handle('get-overdue-analysis', async (event, params) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        strftime('%Y-%m', payment_date) as label,
        SUM(CASE WHEN payment_date > due_date THEN amount ELSE 0 END) as overdue_amount,
        COUNT(*) as total_payments,
        COUNT(CASE WHEN payment_date > due_date THEN 1 END) as overdue_count
      FROM payment_history
      WHERE payment_date IS NOT NULL
      GROUP BY strftime('%Y-%m', payment_date)
      ORDER BY label DESC
      LIMIT 12
    `, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      rows = rows.reverse();

      resolve({
        labels: rows.map(row => row.label),
        amounts: rows.map(row => row.overdue_amount),
        rates: rows.map(row => Math.round((row.overdue_count / row.total_payments) * 100))
      });
    });
  });
});

// 获取即将到期的支付
ipcMain.handle('get-upcoming-payments', async () => {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        t.name as tenant_name,
        r.room_number,
        t.rent_amount as amount,
        date(t.last_payment_date, '+' || t.payment_frequency || ' months') as due_date,
        CAST(
          (julianday(date(t.last_payment_date, '+' || t.payment_frequency || ' months')) - 
           julianday(?)) as INTEGER
        ) as days_left
      FROM tenants t
      JOIN rooms r ON t.room_id = r.id
      WHERE 
        date(t.last_payment_date, '+' || t.payment_frequency || ' months') BETWEEN ? AND ?
        AND t.is_active = 1
      ORDER BY days_left ASC
    `, [today, today, thirtyDaysLater], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
});

module.exports = {}; 