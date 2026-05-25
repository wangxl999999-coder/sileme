const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');

exports.getNotifications = async (req, res) => {
  try {
    const { 
      limit = 50, 
      skip = 0, 
      status, 
      type,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = {};
    
    if (!req.user.isAdmin) {
      const managedUsers = req.user.managedUsers || [];
      managedUsers.push(req.user._id);
      query.userId = { $in: managedUsers };
    }

    if (status) {
      query.status = status;
    }

    if (type) {
      const typeMap = {
        'inactivity': 'inactivity_alert',
        'sos': 'sos_alert',
        'test': 'test'
      };
      query.type = typeMap[type] || type;
    }

    if (search) {
      query.$or = [
        { 'recipient.phone': { $regex: search, $options: 'i' } },
        { 'recipient.name': { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const notifications = await Notification.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('userId', 'nickname phone avatar');

    const total = await Notification.countDocuments(query);

    res.json({
      notifications: notifications.map(n => ({
        ...n.toObject(),
        contactName: n.recipient?.name,
        contactPhone: n.recipient?.phone,
        message: n.content
      })),
      total
    });
  } catch (error) {
    res.status(500).json({ message: '获取通知记录失败', error: error.message });
  }
};

exports.retryNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: '通知记录不存在' });
    }

    if (!req.user.isAdmin && !req.user.managedUsers?.includes(notification.userId.toString())) {
      return res.status(403).json({ message: '无权限重发此通知' });
    }

    if (notification.type === 'inactivity_alert') {
      await notificationService.sendInactivityAlert(
        notification.userId,
        notification.daysInactive || 2
      );
    } else if (notification.type === 'sos_alert') {
      return res.status(400).json({ 
        success: false,
        message: 'SOS通知不支持重发，请直接触发新的SOS' 
      });
    } else if (notification.type === 'test') {
      await notificationService.sendTestMessage(
        notification.userId,
        notification.recipient.phone
      );
    }

    res.json({
      success: true,
      message: '通知已重新发送'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: '重发通知失败', 
      error: error.message 
    });
  }
};
