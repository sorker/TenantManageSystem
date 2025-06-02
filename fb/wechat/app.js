import { API_CONFIG, APP_CONFIG, CLOUD_CONFIG } from './config/index';

App({
  globalData: {
    userInfo: null,
    baseUrl: API_CONFIG.BASE_URL
  },
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: CLOUD_CONFIG.ENV_ID,
        traceUser: CLOUD_CONFIG.TRACE_USER
      });
    }
  }
}) 