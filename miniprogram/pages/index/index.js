const app = getApp();

Page({
  data: {
    userInfo: {},
    greetingText: '',
    dateText: '',
    checkInText: '今日已签到',
    hasCheckedInToday: false,
    lastCheckInTime: '',
    nextCheckInTime: '',
    checkInStats: {},
    calendarData: [],
    computedStatus: '',
    statusText: '',
    pressing: false,
    pressProgress: 0,
    pressTimer: null,
    sosConfirmed: false
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    this.autoCheckIn();
  },

  onUnload() {
    if (this.data.pressTimer) {
      clearInterval(this.data.pressTimer);
    }
  },

  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  },

  initPage() {
    this.updateGreeting();
    this.loadUserInfo();
    this.loadData();
  },

  updateGreeting() {
    const hour = new Date().getHours();
    let greetingText = '你好';
    
    if (hour >= 5 && hour < 9) {
      greetingText = '早上好';
    } else if (hour >= 9 && hour < 12) {
      greetingText = '上午好';
    } else if (hour >= 12 && hour < 14) {
      greetingText = '中午好';
    } else if (hour >= 14 && hour < 18) {
      greetingText = '下午好';
    } else if (hour >= 18 && hour < 22) {
      greetingText = '晚上好';
    } else {
      greetingText = '夜深了';
    }

    const now = new Date();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dateText = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`;

    this.setData({ greetingText, dateText });
  },

  async loadUserInfo() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({ userInfo });
    }
  },

  async autoCheckIn() {
    try {
      await app.ensureLogin();
      await this.loadData();
      
      if (!this.data.hasCheckedInToday) {
        this.doCheckIn();
      }
    } catch (error) {
      console.error('自动签到失败:', error);
    }
  },

  async loadData() {
    try {
      app.showLoading();
      
      const [checkInData, statsData, userData] = await Promise.all([
        app.request('/checkin/history?limit=1'),
        app.request('/checkin/stats?days=7'),
        app.request('/auth/me')
      ]);

      if (userData && userData.user) {
        this.setData({ userInfo: userData.user });
        app.globalData.userInfo = userData.user;
        wx.setStorageSync('userInfo', userData.user);
      }

      this.setData({
        hasCheckedInToday: checkInData.hasCheckedInToday,
        checkInText: checkInData.hasCheckedInToday ? '今日已签到' : '点击签到',
        lastCheckInTime: this.formatCheckInTime(checkInData.todayCheckIn?.checkInTime),
        nextCheckInTime: this.formatNextReminder(checkInData.nextReminder),
        checkInStats: statsData,
        computedStatus: statsData.status || this.computeStatus(statsData.hoursSinceLastCheckIn),
        statusText: this.getStatusText(statsData.status, statsData.hoursSinceLastCheckIn),
        calendarData: this.buildCalendarData(statsData.calendar || [])
      });
      
      app.hideLoading();
    } catch (error) {
      app.hideLoading();
      console.error('加载数据失败:', error);
      if (error.statusCode !== 401) {
        app.showToast('加载失败，请稍后重试');
      }
    }
  },

  async doCheckIn() {
    try {
      const result = await app.request('/checkin', 'POST', {});
      
      if (result) {
        this.setData({
          hasCheckedInToday: true,
          checkInText: '今日已签到',
          lastCheckInTime: this.formatCheckInTime(result.checkIn.checkInTime),
          'userInfo.lastCheckIn': result.user.lastCheckIn,
          'userInfo.checkInStreak': result.checkIn.streak,
          'userInfo.status': result.user.status,
          nextCheckInTime: this.formatNextReminder(result.nextReminder)
        });

        app.showToast('签到成功', 'success');
        this.loadData();
      }
    } catch (error) {
      console.error('签到失败:', error);
      if (error.message && error.message !== '加载失败，请稍后重试') {
        app.showToast(error.message || '签到失败');
      }
    }
  },

  onSOSPressStart() {
    this.setData({ 
      pressing: true, 
      pressProgress: 0 
    });

    const timer = setInterval(() => {
      let progress = this.data.pressProgress + 3;
      if (progress >= 100) {
        progress = 100;
        clearInterval(timer);
      }
      this.setData({ pressProgress: progress });
    }, 100);

    this.setData({ pressTimer: timer });
  },

  onSOSPressEnd() {
    if (this.data.pressTimer) {
      clearInterval(this.data.pressTimer);
    }
    
    if (this.data.pressProgress < 100) {
      this.setData({ 
        pressing: false, 
        pressProgress: 0,
        pressTimer: null 
      });
    }
  },

  onTriggerSOS() {
    if (this.data.sosConfirmed) return;
    
    if (this.data.pressProgress >= 100) {
      wx.showModal({
        title: '确认发送SOS',
        content: '确定要向紧急联系人发送呼救信息吗？',
        confirmText: '发送',
        confirmColor: '#ff4d4f',
        success: (res) => {
          if (res.confirm) {
            this.setData({ sosConfirmed: true });
            this.triggerSOS();
          } else {
            this.setData({ 
              pressing: false, 
              pressProgress: 0,
              pressTimer: null 
            });
          }
        }
      });
    }
  },

  async triggerSOS() {
    try {
      app.showLoading('正在发送呼救...');
      
      const result = await app.request('/sos/trigger', 'POST', {});
      
      app.hideLoading();
      this.setData({ 
        pressing: false, 
        pressProgress: 0,
        pressTimer: null,
        sosConfirmed: false
      });

      if (result) {
        wx.showModal({
          title: 'SOS已发送',
          content: `已通知 ${result.notifyResults?.filter(r => r.success).length || 0} 位紧急联系人`,
          showCancel: false,
          confirmText: '我知道了'
        });
        this.loadData();
      }
    } catch (error) {
      app.hideLoading();
      this.setData({ 
        pressing: false, 
        pressProgress: 0,
        pressTimer: null,
        sosConfirmed: false
      });
      app.showToast(error.message || '发送失败');
    }
  },

  goToHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  },

  goToContacts() {
    wx.switchTab({ url: '/pages/contacts/contacts' });
  },

  goToProfile() {
    wx.switchTab({ url: '/pages/profile/profile' });
  },

  buildCalendarData(calendar) {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    return calendar.map(item => {
      const date = new Date(item.date);
      return {
        ...item,
        day: days[date.getDay()]
      };
    });
  },

  computeStatus(hoursSinceLastCheckIn) {
    if (hoursSinceLastCheckIn === null) return 'never';
    if (hoursSinceLastCheckIn >= 48) return 'timeout';
    if (hoursSinceLastCheckIn >= 24) return 'warning';
    return 'active';
  },

  getStatusText(status, hoursSinceLastCheckIn) {
    if (status === 'sos') return 'SOS呼救';
    if (status === 'timeout' || hoursSinceLastCheckIn >= 48) return '已超时';
    if (hoursSinceLastCheckIn >= 24) return '注意';
    if (hoursSinceLastCheckIn === null) return '待签到';
    return '正常';
  },

  formatCheckInTime(time) {
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

  formatNextReminder(time) {
    if (!time) return '';
    const date = new Date(time);
    return `${date.getMonth() + 1}月${date.getDate()}日 ${this.padZero(date.getHours())}:${this.padZero(date.getMinutes())}`;
  },

  padZero(num) {
    return num.toString().padStart(2, '0');
  }
});
