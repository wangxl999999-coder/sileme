const SOSRecord = require('../models/SOSRecord');
const User = require('../models/User');
const Contact = require('../models/Contact');
const notificationService = require('../services/notificationService');

exports.triggerSOS = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const activeSOS = await SOSRecord.findOne({
      userId,
      resolved: false
    });

    if (activeSOS) {
      return res.status(400).json({ 
        message: '已有未处理的SOS呼叫',
        sosRecord: activeSOS
      });
    }

    const sosRecord = new SOSRecord({
      userId,
      triggerTime: new Date(),
      resolved: false,
      ip: req.ip,
      deviceInfo: req.body.deviceInfo
    });

    const contacts = await Contact.find({
      userId,
      enabled: true
    }).sort({ priority: -1 });

    const notifiedContacts = contacts.map(contact => ({
      contactId: contact._id,
      name: contact.name,
      phone: contact.phone,
      notified: false,
      method: contact.notifyMethods.sms ? 'sms' : 'none'
    }));

    sosRecord.notifiedContacts = notifiedContacts;
    await sosRecord.save();

    const user = await User.findById(userId);
    user.status = 'sos';
    user.lastOnline = new Date();
    await user.save();

    const notifyResults = await notificationService.sendSOSAlert(user, sosRecord._id);

    notifyResults.forEach(result => {
      const contactIndex = sosRecord.notifiedContacts.findIndex(
        c => c.phone === result.contact.phone
      );
      if (contactIndex !== -1) {
        sosRecord.notifiedContacts[contactIndex].notified = result.success;
        sosRecord.notifiedContacts[contactIndex].notifiedAt = new Date();
        if (!result.success) {
          sosRecord.notifiedContacts[contactIndex].error = result.error;
        }
      }
    });
    await sosRecord.save();

    res.json({
      message: 'SOS已触发，正在通知紧急联系人',
      sosRecord,
      notifyResults
    });
  } catch (error) {
    console.error('SOS触发失败:', error);
    res.status(500).json({ message: 'SOS触发失败', error: error.message });
  }
};

exports.resolveSOS = async (req, res) => {
  try {
    const { sosId } = req.params;
    
    const sosRecord = await SOSRecord.findById(sosId);
    if (!sosRecord) {
      return res.status(404).json({ message: 'SOS记录不存在' });
    }

    if (sosRecord.resolved) {
      return res.status(400).json({ message: '该SOS已处理' });
    }

    if (sosRecord.userId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: '无权限处理此SOS' });
    }

    sosRecord.resolved = true;
    sosRecord.resolvedTime = new Date();
    sosRecord.resolvedBy = req.user._id;
    sosRecord.note = req.body.note;
    await sosRecord.save();

    const user = await User.findById(sosRecord.userId);
    if (user && user.status === 'sos') {
      user.status = 'active';
      await user.save();
    }

    res.json({
      message: 'SOS已处理',
      sosRecord
    });
  } catch (error) {
    res.status(500).json({ message: '处理SOS失败', error: error.message });
  }
};

exports.getSOSHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50, skip = 0, resolved, targetUserId } = req.query;

    let query = {};
    
    if (targetUserId && (req.user.isAdmin || req.user.managedUsers?.includes(targetUserId))) {
      query.userId = targetUserId;
    } else if (!req.user.isAdmin) {
      query.userId = userId;
    }

    if (resolved !== undefined) {
      query.resolved = resolved === 'true';
    }

    const sosRecords = await SOSRecord.find(query)
      .sort({ triggerTime: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('userId', 'nickname phone avatar')
      .populate('resolvedBy', 'nickname');

    const total = await SOSRecord.countDocuments(query);

    res.json({
      sosRecords,
      total
    });
  } catch (error) {
    res.status(500).json({ message: '获取SOS记录失败', error: error.message });
  }
};

exports.getActiveSOS = async (req, res) => {
  try {
    let query = { resolved: false };
    
    if (!req.user.isAdmin) {
      const managedUserIds = req.user.managedUsers || [];
      managedUserIds.push(req.user._id);
      query.userId = { $in: managedUserIds };
    }

    const activeSOS = await SOSRecord.find(query)
      .sort({ triggerTime: -1 })
      .populate('userId', 'nickname phone avatar');

    res.json({
      activeSOS,
      count: activeSOS.length
    });
  } catch (error) {
    res.status(500).json({ message: '获取活跃SOS失败', error: error.message });
  }
};
