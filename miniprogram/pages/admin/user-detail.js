const app = getApp();

Page({
  data: {
    userId: '',
    user: null,
    contacts: [],
    recentCheckIns: [],
    recentSOS: [],
    checkInStats: {},
    hoursSinceLastCheckIn: null,
    isAdmin: false
  },

  onLoad(options) {
    if (!options.id) {
      app.showToast('参数错误');
      wx.navigateBack();
      return;
    }
    this.setData({ userId: options.id });
    this.loadData();
  },

  async loadData() {
    try {
      app.showLoading();
      
      const result = await app.request(`/admin/users/${this.data.userId}`);
      
      const user = result.user || {};
      const hoursSinceLastCheckIn = user.lastCheckIn 
        ? (Date.now() - new Date(user.lastCheckIn).getTime()) / 3600000 
        : null;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      user.hasCheckedInToday = user.lastCheckIn && new Date(user.lastCheckIn) >= todayStart;

      const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
      
      this.setData({
        user,
        contacts: result.contacts || [],
        recentCheckIns: result.recentCheckIns || [],
        recentSOS: result.recentSOS || [],
        checkInStats: this.calculateStats(result.recentCheckIns || []),
        hoursSinceLastCheckIn,
        isAdmin: userInfo?.isAdmin || false
      });
      
      app.hideLoading();
    } catch (error) {
      app.hideLoading();
      app.showToast(error.message || '加载失败');
    }
  },

  calculateStats(checkIns) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const thisMonthCheckIns = checkIns.filter(c => new Date(c.checkInTime) >= monthStart);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    const uniqueDays = new Set();
    thisMonthCheckIns.forEach(c => {
      const date = new Date(c.checkInTime);
      uniqueDays.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
    });

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
      
      const hasCheckIn = checkIns.some(c => {
        const cd = new Date(c.checkInTime);
        return `${cd.getFullYear()}-${cd.getMonth()}-${cd.getDate()}` === dateStr;
      });
      
      if (hasCheckIn) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }

    return {
      checkInCount: uniqueDays.size,
      checkInRate: ((uniqueDays.size / daysInMonth) * 100).toFixed(1),
      currentStreak
    };
  },

  async manualCheckIn() {
    wx.showModal({
      title: '手动补签',
      content: '确定要为该用户进行手动补签吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            app.showLoading('处理中...');
            await app.request(`/admin/users/${this.data.userId}/manage`, 'POST', {
              action: 'resetCheckIn'
            });
            app.hideLoading();
            app.showToast('补签成功', 'success');
            this.loadData();
          } catch (error) {
            app.hideLoading();
            app.showToast(error.message || '操作失败');
          }
        }
      }
    });
  },

  getStatusText(status) {
    const map = {
      active: '正常',
      warning: '注意',
      timeout: '超时',
      sos: 'SOS',
      never: '待签到'
    };
    return map[status] || '未知';
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

  formatTimeOnly(time) {
    if (!time) return '';
    const date = new Date(time);
    return `${this.padZero(date.getHours())}:${this.padZero(date.getMinutes())}`;
  },

  formatDate(time) {
    if (!time) return '';
    const date = new Date(time);
    const now = new Date();
    const diffDays = Math.floor((now - date) / 86400000);
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays === 2) return '前天';
    
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    if (diffDays < 7) return weekdays[date.getDay()];
    
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  },

  formatDuration(hours) {
    if (hours === null) return '从未签到';
    if (hours < 1) return `${Math.floor(hours * 60)}分钟`;
    if (hours < 24) return `${Math.floor(hours)}小时`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    return `${days}天${remainingHours > 0 ? remainingHours + '小时' : ''}`;
  },

  padZero(num) {
    return num.toString().padStart(2, '0');
  },

  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  }
});
