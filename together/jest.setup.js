// 设置测试环境变量
process.env.NODE_ENV = 'test';

// 模拟 electron 的 ipcRenderer
global.ipcRenderer = {
  invoke: jest.fn()
};

// 模拟 window 对象
global.window = {
  electronAPI: {
    getAllTables: jest.fn(),
    getTableData: jest.fn(),
    getTableSchema: jest.fn()
  }
}; 