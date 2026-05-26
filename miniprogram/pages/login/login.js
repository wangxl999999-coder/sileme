const app = getApp();

Page({
  data: {
    phone: '',
    password: '',
    loading: false
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  async login() {
    const { phone, password } = this.data;
    
    if (!phone) {
      app.showToast('请输入手机号');
      return;
    }
    if (!password) {
      app.showToast('请输入密码');
      return;
    }

    try {
      this.setData({ loading: true });
      app.showLoading('登录中...');
      
      const result = await app.request('/auth/login', 'POST', { phone, password });
      
      if (result.token) {
        wx.setStorageSync('token', result.token);
        wx.setStorageSync('userInfo', result.user);
        app.globalData.token = result.token;
        app.globalData.userInfo = result.user;
        
        app.hideLoading();
        app.showToast('登录成功', 'success');
        
        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' });
        }, 1000);
      }
      
      this.setData({ loading: false });
    } catch (error) {
      this.setData({ loading: false });
      app.hideLoading();
      app.showToast(error.message || '登录失败');
    }
  },

  goToRegister() {
    app.showToast('注册功能暂未开放');
  },

  goBack() {
    wx.navigateBack();
  }
});
