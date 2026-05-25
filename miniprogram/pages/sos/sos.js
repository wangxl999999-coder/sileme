const app = getApp();

Page({
  data: {
    sosRecords: [],
    activeSOS: null
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      app.showLoading();
      
      const [historyResult, activeResult] = await Promise.all([
        app.request('/sos/history?limit=50'),
        app.request('/sos/active')
      ]);

      this.setData({
        sosRecords: historyResult.sosRecords || [],
        activeSOS: activeResult.activeSOS && activeResult.activeSOS.length > 0 
          ? activeResult.activeSOS[0] 
          : null
      });
      
      app.hideLoading();
    } catch (error) {
      app.hideLoading();
      app.showToast(error.message || '加载失败');
    }
  },

  async resolveSOS(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认处理',
      content: '确定要将此SOS呼救标记为已处理吗？',
      confirmText: '确认',
      success: async (res) => {
        if (res.confirm) {
          try {
            app.showLoading('处理中...');
            await app.request(`/sos/resolve/${id}`, 'POST');
            app.hideLoading();
            app.showToast('已处理', 'success');
            this.loadData();
          } catch (error) {
            app.hideLoading();
            app.showToast(error.message || '处理失败');
          }
        }
      }
    });
  },

  formatTime(time) {
    if (!time) return '';
    const date = new Date(time);
    return `${date.getFullYear()}-${this.padZero(date.getMonth() + 1)}-${this.padZero(date.getDate())} ${this.padZero(date.getHours())}:${this.padZero(date.getMinutes())}`;
  },

  padZero(num) {
    return num.toString().padStart(2, '0');
  },

  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  }
});
