// API配置
const API_CONFIG = {
  BASE_URL: 'https://example.com/api',
  TIMEOUT: 5000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// 其他配置可以在这里添加
const APP_CONFIG = {
  // 应用相关配置
  APP_NAME: '租户管理系统',
  VERSION: '1.0.0'
};

module.exports = { API_CONFIG, APP_CONFIG }; 