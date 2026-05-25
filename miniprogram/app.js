App({
  globalData: {
    userInfo: null,
    token: null,
    apiBaseUrl: 'http://localhost:3000/api'
  },

  onLaunch() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token) {
      this.globalData.token = token;
    }
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }

    this.checkUpdate();
  },

  checkUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          updateManager.onUpdateReady(() => {
            wx.showModal({
              title: '更新提示',
              content: '新版本已经准备好，是否重启应用？',
              success(res) {
                if (res.confirm) {
                  updateManager.applyUpdate();
                }
              }
            });
          });
        }
      });
    }
  },

  async request(url, method = 'GET', data = {}) {
    const token = this.globalData.token || wx.getStorageSync('token');
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: this.globalData.apiBaseUrl + url,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        success: (res) => {
          if (res.statusCode === 401) {
            wx.removeStorageSync('token');
            wx.removeStorageSync('userInfo');
            this.globalData.token = null;
            this.globalData.userInfo = null;
            reject({ message: '请重新登录', statusCode: 401 });
            return;
          }
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            reject({
              message: res.data?.message || '请求失败',
              statusCode: res.statusCode,
              data: res.data
            });
          }
        },
        fail: (err) => {
          reject({ message: '网络错误', error: err });
        }
      });
    });
  },

  async login() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: async (res) => {
          if (res.code) {
            try {
              const result = await this.request('/auth/wx-login', 'POST', {
                code: res.code
              });
              
              if (result.token) {
                wx.setStorageSync('token', result.token);
                wx.setStorageSync('userInfo', result.user);
                this.globalData.token = result.token;
                this.globalData.userInfo = result.user;
              }
              resolve(result);
            } catch (err) {
              reject(err);
            }
          } else {
            reject({ message: '登录失败' });
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  ensureLogin() {
    if (!this.globalData.token) {
      return this.login();
    }
    return Promise.resolve({ user: this.globalData.userInfo });
  },

  showToast(title, icon = 'none') {
    wx.showToast({
      title,
      icon,
      duration: 2000
    });
  },

  showLoading(title = '加载中...') {
    wx.showLoading({
      title,
      mask: true
    });
  },

  hideLoading() {
    wx.hideLoading();
  }
});
