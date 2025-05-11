const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

// 安全地调用 IPC 方法
const safeInvoke = async (channel, ...args) => {
  try {
    return await ipcRenderer.invoke(channel, ...args);
  } catch (error) {
    console.error(`Error in IPC call ${channel}:`, error);
    throw error;
  }
};

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 工具函数
  joinPath: (...args) => path.join(...args),
  basename: (filePath) => path.basename(filePath),
  dirname: (filePath) => path.dirname(filePath),
  resolve: (...args) => path.resolve(...args),

  // 数据库操作
  getAllTables: () => safeInvoke('get-all-tables'),
  getTableData: (tableName) => safeInvoke('get-table-data', tableName),
  getTableSchema: (tableName) => safeInvoke('get-table-schema', tableName),
  deleteRow: (tableName, conditions) => safeInvoke('delete-row', tableName, conditions),
  deleteAllData: (tableName) => safeInvoke('delete-all-data', tableName),

  // 租户管理
  getTenants: () => safeInvoke('get-tenants'),
  addTenant: (tenant) => safeInvoke('add-tenant', tenant),
  updateTenant: (tenant) => safeInvoke('update-tenant', tenant),
  deleteTenant: (id) => safeInvoke('delete-tenant', id),
  updateTenantContractImages: (tenantId, images) => safeInvoke('update-tenant-contract-images', tenantId, images),
  getTenantContractImages: (tenantId) => safeInvoke('get-tenant-contract-images', tenantId),
  getTenantPaymentHistory: (tenantId) => safeInvoke('get-tenant-payment-history', tenantId),
  addPaymentRecord: (payment) => safeInvoke('add-payment-record', payment),
  deletePaymentRecord: (paymentId) => safeInvoke('delete-payment-record', paymentId),

  // 位置管理
  getLocations: () => safeInvoke('get-locations'),
  addLocation: (location) => safeInvoke('add-location', location),
  updateLocation: (location) => safeInvoke('update-location', location),
  deleteLocation: (id) => safeInvoke('delete-location', id),

  // 房间管理
  getRooms: () => safeInvoke('get-rooms'),
  getRoomById: (id) => safeInvoke('get-room-by-id', id),
  addRoom: (room) => safeInvoke('add-room', room),
  updateRoom: (room) => safeInvoke('update-room', room),
  deleteRoom: (id) => safeInvoke('delete-room', id),

  // 设施管理
  getFacilities: () => safeInvoke('get-facilities'),
  addFacility: (facility) => safeInvoke('add-facility', facility),
  updateFacility: (facility) => safeInvoke('update-facility', facility),
  deleteFacility: (id) => safeInvoke('delete-facility', id),

  // 排期管理
  getSchedules: () => safeInvoke('get-schedules'),
  addSchedule: (schedule) => safeInvoke('add-schedule', schedule),
  updateSchedule: (schedule) => safeInvoke('update-schedule', schedule),
  deleteSchedule: (id) => safeInvoke('delete-schedule', id),

  // 图片管理
  ensureImagesDirectory: () => safeInvoke('ensure-images-directory'),
  saveContractImage: (imageData, fileName) => safeInvoke('save-contract-image', imageData, fileName)
}); 