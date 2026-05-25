const app = getApp();

Page({
  data: {
    checkIns: [],
    stats: {},
    total: 0,
    page: 1,
    limit: 20,
    hasMore: true,
    loading: false,
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarDays: []
  },

  onLoad() {
    this.loadData();
    this.buildCalendar();
  },

  async loadData() {
    try {
      app.showLoading();
      
      const [historyData, statsData] = await Promise.all([
        app.request(`/checkin/history?limit=${this.data.limit}&skip=0`),
        app.request('/checkin/stats?days=30')
      ]);

      this.setData({
        checkIns: historyData.checkIns || [],
        total: historyData.total || 0,
        stats: statsData,
        page: 1,
        hasMore: (historyData.checkIns || []).length >= this.data.limit
      });
      
      this.buildCalendar(statsData.calendar || []);
      app.hideLoading();
    } catch (error) {
      app.hideLoading();
      app.showToast(error.message || '加载失败');
    }
  },

  async loadMore() {
    if (this.data.loading || !this.data.hasMore) return;

    try {
      this.setData({ loading: true });
      
      const nextPage = this.data.page + 1;
      const skip = (nextPage - 1) * this.data.limit;
      
      const result = await app.request(`/checkin/history?limit=${this.data.limit}&skip=${skip}`);
      
      const newCheckIns = [...this.data.checkIns, ...(result.checkIns || [])];
      
      this.setData({
        checkIns: newCheckIns,
        page: nextPage,
        hasMore: (result.checkIns || []).length >= this.data.limit,
        loading: false
      });
    } catch (error) {
      this.setData({ loading: false });
      app.showToast(error.message || '加载失败');
    }
  },

  buildCalendar(checkInCalendar = []) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const checkInMap = {};
    checkInCalendar.forEach(item => {
      checkInMap[item.date] = item.checkedIn;
    });
    
    const days = [];
    
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ empty: true });
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${this.padZero(month + 1)}-${this.padZero(day)}`;
      const isToday = day === now.getDate();
      const checkedIn = !!checkInMap[dateStr];
      
      days.push({
        day,
        date: dateStr,
        today: isToday,
        checkedIn,
        empty: false
      });
    }
    
    this.setData({ calendarDays: days });
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
    
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  },

  formatTime(time) {
    if (!time) return '';
    const date = new Date(time);
    return `${this.padZero(date.getHours())}:${this.padZero(date.getMinutes())}`;
  },

  padZero(num) {
    return num.toString().padStart(2, '0');
  },

  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  }
});
