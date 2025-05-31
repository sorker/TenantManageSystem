App({
  globalData: {
    userInfo: null,
    baseUrl: 'http://localhost:8000/api'
  },
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'your-env-id',
        traceUser: true
      });
    }
  }
}) 