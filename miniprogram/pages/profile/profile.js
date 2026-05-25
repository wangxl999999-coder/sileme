const app = getApp();

Page({
  data: {
    userInfo: {},
    contactCount: 0,
    computedStatus: 'active',
    statusText: '正常',
    hasManagedUsers: false
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      app.showLoading();
      
      const [userResult, contactsResult] = await Promise.all([
        app.request('/auth/me'),
        app.request('/contacts')
      ]);

      const userInfo = userResult.user || {};
      this.setData({
        userInfo,
        contactCount: contactsResult.contacts?.length || 0,
        hasManagedUsers: (userInfo.managedUsers?.length || 0) > 0,
        computedStatus: this.computeStatus(userInfo),
        statusText: this.getStatusText(userInfo)
      });

      app.globalData.userInfo = userInfo;
      wx.setStorageSync('userInfo', userInfo);
      
      app.hideLoading();
    } catch (error) {
      app.hideLoading();
      const storedUser = wx.getStorageSync('userInfo');
      if (storedUser) {
        this.setData({ userInfo: storedUser });
      }
    }
  },

  computeStatus(user) {
    if (user.status === 'sos') return 'sos';
    
    const lastCheckIn = user.lastCheckIn;
    if (!lastCheckIn) return 'never';
    
    const hours = (Date.now() - new Date(lastCheckIn).getTime()) / 3600000;
    if (hours >= 48) return 'timeout';
    if (hours >= 24) return 'warning';
    return 'active';
  },

  getStatusText(user) {
    const status = this.computeStatus(user);
    const map = {
      active: '状态正常',
      warning: '注意',
      timeout: '已超时',
      sos: 'SOS呼救',
      never: '待签到'
    };
    return map[status] || '正常';
  },

  editProfile() {
    wx.showModal({
      title: '编辑资料',
      editable: true,
      placeholderText: '请输入昵称',
      content: this.data.userInfo.nickname || '',
      success: async (res) => {
        if (res.confirm && res.content) {
          try {
            app.showLoading('保存中...');
            await app.request('/auth/profile', 'PUT', {
              nickname: res.content.trim()
            });
            app.hideLoading();
            app.showToast('更新成功', 'success');
            this.loadData();
          } catch (error) {
            app.hideLoading();
            app.showToast(error.message || '更新失败');
          }
        }
      }
    });
  },

  goToHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  },

  goToContacts() {
    wx.switchTab({ url: '/pages/contacts/contacts' });
  },

  goToSOSHistory() {
    wx.navigateTo({ url: '/pages/sos/sos' });
  },

  goToManagedUsers() {
    wx.navigateTo({ url: '/pages/admin/dashboard' });
  },

  goToAdmin() {
    wx.navigateTo({ url: '/pages/admin/dashboard' });
  },

  goToAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  },

  async testNotification() {
    const contacts = await app.request('/contacts');
    if (!contacts.contacts || contacts.contacts.length === 0) {
      wx.showModal({
        title: '提示',
        content: '请先添加紧急联系人',
        confirmText: '去添加',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/contacts/contacts' });
          }
        }
      });
      return;
    }

    wx.showActionSheet({
      itemList: contacts.contacts.map(c => `${c.name} (${c.phone})`),
      success: async (res) => {
        const contact = contacts.contacts[res.tapIndex];
        try {
          app.showLoading('发送中...');
          const result = await app.request(`/contacts/${contact._id}/test`, 'POST');
          app.hideLoading();
          
          if (result.success) {
            app.showToast('测试通知已发送', 'success');
          } else {
            wx.showModal({
              title: '发送结果',
              content: result.message || '发送失败',
              showCancel: false
            });
          }
        } catch (error) {
          app.hideLoading();
          app.showToast(error.message || '发送失败');
        }
      }
    });
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          app.globalData.token = null;
          app.globalData.userInfo = null;
          
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }
      }
    });
  }
});
