const app = getApp();

Page({
  data: {
    contacts: []
  },

  onShow() {
    this.loadContacts();
  },

  async loadContacts() {
    try {
      app.showLoading();
      const result = await app.request('/contacts', 'GET');
      this.setData({ contacts: result.contacts || [] });
      app.hideLoading();
    } catch (error) {
      app.hideLoading();
      console.error('加载联系人失败:', error);
      app.showToast(error.message || '加载失败');
    }
  },

  addContact() {
    wx.navigateTo({ url: '/pages/contact-edit/contact-edit' });
  },

  editContact(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/contact-edit/contact-edit?id=${id}` });
  },

  async deleteContact(e) {
    const { id, name } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '删除联系人',
      content: `确定要删除联系人「${name}」吗？`,
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          try {
            app.showLoading('删除中...');
            await app.request(`/contacts/${id}`, 'DELETE');
            app.hideLoading();
            app.showToast('删除成功', 'success');
            this.loadContacts();
          } catch (error) {
            app.hideLoading();
            app.showToast(error.message || '删除失败');
          }
        }
      }
    });
  },

  async testNotify(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '发送测试通知',
      content: '确定要向该联系人发送测试短信吗？',
      confirmText: '发送',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          try {
            app.showLoading('发送中...');
            const result = await app.request(`/contacts/${id}/test`, 'POST');
            app.hideLoading();
            
            if (result.success) {
              app.showToast('发送成功', 'success');
            } else {
              wx.showModal({
                title: '发送结果',
                content: result.message || '发送失败，请检查手机号是否正确',
                showCancel: false
              });
            }
          } catch (error) {
            app.hideLoading();
            app.showToast(error.message || '发送失败');
          }
        }
      }
    });
  },

  getRelationshipText(relationship) {
    const map = {
      spouse: '配偶',
      child: '子女',
      parent: '父母',
      sibling: '兄弟姐妹',
      friend: '朋友',
      other: '其他'
    };
    return map[relationship] || '其他';
  },

  formatTime(time) {
    if (!time) return '';
    const date = new Date(time);
    return `${date.getFullYear()}-${this.padZero(date.getMonth() + 1)}-${this.padZero(date.getDate())} ${this.padZero(date.getHours())}:${this.padZero(date.getMinutes())}`;
  },

  padZero(num) {
    return num.toString().padStart(2, '0');
  }
});
