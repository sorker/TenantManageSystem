// API配置示例
export const API_CONFIG = {
  BASE_URL: 'https://example.com/api',  // 替换为实际的API地址
  TIMEOUT: 5000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// 应用配置
export const APP_CONFIG = {
  APP_NAME: '租户管理系统',
  VERSION: '1.0.0',
  // 其他应用配置
  ENV: 'development',  // development, production, test
  DEBUG: true,  // 生产环境设置为 false
}; 