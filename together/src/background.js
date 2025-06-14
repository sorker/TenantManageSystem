function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  
  // ... rest of createWindow function
}

// IPC 处理函数
ipcMain.handle('get-payment-overview', async (event, params) => {
  try {
    // TODO: 实现统计概览数据查询
    return {
      currentMonthIncome: 0,
      incomeGrowth: 0,
      pendingAmount: 0,
      pendingCount: 0,
      overdueAmount: 0,
      overdueCount: 0,
      collectionRate: 0,
      collectionRateGrowth: 0
    }
  } catch (error) {
    console.error('获取统计概览失败:', error)
    throw error
  }
})

ipcMain.handle('get-payment-trend', async (event, params) => {
  try {
    // TODO: 实现趋势数据查询
    return {
      labels: [],
      values: []
    }
  } catch (error) {
    console.error('获取趋势数据失败:', error)
    throw error
  }
})

ipcMain.handle('get-payment-distribution', async (event, params) => {
  try {
    // TODO: 实现分布数据查询
    return []
  } catch (error) {
    console.error('获取分布数据失败:', error)
    throw error
  }
})

ipcMain.handle('get-overdue-analysis', async (event, params) => {
  try {
    // TODO: 实现逾期分析数据查询
    return {
      labels: [],
      amounts: [],
      rates: []
    }
  } catch (error) {
    console.error('获取逾期分析失败:', error)
    throw error
  }
})

ipcMain.handle('get-upcoming-payments', async () => {
  try {
    // TODO: 实现即将到期付款查询
    return []
  } catch (error) {
    console.error('获取即将到期付款失败:', error)
    throw error
  }
})

ipcMain.handle('get-payment-records', async (event, params) => {
  try {
    // TODO: 实现付款记录查询
    return {
      data: [],
      total: 0
    }
  } catch (error) {
    console.error('获取付款记录失败:', error)
    throw error
  }
})

ipcMain.handle('export-payment-data', async (event, params) => {
  try {
    // TODO: 实现数据导出功能
  } catch (error) {
    console.error('导出数据失败:', error)
    throw error
  }
})

// ... rest of the code ... 