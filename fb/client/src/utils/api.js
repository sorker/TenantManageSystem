import axios from 'axios';

// 获取 API 基础 URL
const getBaseURL = () => {
  // 优先使用 Electron 注入的全局变量
  if (window.API_BASE_URL) {
    return window.API_BASE_URL;
  }
  // 其次使用环境变量
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  // 默认值
  return 'http://127.0.0.1:8000';
};

// 创建 axios 实例
const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 在这里可以添加认证信息等
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response.data;
  },
  error => {
    if (error.response) {
      // 服务器返回错误状态码
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // 请求发出但没有收到响应
      console.error('Network Error:', error.request);
    } else {
      // 请求配置出错
      console.error('Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api; 