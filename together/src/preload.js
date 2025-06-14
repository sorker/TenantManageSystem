const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 统计概览
  getPaymentOverview: (params) => ipcRenderer.invoke('get-payment-overview', params),
  
  // 趋势数据
  getPaymentTrend: (params) => ipcRenderer.invoke('get-payment-trend', params),
  
  // 分布数据
  getPaymentDistribution: (params) => ipcRenderer.invoke('get-payment-distribution', params),
  
  // 逾期分析
  getOverdueAnalysis: (params) => ipcRenderer.invoke('get-overdue-analysis', params),
  
  // 即将到期付款
  getUpcomingPayments: () => ipcRenderer.invoke('get-upcoming-payments'),
  
  // 付款记录
  getPaymentRecords: (params) => ipcRenderer.invoke('get-payment-records', params),
  
  // 导出数据
  exportPaymentData: (params) => ipcRenderer.invoke('export-payment-data', params)
}) 