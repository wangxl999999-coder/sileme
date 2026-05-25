const moment = require('moment');
const CheckIn = require('../models/CheckIn');
const User = require('../models/User');

exports.checkIn = async (req, res) => {
  try {
    const { note } = req.body;
    const userId = req.user._id;

    const now = new Date();
    const todayStart = moment(now).startOf('day').toDate();
    const todayEnd = moment(now).endOf('day').toDate();

    const existingCheckIn = await CheckIn.findOne({
      userId,
      checkInTime: { $gte: todayStart, $lte: todayEnd }
    });

    const checkIn = new CheckIn({
      userId,
      checkInTime: now,
      status: 'success',
      note
    });

    if (req.ip) checkIn.ip = req.ip;
    if (req.headers['user-agent']) checkIn.userAgent = req.headers['user-agent'];

    await checkIn.save();

    const user = req.user;
    const lastCheckIn = user.lastCheckIn;
    let streak = user.checkInStreak || 0;

    if (lastCheckIn) {
      const lastCheckInDate = moment(lastCheckIn).startOf('day');
      const today = moment(now).startOf('day');
      const yesterday = moment(now).subtract(1, 'day').startOf('day');

      if (lastCheckInDate.isSame(today, 'day')) {
      } else if (lastCheckInDate.isSame(yesterday, 'day')) {
        streak += 1;
      } else if (lastCheckInDate.isBefore(yesterday, 'day')) {
        streak = 1;
      }
    } else {
      streak = 1;
    }

    user.lastCheckIn = now;
    user.lastOnline = now;
    user.checkInStreak = streak;
    user.status = 'active';
    await user.save();

    const inactiveHours = process.env.INACTIVE_THRESHOLD_HOURS || 48;
    
    res.json({
      message: '签到成功',
      checkIn: {
        id: checkIn._id,
        checkInTime: checkIn.checkInTime,
        streak
      },
      nextReminder: moment(now).add(inactiveHours, 'hours').toDate(),
      user: {
        lastCheckIn: now,
        checkInStreak: streak,
        status: 'active'
      }
    });
  } catch (error) {
    console.error('签到失败:', error);
    res.status(500).json({ message: '签到失败', error: error.message });
  }
};

exports.getCheckInHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      limit = 30, 
      skip = 0, 
      startDate, 
      endDate,
      targetUserId 
    } = req.query;

    let queryUserId = userId;
    
    if (targetUserId && (req.user.isAdmin || req.user.managedUsers?.includes(targetUserId))) {
      queryUserId = targetUserId;
    }

    const query = { userId: queryUserId };
    
    if (startDate) {
      query.checkInTime = { ...query.checkInTime, $gte: new Date(startDate) };
    }
    if (endDate) {
      query.checkInTime = { ...query.checkInTime, $lte: new Date(endDate) };
    }

    const checkIns = await CheckIn.find(query)
      .sort({ checkInTime: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await CheckIn.countDocuments(query);

    const todayStart = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();
    const todayCheckIn = await CheckIn.findOne({
      userId: queryUserId,
      checkInTime: { $gte: todayStart, $lte: todayEnd }
    });

    res.json({
      checkIns,
      total,
      hasCheckedInToday: !!todayCheckIn,
      todayCheckIn: todayCheckIn || null
    });
  } catch (error) {
    res.status(500).json({ message: '获取签到记录失败', error: error.message });
  }
};

exports.getCheckInStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { targetUserId, days = 30 } = req.query;

    let queryUserId = userId;
    if (targetUserId && (req.user.isAdmin || req.user.managedUsers?.includes(targetUserId))) {
      queryUserId = targetUserId;
    }

    const startDate = moment().subtract(days - 1, 'days').startOf('day').toDate();
    
    const checkIns = await CheckIn.find({
      userId: queryUserId,
      checkInTime: { $gte: startDate }
    }).sort({ checkInTime: 1 });

    const checkInMap = {};
    checkIns.forEach(checkIn => {
      const date = moment(checkIn.checkInTime).format('YYYY-MM-DD');
      if (!checkInMap[date]) {
        checkInMap[date] = checkIn;
      }
    });

    const calendar = [];
    for (let i = 0; i < days; i++) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      calendar.push({
        date,
        checkedIn: !!checkInMap[date],
        checkInTime: checkInMap[date]?.checkInTime || null
      });
    }
    calendar.reverse();

    const user = await User.findById(queryUserId);
    const lastCheckIn = user?.lastCheckIn;
    let hoursSinceLastCheckIn = null;
    if (lastCheckIn) {
      hoursSinceLastCheckIn = moment().diff(moment(lastCheckIn), 'hours');
    }

    res.json({
      calendar,
      checkInCount: Object.keys(checkInMap).length,
      totalDays: parseInt(days),
      checkInRate: (Object.keys(checkInMap).length / days * 100).toFixed(1),
      currentStreak: user?.checkInStreak || 0,
      lastCheckIn,
      hoursSinceLastCheckIn,
      status: user?.status
    });
  } catch (error) {
    res.status(500).json({ message: '获取统计数据失败', error: error.message });
  }
};
