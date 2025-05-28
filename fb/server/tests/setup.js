// 测试环境设置
require('dotenv').config();
const { beforeAll, afterAll, jest } = require('@jest/globals');

// 设置测试超时时间
jest.setTimeout(30000);

// 全局测试设置
beforeAll(() => {
  // 在这里添加测试前的全局设置
});

afterAll(() => {
  // 在这里添加测试后的清理工作
}); 