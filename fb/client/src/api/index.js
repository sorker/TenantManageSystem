import axios from 'axios';
import { API_CONFIG } from '../config/index.js';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 打印请求信息
    
    // 确保URL以斜杠结尾
    if (config.url && !config.url.endsWith('/')) {
      config.url = `${config.url}/`;
    }
        
    // 从 localStorage 获取 token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      // 处理错误响应
      console.error('API Error:', error.response.data);
      console.error('API Error Status:', error.response.status);
      console.error('API Error URL:', error.config.url);
      
      // 处理 401 未授权错误
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// 导出 api 实例
export { api };

// 租户相关 API
export const tenantApi = {
  getList: (params) => api.get('tenants/', { params }),
  getById: (id) => api.get(`tenants/${id}/`),
  create: (data) => api.post('tenants/', data),
  update: (id, data) => api.put(`tenants/${id}/`, data),
  delete: (id) => api.delete(`tenants/${id}/`),
  getContractImages: (id) => api.get(`tenants/${id}/contract_images/`),
  updateContractImages: (id, data) => api.post(`tenants/${id}/update_contract_images/`, data),
  getPaymentHistory: (id) => api.get(`tenants/${id}/payment_history/`),
  addPayment: (data) => api.post('payments/', data),
  deletePayment: (id) => api.delete(`payments/${id}/`),
  getRooms: () => api.get('rooms/'),
  terminateContract: (id) => api.post(`tenants/${id}/terminate/`),
  renewContract: (id) => api.post(`tenants/${id}/renew/`)
};

// 房间相关 API
export const roomApi = {
  getList: () => api.get('rooms/'),
  getById: (id) => api.get(`rooms/${id}/`),
  create: (data) => api.post('rooms/', data),
  update: (id, data) => api.put(`rooms/${id}/`, data),
  delete: (id) => api.delete(`rooms/${id}/`),
};

// 位置相关 API
export const locationApi = {
  getList: () => api.get('locations/'),
  getById: (id) => api.get(`locations/${id}/`),
  create: (data) => api.post('locations/', data),
  update: (id, data) => api.put(`locations/${id}/`, data),
  delete: (id) => api.delete(`locations/${id}/`),
};

// 设施相关 API
export const facilityApi = {
  getList: () => api.get('facilities/'),
  getById: (id) => api.get(`facilities/${id}/`),
  create: (data) => api.post('facilities/', data),
  update: (id, data) => api.put(`facilities/${id}/`, data),
  delete: (id) => api.delete(`facilities/${id}/`),
};

// 日程相关 API
export const scheduleApi = {
  getList: () => api.get('schedules/'),
  getById: (id) => api.get(`schedules/${id}/`),
  create: (data) => api.post('schedules/', data),
  update: (id, data) => api.put(`schedules/${id}/`, data),
  delete: (id) => api.delete(`schedules/${id}/`),
};

// 支付相关 API
export const paymentApi = {
  getList: (params) => api.get('payments/', { params }),
  getById: (id) => api.get(`payments/${id}/`),
  create: (data) => api.post('payments/', data),
  update: (id, data) => api.put(`payments/${id}/`, data),
  delete: (id) => api.delete(`payments/${id}/`),
};