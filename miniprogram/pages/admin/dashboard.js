const app = getApp();

Page({
  data: {
    users: [],
    stats: {},
    userInfo: {},
    currentFilter: 'all',
    filterOptions: [
      { value: 'all', label: '全部' },
      { value: 'active', label: '正常' },
      { value: 'warning', label: '注意' },
      { value: 'timeout', label: '超时' },
      { value: 'sos', label: 'SOS' }
    ]
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      app.showLoading();
      
      const [dashboardResult, usersResult] = await Promise.all([
        app.request('/admin/dashboard'),
        app.request('/admin/users?limit=50')
      ]);

      const usersWithStatus = this.processUsers(usersResult.users || []);
      
      this.setData({
        stats: dashboardResult.stats || {},
        users: usersWithStatus,
        userInfo: app.globalData.userInfo || wx.getStorageSync('userInfo') || {}
      });
      
      this.applyFilter();
      app.hideLoading();
    } catch (error) {
      app.hideLoading();
      console.error('加载数据失败:', error);
      if (error.statusCode === 403) {
        app.showToast('无管理权限');
      } else {
        app.showToast(error.message || '加载失败');
      }
    }
  },

  processUsers(users) {
    const inactiveThreshold = 48;
    const warningThreshold = 24;

    return users.map(user => {
      let computedStatus = user.status;
      let hoursSinceLastCheckIn = user.hoursSinceLastCheckIn;
      
      if (hoursSinceLastCheckIn === null || hoursSinceLastCheckIn === undefined) {
        if (user.lastCheckIn) {
          hoursSinceLastCheckIn = (Date.now() - new Date(user.lastCheckIn).getTime()) / 3600000;
        } else {
          hoursSinceLastCheckIn = null;
        }
      }

      if (computedStatus !== 'sos') {
        if (hoursSinceLastCheckIn === null) {
          computedStatus = 'never';
        } else if (hoursSinceLastCheckIn >= inactiveThreshold) {
          computedStatus = 'timeout';
        } else if (hoursSinceLastCheckIn >= warningThreshold) {
          computedStatus = 'warning';
        } else {
          computedStatus = 'active';
        }
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const hasCheckedInToday = user.lastCheckIn && new Date(user.lastCheckIn) >= todayStart;

      return {
        ...user,
        hoursSinceLastCheckIn,
        computedStatus,
        hasCheckedInToday
      };
    });
  },

  changeFilter(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({ currentFilter: value });
    this.applyFilter();
  },

  applyFilter() {
    const { currentFilter, allUsers } = this.data;
    
    if (currentFilter === 'all') {
      return;
    }

    let filtered;
    if (currentFilter === 'active') {
      filtered = this.data.users.filter(u => u.computedStatus === 'active');
    } else if (currentFilter === 'warning') {
      filtered = this.data.users.filter(u => u.computedStatus === 'warning');
    } else if (currentFilter === 'timeout') {
      filtered = this.data.users.filter(u => u.computedStatus === 'timeout');
    } else if (currentFilter === 'sos') {
      filtered = this.data.users.filter(u => u.computedStatus === 'sos');
    }
    
    if (filtered) {
      this.setData({ users: filtered });
    }
  },

  viewUserDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/admin/user-detail?id=${id}` });
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

  getTimeStatusClass(hours) {
    if (hours === null) return '';
    if (hours < 24) return 'time-good';
    if (hours < 48) return 'time-warning';
    return 'time-danger';
  },

  formatDuration(hours) {
    if (hours === null) return '从未';
    if (hours < 1) return `${Math.floor(hours * 60)}分钟`;
    if (hours < 24) return `${Math.floor(hours)}小时`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    if (days >= 1) {
      return `${days}天${remainingHours > 0 ? remainingHours + '小时' : ''}`;
    }
    return `${Math.floor(hours)}小时`;
  },

  formatTime(time) {
    if (!time) return '';
    const date = new Date(time);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    
    return `${date.getMonth() + 1}月${date.getDate()}日 ${this.padZero(date.getHours())}:${this.padZero(date.getMinutes())}`;
  },

  padZero(num) {
    return num.toString().padStart(2, '0');
  },

  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  }
});
