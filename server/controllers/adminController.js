const User = require('../models/User');
const CheckIn = require('../models/CheckIn');
const Contact = require('../models/Contact');
const SOSRecord = require('../models/SOSRecord');
const moment = require('moment');

exports.getDashboard = async (req, res) => {
  try {
    const inactiveThreshold = parseInt(process.env.INACTIVE_THRESHOLD_HOURS || 48);
    const thresholdTime = moment().subtract(inactiveThreshold, 'hours').toDate();
    const warningThreshold = moment().subtract(24, 'hours').toDate();

    let userQuery = {};
    if (!req.user.isAdmin) {
      const managedUsers = req.user.managedUsers || [];
      userQuery = { _id: { $in: managedUsers } };
    }

    const totalUsers = await User.countDocuments(userQuery);
    const activeUsers = await User.countDocuments({ 
      ...userQuery, 
      status: 'active',
      lastCheckIn: { $gte: warningThreshold }
    });
    const sosUsers = await User.countDocuments({ ...userQuery, status: 'sos' });
    
    const timeoutUsers = await User.countDocuments({
      ...userQuery,
      lastCheckIn: { $lt: thresholdTime },
      status: { $ne: 'sos' }
    });

    const warningUsers = await User.countDocuments({
      ...userQuery,
      lastCheckIn: { $lt: warningThreshold, $gte: thresholdTime },
      status: { $nin: ['sos'] }
    });

    const todayStart = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();
    
    let checkInQuery = { checkInTime: { $gte: todayStart, $lte: todayEnd } };
    if (!req.user.isAdmin) {
      const managedUsers = req.user.managedUsers || [];
      checkInQuery.userId = { $in: managedUsers };
    }
    
    const todayCheckIns = await CheckIn.countDocuments(checkInQuery);

    let sosQuery = { resolved: false };
    if (!req.user.isAdmin) {
      const managedUsers = req.user.managedUsers || [];
      sosQuery.userId = { $in: managedUsers };
    }
    
    const activeSOSCount = await SOSRecord.countDocuments(sosQuery);

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        sosUsers,
        timeoutUsers,
        warningUsers,
        todayCheckIns,
        activeSOSCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: '获取看板数据失败', error: error.message });
  }
};

exports.getUserList = async (req, res) => {
  try {
    const { 
      limit = 50, 
      skip = 0, 
      status, 
      search,
      sortBy = 'lastCheckIn',
      sortOrder = 'desc'
    } = req.query;

    let query = {};
    
    if (!req.user.isAdmin) {
      const managedUsers = req.user.managedUsers || [];
      query._id = { $in: managedUsers };
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { nickname: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('nickname phone avatar lastCheckIn lastOnline status checkInStreak createdAt');

    const total = await User.countDocuments(query);

    const inactiveThreshold = parseInt(process.env.INACTIVE_THRESHOLD_HOURS || 48);
    const warningThreshold = 24;

    const usersWithStatus = users.map(user => {
      let hoursSinceLastCheckIn = null;
      let userStatus = user.status;
      
      if (user.lastCheckIn) {
        hoursSinceLastCheckIn = moment().diff(moment(user.lastCheckIn), 'hours');
        
        if (userStatus !== 'sos') {
          if (hoursSinceLastCheckIn >= inactiveThreshold) {
            userStatus = 'timeout';
          } else if (hoursSinceLastCheckIn >= warningThreshold) {
            userStatus = 'warning';
          } else {
            userStatus = 'active';
          }
        }
      } else {
        userStatus = 'never';
      }

      return {
        ...user.toObject(),
        hoursSinceLastCheckIn,
        computedStatus: userStatus
      };
    });

    res.json({
      users: usersWithStatus,
      total
    });
  } catch (error) {
    res.status(500).json({ message: '获取用户列表失败', error: error.message });
  }
};

exports.getUserDetail = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!req.user.isAdmin && !req.user.managedUsers?.includes(userId)) {
      return res.status(403).json({ message: '无权限查看此用户' });
    }

    const user = await User.findById(userId)
      .select('nickname phone avatar lastCheckIn lastOnline status checkInStreak createdAt');

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const contacts = await Contact.find({ userId }).sort({ priority: -1 });

    const checkIns = await CheckIn.find({ userId })
      .sort({ checkInTime: -1 })
      .limit(10);

    const sosRecords = await SOSRecord.find({ userId })
      .sort({ triggerTime: -1 })
      .limit(5);

    const inactiveThreshold = parseInt(process.env.INACTIVE_THRESHOLD_HOURS || 48);
    let hoursSinceLastCheckIn = null;
    let computedStatus = user.status;

    if (user.lastCheckIn) {
      hoursSinceLastCheckIn = moment().diff(moment(user.lastCheckIn), 'hours');
      if (computedStatus !== 'sos') {
        if (hoursSinceLastCheckIn >= inactiveThreshold) {
          computedStatus = 'timeout';
        } else if (hoursSinceLastCheckIn >= 24) {
          computedStatus = 'warning';
        } else {
          computedStatus = 'active';
        }
      }
    }

    const todayStart = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();
    const todayCheckIn = await CheckIn.findOne({
      userId,
      checkInTime: { $gte: todayStart, $lte: todayEnd }
    });

    res.json({
      user: {
        ...user.toObject(),
        hoursSinceLastCheckIn,
        computedStatus,
        hasCheckedInToday: !!todayCheckIn
      },
      contacts,
      recentCheckIns: checkIns,
      recentSOS: sosRecords
    });
  } catch (error) {
    res.status(500).json({ message: '获取用户详情失败', error: error.message });
  }
};

exports.manageUser = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: '需要管理员权限' });
    }

    const { userId } = req.params;
    const { action, managedBy } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    switch (action) {
      case 'resetCheckIn':
        user.lastCheckIn = new Date();
        user.status = 'active';
        user.checkInStreak = (user.checkInStreak || 0) + 1;
        await user.save();

        const checkIn = new CheckIn({
          userId,
          checkInTime: new Date(),
          status: 'auto',
          note: '管理员手动重置'
        });
        await checkIn.save();
        break;

      case 'setAdmin':
        user.isAdmin = true;
        await user.save();
        break;

      case 'removeAdmin':
        user.isAdmin = false;
        await user.save();
        break;

      case 'setStatus':
        user.status = req.body.status || 'active';
        await user.save();
        break;

      case 'addManager':
        if (managedBy) {
          const manager = await User.findById(managedBy);
          if (manager) {
            if (!manager.managedUsers) manager.managedUsers = [];
            if (!manager.managedUsers.includes(userId)) {
              manager.managedUsers.push(userId);
              await manager.save();
            }
          }
        }
        break;

      case 'removeManager':
        if (managedBy) {
          const manager = await User.findById(managedBy);
          if (manager && manager.managedUsers) {
            manager.managedUsers = manager.managedUsers.filter(id => id.toString() !== userId);
            await manager.save();
          }
        }
        break;

      default:
        return res.status(400).json({ message: '未知操作' });
    }

    res.json({
      message: '操作成功',
      user
    });
  } catch (error) {
    res.status(500).json({ message: '操作用户失败', error: error.message });
  }
};

exports.getManagedUsers = async (req, res) => {
  try {
    const userIds = req.user.managedUsers || [];
    
    const users = await User.find({ _id: { $in: userIds } })
      .select('nickname phone avatar lastCheckIn lastOnline status checkInStreak');

    const inactiveThreshold = parseInt(process.env.INACTIVE_THRESHOLD_HOURS || 48);
    const usersWithStatus = users.map(user => {
      let hoursSinceLastCheckIn = null;
      let computedStatus = user.status;

      if (user.lastCheckIn) {
        hoursSinceLastCheckIn = moment().diff(moment(user.lastCheckIn), 'hours');
        if (computedStatus !== 'sos') {
          if (hoursSinceLastCheckIn >= inactiveThreshold) {
            computedStatus = 'timeout';
          } else if (hoursSinceLastCheckIn >= 24) {
            computedStatus = 'warning';
          } else {
            computedStatus = 'active';
          }
        }
      }

      return {
        ...user.toObject(),
        hoursSinceLastCheckIn,
        computedStatus
      };
    });

    res.json({
      users: usersWithStatus
    });
  } catch (error) {
    res.status(500).json({ message: '获取关注用户失败', error: error.message });
  }
};
